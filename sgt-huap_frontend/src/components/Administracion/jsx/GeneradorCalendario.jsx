import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from "../../../utils/axiosConfig";
import { generarTurnosReales, COLORES_DIAS } from '../../../utils/PlantillaEngine';
import StepNavigator from './StepNavigator';

// ==========================================
// ESTILOS CSS INCRUSTADOS
// ==========================================
const styles = `
  /* ESTILOS DE OVERLAY DE CARGA */
  .gc-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background-color: rgba(255, 255, 255, 0.95); z-index: 9999;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    backdrop-filter: blur(5px);
  }
  .gc-spinner {
    width: 60px; height: 60px; border: 6px solid #f3f3f3;
    border-top: 6px solid #3498db; border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  
  .gc-progress-text { margin-top: 24px; font-size: 1.5rem; color: #1e293b; font-weight: 800; }
  .gc-progress-sub { font-size: 1rem; color: #64748b; margin-top: 8px; }
  
  .gc-progress-bar-container {
    width: 320px; height: 12px; background-color: #e2e8f0; border-radius: 6px;
    margin-top: 20px; overflow: hidden;
  }
  .gc-progress-bar-fill {
    height: 100%; background-color: #3b82f6; transition: width 0.3s ease;
  }

  /* ESTILOS GENERALES */
  .gc-page {
    min-height: 100vh;
    background-color: #f5f7fb;
    padding: 40px 20px;
    display: flex;
    justify-content: center;
    color-scheme: light;
  }
  .gc-card {
    background: white;
    max-width: 1200px;
    width: 100%;
    padding: 32px;
    border-radius: 16px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    border: 1px solid #e2e8f0;
  }
  .gc-card h1 { color: #17416c; margin: 0 0 8px 0; font-size: 24px; line-height: 1.4; }
  .gc-card p { color: #64748b; margin: 0 0 24px 0; font-size: 15px; }
  .gc-error { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; margin-bottom: 20px; text-align: center; border: 1px solid #fca5a5; font-weight: 500; }

  /* Controles Superiores */
  .gc-controls-wrapper { background-color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 30px; }
  .gc-section-label { display: block; font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  .gc-full-row { width: 100%; margin-bottom: 24px; }
  .gc-pisos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  .gc-piso-card { background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; cursor: pointer; transition: all 0.2s; position: relative; display: flex; justify-content: space-between; align-items: center; }
  .gc-piso-card:hover { border-color: #17416c; background: #f0f9ff; transform: translateY(-1px); }
  .gc-piso-card.selected { background: #eff6ff; border-color: #17416c; box-shadow: 0 2px 4px rgba(23, 65, 108, 0.15); }
  .gc-piso-info { display: flex; flex-direction: column; }
  .gc-piso-name { font-weight: 700; color: #0f172a; font-size: 14px; }
  .gc-piso-plantilla { font-size: 11px; color: #64748b; margin-top: 2px; }
  .gc-check { color: #17416c; font-weight: 900; font-size: 16px; }

  .gc-row { display: flex; gap: 20px; align-items: flex-end; margin-bottom: 16px; flex-wrap: wrap; }
  .gc-field { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 150px; }
  .gc-field label { font-weight: 600; color: #334155; font-size: 13px; text-transform: uppercase; }
  .gc-field input, .gc-field select { padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 14px; background-color: #ffffff!important; color: #0f172a!important; }
  .gc-field input:focus, .gc-field select:focus { outline: none; border-color: #17416c; box-shadow: 0 0 0 3px rgba(23, 65, 108, 0.15); }
  .gc-static-val { padding: 10px 12px; background-color: #e2e8f0; border-radius: 8px; color: #475569; font-weight: 500; font-size: 14px; }

  .gc-toggle-group { display: flex; background: #e2e8f0; padding: 4px; border-radius: 8px; gap: 4px; }
  .gc-toggle-btn { padding: 6px 16px; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; color: #64748b; background: transparent; transition: all 0.2s; }
  .gc-toggle-btn.active { background: white; color: #17416c; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); }
  .gc-toggle-label { margin-right: 10px; align-self: center; font-weight: 600; color: #334155; font-size: 13px; }
  
  .gc-btn { padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: transform 0.1s ease, background-color 0.2s; font-size: 15px; }
  .gc-btn:active { transform: scale(0.98); }
  .gc-btn.confirm { background: #17416c; color: white; }
  .gc-btn.confirm:hover { background: #0f2d4a; }
  .gc-btn.confirm:disabled { background: #94a3b8; cursor: not-allowed; }
  .gc-btn.cancel { background: #e2e8f0; color: #334155; }
  .gc-btn.cancel:hover { background: #cbd5e1; }

  /* Área de Previsualización */
  .gc-preview-area { border-top: 2px dashed #e2e8f0; padding-top: 30px; }
  .gc-preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .gc-preview-header h3 { margin: 0; color: #1e293b; font-size: 18px; }
  .gc-btn-color-toggle { background: #fff; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; color: #475569; font-weight: 500; }
  .gc-btn-color-toggle.active { background: #f0fdf4; border-color: #16a34a; color: #16a34a; }

  /* Grilla de Calendario */
  .gc-calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background-color: #cbd5e1; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
  .gc-cal-header { background: #f1f5f9; padding: 12px; text-align: center; font-weight: 700; color: #64748b; font-size: 12px; letter-spacing: 1px; }
  .gc-cal-day { min-height: 140px; padding: 8px; display: flex; flex-direction: column; gap: 6px; position: relative; }
  .gc-cal-day.month-even { background-color: #ffffff; }
  .gc-cal-day.month-odd { background-color: #ecececff; }
  .gc-cal-day.out-range { background-color: #f1f5f9; opacity: 0.5; pointer-events: none; }
  .gc-cal-day.month-start { box-shadow: inset 0 4px 0 0 #ef4444; }
  .gc-cal-day.month-start::after { content: attr(data-month-name); position: absolute; top: 8px; right: 8px; background-color: #ef4444; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .gc-day-number { font-weight: 800; color: #1e293b; font-size: 15px; margin-bottom: 6px; display: flex; justify-content: space-between; }
  .gc-month-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600; }
  .gc-day-turnos { display: flex; flex-direction: column; gap: 4px; flex: 1; }
  .gc-turno-chip { padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; background: #e2e8f0; color: #334155; border: 1px solid rgba(0, 0, 0, 0.05); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: help; text-shadow: 0 1px 1px rgba(0, 0, 0, 0.1); }
  .gc-actions-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 30px; }

  @media(max-width: 768px) {
    .gc-pisos-grid { grid-template-columns: 1fr; }
    .gc-calendar-grid { overflow-x: auto; min-width: 700px; }
  }

  /* MODAL DE CONFLICTOS */
  .gc-modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background-color: rgba(0, 0, 0, 0.5); z-index: 10000;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(2px);
  }
  .gc-modal-content {
    background: white; padding: 32px; border-radius: 12px;
    max-width: 500px; width: 90%;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    text-align: center;
  }
  .gc-modal-title { font-size: 1.5rem; color: #b91c1c; margin-bottom: 12px; font-weight: 800; }
  .gc-modal-text { color: #374151; font-size: 1rem; line-height: 1.5; margin-bottom: 24px; }
  .gc-modal-actions { display: flex; flex-direction: column; gap: 10px; }
  .gc-modal-btn {
    padding: 12px; border-radius: 8px; font-weight: 600; border: none; cursor: pointer;
    transition: all 0.2s; font-size: 0.95rem;
  }
  .gc-btn-overwrite { background-color: #ef4444; color: white; }
  .gc-btn-overwrite:hover { background-color: #dc2626; }
  
  .gc-btn-skip { background-color: #f59e0b; color: white; }
  .gc-btn-skip:hover { background-color: #d97706; }
  
  .gc-btn-cancel-modal { background-color: #e5e7eb; color: #374151; }
  .gc-btn-cancel-modal:hover { background-color: #d1d5db; }
`;

const API_PISOS = "/pisos";
const API_PLANTILLAS = "/plantillas-piso";
const API_PLANTILLA_LINEAS = "/plantillas-piso-linea";
const API_TURNOS = "/turnos";
const API_TURNOS_BASE = "/turnos-base";

const DIAS_SEMANA_HEADER = ["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"];

// Helper para formatear día
const getDiaSemanaStr = (date) => {
  const options = { weekday: 'long' };
  const dia = date.toLocaleDateString('es-ES', options);
  return dia.charAt(0).toUpperCase() + dia.slice(1);
};

export default function GeneradorCalendario() {
  const navigate = useNavigate();

  // Datos Maestros
  const [pisos, setPisos] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [turnosBaseCatalogo, setTurnosBaseCatalogo] = useState([]);

  // Estado de Selección
  const [selectedPlantillaId, setSelectedPlantillaId] = useState("");
  const [selectedPisosIds, setSelectedPisosIds] = useState([]);

  // Fechas
  const [dateMode, setDateMode] = useState('range');
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [numSemanas, setNumSemanas] = useState(4);

  // Lógica Motor
  const [plantillaLineas, setPlantillaLineas] = useState([]);
  const [turnosPrevisualizados, setTurnosPrevisualizados] = useState([]);

  // UI
  const [showColors, setShowColors] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);

  // 1. Carga Inicial
  useEffect(() => {
    const fetchData = async () => {
      const servicioId = localStorage.getItem("servicioId");
      if (!servicioId) return;

      setLoadingData(true);
      try {
        const [resPisos, resTurnos, resPlantillas] = await Promise.all([
          // CORRECCION: Usar query param para pisos
          axiosInstance.get(`${API_PISOS}`, { params: { servicioId } }),
          axiosInstance.get(`${API_TURNOS_BASE}/by-servicio/${servicioId}`),
          // CORRECCION: Agregar slash final para plantillas
          axiosInstance.get(`${API_PLANTILLAS}/`),
        ]);

        const pisosData = Array.isArray(resPisos.data) ? resPisos.data : (resPisos.data.content || resPisos.data);
        const plantillasData = Array.isArray(resPlantillas.data) ? resPlantillas.data : (resPlantillas.data.content || []);

        setPisos(pisosData);
        setTurnosBaseCatalogo(resTurnos.data);
        setPlantillas(plantillasData);

      } catch (err) {
        console.error(err);
        setError("Error cargando datos iniciales.");
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // 2. Cargar Líneas cuando cambia la plantilla seleccionada
  useEffect(() => {
    if (selectedPlantillaId) {
      loadPlantilla(selectedPlantillaId);
    } else {
      setPlantillaLineas([]);
    }
  }, [selectedPlantillaId]);

  const loadPlantilla = async (idPlantilla) => {
    try {
      const resLineas = await axiosInstance.get(`${API_PLANTILLA_LINEAS}/by-plantilla/${idPlantilla}`);
      const lineasHidratadas = hidratarLineas(resLineas.data);
      setPlantillaLineas(lineasHidratadas);
    } catch (err) {
      console.error(err);
      setError("Error cargando líneas de la plantilla.");
    }
  };

  const hidratarLineas = (lineasRaw) => {
    const turnosMap = {};
    turnosBaseCatalogo.forEach(t => turnosMap[t.idTurnoBase] = t);
    return lineasRaw.map(l => {
      let diasIds = [];
      try { diasIds = JSON.parse(l.matrizSemana || "[]"); } catch (e) { }
      const diasObj = diasIds.map(id => id ? turnosMap[id] : null);
      return { id: l.idPlantillaLinea, nombre: l.nombreLinea, dias: diasObj };
    });
  };

  // 3. Selección de Pisos (Simple Multi-select)
  const handlePisoClick = (piso) => {
    setError(null);
    const pisoId = piso.idPiso || piso.id;

    if (selectedPisosIds.includes(pisoId)) {
      setSelectedPisosIds(selectedPisosIds.filter(id => id !== pisoId));
    } else {
      setSelectedPisosIds([...selectedPisosIds, pisoId]);
    }
  };

  // Lógica de Fechas
  useEffect(() => {
    if (dateMode === 'weeks' && fechaInicio && numSemanas > 0) {
      const start = new Date(fechaInicio + 'T12:00:00');
      const daysToAdd = (numSemanas * 7) - 1;
      const end = new Date(start);
      end.setDate(start.getDate() + daysToAdd);
      setFechaFin(end.toISOString().split('T')[0]);
    }
  }, [dateMode, fechaInicio, numSemanas]);

  // Auto-Preview
  useEffect(() => {
    if (fechaInicio && fechaFin && plantillaLineas.length > 0 && selectedPlantillaId) {
      const resultados = generarTurnosReales(plantillaLineas, fechaInicio, fechaFin);
      setTurnosPrevisualizados(resultados);
    } else {
      setTurnosPrevisualizados([]);
    }
  }, [plantillaLineas, fechaInicio, fechaFin, selectedPlantillaId]);

  // Estado para Modal de Conflictos
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictInfo, setConflictInfo] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);

  // --- GUARDADO ROBUSTO (BATCHING) ---
  const handleConfirmar = async () => {
    if (turnosPrevisualizados.length === 0 || selectedPisosIds.length === 0) {
      alert("Debes seleccionar al menos un piso.");
      return;
    }

    // 1. Preparar lista plana de objetos
    const listaCompletaDePeticiones = [];
    const idCreador = localStorage.getItem("userId");

    selectedPisosIds.forEach(pisoId => {
      turnosPrevisualizados.forEach(item => {
        // Detectar turnos nocturnos: si horaFin < horaInicio, el turno termina al día siguiente
        const horaInicioNum = parseInt(item.turnoBase.horaInicio.split(':')[0]);
        const horaFinNum = parseInt(item.turnoBase.horaFin.split(':')[0]);
        const esTurnoNocturno = horaFinNum < horaInicioNum;

        // Calcular diaFinalTurno
        let diaFinal = new Date(item.fecha);
        if (esTurnoNocturno) {
          diaFinal.setDate(diaFinal.getDate() + 1);
        }

        listaCompletaDePeticiones.push({
          nombre: item.turnoBase.nombre,
          tipoTurno: item.turnoBase.tipoTurno?.nombre || "ROTATIVA",
          idTipoTurnoRef: item.turnoBase.tipoTurno?.idTipoTurno,
          diaInicioTurno: item.fecha.toISOString().split('T')[0],
          diaFinalTurno: diaFinal.toISOString().split('T')[0],
          diaSemana: getDiaSemanaStr(item.fecha),
          horaInicio: item.turnoBase.horaInicio,
          horaFin: item.turnoBase.horaFin,
          idPiso: pisoId,
          idMedico: null,
          estado: "PENDIENTE",
          idCreador: idCreador,
          tipoDeTurnoCantidad: "NORMAL"
        });
      });
    });

    setPendingRequests(listaCompletaDePeticiones);

    // 2. CHECK CONFLICTS
    try {
      setGenerating(true);
      const resCheck = await axiosInstance.post('/turnos/check-conflicts', {
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        pisosIds: selectedPisosIds.map(String)
      });

      if (resCheck.data.hasConflicts) {
        setConflictInfo(resCheck.data);
        setConflictModalOpen(true);
        setGenerating(false); // Pausar spinner para mostrar modal
        return;
      }

      // Si no hay conflictos, proceder
      executeGeneration(listaCompletaDePeticiones);

    } catch (err) {
      console.error("Error Checking Conflicts:", err);
      // Fallback: si falla el check, preguntar si continuar a ciegas o alertar
      if (window.confirm("No se pudo verificar si existen conflictos. ¿Deseas continuar de todas formas?")) {
        executeGeneration(listaCompletaDePeticiones);
      } else {
        setGenerating(false);
      }
    }
  };

  const executeGeneration = async (requestsList) => {
    // Iniciar Modo Carga
    setGenerating(true);
    setError(null);
    const total = requestsList.length;
    setProgress({ current: 0, total: total });

    // Procesar por LOTES
    const BATCH_SIZE = 50;

    try {
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const lote = requestsList.slice(i, i + BATCH_SIZE);
        await Promise.all(lote.map(payload => axiosInstance.post(API_TURNOS, payload)));

        // Actualizar progreso visualmente
        setProgress(prev => ({ ...prev, current: Math.min(i + BATCH_SIZE, total) }));
      }

      alert(`¡Éxito! Se generaron ${total} turnos exitosamente.\nPuedes verificar en el Calendario o generar más turnos.`);
      setTurnosPrevisualizados([]); // Limpiar vista previa
      setPendingRequests([]);
      setConflictModalOpen(false);

    } catch (err) {
      console.error("Error en generación masiva:", err);
      setError("Error de conexión durante la generación. Intente nuevamente.");
    } finally {
      setGenerating(false);
    }
  };

  // --- Handlers del Modal de Conflictos ---

  const handleOverwrite = async () => {
    try {
      setGenerating(true); // Reiniciar spinner
      setConflictModalOpen(false); // Cerrar modal pero mantener overlay de carga

      // 1. Borrar rango
      await axiosInstance.post('/turnos/delete-range', {
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        pisosIds: selectedPisosIds.map(String)
      });

      // 2. Crear todo
      await executeGeneration(pendingRequests);

    } catch (err) {
      console.error("Error deleting range:", err);
      setError("Error al sobrescribir turnos antiguos.");
      setGenerating(false);
    }
  };

  const handleNoOverwrite = () => {
    // Filtrar peticiones que caigan en fechas conflictivas
    const fechasConflictivas = new Set(conflictInfo.conflictingDates);
    const filteredRequests = pendingRequests.filter(req => !fechasConflictivas.has(req.diaInicioTurno));

    if (filteredRequests.length === 0) {
      alert("No hay turnos nuevos para generar. Todos coincidían con fechas existentes.");
      setConflictModalOpen(false);
      return;
    }

    setConflictModalOpen(false);
    executeGeneration(filteredRequests);
  };

  // Render Calendario
  const renderCalendar = () => {
    if (turnosPrevisualizados.length === 0) return null;

    const turnosPorDia = {};
    let firstDate = new Date(turnosPrevisualizados[0].fecha);
    let lastDate = new Date(turnosPrevisualizados[turnosPrevisualizados.length - 1].fecha);

    const startCalendar = new Date(firstDate);
    const dayOfWeek = startCalendar.getDay();
    const diffToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startCalendar.setDate(startCalendar.getDate() - diffToMon);

    turnosPrevisualizados.forEach(t => {
      const key = t.fecha.toISOString().split('T')[0];
      if (!turnosPorDia[key]) turnosPorDia[key] = [];
      turnosPorDia[key].push(t);
    });

    const calendarDays = [];
    let current = new Date(startCalendar);

    while (current <= lastDate || calendarDays.length % 7 !== 0) {
      calendarDays.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return (
      <div className="gc-calendar-grid">
        {DIAS_SEMANA_HEADER.map(d => <div key={d} className="gc-cal-header">{d}</div>)}

        {calendarDays.map((dateObj, idx) => {
          const dateKey = dateObj.toISOString().split('T')[0];
          const turnosDia = turnosPorDia[dateKey] || [];
          const isOutOfRange = dateObj < new Date(fechaInicio + 'T00:00:00') || dateObj > new Date(fechaFin + 'T23:59:59');

          const month = dateObj.getMonth();
          const day = dateObj.getDate();
          const isEvenMonth = month % 2 === 0;
          const bgClass = isEvenMonth ? 'month-even' : 'month-odd';
          const isFirstDay = day === 1;
          const monthName = isFirstDay ? dateObj.toLocaleString('es-ES', { month: 'long' }).toUpperCase() : '';

          return (
            <div
              key={idx}
              className={`gc-cal-day ${isOutOfRange ? 'out-range' : ''} ${bgClass} ${isFirstDay ? 'month-start' : ''}`}
              data-month-name={monthName}
            >
              <div className="gc-day-number">
                {day} <span className="gc-month-label">{dateObj.toLocaleString('es', { month: 'short' })}</span>
              </div>

              <div className="gc-day-turnos">
                {turnosDia.map((t, tIdx) => {
                  const bgColor = showColors && t.turnoBase.diaOriginal !== undefined
                    ? COLORES_DIAS[t.turnoBase.diaOriginal]
                    : '#f1f5f9';
                  const textColor = showColors ? '#fff' : '#334155';

                  return (
                    <div
                      key={tIdx}
                      className="gc-turno-chip"
                      style={{ backgroundColor: bgColor, color: textColor }}
                      title={`${t.nombreLinea}: ${t.turnoBase.nombre}`}
                    >
                      {t.turnoBase.nombre ? t.turnoBase.nombre.substring(0, 4).toUpperCase() : "TRN"}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="gc-page">
      <style>{styles}</style>

      {/* --- OVERLAY DE CARGA --- */}
      {generating && (
        <div className="gc-overlay">
          <div className="gc-spinner"></div>
          <div className="gc-progress-text">Generando turnos...</div>
          <div className="gc-progress-sub">Por favor, no cierres esta ventana.</div>

          <div className="gc-progress-bar-container">
            <div
              className="gc-progress-bar-fill"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            ></div>
          </div>
          <p style={{ marginTop: '10px', color: '#64748b' }}>
            Procesando: {progress.current} de {progress.total}
          </p>
        </div>
      )}

      {/* --- MODAL DE CONFLICTOS --- */}
      {conflictModalOpen && (
        <div className="gc-modal-overlay">
          <div className="gc-modal-content">
            <div className="gc-modal-title">⚠️ Conflictos Detectados</div>
            <div className="gc-modal-text">
              <p>Se detectaron <strong>{conflictInfo?.count}</strong> días con turnos existentes dentro del rango seleccionado.</p>
              <br />
              <p>¿Qué desea hacer?</p>
            </div>

            <div className="gc-modal-actions">
              <button
                className="gc-modal-btn gc-btn-skip"
                onClick={handleNoOverwrite}
              >
                No sobrescribir (Mantener anteriores)
              </button>

              <button
                className="gc-modal-btn gc-btn-overwrite"
                onClick={() => {
                  if (window.confirm("¿Seguro que deseas eliminar TODOS los turnos existentes y sus solicitudes en este rango? Esta acción es irreversible.")) {
                    handleOverwrite();
                  }
                }}
              >
                Sobrescribir (Eliminar anteriores)
              </button>

              <button
                className="gc-modal-btn gc-btn-cancel-modal"
                onClick={() => {
                  setConflictModalOpen(false);
                  setGenerating(false);
                }}
              >
                Cancelar operación
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="gc-card">
        <header>
          <h1>Generador de Calendario Mensual</h1>
          <p>Selecciona una plantilla, los pisos donde aplicarla y el rango de fechas.</p>
        </header>

        {error && <div className="gc-error">{error}</div>}

        <div className="gc-controls-wrapper">

          {/* 1. Selector de Plantilla */}
          <div className="gc-full-row">
            <label className="gc-section-label">1. Seleccionar Plantilla Maestra</label>
            <div className="gc-field">
              <select
                value={selectedPlantillaId}
                onChange={(e) => setSelectedPlantillaId(e.target.value)}
                disabled={loadingData}
                style={{ maxWidth: '400px', fontSize: '1rem', padding: '12px' }}
              >
                <option value="">-- Selecciona una Plantilla --</option>
                {plantillas.map(p => (
                  <option key={p.idPlantillaPiso} value={p.idPlantillaPiso}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              {plantillas.length === 0 && !loadingData && <small style={{ color: 'red' }}>No hay plantillas creadas. Ve al paso anterior.</small>}
            </div>
          </div>

          <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

          {/* 2. Selector de Pisos */}
          <div className="gc-full-row">
            <label className="gc-section-label">2. Seleccionar Pisos ({selectedPisosIds.length})</label>
            <div className="gc-pisos-grid">
              {loadingData ? <p>Cargando pisos...</p> : (
                pisos.map(p => {
                  const pId = p.idPiso || p.id;
                  const isSelected = selectedPisosIds.includes(pId);

                  return (
                    <div
                      key={pId}
                      className={`gc-piso-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handlePisoClick(p)}
                    >
                      <div className="gc-piso-info">
                        <span className="gc-piso-name">{p.nombre}</span>
                      </div>
                      {isSelected && <div className="gc-check">✓</div>}
                    </div>
                  );
                })
              )}
            </div>
            {selectedPisosIds.length === 0 && <small style={{ color: '#64748b' }}>Selecciona al menos un piso.</small>}
          </div>

          <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

          {/* 3. Fechas */}
          <div className="gc-row toggle-row">
            <label className="gc-toggle-label">3. Rango de Fechas:</label>
            <div className="gc-toggle-group">
              <button className={`gc-toggle-btn ${dateMode === 'range' ? 'active' : ''}`} onClick={() => setDateMode('range')}>Rango Fechas</button>
              <button className={`gc-toggle-btn ${dateMode === 'weeks' ? 'active' : ''}`} onClick={() => setDateMode('weeks')}>Semanas</button>
            </div>
          </div>

          <div className="gc-row dates">
            <div className="gc-field">
              <label>Inicio</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
            </div>

            {dateMode === 'range' ? (
              <div className="gc-field">
                <label>Fin</label>
                <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
              </div>
            ) : (
              <div className="gc-field">
                <label>Semanas</label>
                <input type="number" min="1" max="52" value={numSemanas} onChange={e => setNumSemanas(parseInt(e.target.value) || 1)} />
              </div>
            )}
            {dateMode === 'weeks' && fechaFin && (
              <div className="gc-field info"><label>Fin Calc.</label><div className="gc-static-val">{fechaFin}</div></div>
            )}
          </div>
        </div>

        {turnosPrevisualizados.length > 0 && (
          <div className="gc-preview-area">
            <div className="gc-preview-header">
              <h3>
                Vista Previa del Patrón
              </h3>
              <button className={`gc-btn-color-toggle ${showColors ? 'active' : ''}`} onClick={() => setShowColors(!showColors)}>
                {showColors ? 'Ocultar Colores' : '🎨 Ver Colores'}
              </button>
            </div>

            <p style={{ marginBottom: '15px' }}>
              Se generará este patrón para <strong>{selectedPisosIds.length} pisos</strong>.
              Total estimado: <strong>{turnosPrevisualizados.length * selectedPisosIds.length} turnos</strong>.
            </p>

            {renderCalendar()}
          </div>
        )}

        <div className="gc-actions-footer">
          <StepNavigator>
            {turnosPrevisualizados.length > 0 && selectedPisosIds.length > 0 && (
              <>
                <button className="gc-btn cancel" onClick={() => setTurnosPrevisualizados([])} disabled={generating}>Cancelar Previsualización</button>
                <button className="gc-btn confirm" onClick={handleConfirmar} disabled={generating}>
                  {generating ? "Generando..." : `Confirmar y Crear`}
                </button>
              </>
            )}
          </StepNavigator>
        </div>
      </div>
    </div>
  );
}