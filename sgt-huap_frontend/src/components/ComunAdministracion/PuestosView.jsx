// PuestosView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, X, Check, AlertCircle, Plus } from 'lucide-react';
import { SGT_DATA } from '../Admin2/data';
import { SGTIcon, TopHeader, IconBadge3D, ConfirmDialog } from '../Style/UIPrimitives';
import { usePagination, PaginationControls, ListEmptyState, LoadingState } from '../Style/ListControls';
import { useAuth } from '../../context/AuthContext';
import {
    getPuestosPorServicio,
    crearPuesto,
    actualizarPuesto,
    eliminarPuesto,
    getTurnosAsociados,
} from '../../services/puestosService';

const PuestosView = ({ onBack }) => {
    const PA = SGT_DATA.PALETTE;
    const { user } = useAuth();
    const servicioId = user?.servicioId;

    const [puestos, setPuestos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Estado para creación y confirmación
    const [nuevoPuesto, setNuevoPuesto] = useState('');
    const [confirmCrear, setConfirmCrear] = useState(null);
    const [creando, setCreando] = useState(false);

    const [editId, setEditId] = useState(null);    
    const [editNombre, setEditNombre] = useState('');
    const [guardando, setGuardando] = useState(false);

    const [confirmDel, setConfirmDel] = useState(null);
    const [turnosAsociados, setTurnosAsociados] = useState(0);
    const [loadingImpacto, setLoadingImpacto] = useState(false);
    const [eliminando, setEliminando] = useState(false);

    const puestoId = (p) => p.idPuesto ?? p.id;
    const puestoNombre = (p) => p.nombre ?? p.nombrePuesto ?? p.descripcion ?? 'Puesto sin nombre';

    const cargarPuestos = useCallback(async () => {
        if (!servicioId) {
            setError('No hay un servicio activo.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        const result = await getPuestosPorServicio(servicioId);
        if (result.success) {
            setPuestos(Array.isArray(result.data) ? result.data : []);
        } else {
            setError(result.error);
        }
        setLoading(false);
    }, [servicioId]);

    useEffect(() => { cargarPuestos(); }, [cargarPuestos]);

    // ─── Paginación ──────────────────────────────────────────────────────────
    const puestosPg = usePagination(puestos, 6);

    // ─── Crear ───────────────────────────────────────────────────────────────
    const handleCrear = (e) => {
        e.preventDefault();
        if (!nuevoPuesto.trim() || creando) return;
        setConfirmCrear(nuevoPuesto.trim());
    };

    const ejecutarCrear = async () => {
        if (!confirmCrear || creando) return;
        setCreando(true);
        setError('');
        const result = await crearPuesto(servicioId, confirmCrear);
        if (result.success) {
            setPuestos((prev) => [...prev, result.data]);
            setNuevoPuesto('');
            setConfirmCrear(null);
            puestosPg.setPage(1); // Volver a la primera página al crear
        } else {
            setError(result.error);
            setConfirmCrear(null);
        }
        setCreando(false);
    };

    // ─── Editar ──────────────────────────────────────────────────────────────
    const abrirEdicion = (puesto) => {
        setEditId(puestoId(puesto));
        setEditNombre(puestoNombre(puesto));
    };
    const cancelarEdicion = () => { setEditId(null); setEditNombre(''); };

    const guardarEdicion = async () => {
        if (!editNombre.trim() || guardando) return;
        setGuardando(true);
        setError('');
        const result = await actualizarPuesto(editId, editNombre.trim());
        if (result.success) {
            setPuestos((prev) => prev.map((p) => (puestoId(p) === editId ? result.data : p)));
            cancelarEdicion();
        } else {
            setError(result.error);
        }
        setGuardando(false);
    };

    // ─── Eliminar ──────────────────────────────────────────────────────────────
    const abrirConfirmEliminar = async (puesto) => {
        setConfirmDel(puesto);
        setTurnosAsociados(0);
        setLoadingImpacto(true);
        const result = await getTurnosAsociados(puestoId(puesto));
        setTurnosAsociados(result.success ? result.data : 0);
        setLoadingImpacto(false);
    };

    const handleEliminar = async () => {
        if (!confirmDel || eliminando) return;
        setEliminando(true);
        setError('');
        const result = await eliminarPuesto(puestoId(confirmDel));
        if (result.success) {
            setPuestos((prev) => prev.filter((p) => puestoId(p) !== puestoId(confirmDel)));
            setConfirmDel(null);
        } else {
            setError(result.error);
            setConfirmDel(null);
        }
        setEliminando(false);
    };

    const inputStyle = {
        flex: 1, padding: '14px', borderRadius: 12, border: `1px solid ${PA.line}`,
        background: '#fff', fontSize: 15, color: PA.ink, fontWeight: 600,
        appearance: 'none', outline: 'none', boxSizing: 'border-box',
    };

    return (
        <div className="dash-page-bg" style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'sgtFade .3s ease', overflow: 'hidden' }}>
            {/* Header */}
            <TopHeader
                title="Puestos del Servicio"
                leftSlot={
                    <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
                        <SGTIcon name="chevron-left" size={24} color={PA.ink} />
                    </button>
                }
            />

            <div style={{ flex: 1, padding: '20px 16px', overflow: 'auto' }}>
                <p style={{ color: PA.ink2, fontSize: 14, marginBottom: 24, fontWeight: 600 }}>
                    Administra los puestos o posiciones disponibles en este servicio.
                </p>

                {error && (
                    <div style={{ padding: 12, marginBottom: 16, borderRadius: 10, fontWeight: 700, fontSize: 13, background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ flex: 1 }}>{error}</span>
                        <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B', display: 'flex' }}><X size={15} /></button>
                    </div>
                )}

                {/* Formulario de creación */}
                <div style={{ marginBottom: 24 }}>
                    <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3 }}>Nuevo Puesto</label>
                    <form onSubmit={handleCrear} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input
                            type="text" placeholder="Ej: Reanimación, Box 1, Triage…" value={nuevoPuesto}
                            onChange={(e) => setNuevoPuesto(e.target.value)} disabled={creando} style={inputStyle}
                        />
                        <button
                            type="submit" disabled={!nuevoPuesto.trim() || creando}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 18px', background: (!nuevoPuesto.trim() || creando) ? PA.line : PA.primary, color: (!nuevoPuesto.trim() || creando) ? PA.ink3 : '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: (!nuevoPuesto.trim() || creando) ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                            <Plus size={16} /> Agregar
                        </button>
                    </form>
                </div>

                {/* Lista de puestos */}
                <div>
                    <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3, marginBottom: 8, display: 'block' }}>
                        Puestos Registrados ({puestos.length})
                    </label>

                    {loading ? (
                        <LoadingState label="Cargando datos…" />
                    ) : puestos.length === 0 ? (
                        <ListEmptyState icon="home" theme="slate" title="No hay puestos registrados" message="Agrega el primero desde el formulario de arriba." />
                    ) : (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {puestosPg.pageItems.map((puesto) => {
                                    const pId = puestoId(puesto);
                                    const enEdicion = editId === pId;
                                    return (
                                        <div key={pId} className="sgt-list-row" style={{ padding: '12px 14px', background: '#fff', borderRadius: 16, border: 'none', boxShadow: '0 2px 10px rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <IconBadge3D icon="home" theme="amber" size={38} radius={10} />

                                            {enEdicion ? (
                                                <>
                                                    <input
                                                        autoFocus value={editNombre} onChange={(e) => setEditNombre(e.target.value)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') guardarEdicion(); if (e.key === 'Escape') cancelarEdicion(); }}
                                                        disabled={guardando} style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 8, border: `1px solid ${PA.primary}`, fontSize: 15, fontWeight: 700, color: PA.ink, outline: 'none', boxSizing: 'border-box' }}
                                                    />
                                                    <button onClick={guardarEdicion} disabled={!editNombre.trim() || guardando} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 6, color: PA.primary, opacity: (!editNombre.trim() || guardando) ? 0.4 : 1 }}><Check size={20} /></button>
                                                    <button onClick={cancelarEdicion} disabled={guardando} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 6, color: PA.ink3 }}><X size={20} /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, color: PA.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{puestoNombre(puesto)}</div>
                                                    <button onClick={() => abrirEdicion(puesto)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 6, color: PA.ink3 }}><Pencil size={17} /></button>
                                                    <button onClick={() => abrirConfirmEliminar(puesto)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 6, color: PA.warn || '#DC2626' }}><Trash2 size={17} /></button>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <PaginationControls page={puestosPg.page} totalPages={puestosPg.totalPages} onChange={puestosPg.setPage} />
                        </>
                    )}
                </div>
            </div>

            {/* Modales de confirmación */}
            <ConfirmDialog
                open={!!confirmCrear}
                icon="home" tone="primary"
                title="¿Agregar nuevo puesto?"
                busy={creando}
                confirmLabel={creando ? 'Agregando…' : 'Sí, agregar'}
                onConfirm={ejecutarCrear}
                onCancel={() => setConfirmCrear(null)}
            >
                Estás a punto de registrar el puesto <strong style={{ color: PA.ink }}>{confirmCrear}</strong>.
            </ConfirmDialog>

            <ConfirmDialog
                open={!!confirmDel}
                icon="alert" tone="danger"
                title="¿Eliminar puesto?"
                busy={eliminando || loadingImpacto}
                confirmLabel={eliminando ? 'Eliminando…' : 'Sí, eliminar'}
                onConfirm={handleEliminar}
                onCancel={() => setConfirmDel(null)}
            >
                <div style={{ marginBottom: 8 }}>
                    Estás a punto de eliminar <strong style={{ color: PA.ink }}>{confirmDel ? puestoNombre(confirmDel) : ''}</strong>.
                </div>
                {loadingImpacto ? (
                    <div style={{ fontSize: 12.5, color: PA.ink3 }}>Verificando turnos asociados…</div>
                ) : turnosAsociados > 0 ? (
                    <div style={{ background: PA.warnSoft, borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 8, textAlign: 'left' }}>
                        <AlertCircle size={16} color={PA.warn} style={{ flexShrink: 0, marginTop: 1 }} />
                        <div style={{ fontSize: 12.5, color: PA.ink2, lineHeight: 1.5 }}>
                            Este puesto está asociado a <strong style={{ color: PA.ink }}>{turnosAsociados} turno{turnosAsociados === 1 ? '' : 's'}</strong>. Se ocultará de la gestión, pero los turnos históricos se conservan.
                        </div>
                    </div>
                ) : (
                    <div style={{ fontSize: 12.5, color: PA.ink3 }}>No tiene turnos asociados. Dejará de aparecer en la gestión.</div>
                )}
            </ConfirmDialog>
        </div>
    );
};

export default PuestosView;