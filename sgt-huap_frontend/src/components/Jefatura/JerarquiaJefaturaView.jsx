// JerarquiaJefaturaView.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SGT_DATA } from '../Admin2/data';
import { SGTIcon, TopHeader, IconBadge3D, ConfirmDialog } from '../Style/UIPrimitives';
import { getFuncionariosSummary, asignarRolJerarquia } from '../../services/funcionarioService';
import { useAuth } from '../../context/AuthContext';

// ---------------------------------------------------------------------------
// CONSTANTES Y HELPERS (Importados de AsignacionView)
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
// VISTA PREVIA DE JERARQUÍA
// Agrupación puramente presentacional de la misma lista de funcionarios ya
// obtenida (getFuncionariosSummary): no hay una nueva llamada ni un campo
// nuevo, solo se agrupan por el rol que cada uno ya tiene en este servicio
// (mismo criterio que usa "Personal del Servicio" para sus badges de rol).
// ---------------------------------------------------------------------------
const JerarquiaPreview = ({ jefe, subrogantes, totalFuncionarios, PA }) => (
    <div style={{ background: '#fff', border: `1px solid ${PA.line}`, borderRadius: 16, padding: 16, marginBottom: 22, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: PA.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Jerarquía actual del servicio
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconBadge3D icon="crown" theme="amber" size={36} iconSize={17} radius={10} />
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: PA.ink3, textTransform: 'uppercase' }}>Jefatura</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: PA.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {jefe ? getNombreCompleto(jefe) : 'Sin jefatura designada'}
                </div>
            </div>
        </div>

        <div style={{ marginLeft: 17, width: 1, height: 16, background: PA.line }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconBadge3D icon="shield-check" theme="blue" size={36} iconSize={17} radius={10} />
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: PA.ink3, textTransform: 'uppercase' }}>
                    Subrogante{subrogantes.length !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: PA.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {subrogantes.length > 0 ? subrogantes.map(getNombreCompleto).join(', ') : 'Sin subrogante designado'}
                </div>
            </div>
        </div>

        <div style={{ marginLeft: 17, width: 1, height: 16, background: PA.line }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconBadge3D icon="users" theme="green" size={36} iconSize={17} radius={10} />
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: PA.ink3, textTransform: 'uppercase' }}>Funcionarios</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: PA.ink }}>{totalFuncionarios} en el servicio</div>
            </div>
        </div>
    </div>
);

// ---------------------------------------------------------------------------
// VISTA PRINCIPAL
// ---------------------------------------------------------------------------
const JerarquiaJefaturaView = ({ onBack }) => {
  const PA = SGT_DATA.PALETTE;
  const auth = useAuth();

  // 1. OBTENER DATOS DE SESIÓN
  const storedUserData = localStorage.getItem('userData') || localStorage.getItem('user');
  const userData = auth?.user || (storedUserData ? JSON.parse(storedUserData) : {});
  
  const servicioActivoId = userData?.servicioId || null;
  const servicioActivoNombre = userData?.servicioNombre || localStorage.getItem("sgt_servicio_activo_nombre") || 'Servicio Actual';

  const [funcionarios, setFuncionarios] = useState([]);
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

  // ---------------------------------------------------------------------------
  // EFECTOS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const cargarDatos = async () => {
      setLoadingDatos(true);
      setErrorCarga('');
      
      if (!servicioActivoId) {
         setErrorCarga('No se encontró un servicio activo en la sesión.');
         setLoadingDatos(false);
         return;
      }
      
      const resFunc = await getFuncionariosSummary(servicioActivoId);
      
      if (!mounted) return;

      if (resFunc.success) {
        setFuncionarios(Array.isArray(resFunc.data) ? resFunc.data : []);
      } else {
        setErrorCarga(resFunc.error || 'Error al cargar los funcionarios.');
      }
      
      setLoadingDatos(false);
    };

    cargarDatos();
    return () => { mounted = false; };
  }, [servicioActivoId]);

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

  // Rol de cada funcionario en el servicio activo (mismo criterio que
  // "Personal del Servicio" usa para sus badges de rol) — solo para
  // agrupar visualmente, no dispara ninguna llamada nueva.
  const rolEnServicioActivo = (u) => {
    const rel = u.servicios?.find(s => Number(s.idServicio) === Number(servicioActivoId));
    return (rel?.rolServicioNombre || '').toLowerCase();
  };
  const jefeActual = funcionarios.find(u => rolEnServicioActivo(u).includes('jefe'));
  const subrogantesActuales = funcionarios.filter(u => rolEnServicioActivo(u).includes('subrogante'));

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
    if (!selectedUser || !servicioActivoId) return;
    setShowConfirm(true);
  };

  const handleConfirmar = async () => {
    if (!selectedUser || !servicioActivoId) return;

    setGuardando(true);
    setShowConfirm(false);

    const idRolReal = selectedRole === 'jefe' ? 1 : 2; 
    const idFunc = selectedUser.idFuncionario || selectedUser.id || selectedUser.rutCompleto;

    const result = await asignarRolJerarquia(idFunc, servicioActivoId, idRolReal);

    if (result.success) {
      setMensaje({ tipo: 'success', texto: 'Jerarquía designada con éxito.' });
      setSelectedUser(null);
      setSearchQuery('');
    } else {
      setMensaje({ tipo: 'error', texto: result.error || 'Ocurrió un error al designar la jerarquía.' });
    }
    
    setGuardando(false);
  };

  const canSubmit = Boolean(selectedUser && servicioActivoId && !guardando);

  // ---------------------------------------------------------------------------
  // ESTILOS
  // ---------------------------------------------------------------------------
  const inputStyle = {
    width: '100%', padding: '14px', borderRadius: 12, border: `1px solid ${PA.line}`,
    background: '#fff', fontSize: 15, color: PA.ink, fontWeight: 600, marginTop: 6,
    appearance: 'none', outline: 'none', boxSizing: 'border-box'
  };

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
          Designa quién es la jefatura oficial de tu servicio actual o nombra a un subrogante temporal.
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

        {/* Vista previa de la jerarquía actual */}
        {!loadingDatos && !errorCarga && servicioActivoId && (
          <JerarquiaPreview
            jefe={jefeActual}
            subrogantes={subrogantesActuales}
            totalFuncionarios={funcionarios.length}
            PA={PA}
          />
        )}

        {/* 1. SERVICIO ACTUAL (Vista solo lectura) */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3 }}>1. Servicio Activo</label>
          <div style={{ 
             width: '100%', padding: '14px', borderRadius: 12, border: `1px solid ${PA.line}`,
             background: '#F8FAFC', fontSize: 15, color: PA.ink, fontWeight: 600, marginTop: 6,
             display: 'flex', alignItems: 'center', gap: 10
          }}>
            <SGTIcon name="briefcase" size={18} color={PA.ink3} />
            {servicioActivoNombre}
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
              disabled={loadingDatos || !servicioActivoId}
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
                    No se encontraron funcionarios en este servicio
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
          title={!selectedUser ? 'Selecciona un funcionario primero' : !servicioActivoId ? 'Debes tener un servicio activo' : ''}
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
        open={showConfirm && !!selectedUser}
        icon="org-chart" tone="primary"
        title="Confirmar jerarquía"
        busy={guardando}
        confirmLabel={guardando ? 'Guardando...' : 'Confirmar'}
        onConfirm={handleConfirmar}
        onCancel={() => setShowConfirm(false)}
      >
        ¿Deseas designar a <strong style={{ color: PA.ink }}>{selectedUser ? getNombreCompleto(selectedUser) : ''}</strong> como{' '}
        <strong style={{ color: PA.ink }}>{selectedRole === 'jefe' ? 'Jefatura' : 'Subrogante'}</strong> de{' '}
        <strong style={{ color: PA.ink }}>{servicioActivoNombre}</strong>?
      </ConfirmDialog>
    </div>
  );
};

export default JerarquiaJefaturaView;