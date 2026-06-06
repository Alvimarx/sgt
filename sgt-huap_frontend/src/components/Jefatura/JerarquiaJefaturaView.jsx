import React, { useEffect, useState } from 'react';
import { SGT_DATA } from '../Admin2/data';
import { SGTIcon, SGTAvatar } from '../Style/UIPrimitives';
// Eliminamos getServicios ya que usaremos el servicio activo de la sesión
import { getFuncionariosSummary, asignarRolJerarquia } from '../../services/funcionarioService';
import { useAuth } from '../../context/AuthContext'; // Añadido para acceder al contexto si es necesario

const JerarquiaJefaturaView = ({ onBack }) => {
  const PA = SGT_DATA.PALETTE;
  const auth = useAuth(); // Hook de tu contexto

  // 1. OBTENER DATOS DE SESIÓN (Priorizando AuthContext y respaldando con localStorage)
  // Ajusta 'userData' si la llave en tu localStorage tiene otro nombre
  const storedUserData = localStorage.getItem('userData') || localStorage.getItem('user');
  const userData = auth?.user || (storedUserData ? JSON.parse(storedUserData) : {});
  
  const servicioActivoId = userData?.servicioId || null;
  // Usamos el nombre del userData o la llave específica que guardas en Prop4.jsx
  const servicioActivoNombre = userData?.servicioNombre || localStorage.getItem("sgt_servicio_activo_nombre") || 'Servicio Actual';

  const [funcionarios, setFuncionarios] = useState([]);
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  
  // Estados para el buscador
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Estados de selección
  const [selectedRole, setSelectedRole] = useState('jefe');

  useEffect(() => {
    const cargarDatos = async () => {
      setLoadingDatos(true);
      
      if (!servicioActivoId) {
         setMensaje({ tipo: 'error', texto: 'No se encontró un servicio activo en la sesión.' });
         setLoadingDatos(false);
         return;
      }
      
      // 2. FILTRAR FUNCIONARIOS POR SERVICIO
      const resFunc = await getFuncionariosSummary(servicioActivoId);
      
      if (resFunc.success) {
        setFuncionarios(Array.isArray(resFunc.data) ? resFunc.data : []);
      } else {
        setMensaje({ tipo: 'error', texto: resFunc.error || 'Error al cargar los funcionarios.' });
      }
      
      setLoadingDatos(false);
    };

    cargarDatos();
  }, [servicioActivoId]);

  // Filtrar usando los datos reales del backend
  const filteredUsers = funcionarios.filter(u => {
    const nombreCompleto = `${u.nombre || ''} ${u.apellidoPaterno || ''}`.toLowerCase();
    return nombreCompleto.includes(searchQuery.toLowerCase());
  });

  const handleGuardar = async () => {
    if (!selectedUser || !servicioActivoId) {
      setMensaje({ tipo: 'error', texto: 'Debes seleccionar un funcionario y tener un servicio activo.' });
      return;
    }

    setGuardando(true);
    setMensaje({ tipo: '', texto: '' });

    const idRolReal = selectedRole === 'jefe' ? 1 : 2; 
    const idFunc = selectedUser.idFuncionario || selectedUser.id;

    // Usamos el servicioActivoId obtenido de la sesión
    const result = await asignarRolJerarquia(idFunc, servicioActivoId, idRolReal);

    if (result.success) {
      setMensaje({ tipo: 'success', texto: 'Jerarquía designada con éxito.' });
    } else {
      setMensaje({ tipo: 'error', texto: result.error || 'Ocurrió un error al designar la jerarquía.' });
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
        <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink }}>Jerarquía</div>
      </div>

      <div style={{ flex: 1, padding: '20px 16px', overflow: 'auto' }}>
        <p style={{ color: PA.ink2, fontSize: 14, marginBottom: 24, fontWeight: 600 }}>
          Designa quién es la jefatura oficial de tu servicio actual o nombra a un subrogante temporal.
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

        {/* 2. BUSCADOR DE FUNCIONARIO (Ya filtrados por servicio) */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3 }}>
            2. Buscar Funcionario {loadingDatos && '(Cargando...)'}
          </label>
          <div style={{ position: 'relative' }}>
            <SGTIcon name="search" size={18} color={PA.ink3} style={{ position: 'absolute', left: 14, top: 21, pointerEvents: 'none' }}/>
            <input 
              type="text" 
              placeholder="Ej: Carmen Valdés..."
              value={searchQuery}
              disabled={loadingDatos || !servicioActivoId}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
                if (e.target.value === '') setSelectedUser(null);
              }}
              onFocus={() => setShowDropdown(true)}
              style={{ ...inputStyle, paddingLeft: 42 }}
            />
            
            {/* Menú desplegable del buscador */}
            {showDropdown && (
              <div style={{ 
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, background: '#fff', 
                border: `1px solid ${PA.line}`, borderRadius: 12, maxHeight: 200, overflowY: 'auto', 
                zIndex: 10, boxShadow: '0 8px 24px rgba(15,23,42,0.1)' 
              }}>
                {filteredUsers.length > 0 ? filteredUsers.map((u, i) => {
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
                        {(u.nombre || 'U').charAt(0)}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: selectedUser && (selectedUser.idFuncionario || selectedUser.id) === uId ? 800 : 600, color: PA.ink }}>
                        {u.nombre} {u.apellidoPaterno} <span style={{ fontSize: 12, color: PA.ink3, fontWeight: 500 }}>· {u.rut || ''}</span>
                      </div>
                    </div>
                  );
                }) : (
                  <div style={{ padding: '16px', fontSize: 13, color: PA.ink3, textAlign: 'center', fontWeight: 600 }}>
                    No se encontraron resultados en este servicio
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

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
          disabled={!selectedUser || !servicioActivoId || guardando}
          onClick={handleGuardar} 
          style={{
            width: '100%', padding: '16px', 
            background: (!selectedUser || !servicioActivoId) ? PA.line : PA.ink, 
            color: (!selectedUser || !servicioActivoId) ? PA.ink3 : '#fff', 
            border: 'none', borderRadius: 14, 
            fontSize: 16, fontWeight: 800, 
            cursor: (!selectedUser || !servicioActivoId || guardando) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}>
          {guardando ? 'Guardando...' : (!selectedUser ? 'Selecciona un funcionario' : 'Designar Autoridad')}
        </button>
      </div>

      {showDropdown && (
        <div onClick={() => setShowDropdown(false)} style={{ position: 'fixed', inset: 0, zIndex: 5 }} />
      )}
    </div>
  );
};

export default JerarquiaJefaturaView;