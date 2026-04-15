import React, { useState, useEffect } from 'react';
import { useMediaQuery } from 'react-responsive';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import axiosInstance from '../../../utils/axiosConfig';

// Estilos dependiendo dispositivo
import "../css/movil/Solicitud-Permiso-Movil.css";
import "../css/pc/Solicitud-Permiso-Pc.css";
import "../css/tablet/Solicitud-Permiso-Tablet.css";

export default function SolicitudPermiso() {
    const [tipoPermiso, setTipoPermiso] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [descripcion, setDescripcion] = useState('');
    
    // ESTADO: IDs de los turnos que el usuario selecciona para el permiso
    const [turnosSeleccionados, setTurnosSeleccionados] = useState([]); 
    
    // ESTADO: Turnos afectados y Mapa de Pisos
    const [turnosAfectados, setTurnosAfectados] = useState([]);
    const [loadingTurnos, setLoadingTurnos] = useState(false);
    const [pisosMap, setPisosMap] = useState({});

    const navigate = useNavigate();
    const location = useLocation();
    const auth = useAuth();
    const medicoId = auth?.user?.id || localStorage.getItem('userId');
    const { refresh } = useNotifications();

    // ==================================================================================
    // 1. CARGAR CATÁLOGO DE PISOS 
    // ==================================================================================
    useEffect(() => {
        const fetchPisos = async () => {
            try {
                const response = await axiosInstance.get('/pisos');
                const map = {};
                if (response.data) {
                    response.data.forEach(piso => {
                        map[piso.id] = piso.nombre; 
                    });
                }
                setPisosMap(map);
            } catch (error) {
                console.error("Error al cargar mapa de pisos:", error);
            }
        };
        fetchPisos();
    }, []);

    // ==================================================================================
    // 2. BÚSQUEDA AUTOMÁTICA DE TURNOS AFECTADOS
    // ==================================================================================
    useEffect(() => {
        const buscarConflictos = async () => {
            if (!fechaInicio || !fechaFin || !medicoId) {
                setTurnosAfectados([]);
                setTurnosSeleccionados([]); 
                return;
            }

            setLoadingTurnos(true);
            try {
                const response = await axiosInstance.get('/turnos/'); 
                const todosLosTurnos = response.data || [];

                const conflictos = todosLosTurnos.filter(t => {
                    const idDelTurno = t.idMedico || t.id_medico;
                    const esMio = Number(idDelTurno) === Number(medicoId);
                    if (!esMio) return false;

                    const fechaTurnoRaw = t.diaInicioTurno || '';
                    const fechaTurno = fechaTurnoRaw.includes('T') ? fechaTurnoRaw.split('T')[0] : fechaTurnoRaw;
                    
                    return fechaTurno >= fechaInicio && fechaTurno <= fechaFin;
                });

                setTurnosAfectados(conflictos);
                
                //Filtra los turnos seleccionados para que sigan en el nuevo rango
                const nuevosIdsAfectados = conflictos.map(t => t.id);
                setTurnosSeleccionados(prev => 
                    prev.filter(id => nuevosIdsAfectados.includes(id))
                );

            } catch (error) {
                console.error("Error buscando turnos afectados:", error);
            } finally {
                setLoadingTurnos(false);
            }
        };

        const timeoutId = setTimeout(() => {
            buscarConflictos();
        }, 600);

        return () => clearTimeout(timeoutId);

    }, [fechaInicio, fechaFin, medicoId]);

    // 3. MANEJO DE TURNO SELECCIONADO
    const handleTurnoSelect = (turnoId, isChecked) => {
        const id = Number(turnoId); 

        if (isChecked) {
            setTurnosSeleccionados(prev => [...prev.filter(t => t !== id), id]);
        } else {
            setTurnosSeleccionados(prev => prev.filter(t => t !== id));
        }
    };


    // 4. ENVÍO DEL FORMULARIO
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!medicoId) {
            alert('Error: No se pudo obtener el ID del médico.');
            return;
        }

        const fechaInicioConHora = `${fechaInicio}T00:00:00`;
        const fechaFinConHora = `${fechaFin}T23:59:59`;

        //SERIALIZAR LOS TURNOS SELECCIONADOS EN TEXTO
        const turnosInfo = turnosSeleccionados.map(id => {
            const turno = turnosAfectados.find(t => t.id === id);
            if (turno) {
                // Usamos formato de la imagen de ejemplo
                const fecha = formatFechaVisual(turno.diaInicioTurno);
                const hora = `${formatHora(turno.horaInicio)} - ${formatHora(turno.horaFin)}`;
                const piso = getNombrePiso(turno.idPiso);
                return `\n* 📅 ${fecha} | 🕒 ${hora} | 🏰 ${piso}`;
            }
            return `\n* Turno ID ${id} (Info no disponible)`;
        }).join('');
        
        // Combinamos el motivo del usuario con la lista de turnos seleccionados
        const descripcionFinal = `${descripcion}\n\nTurnos Afectados:\n${turnosInfo}`;
        
        const solicitudDTO = {
            tipoPermiso: tipoPermiso,
            fechaInicioPermiso: fechaInicioConHora,
            fechaTerminoPermiso: fechaFinConHora,
            descripcion: descripcionFinal, //Campo que se guarda en el backend
            turnosAfectadosIds: turnosSeleccionados, //Se envía, pero si el backend lo ignora, no hay problema.
        };

        try {
            const response = await axiosInstance.post(`/solicitudes/permiso/${medicoId}`, solicitudDTO);
            alert('Solicitud de permiso enviada con éxito.');
            setTipoPermiso('');
            setFechaInicio('');
            setFechaFin('');
            setDescripcion('');
            setTurnosAfectados([]);
            setTurnosSeleccionados([]);
            try { await refresh(); } catch (e) { console.warn('refresh failed', e); }
            navigate('/solicitudes');
        } catch (error) {
            console.error('Error al enviar:', error);
            alert(`Error al enviar solicitud: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleCancelar = () => navigate(-1);

    const formatFechaVisual = (fechaIso) => {
        if (!fechaIso) return '';
        const clean = fechaIso.includes('T') ? fechaIso.split('T')[0] : fechaIso;
        const [y, m, d] = clean.split('-');
        return `${d}/${m}/${y}`;
    };

    const formatHora = (hora) => {
        if (!hora) return '';
        return hora.length > 5 ? hora.substring(0, 5) : hora;
    }

    const getNombrePiso = (idPiso) => {
        if (!idPiso) return 'Sin piso asignado';
        return pisosMap[idPiso] || idPiso;
    };

    const isMobile = useMediaQuery({ maxWidth: 768 });
    const getLayoutClass = () => isMobile ? 'mobile' : 'desktop';

    return (
        <React.Fragment>
            <div className={`solicitud-permiso-root ${getLayoutClass()}`}>
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3 className="modal-title">Solicitar Permiso</h3>
                            <button className="modal-close-btn" onClick={handleCancelar}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="form-container">
                            
                            <div className="form-section">
                                <label htmlFor="tipoPermiso" className="form-label">Tipo de Permiso</label>
                                <select
                                    id="tipoPermiso"
                                    value={tipoPermiso}
                                    onChange={(e) => setTipoPermiso(e.target.value)}
                                    className="input-field"
                                    required
                                >
                                    <option value="">Seleccione...</option>
                                    <option value="Motivos personales">Motivos personales</option>
                                    <option value="Licencia médica">Licencia médica</option>
                                    <option value="Feriado legal">Feriado legal</option>
                                    <option value="Permiso administrativo">Permiso administrativo</option>

                                </select>
                            </div>

                            <div className="form-section">
                                <label htmlFor="fechaInicio" className="form-label">Fecha de inicio</label>
                                <input
                                    type="date"
                                    id="fechaInicio"
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                    className="input-field"
                                    required
                                />
                            </div>

                            <div className="form-section">
                                <label htmlFor="fechaFin" className="form-label">Fecha de fin</label>
                                <input
                                    type="date"
                                    id="fechaFin"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                    className="input-field"
                                    required
                                />
                            </div>

                            {/* --- LISTA DE TURNOS AFECTADOS con Checkboxes --- */}
                            <div className="form-section" style={{marginTop: '15px', marginBottom: '15px'}}>
                                <label className="form-label" style={{marginBottom: '8px', display: 'block', color: '#4b5563'}}>
                                    Turnos afectados por este permiso (Selecciona cuáles liberar):
                                </label>
                                <div className="lista-turnos-afectados" style={{
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    backgroundColor: '#f8fafc',
                                    maxHeight: '200px',
                                    overflowY: 'auto'
                                }}>
                                    {loadingTurnos ? (
                                        <p style={{color:'#64748b', fontSize:'0.9rem', fontStyle:'italic', margin:0, textAlign:'center'}}>
                                            Buscando coincidencias...
                                        </p>
                                    ) : turnosAfectados.length > 0 ? (
                                        <ul style={{listStyle:'none', padding:0, margin:0}}>
                                            {turnosAfectados.map((t) => (
                                                <li key={t.id} style={{
                                                    padding: '10px',
                                                    marginBottom: '8px',
                                                    backgroundColor: '#ffffff',
                                                    borderRadius: '6px',
                                                    border: turnosSeleccionados.includes(t.id) ? '1px solid #3b82f6' : '1px solid #e2e8f0', 
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '4px'
                                                }}>
                                                    {/* Contenedor del Checkbox y la info principal */}
                                                    <div style={{display:'flex', alignItems:'center', borderBottom:'1px solid #f1f5f9', paddingBottom:'4px', marginBottom:'4px'}}>
                                                        
                                                        {/* Checkbox para seleccionar el turno */}
                                                        <input 
                                                            type="checkbox"
                                                            id={`turno-${t.id}`}
                                                            checked={turnosSeleccionados.includes(t.id)}
                                                            onChange={(e) => handleTurnoSelect(t.id, e.target.checked)}
                                                            style={{marginRight: '10px', minWidth: '20px', minHeight: '20px', cursor: 'pointer'}}
                                                        />

                                                        {/* Label que contiene la información visual */}
                                                        <label htmlFor={`turno-${t.id}`} style={{flexGrow: 1, cursor: 'pointer', display: 'flex', justifyContent:'space-between', alignItems:'center'}}>
                                                            <span style={{fontWeight:'700', color:'#1e293b', fontSize:'0.95rem'}}>
                                                                📅 {formatFechaVisual(t.diaInicioTurno)}
                                                            </span>
                                                            <span style={{
                                                                fontSize:'0.75rem', 
                                                                backgroundColor:'#e0f2fe', 
                                                                color:'#0369a1', 
                                                                padding:'2px 8px', 
                                                                borderRadius:'10px',
                                                                fontWeight: '600'
                                                            }}>
                                                                {t.tipoTurno || 'Turno'}
                                                            </span>
                                                        </label>
                                                    </div>
                                                    
                                                    <div style={{fontSize:'0.9rem', color:'#475569', display:'flex', flexDirection:'column', gap:'4px', paddingLeft: '30px'}}>
                                                        <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                                                            <span>🕒</span> 
                                                            <strong>Horario:</strong> 
                                                            {formatHora(t.horaInicio)} - {formatHora(t.horaFin)}
                                                        </div>
                                                        <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                                                            <span>🏥</span> 
                                                            <strong>Piso:</strong> 
                                                            {getNombrePiso(t.idPiso)}
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div style={{textAlign:'center', padding:'15px 0'}}>
                                            {fechaInicio && fechaFin ? (
                                                <span style={{color:'#22c55e', fontSize:'0.9rem', fontWeight:'600', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px'}}>
                                                    ✅ No hay turnos afectados en ese rango.
                                                </span>
                                            ) : (
                                                <span style={{color:'#94a3b8', fontSize:'0.9rem'}}>
                                                    Selecciona las fechas para verificar.
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-section">
                                <label htmlFor="descripcion" className="form-label">Descripción detallada</label>
                                <textarea
                                    id="descripcion"
                                    value={descripcion}
                                    onChange={(e) => setDescripcion(e.target.value)}
                                    className="input-field textarea"
                                    placeholder="Proporciona detalles sobre tu solicitud de permiso."
                                    rows="4"
                                    required
                                ></textarea>
                            </div>

                            <div className="button-group">
                                <button type="button" className="btn-cancel" onClick={handleCancelar}>
                                    CANCELAR
                                </button>
                                <button type="submit" className="btn-submit">
                                    ENVIAR SOLICITUD
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}