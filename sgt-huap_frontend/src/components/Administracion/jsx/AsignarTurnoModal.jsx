import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, AlertTriangle, RefreshCw, UserPlus } from 'lucide-react';
import adminService from '../../../services/adminService';

const AsignarTurnoModal = ({ isOpen, onClose, turno, fechaSeleccionada = null, onSuccess = null }) => {
    const [medicoSeleccionado, setMedicoSeleccionado] = useState('');
    const [motivo, setMotivo] = useState('');
    const [todosMedicos, setTodosMedicos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showConfirmacion, setShowConfirmacion] = useState(false);

    useEffect(() => {
        if (isOpen) {
            cargarMedicos();
            setMedicoSeleccionado('');
            setMotivo('');
            setShowConfirmacion(false);
        }
    }, [isOpen]);

    const cargarMedicos = async () => {
        try {
            const usuarios = await adminService.usuarios.getAll();
            const medicos = usuarios?.filter(p =>
                p.tipoCargoNombre?.toLowerCase().includes('medico') ||
                p.tipoCargoNombre?.toLowerCase().includes('médico') ||
                p.rol?.toLowerCase().includes('medico') ||
                p.rol?.toLowerCase().includes('médico')
            ) || [];
            setTodosMedicos(medicos);
        } catch (error) {
            console.error('Error cargando médicos:', error);
        }
    };

    const handleAsignarClick = () => {
        if (!medicoSeleccionado) {
            alert('Debe seleccionar un médico');
            return;
        }
        if (!motivo || motivo.trim() === '') {
            alert('Debe proporcionar un motivo');
            return;
        }
        // Mostrar confirmación
        setShowConfirmacion(true);
    };

    const handleConfirmarAsignacion = async () => {
        setLoading(true);
        try {
            const adminId = JSON.parse(localStorage.getItem('user_data'))?.userId;

            const request = {
                idTurno: turno.id,
                accion: 'ASIGNAR',
                idAdministrador: adminId,
                idNuevoMedico: Number(medicoSeleccionado),
                motivo: motivo.trim()
            };

            console.log('Enviando request de asignación:', request);
            await adminService.turnos.alterar(request);
            alert('Turno asignado exitosamente');

            setShowConfirmacion(false);

            if (onSuccess) {
                await onSuccess();
            }
            onClose();
        } catch (error) {
            console.error('Error asignando turno:', error);
            alert('Error al asignar turno: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const formatearFecha = (fecha) => {
        if (!fecha) return 'N/A';
        const [year, month, day] = fecha.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const opciones = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        return date.toLocaleDateString('es-ES', opciones)
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const formatearHora = (hora) => {
        if (!hora) return 'N/A';
        const [horas, minutos] = hora.split(':');
        return `${horas}:${minutos}`;
    };

    const medicoInfo = todosMedicos.find(m => m.idPersonal === Number(medicoSeleccionado));

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                width: '90%',
                maxWidth: '600px',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#f0fdf4'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#166534', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <UserPlus size={24} color="#16a34a" />
                            Asignar Turno
                        </h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                            Asignar un médico a este turno sin asignar
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '6px'
                        }}
                    >
                        <X size={20} color="#6b7280" />
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px'
                }}>
                    {/* Información del turno */}
                    <div style={{
                        backgroundColor: '#f9fafb',
                        padding: '16px',
                        borderRadius: '10px',
                        marginBottom: '20px',
                        border: '1px solid #e5e7eb'
                    }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Información del Turno
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={16} color="#3b82f6" />
                                <div>
                                    <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600' }}>Fecha</div>
                                    <div style={{ fontSize: '13px', color: '#1f2937', fontWeight: '500' }}>
                                        {formatearFecha(turno?.diaInicioTurno || fechaSeleccionada)}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={16} color="#10b981" />
                                <div>
                                    <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600' }}>Horario</div>
                                    <div style={{ fontSize: '13px', color: '#1f2937', fontWeight: '500' }}>
                                        {formatearHora(turno?.horaInicio)} - {formatearHora(turno?.horaFin)}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600' }}>Piso</div>
                                    <div style={{ fontSize: '13px', color: '#1f2937', fontWeight: '500' }}>
                                        {turno?.nombrePiso || turno?.idPiso || 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Selector de médico */}
                    <div style={{
                        marginBottom: '16px',
                        backgroundColor: '#eff6ff',
                        padding: '16px',
                        borderRadius: '10px',
                        border: '2px solid #3b82f6'
                    }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '13px',
                            fontWeight: '700',
                            color: '#1e40af',
                            marginBottom: '10px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            <User size={16} color="#3b82f6" />
                            Seleccionar Médico
                        </label>
                        <select
                            value={medicoSeleccionado}
                            onChange={(e) => setMedicoSeleccionado(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                border: '2px solid #3b82f6',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                backgroundColor: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="">Seleccione un médico...</option>
                            {todosMedicos.map(medico => (
                                <option key={medico.idPersonal} value={medico.idPersonal}>
                                    {medico.nombre} {medico.apellidoPaterno || ''} - {medico.especialidad || medico.tipoCargoNombre || 'Sin especialidad'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Campo de motivo */}
                    <div style={{
                        marginBottom: '16px',
                        backgroundColor: '#fef3c7',
                        padding: '16px',
                        borderRadius: '10px',
                        border: '2px solid #f59e0b'
                    }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '13px',
                            fontWeight: '700',
                            color: '#92400e',
                            marginBottom: '10px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            <AlertTriangle size={16} color="#f59e0b" />
                            Motivo de la Asignación (Obligatorio)
                        </label>
                        <textarea
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder="Explique detalladamente el motivo de esta asignación..."
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                border: '2px solid #f59e0b',
                                borderRadius: '8px',
                                fontSize: '14px',
                                resize: 'vertical',
                                fontFamily: 'inherit',
                                backgroundColor: 'white',
                                lineHeight: '1.5'
                            }}
                        />
                    </div>

                    {/* Modal de confirmación */}
                    {showConfirmacion && (
                        <div style={{
                            backgroundColor: '#fef2f2',
                            border: '2px solid #dc2626',
                            borderRadius: '10px',
                            padding: '20px',
                            marginBottom: '16px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                <AlertTriangle size={24} color="#dc2626" />
                                <h4 style={{ margin: 0, color: '#991b1b', fontSize: '16px', fontWeight: '700' }}>
                                    ¿Está seguro de asignar este turno?
                                </h4>
                            </div>

                            <div style={{
                                backgroundColor: 'white',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '16px',
                                fontSize: '14px',
                                color: '#374151'
                            }}>
                                <p style={{ margin: '0 0 8px 0' }}>
                                    <strong>Médico:</strong> {medicoInfo?.nombre} {medicoInfo?.apellidoPaterno || ''}
                                </p>
                                <p style={{ margin: '0 0 8px 0' }}>
                                    <strong>Turno:</strong> {formatearFecha(turno?.diaInicioTurno || fechaSeleccionada)}
                                </p>
                                <p style={{ margin: '0 0 8px 0' }}>
                                    <strong>Horario:</strong> {formatearHora(turno?.horaInicio)} - {formatearHora(turno?.horaFin)}
                                </p>
                                <p style={{ margin: '0' }}>
                                    <strong>Piso:</strong> {turno?.nombrePiso || turno?.idPiso || 'N/A'}
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setShowConfirmacion(false)}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        backgroundColor: '#6b7280',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmarAsignacion}
                                    disabled={loading}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: loading
                                            ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                                            : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    {loading ? (
                                        <>
                                            <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                            Procesando...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus size={18} />
                                            Sí, Asignar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Botón principal (solo si no está mostrando confirmación) */}
                    {!showConfirmacion && (
                        <button
                            onClick={handleAsignarClick}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '15px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.4)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}
                        >
                            <UserPlus size={18} />
                            Asignar Turno
                        </button>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #e5e7eb',
                    backgroundColor: '#f9fafb',
                    display: 'flex',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Cerrar
                    </button>
                </div>
            </div>

            <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};

export default AsignarTurnoModal;
