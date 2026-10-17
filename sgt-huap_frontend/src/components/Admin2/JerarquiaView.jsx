// JerarquiaView.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SGT_DATA } from './data';
import { SGTIcon, TopHeader, ConfirmDialog } from '../Style/UIPrimitives';
import { getServicios } from '../../services/servicioService';
import { getFuncionariosSummary, asignarRolJerarquia } from '../../services/funcionarioService';
import { useLayout } from '../../layout/layout';
import { EncabezadoDesktop, PaginaDesktop, PanelDesktop, CampoDesktop, BotonDesktop } from '../Desktop/ui';
import { BusquedaFuncionarioDesktop } from '../Desktop/gestion/BusquedaFuncionarioDesktop';
import { AvisoMantenedorDesktop, OpcionesTarjetaDesktop, PersonasNivelDesktop } from '../Desktop/admin/PiezasMantenedoresDesktop';

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
    const clean = rut.replace(/[^0-9kK-]/g, '');
    if (clean.length < 5) return '***';
    return `***${clean.slice(-5)}`;
};

// ---------------------------------------------------------------------------
// VISTA PRINCIPAL
// ---------------------------------------------------------------------------
const JerarquiaView = ({ onBack }) => {
  const PA = SGT_DATA.PALETTE;
  const { esDesktop } = useLayout();

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

  // Desktop: la "Jerarquía actual" se arma con los datos cargados al abrir la
  // vista, que no se vuelven a pedir. Tras una designación exitosa se avisa
  // que no la incluye. En móvil no se dibuja.
  const [designoEnLaVisita, setDesignoEnLaVisita] = useState(false);
  useEffect(() => {
      if (mensaje.tipo === 'success') setDesignoEnLaVisita(true);
  }, [mensaje.tipo]);

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

  // ---------------------------------------------------------------------------
  // DESKTOP (R18): vista raíz del menú (sin volver). Los mismos tres pasos
  // (servicio, buscador con la misma regla de 2 caracteres y el RUT
  // enmascarado, y nivel) en un panel, y al lado la jerarquía actual del
  // servicio elegido; la misma confirmación y los mismos mensajes.
  // ---------------------------------------------------------------------------
  if (esDesktop) {
    const nombreServicio = servicioSeleccionado?.nombreServicio || servicioSeleccionado?.nombre;
    // Jerarquía actual del servicio elegido, armada con los funcionarios que la
    // vista ya cargó (sin llamadas nuevas), como la vista previa de Jerarquía
    // del servicio de jefatura. Solo cuentan los roles asignados en el
    // servicio: a los administradores del sistema el backend los informa como
    // JEFATURA en todos los servicios, sin rol de servicio (idRolServicio null).
    const relEnServicio = (u) => (u?.servicios || []).find(
      (s) => String(s.idServicio) === String(selectedServicioId) && s.idRolServicio != null,
    );
    const miembros = selectedServicioId ? funcionarios.filter((u) => relEnServicio(u)) : [];
    const conRol = (patron) => miembros
      .filter((u) => patron.test(relEnServicio(u)?.rolServicioNombre || ''))
      .map((u) => ({ clave: String(getUserId(u)), nombre: getNombreCompleto(u) }));
    const jefaturas = conRol(/JEF/i);
    const subrogantes = conRol(/SUBROG/i);
    const nivel = selectedRole === 'jefe' ? 'Jefatura' : 'Subrogante';
    const rolActual = selectedUser ? relEnServicio(selectedUser)?.rolServicioNombre : null;
    const ETIQUETA_ROL = { JEFATURA: 'Jefatura', SUBROGANTE: 'Subrogante', MEDICO: 'Médico' };
    return (
      <>
        <EncabezadoDesktop titulo="Jerarquía de Funcionarios" subtitulo="Designa quién es la jefatura oficial de un servicio o nombra a un subrogante temporal." />
        <PaginaDesktop ancho="medio">
          {errorCarga && <AvisoMantenedorDesktop tono="alerta" icono="alert">{errorCarga}</AvisoMantenedorDesktop>}
          {mensaje.texto && (
            <AvisoMantenedorDesktop
              tono={mensaje.tipo === 'success' ? 'exito' : 'alerta'}
              icono={mensaje.tipo === 'success' ? 'check-circle' : 'alert'}
              rol={mensaje.tipo === 'success' ? 'status' : 'alert'}
              onCerrar={() => setMensaje({ tipo: '', texto: '' })}
            >
              {mensaje.texto}
            </AvisoMantenedorDesktop>
          )}
          <div className="sgt-da-mant-columnas">
            <PanelDesktop titulo="Designar autoridad" icono="org-chart" iconoColor="#6D28D9" iconoFondo="#EFEAFB" className="sgt-da-mant-abierto">
              <div className="sgt-d-formulario">
                <CampoDesktop etiqueta="1. Seleccionar Servicio" htmlFor="select-servicio">
                  <select
                    id="select-servicio"
                    className="sgt-d-select"
                    value={selectedServicioId}
                    onChange={e => setSelectedServicioId(e.target.value)}
                    disabled={loadingDatos || servicios.length === 0}
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
                </CampoDesktop>
                <BusquedaFuncionarioDesktop
                  id="buscar-funcionario"
                  listaId="lista-funcionarios"
                  etiqueta={<>2. Buscar Funcionario {loadingDatos && <span className="sgt-da-mant-sec" style={{ textTransform: 'none', letterSpacing: 0 }}>(Cargando…)</span>}</>}
                  placeholder="Nombre o RUT del funcionario"
                  maxLength={MAX_SEARCH_LENGTH}
                  valor={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => setShowDropdown(true)}
                  onCerrar={() => setShowDropdown(false)}
                  disabled={loadingDatos}
                  abierto={dropdownVisible}
                  wrapperRef={searchWrapperRef}
                  vacio="No se encontraron funcionarios con ese nombre o RUT"
                  ayuda={searchQuery.length > 0 && searchQuery.length < 2 && (
                    <div className="sgt-d-campo__ayuda">Escribe al menos 2 caracteres para buscar</div>
                  )}
                  resultados={resultados.map((u, i) => {
                    const uId = getUserId(u);
                    return {
                      clave: `${uId ?? 'sin-id'}-${i}`,
                      nombre: getNombreCompleto(u),
                      detalle: `RUT ${maskRut(u.rutCompleto || u.rut)}`,
                      iniciales: getInitials(u.nombre, u.apellidoPaterno),
                      seleccionado: Boolean(selectedUser && getUserId(selectedUser) === uId),
                      onElegir: () => handleSelectUser(u),
                    };
                  })}
                />
                <div className="sgt-d-campo sgt-d-formulario__ancho-completo">
                  <span className="sgt-d-campo__etiqueta" id="nivel-jerarquia">3. Nivel de Jerarquía</span>
                  <OpcionesTarjetaDesktop
                    nombre="nivel-jerarquia"
                    etiquetadoPor="nivel-jerarquia"
                    valor={selectedRole}
                    onCambiar={setSelectedRole}
                    opciones={[
                      { id: 'jefe', titulo: 'Jefatura', descripcion: 'Jefatura oficial del servicio.' },
                      { id: 'subrogante', titulo: 'Subrogante', descripcion: 'Reemplaza a la jefatura de forma temporal.' },
                    ]}
                  />
                </div>
              </div>
              <div className="sgt-da-mant-pie" style={{ marginTop: 14 }}>
                <span className="sgt-da-mant-pie__nota">
                  {selectedUser && selectedServicioId ? (
                    <>
                      Se designará a <strong>{getNombreCompleto(selectedUser)}</strong> como <strong>{nivel}</strong> de <strong>{nombreServicio}</strong>.
                      {' '}{rolActual ? `Hoy es ${ETIQUETA_ROL[String(rolActual).toUpperCase()] || rolActual} en el servicio.` : 'Hoy no tiene rol en el servicio.'}
                    </>
                  ) : 'Elige el servicio y el funcionario para designar.'}
                </span>
                <BotonDesktop
                  variante="primario"
                  icono="crown"
                  onClick={handleGuardarClick}
                  disabled={!canSubmit}
                  aria-disabled={!canSubmit}
                  title={!selectedUser ? 'Selecciona un funcionario primero' : !selectedServicioId ? 'Selecciona un servicio primero' : ''}
                >
                  {guardando ? 'Guardando...' : 'Designar Autoridad'}
                </BotonDesktop>
              </div>
            </PanelDesktop>

            <PanelDesktop
              titulo="Jerarquía actual"
              subtitulo={nombreServicio || 'Elige un servicio'}
              icono="crown"
              iconoColor="#B45309"
              iconoFondo="#FDF3E3"
            >
              {loadingDatos ? (
                <div className="sgt-da-mant-niveles" aria-busy="true">
                  {[0, 1, 2].map((i) => <div key={i} className="sgt-d-cargando" style={{ height: 30 }} />)}
                </div>
              ) : !selectedServicioId ? (
                <div className="sgt-da-mant-vacio-paso">
                  <SGTIcon name="org-chart" size={15} color="var(--ink3)" />
                  Elige un servicio para ver su jefatura y sus subrogantes actuales.
                </div>
              ) : (
                <div className="sgt-da-mant-niveles">
                  <PersonasNivelDesktop
                    titulo={`Jefatura (${jefaturas.length})`}
                    icono="crown"
                    nivel="jefatura"
                    personas={jefaturas}
                    vacio="Sin jefatura designada"
                  />
                  <PersonasNivelDesktop
                    titulo={`Subrogantes (${subrogantes.length})`}
                    icono="shield-check"
                    nivel="subrogante"
                    personas={subrogantes}
                    vacio="Sin subrogante designado"
                  />
                  <div>
                    <div className="sgt-da-mant-nivel__cabecera">
                      <SGTIcon name="users" size={13} color="var(--ink3)" strokeWidth={2.2} />
                      <span className="sgt-da-mant-nivel__titulo">Funcionarios</span>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{miembros.length} en el servicio</div>
                  </div>
                  {designoEnLaVisita && (
                    <AvisoMantenedorDesktop tono="aviso" icono="history" rol="note">
                      Muestra la jerarquía como estaba al abrir esta pantalla. Lo que designaste se verá al volver a entrar.
                    </AvisoMantenedorDesktop>
                  )}
                </div>
              )}
            </PanelDesktop>
          </div>
        </PaginaDesktop>

        <ConfirmDialog
          open={showConfirm && !!servicioSeleccionado && !!selectedUser}
          icon="org-chart" tone="primary"
          title="Confirmar jerarquía"
          busy={guardando}
          confirmLabel={guardando ? 'Guardando...' : 'Confirmar'}
          onConfirm={handleConfirmar}
          onCancel={() => setShowConfirm(false)}
        >
          ¿Deseas designar a <strong style={{ color: PA.ink }}>{selectedUser ? getNombreCompleto(selectedUser) : ''}</strong> como{' '}
          <strong style={{ color: PA.ink }}>{selectedRole === 'jefe' ? 'Jefatura' : 'Subrogante'}</strong> del servicio{' '}
          <strong style={{ color: PA.ink }}>{servicioSeleccionado?.nombreServicio || servicioSeleccionado?.nombre}</strong>?
        </ConfirmDialog>
      </>
    );
  }

  return (
    <div className="dash-page-bg" style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'sgtFade .3s ease' }}>

      {/* Header */}
      <TopHeader
        title="Jerarquía de Funcionarios"
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
      <ConfirmDialog
        open={showConfirm && !!servicioSeleccionado && !!selectedUser}
        icon="org-chart" tone="primary"
        title="Confirmar jerarquía"
        busy={guardando}
        confirmLabel={guardando ? 'Guardando...' : 'Confirmar'}
        onConfirm={handleConfirmar}
        onCancel={() => setShowConfirm(false)}
      >
        ¿Deseas designar a <strong style={{ color: PA.ink }}>{selectedUser ? getNombreCompleto(selectedUser) : ''}</strong> como{' '}
        <strong style={{ color: PA.ink }}>{selectedRole === 'jefe' ? 'Jefatura' : 'Subrogante'}</strong> del servicio{' '}
        <strong style={{ color: PA.ink }}>{servicioSeleccionado?.nombreServicio || servicioSeleccionado?.nombre}</strong>?
      </ConfirmDialog>
    </div>
  );
};

export default JerarquiaView;