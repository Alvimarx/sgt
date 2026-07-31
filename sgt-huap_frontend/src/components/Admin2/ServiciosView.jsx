// ServiciosView.jsx
import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, X, Check, AlertCircle, Plus } from 'lucide-react';
import { SGT_DATA } from './data';
import { SGTIcon, TopHeader, IconBadge3D, StatusBadge, ConfirmDialog } from '../Style/UIPrimitives';
import { usePagination, PaginationControls, ListEmptyState, LoadingState } from '../Style/ListControls';
import {
    getServicios, 
    getServiciosInactivos,
    createServicio, 
    updateServicio, 
    eliminarServicio,
    getDependenciasServicio 
} from '../../services/servicioService'; 

const ServiciosView = ({ onBack }) => {
  const PA = SGT_DATA.PALETTE;
  
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estado para creación y su confirmación
  const [nuevoServicio, setNuevoServicio] = useState('');
  const [confirmCrear, setConfirmCrear] = useState(null);
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

  // Funciones auxiliares
  const srvId = (srv) => srv.idServicio || srv.id;
  const srvNombre = (srv) => srv.nombreServicio || srv.nombre;

  useEffect(() => {
    cargarServicios();
  }, []);

  const cargarServicios = async () => {
    setLoading(true);
    setError('');
    
    const [resultActivos, resultInactivos] = await Promise.all([
      getServicios(),
      getServiciosInactivos()
    ]);

    if (resultActivos.success && resultInactivos.success) {
      const activosMapeados = resultActivos.data.map(srv => ({ ...srv, eliminado: false }));
      const inactivosMapeados = resultInactivos.data.map(srv => ({ ...srv, eliminado: true }));
      setServicios([...activosMapeados, ...inactivosMapeados]);
    } else {
      setError(resultActivos.error || resultInactivos.error || 'Error al cargar los servicios');
    }
    
    setLoading(false);
  };

  // ─── Crear ───────────────────────────────────────────────────────────────
  const handleCrear = (e) => {
    e.preventDefault();
    if (!nuevoServicio.trim() || creando) return;
    setConfirmCrear(nuevoServicio.trim());
  };

  const ejecutarCrear = async () => {
    if (!confirmCrear || creando) return;
    setCreando(true);
    setError('');
    const result = await createServicio(confirmCrear);
    if (result.success) {
      setServicios([...servicios, { ...result.data, eliminado: false }]);
      setNuevoServicio('');
      activosPg.setPage(1);
      setConfirmCrear(null);
    } else { 
      setError(result.error);
      setConfirmCrear(null);
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
  const activos = servicios.filter(s => s.eliminado === false);
  const inactivos = servicios.filter(s => s.eliminado === true);

  const activosPg = usePagination(activos, 3);
  const inactivosPg = usePagination(inactivos, 3);

  const inputStyle = {
      flex: 1, padding: '14px', borderRadius: 12, border: `1px solid ${PA.line}`,
      background: '#fff', fontSize: 15, color: PA.ink, fontWeight: 600,
      appearance: 'none', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div className="dash-page-bg" style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'sgtFade .3s ease', overflow: 'hidden' }}>

      {/* Header */}
      <TopHeader
        title="Servicios"
        leftSlot={
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <SGTIcon name="chevron-left" size={24} color={PA.ink} />
          </button>
        }
      />

      <div style={{ flex: 1, padding: '20px 16px', overflow: 'auto' }}>
        <p style={{ color: PA.ink2, fontSize: 14, marginBottom: 24, fontWeight: 600 }}>
            Administra los servicios disponibles en el sistema.
        </p>
        
        {/* Alertas de error */}
        {error && (
          <div style={{ padding: 12, marginBottom: 16, borderRadius: 10, fontWeight: 700, fontSize: 13, background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ flex: 1 }}>{error}</span>
              <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B', display: 'flex' }}><X size={15} /></button>
          </div>
        )}

        {/* Formulario de creación */}
        <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3 }}>Nuevo Servicio</label>
            <form onSubmit={handleCrear} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input 
                  type="text" placeholder="Ej: Urgencias, Pediatría…" value={nuevoServicio} 
                  onChange={(e) => setNuevoServicio(e.target.value)} disabled={creando} style={inputStyle} 
                />
                <button 
                  type="submit" disabled={!nuevoServicio.trim() || creando} 
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 18px', background: (!nuevoServicio.trim() || creando) ? PA.line : PA.primary, color: (!nuevoServicio.trim() || creando) ? PA.ink3 : '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: (!nuevoServicio.trim() || creando) ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                    <Plus size={16} /> Agregar
                </button>
            </form>
        </div>

        {/* ─── LISTA DE SERVICIOS ACTIVOS ─── */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3, marginBottom: 8, display: 'block' }}>Servicios Activos ({activos.length})</label>
          {loading ? (
             <LoadingState label="Cargando datos…" />
          ) : activos.length === 0 ? (
             <ListEmptyState icon="building" theme="slate" title="No hay servicios activos" message="Agrega el primero desde el formulario de arriba." />
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activosPg.pageItems.map((srv) => {
                  const id = srvId(srv);
                  const isEditing = editingId === id;

                  return (
                    <div key={id} className="sgt-list-row" style={{ padding: '12px 14px', background: '#fff', borderRadius: 16, border: 'none', boxShadow: '0 2px 10px rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <IconBadge3D icon="building" theme="blue" size={38} radius={10} />

                      {isEditing ? (
                        <>
                          <input 
                            value={editNombre} onChange={(e) => setEditNombre(e.target.value)} 
                            onKeyDown={(e) => { if (e.key === 'Enter') guardarEdicion(id); if (e.key === 'Escape') cancelarEdicion(); }} 
                            autoFocus disabled={guardandoEdicion} style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 8, border: `1px solid ${PA.primary}`, fontSize: 15, fontWeight: 700, color: PA.ink, outline: 'none', boxSizing: 'border-box' }} 
                          />
                          <button onClick={() => guardarEdicion(id)} disabled={guardandoEdicion || !editNombre.trim()} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 6, color: PA.primary, opacity: (!editNombre.trim() || guardandoEdicion) ? 0.4 : 1 }}><Check size={20} /></button>
                          <button onClick={cancelarEdicion} disabled={guardandoEdicion} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 6, color: PA.ink3 }}><X size={20} /></button>
                        </>
                      ) : (
                        <>
                          <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, color: PA.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{srvNombre(srv)}</div>
                          <button onClick={() => iniciarEdicion(srv)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 6, color: PA.ink3 }}><Pencil size={17} /></button>
                          <button onClick={() => abrirConfirmEliminar(srv)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 6, color: PA.warn || '#DC2626' }}><Trash2 size={17} /></button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <PaginationControls page={activosPg.page} totalPages={activosPg.totalPages} onChange={activosPg.setPage} />
            </>
          )}
        </div>

        {/* ─── LISTA DE SERVICIOS INACTIVOS ─── */}
        {!loading && inactivos.length > 0 && (
          <div>
            <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3, marginBottom: 8, display: 'block' }}>Servicios Inactivos ({inactivos.length})</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {inactivosPg.pageItems.map((srv) => {
                const id = srvId(srv);
                return (
                  <div key={id} style={{ padding: '12px 14px', background: 'transparent', borderRadius: 12, border: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 10, opacity: 0.7 }}>
                    <IconBadge3D icon="building" theme="slate" size={38} radius={10} />
                    <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, color: PA.ink3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{srvNombre(srv)}</div>
                    <StatusBadge status="INACTIVO" />
                  </div>
                );
              })}
            </div>
            <PaginationControls page={inactivosPg.page} totalPages={inactivosPg.totalPages} onChange={inactivosPg.setPage} />
          </div>
        )}
      </div>

      {/* Modales de Confirmación */}
      <ConfirmDialog
        open={!!confirmCrear}
        icon="building" tone="primary"
        title="¿Agregar nuevo servicio?"
        busy={creando}
        confirmLabel={creando ? 'Agregando…' : 'Sí, agregar'}
        onConfirm={ejecutarCrear}
        onCancel={() => setConfirmCrear(null)}
      >
        Estás a punto de registrar el servicio <strong style={{ color: PA.ink }}>{confirmCrear}</strong>.
      </ConfirmDialog>

      <ConfirmDialog
        open={!!confirmDel}
        icon="alert" tone="danger"
        title="¿Desactivar servicio?"
        busy={eliminando || loadingImpacto}
        confirmLabel={eliminando ? 'Desactivando…' : 'Sí, desactivar'}
        onConfirm={handleEliminar}
        onCancel={() => setConfirmDel(null)}
      >
        <div style={{ marginBottom: 8 }}>
          Estás a punto de desactivar <strong style={{ color: PA.ink }}>{confirmDel ? srvNombre(confirmDel) : ''}</strong>.
        </div>
        {loadingImpacto ? (
          <div style={{ fontSize: 12.5, color: PA.ink3 }}>Verificando registros asociados…</div>
        ) : dependencias > 0 ? (
          <div style={{ background: PA.warnSoft, borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 8, textAlign: 'left' }}>
            <AlertCircle size={16} color={PA.warn} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12.5, color: PA.ink2, lineHeight: 1.5 }}>
              El servicio tiene <strong style={{ color: PA.ink }}>{dependencias} registro(s)</strong> asociados. Se ocultará de la gestión, pero los datos históricos se conservan.
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: PA.ink3 }}>No tiene registros asociados. Dejará de aparecer en la gestión activa.</div>
        )}
      </ConfirmDialog>
    </div>
  );
};

export default ServiciosView;