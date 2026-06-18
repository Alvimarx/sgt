// ServiciosView.jsx
import React, { useState, useEffect } from 'react';
import { Building2, Pencil, Trash2, X, Check, AlertCircle, Plus } from 'lucide-react';
import { SGT_DATA } from './data';
import { SGTIcon } from '../Style/UIPrimitives';
import { 
    getServicios, 
    getServiciosInactivos,
    createServicio, 
    updateServicio, 
    eliminarServicio,
    getDependenciasServicio 
} from '../../services/servicioService'; 

const ITEMS_PER_PAGE = 3;

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

  // Estado para eliminación
  const [confirmDel, setConfirmDel] = useState(null);
  const [dependencias, setDependencias] = useState(0); 
  const [loadingImpacto, setLoadingImpacto] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  // Estado para Paginación
  const [pageActivos, setPageActivos] = useState(1);
  const [pageInactivos, setPageInactivos] = useState(1);

  // Funciones auxiliares
  const srvId = (srv) => srv.idServicio || srv.id;
  const srvNombre = (srv) => srv.nombreServicio || srv.nombre;

  useEffect(() => {
    cargarServicios();
  }, []);

  const cargarServicios = async () => {
    setLoading(true);
    setError('');
    
    // Ejecutamos ambas peticiones en paralelo
    const [resultActivos, resultInactivos] = await Promise.all([
      getServicios(),
      getServiciosInactivos()
    ]);

    if (resultActivos.success && resultInactivos.success) {
      // CORRECCIÓN: Forzamos el flag `eliminado` según el endpoint de origen.
      // Así evitamos cualquier problema de serialización JSON desde el backend.
      const activosMapeados = resultActivos.data.map(srv => ({ ...srv, eliminado: false }));
      const inactivosMapeados = resultInactivos.data.map(srv => ({ ...srv, eliminado: true }));

      setServicios([...activosMapeados, ...inactivosMapeados]);
    } else {
      setError(resultActivos.error || resultInactivos.error || 'Error al cargar los servicios');
    }
    
    setLoading(false);
  };

  // ─── Crear ───────────────────────────────────────────────────────────────
  const handleCrear = async (e) => {
    e.preventDefault();
    if (!nuevoServicio.trim() || creando) return;
    setCreando(true);
    setError('');
    const result = await createServicio(nuevoServicio.trim());
    if (result.success) {
      // Al crear, forzamos que venga con eliminado en false
      setServicios([...servicios, { ...result.data, eliminado: false }]);
      setNuevoServicio('');
      setPageActivos(1); // Volver a la primera página al crear
    } else { 
      setError(result.error); 
    }
    setCreando(false);
  };

  // ─── Editar ──────────────────────────────────────────────────────────────
  const iniciarEdicion = (srv) => {
    setEditingId(srvId(srv));
    setEditNombre(srvNombre(srv));
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
      // Actualizamos manteniendo el estado `eliminado` que ya tenía en el frontend
      setServicios(servicios.map(srv => srvId(srv) === id ? { ...result.data, eliminado: srv.eliminado } : srv));
      cancelarEdicion();
    } else { 
      setError(result.error); 
    }
    setGuardandoEdicion(false);
  };

  // ─── Eliminar ────────────────────────────────────────────────────────────
  const abrirConfirmEliminar = async (srv) => {
      setConfirmDel(srv);
      setDependencias(0);
      setLoadingImpacto(true);
      const id = srvId(srv);
      
      const result = await getDependenciasServicio(id);
      setDependencias(result.success ? result.data : 0);
      setLoadingImpacto(false);
  };

  const handleEliminar = async () => {
      if (!confirmDel || eliminando) return;
      setEliminando(true);
      setError('');
      
      const id = srvId(confirmDel);
      const result = await eliminarServicio(id);
      
      if (result.success) {
          // Marcamos como eliminado localmente para que se mueva a la lista inactiva
          setServicios((prev) => prev.map((srv) => 
            srvId(srv) === id ? { ...srv, eliminado: true } : srv
          ));
          setConfirmDel(null);
      } else {
          setError(result.error);
          setConfirmDel(null);
      }
      setEliminando(false);
  };

  // ─── Lógica de Paginación y Filtrado ─────────────────────────────────────
  // Ahora el filtro es simple y exacto porque nosotros mismos seteamos el booleano
  const activos = servicios.filter(s => s.eliminado === false);
  const inactivos = servicios.filter(s => s.eliminado === true);

  const totalPagesActivos = Math.max(1, Math.ceil(activos.length / ITEMS_PER_PAGE));
  const totalPagesInactivos = Math.max(1, Math.ceil(inactivos.length / ITEMS_PER_PAGE));

  // Ajustar la página si el elemento actual desaparece
  useEffect(() => {
    if (pageActivos > totalPagesActivos) setPageActivos(totalPagesActivos);
  }, [totalPagesActivos, pageActivos]);

  useEffect(() => {
    if (pageInactivos > totalPagesInactivos) setPageInactivos(totalPagesInactivos);
  }, [totalPagesInactivos, pageInactivos]);

  const paginatedActivos = activos.slice((pageActivos - 1) * ITEMS_PER_PAGE, pageActivos * ITEMS_PER_PAGE);
  const paginatedInactivos = inactivos.slice((pageInactivos - 1) * ITEMS_PER_PAGE, pageInactivos * ITEMS_PER_PAGE);

  // Componente interno para controles de paginación
  const PaginationControls = ({ page, totalPages, setPage }) => {
    if (totalPages <= 1) return null;
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ 
              background: '#fff', border: `1px solid ${PA.line2}`, padding: '6px 12px', 
              borderRadius: 8, color: page === 1 ? PA.ink3 : PA.ink, 
              cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 12 
            }}
        >
            Anterior
        </button>
        <span style={{ fontSize: 12, fontWeight: 700, color: PA.ink3 }}>
            Página {page} de {totalPages}
        </span>
        <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ 
              background: '#fff', border: `1px solid ${PA.line2}`, padding: '6px 12px', 
              borderRadius: 8, color: page === totalPages ? PA.ink3 : PA.ink, 
              cursor: page === totalPages ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 12 
            }}
        >
            Siguiente
        </button>
      </div>
    );
  };

  const inputStyle = {
      flex: 1, padding: '14px', borderRadius: 12, border: `1px solid ${PA.line}`,
      background: '#fff', fontSize: 15, color: PA.ink, fontWeight: 600,
      appearance: 'none', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtFade .3s ease', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
          <SGTIcon name="chevron-left" size={24} color={PA.ink} />
        </button>
        <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink }}>Servicios</div>
      </div>

      <div style={{ flex: 1, padding: '20px 16px', overflow: 'auto' }}>
        <p style={{ color: PA.ink2, fontSize: 14, marginBottom: 24, fontWeight: 600 }}>
            Administra los servicios disponibles en el sistema.
        </p>
        
        {/* Alertas de error */}
        {error && (
          <div style={{
              padding: 12, marginBottom: 16, borderRadius: 10, fontWeight: 700, fontSize: 13,
              background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA',
              display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ flex: 1 }}>{error}</span>
              <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B', display: 'flex' }}>
                  <X size={15} />
              </button>
          </div>
        )}

        {/* Formulario de creación */}
        <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3 }}>Nuevo Servicio</label>
            <form onSubmit={handleCrear} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input 
                  type="text" 
                  placeholder="Ej: Urgencias, Pediatría…" 
                  value={nuevoServicio} 
                  onChange={(e) => setNuevoServicio(e.target.value)} 
                  disabled={creando} 
                  style={inputStyle} 
                />
                <button 
                  type="submit" 
                  disabled={!nuevoServicio.trim() || creando} 
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 6, 
                    padding: '0 18px', background: (!nuevoServicio.trim() || creando) ? PA.line : PA.primary, 
                    color: (!nuevoServicio.trim() || creando) ? PA.ink3 : '#fff', 
                    border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, 
                    cursor: (!nuevoServicio.trim() || creando) ? 'not-allowed' : 'pointer', transition: 'all 0.2s' 
                  }}>
                    <Plus size={16} /> {creando ? 'Guardando…' : 'Agregar'}
                </button>
            </form>
        </div>

        {/* ─── LISTA DE SERVICIOS ACTIVOS ─── */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3, marginBottom: 8, display: 'block' }}>
            Servicios Activos ({activos.length})
          </label>
          {loading ? (
             <div style={{ padding: '16px', textAlign: 'center', color: PA.ink3, fontWeight: 600, fontSize: 14 }}>
               Cargando datos…
             </div>
          ) : activos.length === 0 ? (
             <div style={{ padding: '16px', textAlign: 'center', background: '#fff', border: `1px solid ${PA.line}`, borderRadius: 12, color: PA.ink3, fontWeight: 600, fontSize: 14 }}>
               No hay servicios activos.
             </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {paginatedActivos.map((srv) => {
                  const id = srvId(srv);
                  const isEditing = editingId === id;

                  return (
                    <div key={id} style={{ padding: '12px 14px', background: '#fff', borderRadius: 12, border: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: PA.surface2, display: 'grid', placeItems: 'center' }}>
                          <Building2 size={18} color={PA.primary} />
                      </div>

                      {isEditing ? (
                        <>
                          <input 
                            value={editNombre} 
                            onChange={(e) => setEditNombre(e.target.value)} 
                            onKeyDown={(e) => { 
                              if (e.key === 'Enter') guardarEdicion(id); 
                              if (e.key === 'Escape') cancelarEdicion(); 
                            }} 
                            autoFocus 
                            disabled={guardandoEdicion} 
                            style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 8, border: `1px solid ${PA.primary}`, fontSize: 15, fontWeight: 700, color: PA.ink, outline: 'none', boxSizing: 'border-box' }} 
                          />
                          <button onClick={() => guardarEdicion(id)} disabled={guardandoEdicion || !editNombre.trim()} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 6, color: PA.primary, opacity: (!editNombre.trim() || guardandoEdicion) ? 0.4 : 1 }} title="Guardar">
                            <Check size={20} />
                          </button>
                          <button onClick={cancelarEdicion} disabled={guardandoEdicion} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 6, color: PA.ink3 }} title="Cancelar">
                            <X size={20} />
                          </button>
                        </>
                      ) : (
                        <>
                          <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, color: PA.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {srvNombre(srv)}
                          </div>
                          <button onClick={() => iniciarEdicion(srv)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 6, color: PA.ink3 }} title="Editar">
                            <Pencil size={17} />
                          </button>
                          <button onClick={() => abrirConfirmEliminar(srv)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 6, color: PA.warn || '#DC2626' }} title="Eliminar">
                            <Trash2 size={17} />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <PaginationControls page={pageActivos} totalPages={totalPagesActivos} setPage={setPageActivos} />
            </>
          )}
        </div>

        {/* ─── LISTA DE SERVICIOS INACTIVOS ─── */}
        {!loading && inactivos.length > 0 && (
          <div>
            <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3, marginBottom: 8, display: 'block' }}>
              Servicios Inactivos ({inactivos.length})
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {paginatedInactivos.map((srv) => {
                const id = srvId(srv);
                return (
                  <div key={id} style={{ padding: '12px 14px', background: 'transparent', borderRadius: 12, border: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 10, opacity: 0.7 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: PA.line, display: 'grid', placeItems: 'center' }}>
                        <Building2 size={18} color={PA.ink3} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, color: PA.ink3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {srvNombre(srv)}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: PA.ink3, background: PA.line, padding: '4px 8px', borderRadius: 6 }}>
                      Inactivo
                    </div>
                  </div>
                );
              })}
            </div>
            <PaginationControls page={pageInactivos} totalPages={totalPagesInactivos} setPage={setPageInactivos} />
          </div>
        )}
      </div>

      {/* Renderizado condicional del modal de confirmación */}
      {confirmDel && (
          <ConfirmDeleteServicio
              PA={PA}
              nombre={srvNombre(confirmDel)}
              dependencias={dependencias} 
              loadingImpacto={loadingImpacto}
              eliminando={eliminando}
              onConfirm={handleEliminar}
              onCancel={() => setConfirmDel(null)}
          />
      )}
    </div>
  );
};

// ─── Bottom-sheet de confirmación ───────────────────────────────────────────
function ConfirmDeleteServicio({ PA, nombre, dependencias, loadingImpacto, eliminando, onConfirm, onCancel }) {
    const tieneDependencias = dependencias > 0;
    const warn = PA.warn || '#DC2626';
    const warnSoft = PA.warnSoft || '#FEF2F2';

    return (
        <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '8px 20px 36px', width: '100%', maxWidth: 480, boxShadow: '0 -8px 40px rgba(0,0,0,0.18)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 16 }}>
                    <div style={{ width: 40, height: 4, background: PA.line, borderRadius: 99 }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: warnSoft, display: 'grid', placeItems: 'center' }}>
                        <Trash2 size={26} color={warn} />
                    </div>
                </div>

                <div style={{ fontWeight: 800, fontSize: 18, color: PA.ink, textAlign: 'center', marginBottom: 10 }}>
                  ¿Eliminar servicio?
                </div>

                <p style={{ fontSize: 14, color: PA.ink2, margin: '0 0 6px', lineHeight: 1.55, textAlign: 'center' }}>
                    Estás a punto de eliminar <strong style={{ color: PA.ink }}>{nombre}</strong>.
                </p>

                {loadingImpacto ? (
                    <p style={{ fontSize: 13, color: PA.ink3, margin: '0 0 24px', lineHeight: 1.5, textAlign: 'center' }}>
                        Verificando registros asociados…
                    </p>
                ) : tieneDependencias ? (
                    <div style={{ background: warnSoft, borderRadius: 12, padding: '12px 14px', margin: '4px 0 22px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <AlertCircle size={16} color={warn} style={{ flexShrink: 0, marginTop: 1 }} />
                        <div style={{ fontSize: 13, color: PA.ink2, lineHeight: 1.5 }}>
                            El servicio tiene{' '}
                            <strong style={{ color: PA.ink }}>{dependencias} registro(s) (funcionarios o turnos)</strong> asociados.
                            Se ocultará de la gestión, pero los datos históricos se conservan.
                        </div>
                    </div>
                ) : (
                    <p style={{ fontSize: 13, color: PA.ink3, margin: '0 0 24px', lineHeight: 1.5, textAlign: 'center' }}>
                        No tiene registros asociados. Dejará de aparecer en la gestión activa.
                    </p>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={onCancel}
                      style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: `1.5px solid ${PA.line}`, background: 'none', color: PA.ink2, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
                    >
                        Cancelar
                    </button>
                    <button
                      onClick={onConfirm}
                      disabled={eliminando || loadingImpacto}
                      style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: warn, color: '#fff', fontSize: 15, fontWeight: 700, cursor: (eliminando || loadingImpacto) ? 'not-allowed' : 'pointer', opacity: (eliminando || loadingImpacto) ? 0.7 : 1 }}
                    >
                        {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ServiciosView;