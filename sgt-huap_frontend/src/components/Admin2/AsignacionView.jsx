// AsignacionView.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SGT_DATA } from './data';
import { SGTIcon, TopHeader } from '../Style/UIPrimitives';
import { getServicios } from '../../services/servicioService';
import { getPersonal, asignarServicio } from '../../services/funcionarioService';
import { getCurrentUser } from '../../services/authService'

// ---------------------------------------------------------------------------
// CONSTANTES DE SEGURIDAD 
// Limitamos la longitud del input de búsqueda para evitar payloads anómalos.
// El filtrado se hace en cliente sobre datos ya validados por el backend.
// ---------------------------------------------------------------------------
const MAX_SEARCH_LENGTH = 60;

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------


const getUserId = (user) =>
    user?.rutCompleto?.replace(/[^0-9kK]/g, '') ||
    user?.rut?.replace(/[^0-9kK]/g, '') ||
    `${user?.nombre ?? ''}-${user?.apellidoPaterno ?? ''}`;

// Genera iniciales para el avatar — máximo 2 caracteres, siempre mayúsculas
const getInitials = (nombre = '', apellido = '') =>
    `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase() || 'U';

// Construye el nombre visible para el input y el dropdown
const getNombreCompleto = (user) =>
    `${user?.nombre || ''} ${user?.apellidoPaterno || ''}`.trim();

/**
 * Sanitiza el query de búsqueda para evitar caracteres de control
 * y limitar el largo del string antes de usarlo en comparaciones. (OWASP A03)
 */
const sanitizeQuery = (raw) =>
    raw.replace(/[<>"'`;]/g, '').slice(0, MAX_SEARCH_LENGTH);

/**
 * Enmascara el RUT para mostrar solo los últimos 3 dígitos verificables.
 * Evitamos exponer el RUT completo en el dropdown — dato sensible. (OWASP A02)
 * Ej: "12.345.678-9" → "***678-9"
 */
const maskRut = (rut = '') => {
    const clean = rut.replace(/[^0-9kK\-]/g, '');
    if (clean.length < 5) return '***';
    return `***${clean.slice(-5)}`;
};

// ---------------------------------------------------------------------------
// COMPONENTE DE CONFIRMACIÓN
// Muestra un resumen antes de ejecutar la acción de asignación.
// ---------------------------------------------------------------------------
const ConfirmDialog = ({ funcionario, servicio, onConfirm, onCancel, guardando }) => {
    const PA = SGT_DATA.PALETTE;
    return (
        <div style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 100, 
            display: 'flex', 
            alignItems: 'center',       // Centrado vertical
            justifyContent: 'center',   // Centrado horizontal
            padding: '20px',            // Margen de seguridad para pantallas muy pequeñas
            background: 'rgba(15,23,42,0.4)' 
        }}>
            <div style={{ 
                width: '100%', 
                maxWidth: '340px',          // Ancho máximo estándar de alerta móvil
                background: '#fff', 
                borderRadius: '20px',       // Bordes redondeados en todas las esquinas
                padding: '24px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' 
            }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: PA.ink, marginBottom: 12, textAlign: 'center' }}>
                    Confirmar asignación
                </div>
                
                <p style={{ fontSize: 14, color: PA.ink2, fontWeight: 500, marginBottom: 24, lineHeight: 1.5, textAlign: 'center' }}>
                    ¿Deseas asignar a <strong style={{ color: PA.ink }}>{getNombreCompleto(funcionario)}</strong> al servicio{' '}
                    <strong style={{ color: PA.ink }}>{servicio?.nombreServicio || servicio?.nombre}</strong>?
                </p>
                
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={onCancel}
                        disabled={guardando}
                        style={{ 
                            flex: 1, 
                            padding: '12px', 
                            borderRadius: '12px', 
                            border: `1px solid ${PA.line}`, 
                            background: '#fff', 
                            fontSize: 15, 
                            fontWeight: 700, 
                            color: PA.ink2, 
                            cursor: guardando ? 'not-allowed' : 'pointer',
                            opacity: guardando ? 0.7 : 1
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={guardando}
                        style={{ 
                            flex: 1, 
                            padding: '12px', 
                            borderRadius: '12px', 
                            border: 'none', 
                            background: PA.primary, 
                            fontSize: 15, 
                            fontWeight: 800, 
                            color: '#fff', 
                            cursor: guardando ? 'not-allowed' : 'pointer', 
                            opacity: guardando ? 0.7 : 1 
                        }}
                    >
                        {guardando ? 'Guardando...' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// ASIGNACIONVIEW
// ---------------------------------------------------------------------------
const AsignacionView = ({ onBack }) => {
    const PA = SGT_DATA.PALETTE;
    const currentUserRut = getCurrentUser()?.rut;

    // Datos cargados desde la API
    const [funcionarios, setFuncionarios] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [loadingDatos, setLoadingDatos] = useState(true);
    // Error de carga inicial separado del error de guardado — Nielsen #1: visibilidad del estado
    const [errorCarga, setErrorCarga] = useState('');

    // Estado del formulario
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedServicioId, setSelectedServicioId] = useState('');

    // Estado del guardado
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
    const [showConfirm, setShowConfirm] = useState(false);

    // Ref para cerrar el dropdown al hacer click fuera — más robusto que un overlay fijo
    const searchWrapperRef = useRef(null);

    // ---------------------------------------------------------------------------
    // CARGA INICIAL — ambos endpoints en paralelo
    // Los errores se registran internamente; NO exponemos detalles técnicos al usuario
    // ---------------------------------------------------------------------------
    useEffect(() => {
        let mounted = true;

        const cargarDatos = async () => {
            setLoadingDatos(true);
            setErrorCarga('');

            const [resServ, resFunc] = await Promise.all([
                getServicios(),
                getPersonal(),
            ]);

            if (!mounted) return;

            // Normalizamos la respuesta de servicios contemplando distintas estructuras de API
            if (resServ.success) {
                const raw = resServ.data;
                const lista = Array.isArray(raw)
                    ? raw
                    : Array.isArray(raw?.servicios)
                    ? raw.servicios
                    : typeof raw === 'object' && raw !== null
                    ? Object.values(raw)
                    : [];
                setServicios(lista);
            } else {
                setErrorCarga('No se pudieron cargar los datos. Intenta de nuevo.');
            }

            if (resFunc.success) {
                setFuncionarios(Array.isArray(resFunc.data) ? resFunc.data : []);
            } else {
                setErrorCarga('No se pudieron cargar los datos. Intenta de nuevo.');
            }

            setLoadingDatos(false);
        };

        cargarDatos();
        return () => { mounted = false; };
    }, []);

    // Cierra el dropdown al hacer click fuera del wrapper
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-dismiss del mensaje de resultado tras 5 segundos
    useEffect(() => {
        if (!mensaje.texto) return;
        const timer = setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
        return () => clearTimeout(timer);
    }, [mensaje.texto]);

    // ---------------------------------------------------------------------------
    // BÚSQUEDA Y FILTRADO
    // El query se sanitiza antes de usarse en comparaciones.
    // Solo mostramos el dropdown si hay al menos 2 caracteres — evitamos
    // exponer la lista completa de funcionarios sin intención del usuario.
    // ---------------------------------------------------------------------------
    const filteredUsers = useCallback(() => {
        const query = sanitizeQuery(searchQuery).toLowerCase().trim();
        if (query.length < 2) return [];

        return funcionarios.filter((u) => {
            
            if (u.rutCompleto === currentUserRut || u.rut === currentUserRut) {
            return false;
            }

            const nombre = getNombreCompleto(u).toLowerCase();
            if (nombre.includes(query)) return true;

            // Búsqueda por RUT: limpiamos caracteres no numéricos antes de comparar
            const rutLimpio = (u.rutCompleto || '').replace(/[^0-9kK]/g, '');
            const queryRut = query.replace(/[^0-9kK]/g, '');
            return queryRut.length >= 2 && rutLimpio.includes(queryRut);
        });
    }, [funcionarios, searchQuery, currentUserRut]);

    const resultados = filteredUsers();
    // El dropdown se muestra solo si hay texto suficiente y resultados
    const dropdownVisible = showDropdown && searchQuery.length >= 2;

    // ---------------------------------------------------------------------------
    // HANDLERS
    // ---------------------------------------------------------------------------

    const handleSearchChange = (e) => {
        // Sanitizamos el input en cada keystroke — no permitimos caracteres peligrosos (OWASP A03)
        const sanitized = sanitizeQuery(e.target.value);
        setSearchQuery(sanitized);
        setShowDropdown(true);
        // Si el usuario borra el campo, limpiamos la selección
        if (sanitized === '') setSelectedUser(null);
    };

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setSearchQuery(getNombreCompleto(user));
        setShowDropdown(false);
    };

    // Abre el diálogo de confirmación — Nielsen #5: prevención de errores en acciones irreversibles
    const handleGuardarClick = () => {
        if (!selectedUser || !selectedServicioId) return;
        setShowConfirm(true);
    };

    // Ejecuta la asignación tras confirmar
    const handleConfirmar = async () => {
    
        if (!selectedUser || !selectedServicioId) return;

        
        const servicioIdNum = Number(selectedServicioId);
        if (!Number.isFinite(servicioIdNum) || servicioIdNum <= 0) {
            setMensaje({ tipo: 'error', texto: 'El servicio seleccionado no es válido.' });
            setShowConfirm(false);
            return;
        }

        
        const rutFuncionario = selectedUser.rutCompleto || selectedUser.rut || '';
        if (!rutFuncionario) {
            setMensaje({ tipo: 'error', texto: 'No se pudo identificar al funcionario.' });
            setShowConfirm(false);
            return;
        }

        setGuardando(true);
        setShowConfirm(false);

        const result = await asignarServicio(servicioIdNum, rutFuncionario);

        if (result.success) {
            setMensaje({ tipo: 'success', texto: `${getNombreCompleto(selectedUser)} fue asignado correctamente.` });
            
            setSelectedUser(null);
            setSearchQuery('');
            setSelectedServicioId('');
        } else {
            
            setMensaje({ tipo: 'error', texto: 'No se pudo completar la asignación. Intenta de nuevo.' });
        }

        setGuardando(false);
    };

    // Servicio seleccionado como objeto (para la pantalla de confirmación)
    const servicioSeleccionado = servicios.find(
        (s) => String(s.idServicio || s.id) === String(selectedServicioId)
    ) ?? null;

    const canSubmit = Boolean(selectedUser && selectedServicioId && !guardando);

    // ---------------------------------------------------------------------------
    // ESTILOS BASE
    // ---------------------------------------------------------------------------
    const inputStyle = {
        width: '100%', padding: '14px', borderRadius: 12,
        border: `1px solid ${PA.line}`, background: '#fff',
        fontSize: 15, color: PA.ink, fontWeight: 600, marginTop: 6,
        appearance: 'none', outline: 'none', boxSizing: 'border-box',
    };

    // ---------------------------------------------------------------------------
    // RENDER
    // ---------------------------------------------------------------------------
    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtFade .3s ease' }}>

            {/* Header */}
            <TopHeader
                title="Asignación"
                leftSlot={
                    <button
                        onClick={onBack}
                        aria-label="Volver"
                        style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}
                    >
                        <SGTIcon name="chevron-left" size={24} color={PA.ink} />
                    </button>
                }
            />

            <div style={{ flex: 1, padding: '20px 16px', overflow: 'auto' }}>
                <p style={{ color: PA.ink2, fontSize: 14, marginBottom: 24, fontWeight: 600, lineHeight: 1.5 }}>
                    Asocia a un funcionario con su servicio correspondiente.
                </p>

                {/* Error de carga inicial */}
                {errorCarga && (
                    <div style={{ padding: '12px 14px', marginBottom: 16, borderRadius: 10, fontWeight: 700, fontSize: 13, background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <SGTIcon name="exclamation-circle" size={16} color="#991B1B" />
                        {errorCarga}
                    </div>
                )}

                {/* Mensaje de resultado con auto-dismiss */}
                {mensaje.texto && (
                    <div
                        role="alert"
                        aria-live="polite"
                        style={{
                            padding: '12px 14px', marginBottom: 16, borderRadius: 10, fontWeight: 700, fontSize: 13,
                            background: mensaje.tipo === 'success' ? '#ECFDF5' : '#FEF2F2',
                            color: mensaje.tipo === 'success' ? '#065F46' : '#991B1B',
                            border: `1px solid ${mensaje.tipo === 'success' ? '#A7F3D0' : '#FECACA'}`,
                            display: 'flex', alignItems: 'center', gap: 8,
                        }}
                    >
                        <SGTIcon
                            name={mensaje.tipo === 'success' ? 'check-circle' : 'exclamation-circle'}
                            size={16}
                            color={mensaje.tipo === 'success' ? '#065F46' : '#991B1B'}
                        />
                        {mensaje.texto}
                    </div>
                )}

                {/* Buscar funcionario */}
                <div style={{ marginBottom: 20 }} ref={searchWrapperRef}>
                    {/* htmlFor conecta el label con el input */}
                    <label
                        htmlFor="buscar-funcionario"
                        style={{ fontSize: 13, fontWeight: 800, color: PA.ink3, display: 'block' }}
                    >
                        1. Buscar funcionario
                        {loadingDatos && (
                            <span style={{ fontWeight: 600, color: PA.ink3, marginLeft: 6 }}>(Cargando…)</span>
                        )}
                    </label>

                    <div style={{ position: 'relative' }}>
                        <SGTIcon
                            name="search"
                            size={18}
                            color={PA.ink3}
                            style={{ position: 'absolute', left: 14, top: 21, pointerEvents: 'none' }}
                        />
                        <input
                            id="buscar-funcionario"
                            type="search"
                            autoComplete="off"
                            
                            maxLength={MAX_SEARCH_LENGTH}
                            placeholder="Nombre o RUT del funcionario"
                            value={searchQuery}
                            disabled={loadingDatos}
                            onChange={handleSearchChange}
                            onFocus={() => setShowDropdown(true)}
                            aria-autocomplete="list"
                            aria-controls="lista-funcionarios"
                            aria-expanded={dropdownVisible}
                            style={{ ...inputStyle, paddingLeft: 42 }}
                        />

                        {/* Indicación de mínimo de caracteres */}
                        {searchQuery.length > 0 && searchQuery.length < 2 && (
                            <div style={{ fontSize: 11.5, color: PA.ink3, fontWeight: 600, marginTop: 4, paddingLeft: 4 }}>
                                Escribe al menos 2 caracteres para buscar
                            </div>
                        )}

                        {/* Dropdown de resultados */}
                        {dropdownVisible && (
                            <div
                                id="lista-funcionarios"
                                role="listbox"
                                style={{
                                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6,
                                    background: '#fff', border: `1px solid ${PA.line}`, borderRadius: 12,
                                    maxHeight: 200, overflowY: 'auto', zIndex: 10,
                                    boxShadow: '0 8px 24px rgba(15,23,42,0.1)',
                                }}
                            >
                                {resultados.length > 0 ? (
                                    resultados.map((u, idx) => {
                                        const uId = getUserId(u);
                                        const rowKey = `${uId ?? "sin-id"}-${idx}`;
                                        const isSelected = selectedUser && getUserId(selectedUser) === uId;

                                        return (
                                            <div
                                                key={rowKey}
                                                role="option"
                                                aria-selected={isSelected}
                                                onClick={() => handleSelectUser(u)}
                                                style={{
                                                    padding: '12px 14px', borderBottom: `1px solid ${PA.line2}`,
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                                                    background: isSelected ? PA.primarySoft : '#fff',
                                                }}
                                            >
                                                {/* Avatar con iniciales */}
                                                <div style={{ width: 32, height: 32, borderRadius: 99, background: PA.primary, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                                                    {getInitials(u.nombre, u.apellidoPaterno)}
                                                </div>

                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontSize: 14, fontWeight: isSelected ? 800 : 600, color: PA.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {getNombreCompleto(u)}
                                                    </div>
                                                    {/* Mostramos el RUT enmascarado — dato sensible (OWASP A02) */}
                                                    <div style={{ fontSize: 11.5, color: PA.ink3, fontWeight: 500, marginTop: 1 }}>
                                                        RUT {maskRut(u.rutCompleto || u.rut)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    
                                    <div style={{ padding: '16px', fontSize: 13, color: PA.ink3, textAlign: 'center', fontWeight: 600 }}>
                                        No se encontraron funcionarios con ese nombre o RUT
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Seleccionar servicio */}
                <div style={{ marginBottom: 20 }}>
                    <label
                        htmlFor="select-servicio"
                        style={{ fontSize: 13, fontWeight: 800, color: PA.ink3, display: 'block' }}
                    >
                        2. Asignar a servicio
                    </label>
                    <div style={{ position: 'relative' }}>
                        <select
                            id="select-servicio"
                            style={inputStyle}
                            value={selectedServicioId}
                            onChange={(e) => setSelectedServicioId(e.target.value)}
                            disabled={loadingDatos || servicios.length === 0}
                            aria-label="Seleccionar servicio"
                        >
                            <option value="" disabled>
                                {servicios.length === 0 && !loadingDatos
                                    ? 'No hay servicios disponibles'
                                    : 'Selecciona un servicio…'}
                            </option>
                            {servicios.map((srv, index) => {
                                const srvId = srv.idServicio ?? srv.id ?? `s_${index}`;
                                const srvNombre = srv.nombreServicio || srv.nombre || 'Servicio';
                                return (
                                    <option key={srvId} value={srvId}>
                                        {srvNombre}
                                    </option>
                                );
                            })}
                        </select>
                        <SGTIcon
                            name="chevron-down"
                            size={16}
                            color={PA.ink3}
                            style={{ position: 'absolute', right: 14, top: 20, pointerEvents: 'none' }}
                        />
                    </div>
                </div>

                {/* Botón principal */}
                <button
                    onClick={handleGuardarClick}
                    disabled={!canSubmit}
                    aria-disabled={!canSubmit}
                    // Tooltip explica por qué está deshabilitado
                    title={!selectedUser ? 'Selecciona un funcionario primero' : !selectedServicioId ? 'Selecciona un servicio primero' : ''}
                    style={{
                        width: '100%', padding: '16px', marginTop: 10,
                        background: canSubmit ? PA.primary : PA.line,
                        color: canSubmit ? '#fff' : PA.ink3,
                        border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 800,
                        cursor: canSubmit ? 'pointer' : 'not-allowed',
                        boxShadow: canSubmit ? '0 4px 12px rgba(23,65,108,0.2)' : 'none',
                        transition: 'all 0.2s',
                    }}
                >
                    Guardar asignación
                </button>
            </div>

            {/* Diálogo de confirmación  */}
            {showConfirm && servicioSeleccionado && (
                <ConfirmDialog
                    funcionario={selectedUser}
                    servicio={servicioSeleccionado}
                    onConfirm={handleConfirmar}
                    onCancel={() => setShowConfirm(false)}
                    guardando={guardando}
                />
            )}
        </div>
    );
};

export default AsignacionView;
