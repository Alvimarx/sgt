// JerarquiaView.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SGT_DATA } from './data';
import { SGTIcon, TopHeader } from '../Style/UIPrimitives';
import { getServicios } from '../../services/servicioService';
import { getFuncionariosSummary, asignarRolJerarquia } from '../../services/funcionarioService';

// ---------------------------------------------------------------------------
// CONSTANTES Y HELPERS (Importados desde AsignacionView)
// ---------------------------------------------------------------------------
const MAX_SEARCH_LENGTH = 60;

const getUserId = (user) =>
    user?.rutCompleto?.replace(/[^0-9kK]/g, '') ||
    user?.rut?.replace(/[^0-9kK]/g, '') ||
    user?.idFuncionario || user?.id ||
    `${user?.nombre ?? ''}-${user?.apellidoPaterno ?? ''}`;

const getInitials = (nombre = '', apellido = '') =>
    `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase() || 'U';

const getNombreCompleto = (user) =>
    `${user?.nombre || ''} ${user?.apellidoPaterno || ''}`.trim();

const sanitizeQuery = (raw) =>
    raw.replace(/[<>"'`;]/g, '').slice(0, MAX_SEARCH_LENGTH);

const maskRut = (rut = '') => {
    const clean = rut.replace(/[^0-9kK\-]/g, '');
    if (clean.length < 5) return '***';
    return `***${clean.slice(-5)}`;
};

// ---------------------------------------------------------------------------
// COMPONENTE DE CONFIRMACIÓN
// ---------------------------------------------------------------------------
const ConfirmDialog = ({ funcionario, servicio, rol, onConfirm, onCancel, guardando }) => {
    const PA = SGT_DATA.PALETTE;
    const nombreRol = rol === 'jefe' ? 'Jefatura' : 'Subrogante';

    return (
        <div style={{ 
            position: 'fixed', inset: 0, zIndex: 100, display: 'flex', 
            alignItems: 'center', justifyContent: 'center', padding: '20px', 
            background: 'rgba(15,23,42,0.4)' 
        }}>
            <div style={{ 
                width: '100%', maxWidth: '340px', background: '#fff', 
                borderRadius: '20px', padding: '24px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' 
            }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: PA.ink, marginBottom: 12, textAlign: 'center' }}>
                    Confirmar jerarquía
                </div>
                
                <p style={{ fontSize: 14, color: PA.ink2, fontWeight: 500, marginBottom: 24, lineHeight: 1.5, textAlign: 'center' }}>
                    ¿Deseas designar a <strong style={{ color: PA.ink }}>{getNombreCompleto(funcionario)}</strong> como <strong style={{ color: PA.ink }}>{nombreRol}</strong> del servicio{' '}
                    <strong style={{ color: PA.ink }}>{servicio?.nombreServicio || servicio?.nombre}</strong>?
                </p>
                
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={onCancel}
                        disabled={guardando}
                        style={{ 
                            flex: 1, padding: '12px', borderRadius: '12px', 
                            border: `1px solid ${PA.line}`, background: '#fff', 
                            fontSize: 15, fontWeight: 700, color: PA.ink2, 
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
                            flex: 1, padding: '12px', borderRadius: '12px', 
                            border: 'none', background: PA.primary, 
                            fontSize: 15, fontWeight: 800, color: '#fff', 
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
// VISTA PRINCIPAL
// ---------------------------------------------------------------------------
const JerarquiaView = ({ onBack }) => {
  const PA = SGT_DATA.PALETTE;

  const [funcionarios, setFuncionarios] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Estados para el buscador
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchWrapperRef = useRef(null);

  // Estados de selección
  const [selectedRole, setSelectedRole] = useState('jefe');
  const [selectedServicioId, setSelectedServicioId] = useState('');

  // ---------------------------------------------------------------------------
  // EFECTOS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const cargarDatos = async () => {
      setLoadingDatos(true);
      setErrorCarga('');
      
      const [resServ, resFunc] = await Promise.all([
        getServicios(),
        getFuncionariosSummary() 
      ]);
      
      if (!mounted) return;

      if (resServ.success) {
        let dataServicios = [];
        if (Array.isArray(resServ.data)) {
          dataServicios = resServ.data;
        } else if (resServ.data && Array.isArray(resServ.data.servicios)) {
          dataServicios = resServ.data.servicios;
        } else if (typeof resServ.data === 'object' && resServ.data !== null) {
          dataServicios = Object.values(resServ.data);
        }
        setServicios(dataServicios);
      } else {
        setErrorCarga('No se pudieron cargar los servicios. Intenta de nuevo.');
      }

      if (resFunc.success) {
        setFuncionarios(Array.isArray(resFunc.data) ? resFunc.data : []);
      } else {
        setErrorCarga('No se pudo cargar el listado de funcionarios. Intenta de nuevo.');
      }
      
      setLoadingDatos(false);
    };

    cargarDatos();
    return () => { mounted = false; };
  }, []);

  // Cierra el dropdown al hacer click fuera
  useEffect(() => {
      const handleClickOutside = (e) => {
          if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
              setShowDropdown(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-dismiss del mensaje tras 5 segundos
  useEffect(() => {
      if (!mensaje.texto) return;
      const timer = setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
      return () => clearTimeout(timer);
  }, [mensaje.texto]);

  // ---------------------------------------------------------------------------
  // BÚSQUEDA Y FILTRADO
  // ---------------------------------------------------------------------------
  const filteredUsers = useCallback(() => {
      const query = sanitizeQuery(searchQuery).toLowerCase().trim();
      if (query.length < 2) return [];

      return funcionarios.filter((u) => {
          const nombre = getNombreCompleto(u).toLowerCase();
          if (nombre.includes(query)) return true;

          const rutLimpio = (u.rutCompleto || u.rut || '').replace(/[^0-9kK]/g, '');
          const queryRut = query.replace(/[^0-9kK]/g, '');
          return queryRut.length >= 2 && rutLimpio.includes(queryRut);
      });
  }, [funcionarios, searchQuery]);

  const resultados = filteredUsers();
  const dropdownVisible = showDropdown && searchQuery.length >= 2;

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleSearchChange = (e) => {
      const sanitized = sanitizeQuery(e.target.value);
      setSearchQuery(sanitized);
      setShowDropdown(true);
      if (sanitized === '') setSelectedUser(null);
  };

  const handleSelectUser = (user) => {
      setSelectedUser(user);
      setSearchQuery(getNombreCompleto(user));
      setShowDropdown(false);
  };

  const handleGuardarClick = () => {
    if (!selectedUser || !selectedServicioId) return;
    setShowConfirm(true);
  };

  const handleConfirmar = async () => {
    if (!selectedUser || !selectedServicioId) return;

    setGuardando(true);
    setShowConfirm(false);

    // Suponiendo que Jefe Titular es ID 1 y Subrogante es ID 2
    const idRolReal = selectedRole === 'jefe' ? 1 : 2; 
    const idFunc = selectedUser.idFuncionario || selectedUser.id || selectedUser.rutCompleto;

    const result = await asignarRolJerarquia(idFunc, selectedServicioId, idRolReal);

    if (result.success) {
      setMensaje({ tipo: 'success', texto: 'Jerarquía designada con éxito.' });
      setSelectedUser(null);
      setSearchQuery('');
      setSelectedServicioId('');
    } else {
      setMensaje({ tipo: 'error', texto: result.error || 'Ocurrió un error al designar la jerarquía.' });
    }
    
    setGuardando(false);
  };

  const servicioSeleccionado = servicios.find(
      (s) => String(s.idServicio || s.id) === String(selectedServicioId)
  ) ?? null;

  const canSubmit = Boolean(selectedUser && selectedServicioId && !guardando);

  // ---------------------------------------------------------------------------
  // ESTILOS
  // ---------------------------------------------------------------------------
  const inputStyle = {
    width: '100%', padding: '14px', borderRadius: 12, border: `1px solid ${PA.line}`,
    background: '#fff', fontSize: 15, color: PA.ink, fontWeight: 600, marginTop: 6,
    appearance: 'none', outline: 'none', boxSizing: 'border-box'
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtFade .3s ease' }}>
      
      {/* Header */}
      <TopHeader
        title="Jerarquía"
        leftSlot={
          <button onClick={onBack} aria-label="Volver" style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <SGTIcon name="chevron-left" size={24} color={PA.ink} />
          </button>
        }
      />

      <div style={{ flex: 1, padding: '20px 16px', overflow: 'auto' }}>
        <p style={{ color: PA.ink2, fontSize: 14, marginBottom: 24, fontWeight: 600, lineHeight: 1.5 }}>
          Designa quién es la jefatura oficial de un servicio o nombra a un subrogante temporal.
        </p>

        {/* Error de carga inicial */}
        {errorCarga && (
            <div style={{ padding: '12px 14px', marginBottom: 16, borderRadius: 10, fontWeight: 700, fontSize: 13, background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: 8 }}>
                <SGTIcon name="exclamation-circle" size={16} color="#991B1B" />
                {errorCarga}
            </div>
        )}

        {/* Feedback visual con Auto-Dismiss */}
        {mensaje.texto && (
          <div role="alert" aria-live="polite" style={{ 
            padding: '12px 14px', marginBottom: 16, borderRadius: 10, fontWeight: 700, fontSize: 13,
            background: mensaje.tipo === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: mensaje.tipo === 'success' ? '#065F46' : '#991B1B',
            border: `1px solid ${mensaje.tipo === 'success' ? '#A7F3D0' : '#FECACA'}`,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <SGTIcon
                name={mensaje.tipo === 'success' ? 'check-circle' : 'exclamation-circle'}
                size={16}
                color={mensaje.tipo === 'success' ? '#065F46' : '#991B1B'}
            />
            {mensaje.texto}
          </div>
        )}

        {/* 1. SELECCIONAR SERVICIO DINÁMICO */}
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="select-servicio" style={{ fontSize: 13, fontWeight: 800, color: PA.ink3, display: 'block' }}>
            1. Seleccionar Servicio
          </label>
          <div style={{ position: 'relative' }}>
            <select 
              id="select-servicio"
              style={inputStyle} 
              value={selectedServicioId} 
              onChange={e => setSelectedServicioId(e.target.value)}
              disabled={loadingDatos || servicios.length === 0}
              aria-label="Seleccionar servicio"
            >
              <option value="" disabled>
                {loadingDatos ? 'Cargando servicios...' : 'Seleccione un servicio...'}
              </option>
              {servicios.map((srv, index) => {
                const srvId = srv.idServicio ?? srv.id ?? `s_${index}`;
                const srvNombre = srv.nombreServicio || srv.nombre || 'Servicio';
                return <option key={srvId} value={srvId}>{srvNombre}</option>;
              })}
            </select>
            <SGTIcon name="chevron-down" size={16} color={PA.ink3} style={{ position: 'absolute', right: 14, top: 20, pointerEvents: 'none' }}/>
          </div>
        </div>

        {/* 2. BUSCADOR DE FUNCIONARIO */}
        <div style={{ marginBottom: 20 }} ref={searchWrapperRef}>
          <label htmlFor="buscar-funcionario" style={{ fontSize: 13, fontWeight: 800, color: PA.ink3, display: 'block' }}>
            2. Buscar Funcionario {loadingDatos && <span style={{ fontWeight: 600, color: PA.ink3, marginLeft: 6 }}>(Cargando…)</span>}
          </label>
          <div style={{ position: 'relative' }}>
            <SGTIcon name="search" size={18} color={PA.ink3} style={{ position: 'absolute', left: 14, top: 21, pointerEvents: 'none' }}/>
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
            
            {searchQuery.length > 0 && searchQuery.length < 2 && (
                <div style={{ fontSize: 11.5, color: PA.ink3, fontWeight: 600, marginTop: 4, paddingLeft: 4 }}>
                    Escribe al menos 2 caracteres para buscar
                </div>
            )}

            {/* Menú desplegable del buscador */}
            {dropdownVisible && (
              <div 
                id="lista-funcionarios"
                role="listbox"
                style={{ 
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, background: '#fff', 
                  border: `1px solid ${PA.line}`, borderRadius: 12, maxHeight: 200, overflowY: 'auto', 
                  zIndex: 10, boxShadow: '0 8px 24px rgba(15,23,42,0.1)' 
              }}>
                {resultados.length > 0 ? resultados.map((u, i) => {
                  const uId = getUserId(u);
                  const rowKey = `${uId ?? "sin-id"}-${i}`;
                  const isSelected = selectedUser && getUserId(selectedUser) === uId;

                  return (
                    <div key={rowKey} role="option" aria-selected={isSelected} onClick={() => handleSelectUser(u)} style={{ 
                      padding: '12px 14px', borderBottom: `1px solid ${PA.line2}`, cursor: 'pointer', 
                      display: 'flex', alignItems: 'center', gap: 10, 
                      background: isSelected ? PA.primarySoft : '#fff'
                    }}>
                      <div style={{ width: 32, height: 32, borderRadius: 99, background: PA.primary, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {getInitials(u.nombre, u.apellidoPaterno)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: isSelected ? 800 : 600, color: PA.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {getNombreCompleto(u)}
                        </div>
                        <div style={{ fontSize: 11.5, color: PA.ink3, fontWeight: 500, marginTop: 1 }}>
                            RUT {maskRut(u.rutCompleto || u.rut)}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div style={{ padding: '16px', fontSize: 13, color: PA.ink3, textAlign: 'center', fontWeight: 600 }}>
                    No se encontraron funcionarios con ese nombre o RUT
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 3. NIVEL DE JERARQUÍA */}
        <div style={{ marginBottom: 30 }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3 }}>3. Nivel de Jerarquía</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button 
              onClick={() => setSelectedRole('jefe')}
              style={{ flex: 1, padding: '12px', borderRadius: 10, border: `2px solid ${selectedRole === 'jefe' ? PA.warn : PA.line}`, background: selectedRole === 'jefe' ? PA.warnSoft : '#fff', color: selectedRole === 'jefe' ? PA.warn : PA.ink2, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Jefatura
            </button>
            <button 
              onClick={() => setSelectedRole('subrogante')}
              style={{ flex: 1, padding: '12px', borderRadius: 10, border: `2px solid ${selectedRole === 'subrogante' ? PA.primary : PA.line}`, background: selectedRole === 'subrogante' ? PA.primarySoft : '#fff', color: selectedRole === 'subrogante' ? PA.primary : PA.ink2, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Subrogante
            </button>
          </div>
        </div>

        <button 
          disabled={!canSubmit}
          aria-disabled={!canSubmit}
          onClick={handleGuardarClick} 
          title={!selectedUser ? 'Selecciona un funcionario primero' : !selectedServicioId ? 'Selecciona un servicio primero' : ''}
          style={{
            width: '100%', padding: '16px',
            background: canSubmit ? PA.primary : PA.line,
            color: canSubmit ? '#fff' : PA.ink3,
            border: 'none', borderRadius: 14,
            fontSize: 16, fontWeight: 800,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            boxShadow: canSubmit ? '0 4px 12px rgba(23,65,108,0.25)' : 'none',
            transition: 'all 0.2s'
          }}>
          {guardando ? 'Guardando...' : 'Designar Autoridad'}
        </button>
      </div>

      {/* Diálogo de confirmación  */}
      {showConfirm && servicioSeleccionado && selectedUser && (
        <ConfirmDialog
            funcionario={selectedUser}
            servicio={servicioSeleccionado}
            rol={selectedRole}
            onConfirm={handleConfirmar}
            onCancel={() => setShowConfirm(false)}
            guardando={guardando}
        />
      )}
    </div>
  );
};

export default JerarquiaView;