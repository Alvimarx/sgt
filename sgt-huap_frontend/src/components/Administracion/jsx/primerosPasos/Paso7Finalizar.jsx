import React, { useEffect } from 'react';
import '../../css/primerosPasos/Paso7Finalizar.css';

const Paso7Finalizar = ({ onDataSaved }) => {
    
    useEffect(() => {
        // Habilitamos el botón "Finalizar" apenas carga la vista
        if (onDataSaved) onDataSaved();
    }, [onDataSaved]);

    return (
        <div className="paso7-container">
            <div className="p7-card">
                <div className="p7-icon-wrapper">
                    <div className="p7-icon">🎉</div>
                </div>
                <h1>¡Configuración Completada!</h1>
                <p>Has configurado exitosamente todo el sistema de turnos del HUAP.</p>
                
                <div className="p7-summary">
                    <div className="p7-item">✅ Pisos definidos</div>
                    <div className="p7-item">✅ Patrones de turno creados</div>
                    <div className="p7-item">✅ Horarios base configurados</div>
                    <div className="p7-item">✅ Plantilla maestra diseñada</div>
                    <div className="p7-item">✅ Calendario generado</div>
                    <div className="p7-item">✅ Médicos asignados</div>
                </div>

                <div className="p7-message">
                    Haz clic en el botón <strong>"Ir al Panel de Control"</strong> para comenzar a gestionar el sistema.
                </div>
            </div>
        </div>
    );
};

// ESTA LÍNEA ES LA QUE PROBABLEMENTE FALTABA O ESTABA MAL ESCRITA
export default Paso7Finalizar;