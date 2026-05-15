// JerarquiaView.jsx
import React, { useState } from 'react';
import { SGT_DATA } from './data';
import { SGTIcon, SGTAvatar } from './UIPrimitives';

const JerarquiaView = ({ onBack }) => {
  const PA = SGT_DATA.PALETTE;
  
  // Estados para el buscador
  const [selectedUser, setSelectedUser] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [selectedRole, setSelectedRole] = useState('jefe');
  const [selectedServicio, setSelectedServicio] = useState('urgencia');

  const users = Object.values(SGT_DATA.PEOPLE);

  // Filtramos la lista según lo que se escriba
  const filteredUsers = users.filter(u => 
    u.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3 }}>1. Seleccionar Servicio</label>
          <div style={{ position: 'relative' }}>
            <select style={inputStyle} value={selectedServicio} onChange={e => setSelectedServicio(e.target.value)}>
              <option value="urgencia">Servicio de Urgencias HUAP</option>
              <option value="uci">Unidad de Cuidados Intensivos (UCI)</option>
            </select>
            <SGTIcon name="chevron-down" size={16} color={PA.ink3} style={{ position: 'absolute', right: 14, top: 20, pointerEvents: 'none' }}/>
          </div>
        </div>

        {/* 2. BUSCADOR DE FUNCIONARIO */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3 }}>2. Buscar Funcionario</label>
          <div style={{ position: 'relative' }}>
            <SGTIcon name="search" size={18} color={PA.ink3} style={{ position: 'absolute', left: 14, top: 21, pointerEvents: 'none' }}/>
            <input 
              type="text" 
              placeholder="Ej: Carmen Valdés..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
                if (e.target.value === '') setSelectedUser('');
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
                {filteredUsers.length > 0 ? filteredUsers.map(u => (
                  <div key={u.id} onClick={() => {
                    setSelectedUser(u.id);
                    setSearchQuery(u.nombre);
                    setShowDropdown(false);
                  }} style={{ 
                    padding: '12px 14px', borderBottom: `1px solid ${PA.line2}`, cursor: 'pointer', 
                    display: 'flex', alignItems: 'center', gap: 10, background: selectedUser === u.id ? PA.primarySoft : '#fff'
                  }}>
                    <SGTAvatar person={u} size={26} />
                    <div style={{ fontSize: 14, fontWeight: selectedUser === u.id ? 800 : 600, color: PA.ink }}>
                      {u.nombre} <span style={{ fontSize: 12, color: PA.ink3, fontWeight: 500 }}>· {u.rol}</span>
                    </div>
                  </div>
                )) : (
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
              Jefe Titular
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
          disabled={!selectedUser}
          onClick={() => { alert('Jefatura designada con éxito.'); onBack(); }} 
          style={{
            width: '100%', padding: '16px', background: selectedUser ? PA.ink : PA.line, 
            color: selectedUser ? '#fff' : PA.ink3, border: 'none', borderRadius: 14, 
            fontSize: 16, fontWeight: 800, cursor: selectedUser ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s'
          }}>
          {selectedUser ? 'Designar Autoridad' : 'Selecciona un funcionario'}
        </button>
      </div>

      {/* Overlay invisible para cerrar el menú si haces clic afuera */}
      {showDropdown && (
        <div onClick={() => setShowDropdown(false)} style={{ position: 'fixed', inset: 0, zIndex: 5 }} />
      )}
    </div>
  );
};

export default JerarquiaView;