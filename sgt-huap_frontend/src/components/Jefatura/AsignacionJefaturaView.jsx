import React, { useState, useEffect, useRef } from 'react';
import { SGT_DATA } from '../Admin2/data'; 
import { SGTIcon, TopHeader, ConfirmDialog } from '../Style/UIPrimitives';
import { getPersonal, asignarServicio } from '../../services/funcionarioService';
import { useAuth } from '../../context/AuthContext';
import { getCurrentUser } from '../../services/authService'
import { useLayout } from '../../layout/layout';
import { EncabezadoDesktop, PaginaDesktop, PanelDesktop, CampoDesktop, BotonDesktop, AvisoDesktop, PersonaDesktop } from '../Desktop/ui';
import { BusquedaFuncionarioDesktop } from '../Desktop/gestion/BusquedaFuncionarioDesktop';

// ---------------------------------------------------------------------------
// CONSTANTES Y HELPERS (Homologados de AsignacionView)
// ---------------------------------------------------------------------------
const MAX_SEARCH_LENGTH = 60;

const sanitizeQuery = (raw) =>
    raw.replace(/[<>"'`;]/g, '').slice(0, MAX_SEARCH_LENGTH);

const getUserId = (user) =>
    user?.rutCompleto?.replace(/[^0-9kK]/g, '') ||
    user?.rut?.replace(/[^0-9kK]/g, '') ||
    `${user?.nombre ?? ''}-${user?.apellidoPaterno ?? ''}`;

const getNombreCompleto = (user) =>
    `${user?.nombre || ''} ${user?.apellidoPaterno || ''}`.trim();

const getInitials = (nombre = '', apellido = '') =>
    `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase() || 'U';

const maskRut = (rut = '') => {
    const clean = rut.replace(/[^0-9kK-]/g, '');
    if (clean.length < 5) return '***';
    return `***${clean.slice(-5)}`;
};

// ---------------------------------------------------------------------------
// ASIGNACIONVIEW JEFATURA
// ---------------------------------------------------------------------------

const AsignacionJerarquiaView = ({ onBack }) => {
  const PA = SGT_DATA.PALETTE;
  const auth = useAuth();
  const { esDesktop } = useLayout();
  const currentUserRut = getCurrentUser()?.rut;

  const storedUserData = localStorage.getItem('userData') || localStorage.getItem('user');
  const userData = auth?.user || (storedUserData ? JSON.parse(storedUserData) : {});
  
  const servicioActivoId = userData?.servicioId || null;
  const servicioActivoNombre = userData?.servicioNombre || localStorage.getItem("sgt_servicio_activo_nombre") || 'Servicio Actual';
  
  // Estados de datos dinámicos
  const [funcionarios, setFuncionarios] = useState([]);
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Estados para el buscador
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  
  // Ref para cerrar el dropdown al hacer click fuera — más robusto que un overlay fijo
  const searchWrapperRef = useRef(null);
  

  // Cargar datos al montar
  useEffect(() => {
    let mounted = true;

    const cargarDatos = async () => {
      setLoadingDatos(true);
      
      if (!mounted) return;

      if (!servicioActivoId) {
         setMensaje({ tipo: 'error', texto: 'No se encontró un servicio activo en la sesión.' });
         setLoadingDatos(false);
         return;
      }
      
      const resFunc = await getPersonal();
      
      if (resFunc.success) {
        setFuncionarios(Array.isArray(resFunc.data) ? resFunc.data : []);
      } else {
        setMensaje({ tipo: 'error', texto: resFunc.error || 'Error al cargar los funcionarios.' });
      }
      
      setLoadingDatos(false);
    };

    cargarDatos();
    return () => { mounted = false; };
  }, [servicioActivoId]);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)){
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!mensaje.texto) return;
    const timer = setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
    return () => clearTimeout(timer);

  }, [mensaje.texto]);
  
  // ---------------------------------------------------------------------------
  // BÚSQUEDA Y FILTRADO (Idéntico a AsignacionView)
  // ---------------------------------------------------------------------------
  const resultados = (() => {
      const query = sanitizeQuery(searchQuery).toLowerCase().trim();
      // Retornar vacío si no hay al menos 2 caracteres
      if (query.length < 2) return [];

      return funcionarios.filter((u) => {

        if (u.rutCompleto === currentUserRut || u.rut === currentUserRut) {
          return false;
        }

        // Búsqueda por Nombre
        const nombreCompleto = `${u.nombre || ''} ${u.apellidoPaterno || ''}`.toLowerCase();
        if (nombreCompleto.includes(query)) return true;
          
        // Búsqueda por RUT
        const rutLimpio = (u.rutCompleto || u.rut || '').replace(/[^0-9kK]/g, '');
        const queryRut = query.replace(/[^0-9kK]/g, '');
        return queryRut.length >= 2 && rutLimpio.includes(queryRut);
      });
  })();

  // El dropdown se muestra solo si hay texto suficiente
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

  const handleGuardarClick = () => {
        if (!selectedUser || !servicioActivoId) return;
        setShowConfirm(true);
    };

  const handleConfirmar = async () => {
    if (!selectedUser || !servicioActivoId) return;

    
    setMensaje({ tipo: '', texto: '' });

    // Extraemos el RUT 
    const rutFuncionario = selectedUser.rutCompleto || selectedUser.rut || '';
    if (!rutFuncionario) {
      setMensaje({ tipo: 'error', texto: 'No se pudo identificar al funcionario.' });
      setShowConfirm(false);
      return;
    }

    // aseguramos de que el ID del servicio sea numérico
    const servicioIdNum = Number(servicioActivoId);

    setGuardando(true);
    setShowConfirm(false);

    // Respetamos el orden de la función: (servicioId, rut)
    const result = await asignarServicio(servicioIdNum, rutFuncionario);

    if (result.success) {
      setMensaje({ tipo: 'success', texto: 'Asignación guardada con éxito.' });
      // Limpiar formulario tras éxito
      setSelectedUser(null);
      setSearchQuery('');
    } else {
      setMensaje({ tipo: 'error', texto: result.error || 'Ocurrió un error.' });
    }
    
    setGuardando(false);
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSearchQuery(getNombreCompleto(user));
    setShowDropdown(false);
  };

  const canSubmit = Boolean(selectedUser && servicioActivoId && !guardando);

  const inputStyle = {
    width: '100%', padding: '14px', borderRadius: 12, border: `1px solid ${PA.line}`,
    background: '#fff', fontSize: 15, color: PA.ink, fontWeight: 600, marginTop: 6,
    appearance: 'none', outline: 'none', boxSizing: 'border-box'
  };

  // Desktop (R18): vista raíz del menú (sin volver). El mismo formulario
  // (búsqueda, selección, confirmación y mensajes) en una página angosta. Sin la
  // capa fija transparente del móvil para cerrar la lista: taparía el menú
  // lateral; la cierra el mismo listener de clic afuera (searchWrapperRef).
  if (esDesktop) {
    const conMensaje = Boolean(mensaje.texto);
    return (
      <>
        <EncabezadoDesktop titulo="Asignación de Funcionarios" subtitulo="Asocia a un nuevo funcionario para que forme parte de tu servicio." />
        <PaginaDesktop ancho="angosto">
          {conMensaje && (
            <AvisoDesktop tono={mensaje.tipo === 'success' ? 'exito' : 'alerta'}>
              <span role={mensaje.tipo === 'success' ? 'status' : 'alert'}>{mensaje.texto}</span>
            </AvisoDesktop>
          )}
          <PanelDesktop titulo="Nueva asignación" icono="user-plus" iconoColor="#B45309" iconoFondo="#FDF3E3" className="sgt-dg-panel-abierto">
            <div className="sgt-d-formulario">
              <BusquedaFuncionarioDesktop
                id="buscar-funcionario"
                listaId="lista-funcionarios"
                etiqueta={<>1. Buscar Funcionario {loadingDatos && <span style={{ textTransform: 'none', fontWeight: 600, color: 'var(--ink3)' }}>(Cargando...)</span>}</>}
                placeholder="Nombre o RUT del funcionario..."
                maxLength={MAX_SEARCH_LENGTH}
                valor={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setShowDropdown(true)}
                onCerrar={() => setShowDropdown(false)}
                disabled={loadingDatos || !servicioActivoId}
                abierto={dropdownVisible}
                wrapperRef={searchWrapperRef}
                vacio="No se encontraron funcionarios con ese nombre o RUT"
                ayuda={searchQuery.length > 0 && searchQuery.length < 2 && (
                  <div className="sgt-d-campo__ayuda">Escribe al menos 2 caracteres para buscar</div>
                )}
                resultados={resultados.map((u, idx) => {
                  const uId = getUserId(u);
                  return {
                    clave: `${uId ?? 'sin-id'}-${idx}`,
                    nombre: getNombreCompleto(u),
                    detalle: `RUT ${maskRut(u.rutCompleto || u.rut)}`,
                    iniciales: getInitials(u.nombre, u.apellidoPaterno),
                    seleccionado: Boolean(selectedUser && getUserId(selectedUser) === uId),
                    onElegir: () => handleSelectUser(u),
                  };
                })}
              />
              <CampoDesktop etiqueta="2. Asignar a Servicio">
                <div className="sgt-dg-solo-lectura">
                  <SGTIcon name="briefcase" size={15} color={PA.ink3} />
                  {servicioActivoNombre}
                </div>
              </CampoDesktop>
              {selectedUser && (
                <div className="sgt-d-formulario__ancho-completo sgt-dg-elegido">
                  <PersonaDesktop
                    nombre={getNombreCompleto(selectedUser)}
                    iniciales={getInitials(selectedUser.nombre, selectedUser.apellidoPaterno)}
                    detalle={`RUT ${maskRut(selectedUser.rutCompleto || selectedUser.rut)}`}
                    fondo="var(--primary)"
                    tinta="#fff"
                  />
                  <span className="sgt-dg-sec" style={{ marginLeft: 'auto' }}>Se asignará a {servicioActivoNombre}</span>
                </div>
              )}
            </div>
            <div className="sgt-dg-pie-form" style={{ marginTop: 14 }}>
              <BotonDesktop
                variante="primario"
                icono="check"
                disabled={!canSubmit}
                aria-disabled={!canSubmit}
                onClick={handleGuardarClick}
                title={!selectedUser ? 'Selecciona un funcionario primero' : ''}
              >
                {guardando ? 'Guardando...' : 'Guardar Asignación'}
              </BotonDesktop>
            </div>
          </PanelDesktop>
        </PaginaDesktop>
        <ConfirmDialog
          open={showConfirm && !!servicioActivoId}
          icon="users" tone="primary"
          title="Confirmar asignación"
          busy={guardando}
          confirmLabel={guardando ? 'Guardando...' : 'Confirmar'}
          onConfirm={handleConfirmar}
          onCancel={() => setShowConfirm(false)}
        >
          ¿Deseas asignar a <strong style={{ color: PA.ink }}>{selectedUser ? getNombreCompleto(selectedUser) : ''}</strong> al servicio{' '}
          <strong style={{ color: PA.ink }}>{servicioActivoNombre}</strong>?
        </ConfirmDialog>
      </>
    );
  }

  return (
    <div className="dash-page-bg" style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'sgtFade .3s ease' }}>
      <TopHeader
        title="Asignación de Funcionarios"
        leftSlot={
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <SGTIcon name="chevron-left" size={24} color={PA.ink} />
          </button>
        }
      />

      <div style={{ flex: 1, padding: '20px 16px', overflow: 'auto' }}>
        <p style={{ color: PA.ink2, fontSize: 14, marginBottom: 24, fontWeight: 600 }}>
          Asocia a un nuevo funcionario para que forme parte de tu servicio.
        </p>

        {mensaje.texto && (
          <div style={{ 
            padding: 12, marginBottom: 16, borderRadius: 10, fontWeight: 700, fontSize: 13,
            background: mensaje.tipo === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: mensaje.tipo === 'success' ? '#065F46' : '#991B1B',
            border: `1px solid ${mensaje.tipo === 'success' ? '#A7F3D0' : '#FECACA'}`
          }}>
            {mensaje.texto}
          </div>
        )}

        {/* 1. BUSCADOR DE FUNCIONARIO */}
        <div style={{ marginBottom: 20 }} ref={searchWrapperRef}>
          <label
          htmlFor="buscar-funcionario" 
          style={{ fontSize: 13, fontWeight: 800, color: PA.ink3 }}>
            1. Buscar Funcionario {loadingDatos && '(Cargando...)'}
          </label>

          <div style={{ position: 'relative' }}>
            <SGTIcon name="search" size={18} color={PA.ink3} style={{ position: 'absolute', left: 14, top: 21, pointerEvents: 'none' }}/>
            <input 
              id = "buscar-funcionario"
              type="search" 
              maxLength={MAX_SEARCH_LENGTH}
              placeholder="Nombre o RUT del funcionario..."
              value={searchQuery}
              disabled={loadingDatos || !servicioActivoId}
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
            
            {/* Dropdown de resultados controlado por dropdownVisible */}
            {dropdownVisible && (
              <div 
                id="lista-funcionarios"
                role="listbox"
                style={{ 
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, background: '#fff', 
                border: `1px solid ${PA.line}`, borderRadius: 12, maxHeight: 200, overflowY: 'auto', 
                zIndex: 10, boxShadow: '0 8px 24px rgba(15,23,42,0.1)' 
              }}>
                {resultados.length > 0 ? resultados.map((u, idx) => {
                  const uId = getUserId(u);
                  const rowKey = `${uId ?? "sin-id"}-${idx}`;
                  const isSelected = selectedUser && getUserId(selectedUser) === uId;
                  return (
                    <div 
                      key={rowKey} 
                      onClick={() => {handleSelectUser(u)}} 
                      aria-selected={isSelected}
                      style={{ 
                        padding: '12px 14px', borderBottom: `1px solid ${PA.line2}`, cursor: 'pointer', 
                        display: 'flex', alignItems: 'center', gap: 10, 
                        background: isSelected ? PA.primarySoft : '#fff',
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
                }
              ) : (
                <div style={{ padding: '16px', fontSize: 13, color: PA.ink3, textAlign: 'center', fontWeight: 600 }}>
                  No se encontraron funcionarios con ese nombre o RUT
                </div>
              )}
            </div>
          )}
        </div>
      </div>

        {/* 2. SERVICIO ACTUAL (Solo lectura) */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3 }}>2. Asignar a Servicio</label>
          <div style={{ 
             width: '100%', padding: '14px', borderRadius: 12, border: `1px solid ${PA.line}`,
             background: '#F8FAFC', fontSize: 15, color: PA.ink, fontWeight: 600, marginTop: 6,
             display: 'flex', alignItems: 'center', gap: 10
          }}>
            <SGTIcon name="briefcase" size={18} color={PA.ink3} />
            {servicioActivoNombre}
          </div>
        </div>

        <button 
          disabled={!canSubmit}
          onClick={handleGuardarClick} 
          aria-disabled={!canSubmit}
          title={!selectedUser ? 'Selecciona un funcionario primero' : ''}
          style={{
            width: '100%', padding: '16px', marginTop: 10,
            background: !canSubmit ? PA.line : PA.primary, 
            color: !canSubmit ? PA.ink3 : '#fff', 
            border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 800, 
            cursor: !canSubmit ? 'not-allowed' : 'pointer',
            boxShadow: !canSubmit ? 'none' : '0 4px 12px rgba(23, 65, 108, 0.2)',
            transition: 'all 0.2s'
          }}>
          {guardando ? 'Guardando...' : 'Guardar Asignación'}
        </button>
      </div>
      {/* Diálogo de confirmación */}
      <ConfirmDialog
        open={showConfirm && !!servicioActivoId}
        icon="users" tone="primary"
        title="Confirmar asignación"
        busy={guardando}
        confirmLabel={guardando ? 'Guardando...' : 'Confirmar'}
        onConfirm={handleConfirmar}
        onCancel={() => setShowConfirm(false)}
      >
        ¿Deseas asignar a <strong style={{ color: PA.ink }}>{selectedUser ? getNombreCompleto(selectedUser) : ''}</strong> al servicio{' '}
        <strong style={{ color: PA.ink }}>{servicioActivoNombre}</strong>?
      </ConfirmDialog>
      {showDropdown && (
        <div onClick={() => setShowDropdown(false)} style={{ position: 'fixed', inset: 0, zIndex: 5 }} />
      )}
    </div>
  );
};

export default AsignacionJerarquiaView;