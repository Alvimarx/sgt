// AsignacionView.jsx
import React, { useState } from 'react';
import { SGT_DATA } from './data';
import { SGTIcon, SGTAvatar } from './UIPrimitives';

const AsignacionView = ({ onBack }) => {
  const PA = SGT_DATA.PALETTE;
  
  // Estados para el buscador
  const [selectedUser, setSelectedUser] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [selectedServicio, setSelectedServicio] = useState('urgencia');
  
  // Estados para la rotativa (turno)
  const [asignarTurno, setAsignarTurno] = useState(false);
  const [selectedRotativa, setSelectedRotativa] = useState('4to_turno');

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
        <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink }}>Asignación</div>
      </div>

      <div style={{ flex: 1, padding: '20px 16px', overflow: 'auto' }}>
        <p style={{ color: PA.ink2, fontSize: 14, marginBottom: 24, fontWeight: 600 }}>
          Asocia a un funcionario con su servicio correspondiente y opcionalmente su rotativa.
        </p>

        {/* 1. BUSCADOR DE FUNCIONARIO */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3 }}>1. Buscar Funcionario</label>
          <div style={{ position: 'relative' }}>
            <SGTIcon name="search" size={18} color={PA.ink3} style={{ position: 'absolute', left: 14, top: 21, pointerEvents: 'none' }}/>
            <input 
              type="text" 
              placeholder="Ej: Jorge Muñoz..."
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

        {/* 2. SERVICIO */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3 }}>2. Asignar a Servicio</label>
          <div style={{ position: 'relative' }}>
            <select style={inputStyle} value={selectedServicio} onChange={e => setSelectedServicio(e.target.value)}>
              <option value="urgencia">Servicio de Urgencias HUAP</option>
              <option value="uci">Unidad de Cuidados Intensivos (UCI)</option>
              <option value="pediatria">Urgencia Pediátrica</option>
            </select>
            <SGTIcon name="chevron-down" size={16} color={PA.ink3} style={{ position: 'absolute', right: 14, top: 20, pointerEvents: 'none' }}/>
          </div>
        </div>

        {/* 3. OPCIONAL: ROTATIVA */}
        <div style={{ marginBottom: 30 }}>
          {!asignarTurno ? (
            <button 
              onClick={() => setAsignarTurno(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                width: '100%', padding: '14px', background: PA.primarySoft, color: PA.primary,
                border: `1px dashed ${PA.primary}`, borderRadius: 12, fontSize: 15, 
                fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <SGTIcon name="plus" size={18} color={PA.primary} />
              ¿Quiere asignar turno?
            </button>
          ) : (
            <div style={{ animation: 'sgtFade .3s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3 }}>3. Tipo de Rotativa</label>
                <button 
                  onClick={() => setAsignarTurno(false)}
                  style={{ background: 'transparent', border: 'none', color: PA.warn, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancelar turno
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <select style={inputStyle} value={selectedRotativa} onChange={e => setSelectedRotativa(e.target.value)}>
                  <option value="4to_turno">Cuarto Turno (D-N-L-L)</option>
                  <option value="3er_turno">Tercer Turno Modificado</option>
                  <option value="diurno">Diurno (L a V)</option>
                </select>
                <SGTIcon name="chevron-down" size={16} color={PA.ink3} style={{ position: 'absolute', right: 14, top: 20, pointerEvents: 'none' }}/>
              </div>
            </div>
          )}
        </div>

        <button 
          disabled={!selectedUser}
          onClick={() => { alert('Asignación guardada con éxito.'); onBack(); }} 
          style={{
            width: '100%', padding: '16px', background: selectedUser ? PA.primary : PA.line, 
            color: selectedUser ? '#fff' : PA.ink3, border: 'none', borderRadius: 14, fontSize: 16, 
            fontWeight: 800, cursor: selectedUser ? 'pointer' : 'not-allowed',
            boxShadow: selectedUser ? '0 4px 12px rgba(23, 65, 108, 0.2)' : 'none',
            transition: 'all 0.2s'
          }}>
          {selectedUser ? 'Guardar Asignación' : 'Selecciona un funcionario'}
        </button>
      </div>
      
      {/* Overlay invisible para cerrar el menú si haces clic afuera */}
      {showDropdown && (
        <div onClick={() => setShowDropdown(false)} style={{ position: 'fixed', inset: 0, zIndex: 5 }} />
      )}
    </div>
  );
};

export default AsignacionView;