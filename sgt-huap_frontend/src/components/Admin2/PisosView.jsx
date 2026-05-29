// PisosView.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Building2, Pencil, Trash2, X, Check, AlertCircle, Plus } from 'lucide-react';
import { SGT_DATA } from './data';
import { SGTIcon } from './UIPrimitives';
import { useAuth } from '../../context/AuthContext';
import {
    getPisosPorServicio,
    crearPiso,
    actualizarPiso,
    eliminarPiso,
    getTurnosAsociados,
} from '../../services/pisosService';

const PisosView = ({ onBack }) => {
    const PA = SGT_DATA.PALETTE;
    const { user } = useAuth();
    const servicioId = user?.servicioId;

    const [pisos, setPisos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [nuevoPiso, setNuevoPiso] = useState('');
    const [creando, setCreando] = useState(false);

    const [editId, setEditId] = useState(null);     // idPiso en edición
    const [editNombre, setEditNombre] = useState('');
    const [guardando, setGuardando] = useState(false);

    const [confirmDel, setConfirmDel] = useState(null);   // piso a eliminar
    const [turnosAsociados, setTurnosAsociados] = useState(0);
    const [loadingImpacto, setLoadingImpacto] = useState(false);
    const [eliminando, setEliminando] = useState(false);

    const pisoId = (p) => p.idPiso ?? p.id;
    const pisoNombre = (p) => p.nombre ?? p.nombrePiso ?? p.descripcion ?? 'Piso sin nombre';

    const cargarPisos = useCallback(async () => {
        if (!servicioId) {
            setError('No hay un servicio activo.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        const result = await getPisosPorServicio(servicioId);
        if (result.success) {
            setPisos(Array.isArray(result.data) ? result.data : []);
        } else {
            setError(result.error);
        }
        setLoading(false);
    }, [servicioId]);

    useEffect(() => { cargarPisos(); }, [cargarPisos]);

    // ─── Crear ───────────────────────────────────────────────────────────────
    const handleCrear = async (e) => {
        e.preventDefault();
        if (!nuevoPiso.trim() || creando) return;
        setCreando(true);
        setError('');
        const result = await crearPiso(servicioId, nuevoPiso.trim());
        if (result.success) {
            setPisos((prev) => [...prev, result.data]);
            setNuevoPiso('');
        } else {
            setError(result.error);
        }
        setCreando(false);
    };

    // ─── Editar ──────────────────────────────────────────────────────────────
    const abrirEdicion = (piso) => {
        setEditId(pisoId(piso));
        setEditNombre(pisoNombre(piso));
    };
    const cancelarEdicion = () => { setEditId(null); setEditNombre(''); };

    const guardarEdicion = async () => {
        if (!editNombre.trim() || guardando) return;
        setGuardando(true);
        setError('');
        const result = await actualizarPiso(editId, editNombre.trim());
        if (result.success) {
            setPisos((prev) => prev.map((p) => (pisoId(p) === editId ? result.data : p)));
            cancelarEdicion();
        } else {
            setError(result.error);
        }
        setGuardando(false);
    };

    // ─── Eliminar ──────────────────────────────────────────────────────────────
    const abrirConfirmEliminar = async (piso) => {
        setConfirmDel(piso);
        setTurnosAsociados(0);
        setLoadingImpacto(true);
        const result = await getTurnosAsociados(pisoId(piso));
        setTurnosAsociados(result.success ? result.data : 0);
        setLoadingImpacto(false);
    };

    const handleEliminar = async () => {
        if (!confirmDel || eliminando) return;
        setEliminando(true);
        setError('');
        const result = await eliminarPiso(pisoId(confirmDel));
        if (result.success) {
            setPisos((prev) => prev.filter((p) => pisoId(p) !== pisoId(confirmDel)));
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtFade .3s ease', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
                    <SGTIcon name="chevron-left" size={24} color={PA.ink} />
                </button>
                <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink }}>Pisos del Servicio</div>
            </div>

            <div style={{ flex: 1, padding: '20px 16px', overflow: 'auto' }}>
                <p style={{ color: PA.ink2, fontSize: 14, marginBottom: 24, fontWeight: 600 }}>
                    Administra los pisos o niveles disponibles en este servicio.
                </p>

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
                    <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3 }}>Nuevo Piso</label>
                    <form onSubmit={handleCrear} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input
                            type="text"
                            placeholder="Ej: Piso 1, Urgencias…"
                            value={nuevoPiso}
                            onChange={(e) => setNuevoPiso(e.target.value)}
                            disabled={creando}
                            style={inputStyle}
                        />
                        <button
                            type="submit"
                            disabled={!nuevoPiso.trim() || creando}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '0 18px', background: (!nuevoPiso.trim() || creando) ? PA.line : PA.primary,
                                color: (!nuevoPiso.trim() || creando) ? PA.ink3 : '#fff',
                                border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800,
                                cursor: (!nuevoPiso.trim() || creando) ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                            }}>
                            <Plus size={16} /> {creando ? 'Guardando…' : 'Agregar'}
                        </button>
                    </form>
                </div>

                {/* Lista de pisos */}
                <div>
                    <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3, marginBottom: 8, display: 'block' }}>
                        Pisos Registrados
                    </label>

                    {loading ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: PA.ink3, fontWeight: 600, fontSize: 14 }}>
                            Cargando datos…
                        </div>
                    ) : pisos.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', background: '#fff', border: `1px solid ${PA.line}`, borderRadius: 12, color: PA.ink3, fontWeight: 600, fontSize: 14 }}>
                            No hay pisos registrados en este servicio.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {pisos.map((piso) => {
                                const pId = pisoId(piso);
                                const enEdicion = editId === pId;
                                return (
                                    <div key={pId} style={{
                                        padding: '12px 14px', background: '#fff', borderRadius: 12,
                                        border: `1px solid ${PA.line2}`, display: 'flex',
                                        alignItems: 'center', gap: 10,
                                    }}>
                                        <div style={{
                                            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                                            background: PA.surface2, display: 'grid', placeItems: 'center',
                                        }}>
                                            <Building2 size={18} color={PA.primary} />
                                        </div>

                                        {enEdicion ? (
                                            <>
                                                <input
                                                    autoFocus
                                                    value={editNombre}
                                                    onChange={(e) => setEditNombre(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') guardarEdicion();
                                                        if (e.key === 'Escape') cancelarEdicion();
                                                    }}
                                                    disabled={guardando}
                                                    style={{
                                                        flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 8,
                                                        border: `1px solid ${PA.primary}`, fontSize: 15, fontWeight: 700,
                                                        color: PA.ink, outline: 'none', boxSizing: 'border-box',
                                                    }}
                                                />
                                                <button
                                                    onClick={guardarEdicion}
                                                    disabled={!editNombre.trim() || guardando}
                                                    style={{
                                                        background: 'transparent', border: 'none', cursor: 'pointer',
                                                        display: 'flex', padding: 6, color: PA.primary,
                                                        opacity: (!editNombre.trim() || guardando) ? 0.4 : 1,
                                                    }}
                                                    title="Guardar"
                                                >
                                                    <Check size={20} />
                                                </button>
                                                <button
                                                    onClick={cancelarEdicion}
                                                    disabled={guardando}
                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 6, color: PA.ink3 }}
                                                    title="Cancelar"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, color: PA.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {pisoNombre(piso)}
                                                </div>
                                                <button
                                                    onClick={() => abrirEdicion(piso)}
                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 6, color: PA.ink3 }}
                                                    title="Editar"
                                                >
                                                    <Pencil size={17} />
                                                </button>
                                                <button
                                                    onClick={() => abrirConfirmEliminar(piso)}
                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 6, color: PA.warn || '#DC2626' }}
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={17} />
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

            {/* Confirmación de eliminación */}
            {confirmDel && (
                <ConfirmDeletePiso
                    PA={PA}
                    nombre={pisoNombre(confirmDel)}
                    turnos={turnosAsociados}
                    loadingImpacto={loadingImpacto}
                    eliminando={eliminando}
                    onConfirm={handleEliminar}
                    onCancel={() => setConfirmDel(null)}
                />
            )}
        </div>
    );
};

// ─── Bottom-sheet de confirmación de eliminación ────────────────────────────
function ConfirmDeletePiso({ PA, nombre, turnos, loadingImpacto, eliminando, onConfirm, onCancel }) {
    const bloqueado = turnos > 0;
    const warn = PA.warn || '#DC2626';
    const warnSoft = PA.warnSoft || '#FEF2F2';

    return (
        <div
            onClick={onCancel}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#fff', borderRadius: '20px 20px 0 0',
                    padding: '8px 20px 36px', width: '100%', maxWidth: 480,
                    boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 16 }}>
                    <div style={{ width: 40, height: 4, background: PA.line, borderRadius: 99 }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: warnSoft, display: 'grid', placeItems: 'center' }}>
                        <Trash2 size={26} color={warn} />
                    </div>
                </div>

                <div style={{ fontWeight: 800, fontSize: 18, color: PA.ink, textAlign: 'center', marginBottom: 10 }}>
                    ¿Eliminar piso?
                </div>

                <p style={{ fontSize: 14, color: PA.ink2, margin: '0 0 6px', lineHeight: 1.55, textAlign: 'center' }}>
                    Estás a punto de eliminar <strong style={{ color: PA.ink }}>{nombre}</strong>.
                </p>

                {loadingImpacto ? (
                    <p style={{ fontSize: 13, color: PA.ink3, margin: '0 0 24px', lineHeight: 1.5, textAlign: 'center' }}>
                        Verificando turnos asociados…
                    </p>
                ) : bloqueado ? (
                    <div style={{ background: warnSoft, borderRadius: 12, padding: '12px 14px', margin: '4px 0 22px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <AlertCircle size={16} color={warn} style={{ flexShrink: 0, marginTop: 1 }} />
                        <div style={{ fontSize: 13, color: PA.ink2, lineHeight: 1.5 }}>
                            No se puede eliminar: el piso está asociado a{' '}
                            <strong style={{ color: PA.ink }}>{turnos} turno{turnos === 1 ? '' : 's'}</strong>.
                            Reasigna esos turnos a otro piso antes de eliminarlo.
                        </div>
                    </div>
                ) : (
                    <p style={{ fontSize: 13, color: PA.ink3, margin: '0 0 24px', lineHeight: 1.5, textAlign: 'center' }}>
                        No tiene turnos asociados. Esta acción no se puede deshacer.
                    </p>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={onCancel}
                        style={{
                            flex: 1, padding: '13px 0', borderRadius: 12,
                            border: `1.5px solid ${PA.line}`, background: 'none',
                            color: PA.ink2, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                        }}
                    >
                        {bloqueado ? 'Entendido' : 'Cancelar'}
                    </button>
                    {!bloqueado && (
                        <button
                            onClick={onConfirm}
                            disabled={eliminando || loadingImpacto}
                            style={{
                                flex: 1, padding: '13px 0', borderRadius: 12,
                                border: 'none', background: warn, color: '#fff',
                                fontSize: 15, fontWeight: 700,
                                cursor: (eliminando || loadingImpacto) ? 'not-allowed' : 'pointer',
                                opacity: (eliminando || loadingImpacto) ? 0.7 : 1,
                            }}
                        >
                            {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PisosView;
