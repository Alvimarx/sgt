// PisosView.jsx
import React, { useState, useEffect } from 'react';
import { SGT_DATA } from './data';
import { SGTIcon } from './UIPrimitives';
import { getPisos, crearPiso} from '../../services/pisosService'; 

const PisosView = ({ onBack }) => {
    const PA = SGT_DATA.PALETTE;
    const [pisos, setPisos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [nuevoPiso, setNuevoPiso] = useState('');
    const [creando, setCreando] = useState(false);

    useEffect(() => {
        cargarPisos();
    }, []);

    const cargarPisos = async () => {
        setLoading(true);
        setError('');
        const result = await getPisos();
        if (result.success) {
            // Aseguramos que sea un array dependiendo de la estructura de tu respuesta
            let dataPisos = [];
            if (Array.isArray(result.data)) {
                dataPisos = result.data;
            } else if (result.data && Array.isArray(result.data.pisos)) {
                dataPisos = result.data.pisos;
            }
            setPisos(dataPisos);
        } else {
            setError(result.error);
        }
        setLoading(false);
    };

    const handleCrear = async (e) => {
        e.preventDefault();
        if (!nuevoPiso.trim() || creando) return;
        
        setCreando(true);
        setError('');
        
        const result = await crearPiso(nuevoPiso.trim());
        
        if (result.success) {
            setPisos([...pisos, result.data]);
            setNuevoPiso('');
        } else {
            setError(result.error);
        }
        
        setCreando(false);
    };

    const inputStyle = {
        flex: 1, padding: '14px', borderRadius: 12, border: `1px solid ${PA.line}`,
        background: '#fff', fontSize: 15, color: PA.ink, fontWeight: 600,
        appearance: 'none', outline: 'none', boxSizing: 'border-box'
    };

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtFade .3s ease' }}>
            {/* Header */}
            <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
                    <SGTIcon name="chevron-left" size={24} color={PA.ink} />
                </button>
                <div style={{ fontSize: 19, fontWeight: 800, color: PA.ink }}>Pisos del Recinto</div>
            </div>

            <div style={{ flex: 1, padding: '20px 16px', overflow: 'auto' }}>
                <p style={{ color: PA.ink2, fontSize: 14, marginBottom: 24, fontWeight: 600 }}>
                    Administra los pisos o niveles disponibles en el establecimiento.
                </p>

                {error && (
                    <div style={{ 
                        padding: 12, marginBottom: 16, borderRadius: 10, fontWeight: 700, fontSize: 13,
                        background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA'
                    }}>
                        {error}
                    </div>
                )}

                {/* Formulario de Creación */}
                <div style={{ marginBottom: 24 }}>
                    <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3 }}>Nuevo Piso</label>
                    <form onSubmit={handleCrear} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input 
                            type="text" 
                            placeholder="Ej: Piso 1, Urgencias..."
                            value={nuevoPiso}
                            onChange={(e) => setNuevoPiso(e.target.value)}
                            disabled={creando}
                            style={inputStyle}
                        />
                        <button 
                            type="submit"
                            disabled={!nuevoPiso.trim() || creando}
                            style={{
                                padding: '0 20px', background: (!nuevoPiso.trim() || creando) ? PA.line : PA.primary, 
                                color: (!nuevoPiso.trim() || creando) ? PA.ink3 : '#fff', 
                                border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, 
                                cursor: (!nuevoPiso.trim() || creando) ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                            }}>
                            {creando ? 'Guardando...' : 'Agregar'}
                        </button>
                    </form>
                </div>

                {/* Lista de Pisos */}
                <div>
                    <label style={{ fontSize: 13, fontWeight: 800, color: PA.ink3, marginBottom: 8, display: 'block' }}>
                        Pisos Registrados
                    </label>
                    
                    {loading ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: PA.ink3, fontWeight: 600, fontSize: 14 }}>
                            Cargando datos...
                        </div>
                    ) : pisos.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', background: '#fff', border: `1px solid ${PA.line}`, borderRadius: 12, color: PA.ink3, fontWeight: 600, fontSize: 14 }}>
                            No hay pisos registrados.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {pisos.map((piso, index) => {
                                // Aseguramos tomar el ID y nombre correctos dependiendo de tu DTO Java
                                const pId = piso.idPiso || piso.id || `piso_${index}`;
                                const pNombre = piso.nombrePiso || piso.nombre || piso.descripcion || 'Piso sin nombre';
                                
                                return (
                                    <div key={pId} style={{ 
                                        padding: '14px 16px', background: '#fff', borderRadius: 12, 
                                        border: `1px solid ${PA.line2}`, display: 'flex', 
                                        alignItems: 'center', justifyContent: 'space-between' 
                                    }}>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: PA.ink }}>
                                            {pNombre}
                                        </div>
                                        {/* Opcional: Un botón para editar o eliminar más adelante */}
                                        <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 }}>
                                            <SGTIcon name="edit" size={18} color={PA.ink3} />
                                        </button>
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

export default PisosView;