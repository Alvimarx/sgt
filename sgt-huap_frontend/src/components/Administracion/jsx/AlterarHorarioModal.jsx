import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, AlertTriangle, RefreshCw, UserX } from 'lucide-react';
import adminService from '../../../services/adminService';

const AlterarHorarioModal = ({ isOpen, onClose, doctorId, doctorNombre, fechaSeleccionada = null, onSuccess = null }) => {
  const [turnosFuturos, setTurnosFuturos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accionSeleccionada, setAccionSeleccionada] = useState({});
  const [nuevoMedicoId, setNuevoMedicoId] = useState({});
  const [nuevasHoras, setNuevasHoras] = useState({});
  const [motivos, setMotivos] = useState({});
  const [todosMedicos, setTodosMedicos] = useState([]);
  const [procesando, setProcesando] = useState({});

  useEffect(() => {
    if (isOpen && doctorId) {
      cargarTurnosFuturos();
      cargarMedicos();
    }
  }, [isOpen, doctorId]);

  const cargarTurnosFuturos = async () => {
    setLoading(true);
    try {
      console.log('Cargando turnos para doctorId:', doctorId);
      const turnos = await adminService.turnos.getFuturos(doctorId);
      console.log('Turnos recibidos:', turnos);
      console.log('Cantidad de turnos:', turnos?.length || 0);
      
      // Si hay una fecha seleccionada, filtrar solo los turnos de ese día
      if (fechaSeleccionada) {
        console.log('Filtrando por fecha seleccionada:', fechaSeleccionada);
        const turnosFiltrados = turnos?.filter(t => 
          t.diaInicioTurno === fechaSeleccionada || t.diaFinalTurno === fechaSeleccionada
        ) || [];
        console.log('Turnos filtrados:', turnosFiltrados);
        setTurnosFuturos(turnosFiltrados);
      } else {
        setTurnosFuturos(turnos || []);
      }
    } catch (error) {
      console.error('Error cargando turnos futuros:', error);
      alert('Error al cargar turnos futuros');
    } finally {
      setLoading(false);
    }
  };

  const cargarMedicos = async () => {
    try {
      const usuarios = await adminService.usuarios.getAll();
      const medicos = usuarios?.filter(p => 
        p.tipoCargoNombre?.toLowerCase().includes('medico') ||
        p.tipoCargoNombre?.toLowerCase().includes('médico')
      ) || [];
      setTodosMedicos(medicos);
    } catch (error) {
      console.error('Error cargando médicos:', error);
    }
  };

  const handleAccionChange = (turnoId, accion) => {
    setAccionSeleccionada(prev => ({ ...prev, [turnoId]: accion }));
    // Reset valores cuando cambia acción
    setNuevoMedicoId(prev => {
      const newState = { ...prev };
      delete newState[turnoId];
      return newState;
    });
    setNuevasHoras(prev => {
      const newState = { ...prev };
      delete newState[turnoId];
      return newState;
    });
  };

  const handleAlterarTurno = async (turno) => {
    const accion = accionSeleccionada[turno.id];
    const motivo = motivos[turno.id];

    if (!accion) {
      alert('Seleccione una acción');
      return;
    }

    if (!motivo || motivo.trim() === '') {
      alert('Debe proporcionar un motivo');
      return;
    }

    if (accion === 'REASIGNAR' && !nuevoMedicoId[turno.id]) {
      alert('Debe seleccionar un médico para reasignar');
      return;
    }

    if (accion === 'CAMBIAR_HORAS') {
      const horas = nuevasHoras[turno.id];
      if (!horas?.inicio || !horas?.fin) {
        alert('Debe especificar nueva hora de inicio y fin');
        return;
      }
    }

    setProcesando(prev => ({ ...prev, [turno.id]: true }));

    try {
      const adminId = JSON.parse(localStorage.getItem('user_data'))?.userId;
      console.log('adminId:', adminId);
      
      const request = {
        idTurno: turno.id,
        accion: accion,
        idAdministrador: adminId,
        motivo: motivo.trim()
      };

      if (accion === 'REASIGNAR') {
        request.idNuevoMedico = nuevoMedicoId[turno.id];
      }

      if (accion === 'CAMBIAR_HORAS') {
        const horas = nuevasHoras[turno.id];
        request.nuevaHoraInicio = horas.inicio;
        request.nuevaHoraFin = horas.fin;
      }

      console.log('Enviando request:', request);
      console.log('Datos del turno original:', turno);
      await adminService.turnos.alterar(request);
      alert('✅ Turno alterado exitosamente');
      
      // Limpiar estado del turno
      setAccionSeleccionada(prev => {
        const newState = { ...prev };
        delete newState[turno.id];
        return newState;
      });
      setMotivos(prev => {
        const newState = { ...prev };
        delete newState[turno.id];
        return newState;
      });

      // Recargar turnos
      await cargarTurnosFuturos();
      
      // Notificar al componente padre que hubo cambios
      if (onSuccess) {
        await onSuccess();
      }
    } catch (error) {
      console.error('Error alterando turno:', error);
      console.log('Error response:', error.response);
      alert('❌ Error al alterar turno: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcesando(prev => ({ ...prev, [turno.id]: false }));
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    // Parse YYYY-MM-DD as local date to avoid timezone issues
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

  const obtenerDiferenciaDias = (fecha) => {
    if (!fecha) return '';
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    // Parse YYYY-MM-DD as local date to avoid timezone issues
    const [year, month, day] = fecha.split('-').map(Number);
    const fechaTurno = new Date(year, month - 1, day);
    fechaTurno.setHours(0, 0, 0, 0);
    const diferencia = Math.ceil((fechaTurno - hoy) / (1000 * 60 * 60 * 24));
    
    if (diferencia === 0) return '• Hoy';
    if (diferencia === 1) return '• Mañana';
    if (diferencia > 1 && diferencia <= 7) return `• En ${diferencia} días`;
    return '';
  };

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
        maxWidth: '1000px',
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
          backgroundColor: '#f9fafb'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>
              Alterar Horarios - {doctorNombre}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
              Gestione los turnos futuros asignados
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
              borderRadius: '6px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
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
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Cargando turnos futuros...
            </div>
          ) : turnosFuturos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Calendar size={48} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: '#6b7280', margin: 0 }}>No hay turnos futuros para este médico</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {turnosFuturos.map((turno, index) => {
                const esMismoDia = turno.diaInicioTurno === turno.diaFinalTurno;
                const diferenciaDias = obtenerDiferenciaDias(turno.diaInicioTurno);
                const esHoy = diferenciaDias === '• Hoy';
                const esManana = diferenciaDias === '• Mañana';
                
                return (
                <div
                  key={turno.id || index}
                  style={{
                    border: esHoy ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '20px',
                    backgroundColor: esHoy ? '#eff6ff' : esManana ? '#fef9e7' : '#ffffff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  {/* Badge de urgencia */}
                  {(esHoy || esManana) && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      backgroundColor: esHoy ? '#3b82f6' : '#f59e0b',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                    }}>
                      {diferenciaDias.replace('• ', '')}
                    </div>
                  )}

                  {/* Header del turno con ID */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    paddingBottom: '12px',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '14px'
                      }}>
                        #{turno.id}
                      </div>
                      <div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#6b7280',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Turno ID
                        </div>
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: '700',
                          color: '#1f2937'
                        }}>
                          {turno.nombre || turno.tipoTurno || 'Sin nombre'}
                        </div>
                      </div>
                    </div>
                    {diferenciaDias && !esHoy && !esManana && (
                      <span style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        fontWeight: '600'
                      }}>
                        {diferenciaDias}
                      </span>
                    )}
                  </div>

                  {/* Info del Turno - Grid mejorado */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '16px',
                    marginBottom: '20px'
                  }}>
                    {/* Fecha */}
                    <div style={{
                      backgroundColor: '#f0f9ff',
                      borderLeft: '4px solid #3b82f6',
                      padding: '12px',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <Calendar size={18} color="#3b82f6" />
                        <span style={{ 
                          fontSize: '11px', 
                          color: '#6b7280',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Fecha
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: '600', lineHeight: '1.4' }}>
                        {esMismoDia ? (
                          formatearFecha(turno.diaInicioTurno)
                        ) : (
                          <>
                            {formatearFecha(turno.diaInicioTurno)}
                            <br />
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>hasta</span>
                            <br />
                            {formatearFecha(turno.diaFinalTurno)}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Horario */}
                    <div style={{
                      backgroundColor: '#f0fdf4',
                      borderLeft: '4px solid #10b981',
                      padding: '12px',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <Clock size={18} color="#10b981" />
                        <span style={{ 
                          fontSize: '11px', 
                          color: '#6b7280',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Horario
                        </span>
                      </div>
                      <div style={{ fontSize: '20px', color: '#1f2937', fontWeight: '700', letterSpacing: '-0.5px' }}>
                        {formatearHora(turno.horaInicio)}
                        <span style={{ fontSize: '14px', color: '#6b7280', margin: '0 6px' }}>→</span>
                        {formatearHora(turno.horaFin)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                        {(() => {
                          const inicio = turno.horaInicio ? turno.horaInicio.split(':') : [0, 0];
                          const fin = turno.horaFin ? turno.horaFin.split(':') : [0, 0];
                          const minutosInicio = parseInt(inicio[0]) * 60 + parseInt(inicio[1]);
                          const minutosFin = parseInt(fin[0]) * 60 + parseInt(fin[1]);
                          let duracion = minutosFin - minutosInicio;
                          if (duracion < 0) duracion += 24 * 60;
                          const horas = Math.floor(duracion / 60);
                          return `Duración: ${horas}h`;
                        })()}
                      </div>
                    </div>

                    {/* Piso */}
                    <div style={{
                      backgroundColor: '#faf5ff',
                      borderLeft: '4px solid #8b5cf6',
                      padding: '12px',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                          <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                        <span style={{ 
                          fontSize: '11px', 
                          color: '#6b7280',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Piso
                        </span>
                      </div>
                      <div style={{ fontSize: '24px', color: '#1f2937', fontWeight: '700' }}>
                        {turno.piso || turno.idPiso || 'N/A'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                        Ubicación
                      </div>
                    </div>

                  </div>

                  {/* Selector de Acción */}
                  <div style={{ 
                    marginBottom: '16px',
                    backgroundColor: '#f9fafb',
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <label style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px', 
                      fontWeight: '700', 
                      color: '#374151', 
                      marginBottom: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      <AlertTriangle size={16} color="#f59e0b" />
                      Acción a realizar
                    </label>
                    <select
                      value={accionSeleccionada[turno.id] || ''}
                      onChange={(e) => handleAccionChange(turno.id, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '2px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#3b82f6';
                        e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                      }}
                    >
                      <option value="">Seleccione una acción...</option>
                      <option value="DESASIGNAR">Desasignar turno</option>
                      <option value="REASIGNAR">Reasignar a otro médico</option>
                      <option value="CAMBIAR_HORAS">Cambiar horario</option>
                    </select>
                  </div>

                  {/* Campos condicionales según acción */}
                  {accionSeleccionada[turno.id] === 'REASIGNAR' && (
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
                        Reasignar a
                      </label>
                      <select
                        value={nuevoMedicoId[turno.id] || ''}
                        onChange={(e) => setNuevoMedicoId(prev => ({ ...prev, [turno.id]: Number(e.target.value) }))}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '2px solid #3b82f6',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          backgroundColor: 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <option value="">Seleccione un médico...</option>
                        {todosMedicos
                          .filter(m => m.idPersonal !== doctorId)
                          .map(medico => (
                            <option key={medico.idPersonal} value={medico.idPersonal}>
                              {medico.nombre} {medico.apellidoPaterno || ''} - {medico.especialidad || 'Sin especialidad'}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {accionSeleccionada[turno.id] === 'CAMBIAR_HORAS' && (
                    <div style={{ 
                      marginBottom: '16px',
                      backgroundColor: '#f0fdf4',
                      padding: '16px',
                      borderRadius: '10px',
                      border: '2px solid #10b981'
                    }}>
                      <label style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px', 
                        fontWeight: '700', 
                        color: '#065f46', 
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        <Clock size={16} color="#10b981" />
                        Nuevo horario
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ 
                            display: 'block', 
                            fontSize: '12px', 
                            fontWeight: '700', 
                            color: '#065f46', 
                            marginBottom: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Hora inicio
                          </label>
                          <input
                            type="time"
                            value={nuevasHoras[turno.id]?.inicio || ''}
                            onChange={(e) => setNuevasHoras(prev => ({
                              ...prev,
                              [turno.id]: { ...prev[turno.id], inicio: e.target.value }
                            }))}
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              border: '2px solid #10b981',
                              borderRadius: '8px',
                              fontSize: '16px',
                              fontWeight: '700',
                              backgroundColor: 'white',
                              cursor: 'pointer'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ 
                            display: 'block', 
                            fontSize: '12px', 
                            fontWeight: '700', 
                            color: '#065f46', 
                            marginBottom: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Hora fin
                          </label>
                          <input
                            type="time"
                            value={nuevasHoras[turno.id]?.fin || ''}
                            onChange={(e) => setNuevasHoras(prev => ({
                              ...prev,
                              [turno.id]: { ...prev[turno.id], fin: e.target.value }
                            }))}
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              border: '2px solid #10b981',
                              borderRadius: '8px',
                              fontSize: '16px',
                              fontWeight: '700',
                              backgroundColor: 'white',
                              cursor: 'pointer'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Campo de Motivo */}
                  {accionSeleccionada[turno.id] && (
                    <>
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
                          Motivo (Obligatorio)
                        </label>
                        <textarea
                          value={motivos[turno.id] || ''}
                          onChange={(e) => setMotivos(prev => ({ ...prev, [turno.id]: e.target.value }))}
                          placeholder="Explique detalladamente el motivo de esta alteración..."
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

                      {/* Botón Confirmar */}
                      <button
                        onClick={() => handleAlterarTurno(turno)}
                        disabled={procesando[turno.id]}
                        style={{
                          width: '100%',
                          padding: '16px',
                          background: procesando[turno.id] 
                            ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' 
                            : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: '15px',
                          fontWeight: '700',
                          cursor: procesando[turno.id] ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          transition: 'all 0.2s',
                          boxShadow: procesando[turno.id] 
                            ? 'none' 
                            : '0 4px 12px rgba(59, 130, 246, 0.4)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}
                        onMouseEnter={(e) => {
                          if (!procesando[turno.id]) {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.5)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!procesando[turno.id]) {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                          }
                        }}
                      >
                        {procesando[turno.id] ? (
                          <>
                            <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                            Procesando...
                          </>
                        ) : (
                          <>
                            {accionSeleccionada[turno.id] === 'DESASIGNAR' && <UserX size={18} />}
                            {accionSeleccionada[turno.id] === 'REASIGNAR' && <RefreshCw size={18} />}
                            {accionSeleccionada[turno.id] === 'CAMBIAR_HORAS' && <Clock size={18} />}
                            Confirmar {accionSeleccionada[turno.id].toLowerCase().replace('_', ' ')}
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              );
              })}
            </div>
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
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
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

export default AlterarHorarioModal;
