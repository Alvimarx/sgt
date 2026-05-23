// JerarquiaView.jsx
import React, { useEffect, useState } from 'react';
import { SGT_DATA } from './data';
import { SGTIcon, SGTAvatar } from './UIPrimitives';
import { getServicios } from '../../services/servicioService';
import { getFuncionariosSummary, asignarRolJerarquia } from '../../services/funcionarioService';

const JerarquiaView = ({ onBack }) => {
  const PA = SGT_DATA.PALETTE;

  const [funcionarios, setFuncionarios] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  
  // Estados para el buscador
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Estados de selección
  const [selectedRole, setSelectedRole] = useState('jefe');
  const [selectedServicio, setSelectedServicio] = useState(''); // Ahora inicia vacío

  useEffect(() => {
    const cargarDatos = async () => {
      setLoadingDatos(true);
      
      const [resServ, resFunc] = await Promise.all([
        getServicios(),
        getFuncionariosSummary() 
      ]);
      
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
      }

      if (resFunc.success) {
        setFuncionarios(Array.isArray(resFunc.data) ? resFunc.data : []);
      }
      
      setLoadingDatos(false);
    };

    cargarDatos();
  }, []);

  // Filtrar usando los datos reales del backend
  const filteredUsers = funcionarios.filter(u => {
    const nombreCompleto = `${u.nombre || ''} ${u.apellidoPaterno || ''}`.toLowerCase();
    return nombreCompleto.includes(searchQuery.toLowerCase());
  });

  const handleGuardar = async () => {
    if (!selectedUser || !selectedServicio) {
      setMensaje({ tipo: 'error', texto: 'Debes seleccionar un funcionario y un servicio.' });
      return;
    }

    setGuardando(true);
    setMensaje({ tipo: '', texto: '' });

    // IMPORTANTE: Mapea los IDs de los roles según tu base de datos
    // Suponiendo que Jefe Titular es ID 2 y Subrogante es ID 3
    const idRolReal = selectedRole === 'jefe' ? 1 : 2; 
    const idFunc = selectedUser.idFuncionario || selectedUser.id;

    const result = await asignarRolJerarquia(idFunc, selectedServicio, idRolReal);

    if (result.success) {
      setMensaje({ tipo: 'success', texto: 'Jerarquía designada con éxito.' });
      // Opcional: onBack() si quieres que salga automáticamente de la vista
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
          Designa quién es la jefatura oficial de un servicio o nombra a un subrogante temporal.
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

        {/* 1. SELECCIONAR SERVICIO DINÁMICO */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3 }}>1. Seleccionar Servicio</label>
          <div style={{ position: 'relative' }}>
            <select 
              style={inputStyle} 
              value={selectedServicio} 
              onChange={e => setSelectedServicio(e.target.value)}
              disabled={loadingDatos || servicios.length === 0}
            >
              <option value="" disabled>
                {loadingDatos ? 'Cargando servicios...' : 'Seleccione un servicio...'}
              </option>
              {servicios.map((srv, index) => {
                const srvId = srv.idServicio || srv.id || `s_${index}`;
                const srvNombre = srv.nombreServicio || srv.nombre || 'Servicio';
                return <option key={srvId} value={srvId}>{srvNombre}</option>;
              })}
            </select>
            <SGTIcon name="chevron-down" size={16} color={PA.ink3} style={{ position: 'absolute', right: 14, top: 20, pointerEvents: 'none' }}/>
          </div>
        </div>

        {/* 2. BUSCADOR DE FUNCIONARIO */}
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
              disabled={loadingDatos}
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
                      {/* Generar Avatar básico temporal si falla SGTAvatar */}
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
                    No se encontraron resultados
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
          disabled={!selectedUser || !selectedServicio || guardando}
          onClick={handleGuardar} 
          style={{
            width: '100%', padding: '16px', 
            background: (!selectedUser || !selectedServicio) ? PA.line : PA.ink, 
            color: (!selectedUser || !selectedServicio) ? PA.ink3 : '#fff', 
            border: 'none', borderRadius: 14, 
            fontSize: 16, fontWeight: 800, 
            cursor: (!selectedUser || !selectedServicio || guardando) ? 'not-allowed' : 'pointer',
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

export default JerarquiaView;