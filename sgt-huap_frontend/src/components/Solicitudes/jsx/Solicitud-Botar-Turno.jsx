import React, { useState, useEffect } from "react";
import { useMediaQuery } from "react-responsive";
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import axiosInstance from '../../../utils/axiosConfig';

//estilos dependiendo dispositivo
import "../css/movil/Solicitud-Permiso-Movil.css"; 
import "../css/pc/Solicitud-Permiso-Pc.css";
import "../css/tablet/Solicitud-Permiso-Tablet.css";

export default function SolicitudBotarTurno() {
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [motivo, setMotivo] = useState('');
    
    const [tipoAutorizacion, setTipoAutorizacion] = useState('');
    
    //Almacena el ID único del turno a botar
    const [turnoId, setTurnoId] = useState(null); 

    const navigate = useNavigate();
    const location = useLocation();
    const auth = useAuth();
    const { refresh } = useNotifications();
    
    // Obtener ID del médico
    const medicoId = auth?.user?.id || localStorage.getItem('userId');

    //OPCIONES DE PERMISO
    const PERMISO_OPTIONS = [
        "Motivos personales", 
        "Licencia médica", 
        "Feriado legal", 
        "Permiso administrativo"
    ];

    // LÓGICA DE PRE-LLENADO (FECHA + RANGO HORARIO)
    useEffect(() => {
        const state = location.state || {};
        // Buscamos el turno con ambos nombres posibles para evitar errores
        const turnoRecibido = state.turnoSeleccionado || state.turnoALiberar;

        if (turnoRecibido) {
            console.log("Datos del turno recibidos:", turnoRecibido);
            
            // ALMACENAR EL ID DEL TURNO
            if (turnoRecibido.id) {
                setTurnoId(turnoRecibido.id);
            }
            // ------------------------------------------

            // 1. Extraer Fechas (YYYY-MM-DD)
            let inicio = turnoRecibido.diaInicioTurno;
            let fin = turnoRecibido.diaFinalTurno || inicio;

            if (inicio && inicio.includes('T')) inicio = inicio.split('T')[0];
            if (fin && fin.includes('T')) fin = fin.split('T')[0];

            // 2. Extraer y Limpiar Horas (HH:mm)
            let horaIni = turnoRecibido.horaInicio || "00:00";
            let horaFn = turnoRecibido.horaFin || "23:59";

            const formatTime = (t) => (t && t.length > 5) ? t.substring(0, 5) : t;
            
            const horaIniFmt = formatTime(horaIni);
            const horaFnFmt = formatTime(horaFn);

            if (inicio) {
                setFechaInicio(inicio);
                setFechaFin(fin);
                
                // 3. Formatear Fecha para el mensaje (DD/MM/YYYY)
                let fechaMensaje = inicio;
                try {
                    const [year, month, day] = inicio.split('-');
                    fechaMensaje = `${day}/${month}/${year}`;
                } catch (e) {
                    console.warn("Error formateando fecha visual");
                }

                // 4. Construir el mensaje con el rango horario
                setMotivo(`Solicito botar el turno asignado para el día ${fechaMensaje} desde las ${horaIniFmt} hasta las ${horaFnFmt}.`);
                
                // 5. Establecer un tipo por defecto para que la validación pase
                setTipoAutorizacion("Botar turno"); 
            }
        }
    }, [location]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!medicoId) {
            alert('Error: No se pudo identificar al médico. Por favor inicie sesión nuevamente.');
            return;
        }

        //Validación crucial para evitar el error
        if (!turnoId) {
            alert('Error: El ID del turno a botar no ha sido cargado. Por favor, asegúrese de seleccionar el turno desde el calendario.');
            return;
        }

        const fechaInicioConHora = `${fechaInicio}T00:00:00`;
        const fechaFinConHora = `${fechaFin}T23:59:59`;

        const solicitudDTO = {
            fechaInicio: fechaInicioConHora,
            fechaFin: fechaFinConHora,
            motivo: motivo,
            tipoAutorizacion: tipoAutorizacion || "Botar turno", 
            turnoId: turnoId 
        };

        try {
            const response = await axiosInstance.post(`/solicitudes/botar-turno/${medicoId}`, solicitudDTO);
            
            alert('Solicitud de devolución de turno enviada con éxito');

            setFechaInicio('');
            setFechaFin('');
            setTipoAutorizacion('');
            setMotivo('');
            setTurnoId(null);
            try { await refresh(); } catch (e) { console.warn('Refresh notifications failed', e); }
            navigate('/solicitudes'); 

        } catch (error) {
            console.error('Error al enviar la solicitud:', error);
            // Mostrar mensaje detallado de error del backend
            const errorMessage = error.response?.data?.message 
                || (typeof error.response?.data === 'string' ? error.response?.data : '')
                || error.message 
                || 'Error de conexión con el servidor';
            
            alert(`Error al enviar solicitud: ${errorMessage}`);
        }
    };

    const handleCancelar = () => {
        navigate(-1);
    };

    const isMobile = useMediaQuery({ maxWidth: 768 });
    const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });
    const isDesktop = useMediaQuery({ minWidth: 1025 });

    const getLayoutClass = () => {
        if (isMobile) return 'mobile';
        if (isTablet) return 'tablet';
        if (isDesktop) return 'desktop';
        return '';
    };

    return (
        <React.Fragment>
            <div className={`solicitud-permiso-root ${getLayoutClass()}`}>
                <div className="modal-overlay">
                    <div className="modal-content">
                        
                        <div className="modal-header">
                            <h3 className="modal-title">Eliminar Turno</h3>
                            <button className="modal-close-btn" onClick={handleCancelar}>&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="form-container">
                            
                            {turnoId === null && (
                                <p style={{color: 'red', fontSize: '0.8rem', textAlign: 'center'}}>
                                    No se detectó ID de turno. No podrá enviar la solicitud.
                                </p>
                            )}

                            {/*TIPO DE PERMISO*/}
                            <div className="form-section">
                                <label htmlFor="tipoAutorizacion" className="form-label">Tipo de Autorización</label>
                                <select
                                    id="tipoAutorizacion"
                                    value={tipoAutorizacion}
                                    onChange={(e) => setTipoAutorizacion(e.target.value)}
                                    className="input-field"
                                    required
                                >
                                    <option value="">Seleccione...</option>
                                    {PERMISO_OPTIONS.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-section">
                                <label htmlFor="fechaInicio" className="form-label">Fecha inicio del turno</label>
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
                                <label htmlFor="fechaFin" className="form-label">Fecha fin del turno</label>
                                <input
                                    type="date"
                                    id="fechaFin"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                    className="input-field"
                                    required
                                />
                            </div>

                            <div className="form-section">
                                <label htmlFor="motivo" className="form-label">Motivo de la devolución</label>
                                <textarea
                                    id="motivo"
                                    value={motivo}
                                    onChange={(e) => setMotivo(e.target.value)}
                                    className="input-field textarea"
                                    placeholder="Explique por qué necesita devolver este turno..."
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