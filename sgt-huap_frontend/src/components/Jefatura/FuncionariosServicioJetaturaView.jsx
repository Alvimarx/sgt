import React, { useEffect, useState } from 'react';
import { SGT_DATA, DASHBOARD_ICON_THEMES } from '../Admin2/data'; // Ajusta la ruta según tu estructura
import { SGTIcon, TopHeader } from '../Style/UIPrimitives';

const AVATAR_THEME = DASHBOARD_ICON_THEMES.green;
import { getFuncionariosSummary } from '../../services/funcionarioService';
import { useAuth } from '../../context/AuthContext';

const FuncionariosServicioJefaturaView = ({ onBack }) => {
  const PA = SGT_DATA.PALETTE;
  const auth = useAuth();

  // 1. Obtener datos del servicio activo de la sesión
  const storedUserData = localStorage.getItem('userData') || localStorage.getItem('user');
  const userData = auth?.user || (storedUserData ? JSON.parse(storedUserData) : {});
  
  const servicioActivoId = userData?.servicioId || null;
  const servicioActivoNombre = userData?.servicioNombre || localStorage.getItem("sgt_servicio_activo_nombre") || 'Servicio Actual';

  // Estados
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  useEffect(() => {
    const cargarPersonal = async () => {
      if (!servicioActivoId) {
        setMensaje({ tipo: 'error', texto: 'No se identificó un servicio activo.' });
        setLoading(false);
        return;
      }

      setLoading(true);
      // Filtramos en el backend enviando el ID del servicio activo
      const response = await getFuncionariosSummary(servicioActivoId);

      if (response.success) {
        setFuncionarios(Array.isArray(response.data) ? response.data : []);
      } else {
        setMensaje({ tipo: 'error', texto: response.error || 'Error al cargar el personal.' });
      }
      setLoading(false);
    };

    cargarPersonal();
  }, [servicioActivoId]);

  // Filtrado local por la barra de búsqueda (Nombre, Apellido o Rut)
  const personalFiltrado = funcionarios.filter(u => {
    const nombreCompleto = `${u.nombre || ''} ${u.apellidoPaterno || ''} ${u.apellidoMaterno || ''}`.toLowerCase();
    const rut = (u.rutCompleto || u.rut || '').toLowerCase();
    const termino = searchQuery.toLowerCase();
    return nombreCompleto.includes(termino) || rut.includes(termino);
  });

  const inputStyle = {
    width: '100%', padding: '14px 14px 14px 42px', borderRadius: 12, border: `1px solid ${PA.line}`,
    background: '#fff', fontSize: 15, color: PA.ink, fontWeight: 600, marginTop: 6,
    outline: 'none', boxSizing: 'border-box'
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtFade .3s ease', overflow: 'hidden' }}>
      
      {/* Cabecera */}
      <TopHeader
        title="Personal del Servicio"
        leftSlot={
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <SGTIcon name="chevron-left" size={24} color={PA.ink} />
          </button>
        }
      />

      <div style={{ flex: 1, padding: '16px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Información del Servicio Fijo */}
        <div style={{ 
           padding: '14px', borderRadius: 12, border: `1px solid ${PA.line}`,
           background: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 10
        }}>
          <SGTIcon name="briefcase" size={18} color={PA.ink3} />
          <div style={{ fontSize: 14, fontWeight: 700, color: PA.ink }}>
            Visualizando: <span style={{ color: PA.primary }}>{servicioActivoNombre}</span>
          </div>
        </div>

        {/* Buscador */}
        <div style={{ position: 'relative' }}>
          <SGTIcon name="search" size={18} color={PA.ink3} style={{ position: 'absolute', left: 14, top: 20, pointerEvents: 'none' }}/>
          <input 
            type="text" 
            placeholder="Buscar por nombre o RUT..."
            value={searchQuery}
            disabled={loading || !servicioActivoId}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Mensajes de Error */}
        {mensaje.texto && (
          <div style={{ 
            padding: 12, borderRadius: 10, fontWeight: 700, fontSize: 13,
            background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA'
          }}>
            {mensaje.texto}
          </div>
        )}

        {/* Lista de Doctores / Funcionarios */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: PA.ink3, fontWeight: 600, fontSize: 14 }}>
              Cargando nómina de personal...
            </div>
          ) : personalFiltrado.length > 0 ? (
            personalFiltrado.map((u, i) => {
              
              // 2. EXTRAER EL ROL PROPIO DE ESTE SERVICIO ESPECÍFICO
              const relServicio = u.servicios?.find(s => Number(s.idServicio) === Number(servicioActivoId));
              const nombreRolEnServicio = relServicio ? relServicio.rolServicioNombre : 'Sin rol asignado';
              
              // Determinar un color de etiqueta según el rol para mejorar UI
              const esJefe = nombreRolEnServicio.toLowerCase().includes('jefe');
              const esSubrogante = nombreRolEnServicio.toLowerCase().includes('subrogante');
              
              let badgeBg = PA.surface2;
              let badgeColor = PA.ink2;
              if (esJefe) { badgeBg = '#FEF3C7'; badgeColor = '#92400E'; }
              else if (esSubrogante) { badgeBg = PA.primarySoft; badgeColor = PA.primary; }

              return (
                <div key={u.idFuncionario || `f_${i}`} style={{
                  background: '#fff', border: 'none', borderRadius: 16,
                  padding: '14px', display: 'flex', alignItems: 'center', gap: 12,
                  boxShadow: '0 2px 10px rgba(15,23,42,0.06)'
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, background: AVATAR_THEME.grad,
                    color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0,
                    boxShadow: `0 6px 14px ${AVATAR_THEME.glow}, inset 0 1.5px 0 rgba(255,255,255,0.55), inset 0 -3px 5px rgba(0,0,0,0.18)`,
                  }}>
                    {(u.nombre || 'U').charAt(0)}{(u.apellidoPaterno || '').charAt(0)}
                  </div>

                  {/* Datos del Funcionario */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: PA.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.nombre} {u.apellidoPaterno} {u.apellidoMaterno}
                    </div>
                    <div style={{ fontSize: 12, color: PA.ink3, fontWeight: 600, marginTop: 2 }}>
                      {u.profesion || 'No especificada'} · <span style={{ fontSize: 11 }}>{u.rutCompleto || u.rut}</span>
                    </div>
                  </div>

                  {/* Badge del Rol en este Servicio */}
                  <div style={{
                    padding: '6px 10px', borderRadius: 8, background: badgeBg, color: badgeColor,
                    fontSize: 11, fontWeight: 800, textAlign: 'center', whiteSpace: 'nowrap'
                  }}>
                    {nombreRolEnServicio}
                  </div>

                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: PA.ink3, fontWeight: 600, fontSize: 14 }}>
              No se encontraron funcionarios asignados a este servicio.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FuncionariosServicioJefaturaView;