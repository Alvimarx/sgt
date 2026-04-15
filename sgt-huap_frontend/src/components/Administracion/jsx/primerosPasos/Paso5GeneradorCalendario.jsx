import React, { useState, useEffect } from 'react';
import axiosInstance from "../../../../utils/axiosConfig";
import { generarTurnosReales, COLORES_DIAS } from '../../../../utils/PlantillaEngine';
import '../../css/primerosPasos/Paso5GeneradorCalendario.css';

// --- ESTILOS CSS INLINE PARA EL LOADER Y OVERLAY ---
const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)', zIndex: 9999,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(5px)'
  },
  spinner: {
    width: '50px', height: '50px', border: '5px solid #f3f3f3',
    borderTop: '5px solid #3498db', borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  progressText: { marginTop: '20px', fontSize: '1.2rem', color: '#333', fontWeight: 'bold' },
  progressBarContainer: {
    width: '300px', height: '10px', backgroundColor: '#e0e0e0', borderRadius: '5px',
    marginTop: '10px', overflow: 'hidden'
  },
  progressBarFill: (percent) => ({
    height: '100%', width: `${percent}%`, backgroundColor: '#3498db', transition: 'width 0.3s ease'
  })
};

// Inyectar animación keyframes para el spinner
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

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
document.head.appendChild(styleSheet);

// --- CONSTANTES API ---
const API_PISOS = "/pisos";
const API_PLANTILLAS = "/plantillas-piso";
const API_PLANTILLA_LINEAS = "/plantillas-piso-linea";
const API_TURNOS = "/turnos";
const API_TURNOS_BASE = "/turnos-base";

const DIAS_SEMANA_HEADER = ["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"];

const getDiaSemanaStr = (date) => {
  const options = { weekday: 'long' };
  const dia = date.toLocaleDateString('es-ES', options);
  return dia.charAt(0).toUpperCase() + dia.slice(1);
};

export default function Paso5GeneradorCalendario({ onDataSaved }) {

  // --- Estados de Datos ---
  const [pisos, setPisos] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [turnosBaseCatalogo, setTurnosBaseCatalogo] = useState([]);

  // --- Selección ---
  const [selectedPlantillaId, setSelectedPlantillaId] = useState("");
  const [selectedPisosIds, setSelectedPisosIds] = useState([]);

  // --- Fechas ---
  const [dateMode, setDateMode] = useState('range');
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [numSemanas, setNumSemanas] = useState(4);

  // --- Motor ---
  const [plantillaLineas, setPlantillaLineas] = useState([]);
  const [turnosPrevisualizados, setTurnosPrevisualizados] = useState([]);

  // --- UI ---
  const [showColors, setShowColors] = useState(true);
  const [loadingData, setLoadingData] = useState(true);

  // ESTADOS DE PROCESO
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Estado para Modal de Conflictos
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictInfo, setConflictInfo] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);

  // 1. Carga Inicial
  useEffect(() => {
    const fetchData = async () => {
      const servicioId = localStorage.getItem("servicioId");
      if (!servicioId) return;

      setLoadingData(true);
      try {
        const [resPisos, resTurnos, resPlantillas] = await Promise.all([
          axiosInstance.get(`${API_PISOS}`, { params: { servicioId } }),
          axiosInstance.get(`${API_TURNOS_BASE}/by-servicio/${servicioId}`),
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
    if (generating) return;
    setError(null);
    setSuccessMessage("");

    const pisoId = piso.idPiso || piso.id;

    if (selectedPisosIds.includes(pisoId)) {
      setSelectedPisosIds(selectedPisosIds.filter(id => id !== pisoId));
    } else {
      setSelectedPisosIds([...selectedPisosIds, pisoId]);
    }
  };

  // Lógica Fechas
  useEffect(() => {
    if (dateMode === 'weeks' && fechaInicio && numSemanas > 0) {
      const start = new Date(fechaInicio + 'T12:00:00');
      const end = new Date(start);
      end.setDate(start.getDate() + ((numSemanas * 7) - 1));
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
      // Fallback
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
        setProgress(prev => ({ ...prev, current: Math.min(i + BATCH_SIZE, total) }));
      }

      setSuccessMessage(`✅ ¡Proceso finalizado! Se generaron ${total} turnos exitosamente.`);
      setTurnosPrevisualizados([]);
      setPendingRequests([]);
      setConflictModalOpen(false);
      if (onDataSaved) onDataSaved();

    } catch (err) {
      console.error("Error en generación masiva:", err);
      setError("Error de conexión durante la generación. Revisa el calendario.");
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

  // --- RENDERIZADO DEL CALENDARIO (Completo) ---
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

      {/* --- PANTALLA DE CARGA (OVERLAY) --- */}
      {generating && (
        <div style={styles.overlay}>
          <div style={styles.spinner}></div>
          <h2 style={{ marginTop: '20px' }}>Generando turnos...</h2>
          <p>Por favor, no cierres esta ventana.</p>

          <div style={styles.progressText}>
            {Math.round((progress.current / progress.total) * 100)}%
          </div>
          <div style={styles.progressBarContainer}>
            <div style={styles.progressBarFill((progress.current / progress.total) * 100)}></div>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>
            Lote: {progress.current} de {progress.total}
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

      <div className="gc-card-container">
        <header className="gc-header">
          <h2>Generador de Calendario</h2>
          <p>Crea una rotativa basada en una plantilla maestra.</p>
        </header>

        {error && <div className="gc-error">{error}</div>}
        {successMessage && <div className="gc-success">{successMessage}</div>}

        <div className="gc-controls-wrapper">

          {/* 1. SELECCION DE PLANTILLA */}
          <div className="gc-full-row">
            <label className="gc-section-label">1. Seleccionar Plantilla Maestra</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                value={selectedPlantillaId}
                onChange={(e) => setSelectedPlantillaId(e.target.value)}
                disabled={loadingData}
                style={{
                  maxWidth: '400px', fontSize: '1rem', padding: '10px',
                  borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%'
                }}
              >
                <option value="">-- Selecciona una Plantilla --</option>
                {plantillas.map(p => (
                  <option key={p.idPlantillaPiso} value={p.idPlantillaPiso}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            {plantillas.length === 0 && !loadingData && <small style={{ color: 'red', display: 'block', marginTop: '6px' }}>No hay plantillas creadas. Ve al paso anterior.</small>}
          </div>

          <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

          {/* 2. SELECCION DE PISOS */}
          <div className="gc-full-row">
            <label className="gc-section-label">2. Seleccionar Pisos ({selectedPisosIds.length})</label>
            <div className="gc-pisos-grid">
              {loadingData ? <p>Cargando pisos...</p> : (
                pisos.map(p => {
                  const pId = p.idPiso || p.id;
                  const isSelected = selectedPisosIds.includes(pId);

                  return (
                    <div key={pId} className={`gc-piso-card ${isSelected ? 'selected' : ''}`} onClick={() => handlePisoClick(p)}>
                      <div className="gc-piso-info">
                        <span className="gc-piso-name">{p.nombre}</span>
                      </div>
                      {isSelected && <div className="gc-check">✓</div>}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. RANGO DE FECHAS */}
          <div className="gc-row toggle-row">
            <label className="gc-toggle-label">3. Rango:</label>
            <div className="gc-toggle-group">
              <button className={`gc-toggle-btn ${dateMode === 'range' ? 'active' : ''}`} onClick={() => setDateMode('range')}>Rango Fechas</button>
              <button className={`gc-toggle-btn ${dateMode === 'weeks' ? 'active' : ''}`} onClick={() => setDateMode('weeks')}>Semanas</button>
            </div>
          </div>

          <div className="gc-row dates">
            <div className="gc-field"><label>Inicio</label><input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} /></div>

            {dateMode === 'range' ? (
              <div className="gc-field"><label>Fin</label><input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} /></div>
            ) : (
              <div className="gc-field"><label>Semanas</label><input type="number" min="1" max="52" value={numSemanas} onChange={e => setNumSemanas(parseInt(e.target.value) || 1)} /></div>
            )}
            {dateMode === 'weeks' && fechaFin && (
              <div className="gc-field info"><label>Fin Calc.</label><div className="gc-static-val">{fechaFin}</div></div>
            )}
          </div>
        </div>

        {/* 4. VISTA PREVIA Y ACCIONES */}
        {turnosPrevisualizados.length > 0 && (
          <div className="gc-preview-area">
            <div className="gc-preview-header">
              <h3>Vista Previa: {turnosPrevisualizados.length} turnos por piso</h3>
              <button className={`gc-btn-color-toggle ${showColors ? 'active' : ''}`} onClick={() => setShowColors(!showColors)}>
                {showColors ? 'Ocultar Colores' : '🎨 Ver Colores'}
              </button>
            </div>

            <p style={{ marginBottom: '15px', color: '#64748b' }}>
              Se generará este patrón para <strong>{selectedPisosIds.length} pisos</strong>.
              Total estimado: <strong>{turnosPrevisualizados.length * selectedPisosIds.length} turnos</strong>.
            </p>

            {renderCalendar()}

            <div className="gc-actions-footer">
              <button className="gc-btn cancel" onClick={() => setTurnosPrevisualizados([])} disabled={generating}>Limpiar</button>
              <button className="gc-btn confirm" onClick={handleConfirmar} disabled={generating}>
                {generating ? "Procesando..." : `Generar Turnos`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}