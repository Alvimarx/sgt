// ServiciosView.jsx
import React, { useState, useEffect } from 'react';
import { SGT_DATA } from './data';
import { SGTIcon } from './UIPrimitives';
import { getServicios, createServicio, updateServicio } from '../../services/servicioService'; // Ajusta la ruta según tu proyecto

const ServiciosView = ({ onBack }) => {
  const PA = SGT_DATA.PALETTE;
  
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estado para creación
  const [nuevoServicio, setNuevoServicio] = useState('');
  const [creando, setCreando] = useState(false);

  // Estado para edición
  const [editingId, setEditingId] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // Cargar servicios al montar el componente
  useEffect(() => {
    cargarServicios();
  }, []);

  const cargarServicios = async () => {
    setLoading(true);
    setError('');
    const result = await getServicios();
    if (result.success) {
      setServicios(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleCrear = async (e) => {
    e.preventDefault();
    if (!nuevoServicio.trim() || creando) return;
    
    setCreando(true);
    setError('');
    
    const result = await createServicio(nuevoServicio.trim());
    if (result.success) {
      // Agregamos el nuevo servicio a la lista local para no recargar todo
      setServicios([...servicios, result.data]);
      setNuevoServicio('');
    } else {
      setError(result.error);
    }
    setCreando(false);
  };

  const iniciarEdicion = (srv) => {
    // Busca el ID y el Nombre correctos (ajusta según el JSON que devuelve tu backend)
    const id = srv.idServicio || srv.id;
    const nombre = srv.nombreServicio || srv.nombre;
    
    setEditingId(id);
    setEditNombre(nombre);
  };

  const cancelarEdicion = () => {
    setEditingId(null);
    setEditNombre('');
  };

  const guardarEdicion = async (id) => {
    if (!editNombre.trim() || guardandoEdicion) return;
    
    setGuardandoEdicion(true);
    setError('');

    const result = await updateServicio(id, editNombre.trim());
    
    if (result.success) {
      // Actualizamos el servicio en el array local
      setServicios(servicios.map(srv => {
        const srvId = srv.idServicio || srv.id;
        return srvId === id ? result.data : srv;
      }));
      cancelarEdicion();
    } else {
      setError(result.error);
    }
    
    setGuardandoEdicion(false);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtSlideLeft .3s ease' }}>
      
      {/* Header con botón volver */}
      <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
          <SGTIcon name="chevron-left" size={24} color={PA.ink} />
        </button>
        <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink }}>Servicios</div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Mostrar mensaje de error general si lo hay */}
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#B91C1C' }}>
            {error}
          </div>
        )}

        {/* Formulario para crear un servicio nuevo */}
        <form onSubmit={handleCrear} style={{
          display: 'flex', gap: 10, background: '#fff', padding: 12, 
          borderRadius: 14, border: `1px solid ${PA.line}`,
          boxShadow: '0 4px 12px rgba(15,23,42,0.03)'
        }}>
          <input 
            type="text" 
            placeholder="Nombre del nuevo servicio..." 
            value={nuevoServicio}
            onChange={(e) => setNuevoServicio(e.target.value)}
            disabled={creando}
            style={{
              flex: 1, border: 'none', background: PA.surface2, padding: '12px 14px',
              borderRadius: 10, fontSize: 14, color: PA.ink, outline: 'none',
              fontWeight: 600, fontFamily: 'inherit'
            }}
          />
          <button type="submit" disabled={!nuevoServicio.trim() || creando} style={{
            background: nuevoServicio.trim() ? PA.primary : PA.line, 
            color: '#fff', border: 'none', borderRadius: 10, padding: '0 16px',
            fontSize: 14, fontWeight: 800, cursor: (!nuevoServicio.trim() || creando) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {creando ? 'Creando...' : 'Crear'}
          </button>
        </form>

        {/* Lista de Servicios */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: PA.ink3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginLeft: 4 }}>
            Servicios Activos ({loading ? '...' : servicios.length})
          </div>
          
          {loading ? (
             <div style={{ textAlign: 'center', padding: '20px', color: PA.ink3, fontWeight: 600 }}>Cargando servicios...</div>
          ) : servicios.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '20px', color: PA.ink3, fontWeight: 600 }}>No hay servicios registrados.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {servicios.map((srv, index) => {
                const srvId = srv.idServicio || srv.id;
                const srvNombre = srv.nombreServicio || srv.nombre;
                const isEditing = editingId === srvId;

                return (
                  <div key={srvId || index} style={{
                    background: '#fff', border: `1px solid ${isEditing ? PA.primary : PA.line}`, padding: '12px 16px',
                    borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12,
                    boxShadow: isEditing ? '0 0 0 2px rgba(59, 130, 246, 0.1)' : 'none'
                  }}>
                    {isEditing ? (
                      // Modo Edición
                      <>
                        <input 
                          type="text"
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                          autoFocus
                          style={{
                            flex: 1, border: `1px solid ${PA.line2}`, background: PA.surface, padding: '8px 12px',
                            borderRadius: 8, fontSize: 14, color: PA.ink, outline: 'none', fontWeight: 600
                          }}
                        />
                        <button 
                          onClick={cancelarEdicion} 
                          disabled={guardandoEdicion}
                          style={{ background: 'transparent', border: 'none', color: PA.ink3, cursor: 'pointer', padding: 4, fontWeight: 700 }}
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={() => guardarEdicion(srvId)}
                          disabled={guardandoEdicion || !editNombre.trim()}
                          style={{ background: PA.primary, border: 'none', color: '#fff', cursor: 'pointer', padding: '6px 12px', borderRadius: 8, fontWeight: 700 }}
                        >
                          {guardandoEdicion ? '...' : 'Guardar'}
                        </button>
                      </>
                    ) : (
                      // Modo Visualización
                      <>
                        <div style={{ width: 8, height: 8, borderRadius: 99, background: PA.primarySoft, border: `2px solid ${PA.primary}` }} />
                        <span style={{ fontSize: 15, fontWeight: 700, color: PA.ink, flex: 1 }}>{srvNombre}</span>
                        <button 
                          onClick={() => iniciarEdicion(srv)}
                          style={{ background: PA.surface2, border: `1px solid ${PA.line2}`, color: PA.ink3, cursor: 'pointer', display: 'flex', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}
                        >
                          Modificar
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ServiciosView;