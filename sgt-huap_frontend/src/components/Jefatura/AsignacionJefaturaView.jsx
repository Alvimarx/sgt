import React, { useState, useEffect } from 'react';
import { SGT_DATA } from '../Admin2/data'; 
import { SGTIcon } from '../Style/UIPrimitives';
import { getFuncionariosSummary, asignarServicio } from '../../services/funcionarioService';
import { useAuth } from '../../context/AuthContext';

// ---------------------------------------------------------------------------
// CONSTANTES Y HELPERS (Homologados de AsignacionView)
// ---------------------------------------------------------------------------
const MAX_SEARCH_LENGTH = 60;

const sanitizeQuery = (raw) =>
    raw.replace(/[<>"'`;]/g, '').slice(0, MAX_SEARCH_LENGTH);

const AsignacionJerarquiaView = ({ onBack }) => {
  const PA = SGT_DATA.PALETTE;
  const auth = useAuth();

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

  // Cargar datos al montar
  useEffect(() => {
    const cargarDatos = async () => {
      setLoadingDatos(true);
      
      if (!servicioActivoId) {
         setMensaje({ tipo: 'error', texto: 'No se encontró un servicio activo en la sesión.' });
         setLoadingDatos(false);
         return;
      }
      
      const resFunc = await getFuncionariosSummary();
      
      if (resFunc.success) {
        setFuncionarios(Array.isArray(resFunc.data) ? resFunc.data : []);
      } else {
        setMensaje({ tipo: 'error', texto: resFunc.error || 'Error al cargar los funcionarios.' });
      }
      
      setLoadingDatos(false);
    };

    cargarDatos();
  }, [servicioActivoId]);
  
  // ---------------------------------------------------------------------------
  // BÚSQUEDA Y FILTRADO (Idéntico a AsignacionView)
  // ---------------------------------------------------------------------------
  const resultados = (() => {
      const query = sanitizeQuery(searchQuery).toLowerCase().trim();
      // Retornar vacío si no hay al menos 2 caracteres
      if (query.length < 2) return [];

      return funcionarios.filter((u) => {
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

  const handleSearchChange = (e) => {
      const sanitized = sanitizeQuery(e.target.value);
      setSearchQuery(sanitized);
      setShowDropdown(true);
      if (sanitized === '') setSelectedUser(null);
  };

  const handleGuardar = async () => {
    if (!selectedUser || !servicioActivoId) {
      setMensaje({ tipo: 'error', texto: 'Debes seleccionar un funcionario y tener un servicio activo.' });
      return;
    }

    setGuardando(true);
    setMensaje({ tipo: '', texto: '' });

    // 1. Extraemos el RUT en lugar del ID numérico (igual que en AsignacionView)
    const rutFuncionario = selectedUser.rutCompleto || selectedUser.rut || '';
    
    // 2. Nos aseguramos de que el ID del servicio sea numérico
    const servicioIdNum = Number(servicioActivoId);

    // 3. Respetamos el orden de la función: (servicioId, rut)
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

  const inputStyle = {
    width: '100%', padding: '14px', borderRadius: 12, border: `1px solid ${PA.line}`,
    background: '#fff', fontSize: 15, color: PA.ink, fontWeight: 600, marginTop: 6,
    appearance: 'none', outline: 'none', boxSizing: 'border-box'
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtFade .3s ease' }}>
      <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
          <SGTIcon name="chevron-left" size={24} color={PA.ink} />
        </button>
        <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink }}>Asignación</div>
      </div>

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
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3 }}>
            1. Buscar Funcionario {loadingDatos && '(Cargando...)'}
          </label>
          <div style={{ position: 'relative' }}>
            <SGTIcon name="search" size={18} color={PA.ink3} style={{ position: 'absolute', left: 14, top: 21, pointerEvents: 'none' }}/>
            <input 
              type="text" 
              maxLength={MAX_SEARCH_LENGTH}
              placeholder="Nombre o RUT del funcionario..."
              value={searchQuery}
              disabled={loadingDatos || !servicioActivoId}
              onChange={handleSearchChange}
              onFocus={() => setShowDropdown(true)}
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
              <div style={{ 
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, background: '#fff', 
                border: `1px solid ${PA.line}`, borderRadius: 12, maxHeight: 200, overflowY: 'auto', 
                zIndex: 10, boxShadow: '0 8px 24px rgba(15,23,42,0.1)' 
              }}>
                {resultados.length > 0 ? resultados.map((u, i) => {
                  const uId = u.idFuncionario || u.id || `f_${i}`;
                  return (
                    <div key={uId} onClick={() => {
                      setSelectedUser(u);
                      setSearchQuery(`${u.nombre || ''} ${u.apellidoPaterno || ''}`.trim());
                      setShowDropdown(false);
                    }} style={{ 
                      padding: '12px 14px', borderBottom: `1px solid ${PA.line2}`, cursor: 'pointer', 
                      display: 'flex', alignItems: 'center', gap: 10, 
                      background: selectedUser && (selectedUser.idFuncionario || selectedUser.id) === uId ? PA.primarySoft : '#fff'
                    }}>
                      <div style={{ width: 28, height: 28, borderRadius: 99, background: PA.primary, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>
                        {(u.nombre || 'U').charAt(0)}{(u.apellidoPaterno || '').charAt(0)}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: selectedUser && (selectedUser.idFuncionario || selectedUser.id) === uId ? 800 : 600, color: PA.ink }}>
                        {u.nombre} {u.apellidoPaterno} <span style={{ fontSize: 12, color: PA.ink3, fontWeight: 500 }}>· {u.rut || u.rutCompleto || ''}</span>
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
          disabled={!selectedUser || !servicioActivoId || guardando}
          onClick={handleGuardar} 
          style={{
            width: '100%', padding: '16px', marginTop: 10,
            background: (!selectedUser || !servicioActivoId) ? PA.line : PA.primary, 
            color: (!selectedUser || !servicioActivoId) ? PA.ink3 : '#fff', 
            border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 800, 
            cursor: (!selectedUser || !servicioActivoId || guardando) ? 'not-allowed' : 'pointer',
            boxShadow: (!selectedUser || !servicioActivoId) ? 'none' : '0 4px 12px rgba(23, 65, 108, 0.2)',
            transition: 'all 0.2s'
          }}>
          {guardando ? 'Guardando...' : 'Guardar Asignación'}
        </button>
      </div>
      
      {showDropdown && (
        <div onClick={() => setShowDropdown(false)} style={{ position: 'fixed', inset: 0, zIndex: 5 }} />
      )}
    </div>
  );
};

export default AsignacionJerarquiaView;