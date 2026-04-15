import React, { useState, useEffect } from 'react';
import axiosInstance from "../../../../utils/axiosConfig"; // Ajusta la ruta si es necesario
import '../../css/primerosPasos/Paso6AsignarTurnos.css';

const API_PISOS = "/pisos";
const API_TURNOS = "/turnos";
const API_USUARIOS = "/usuarios"; 

const DIAS_SEMANA_HEADER = ["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"];

export default function Paso6AsignarTurnos({ onDataSaved }) {
  // --- Estados ---
  const [pisos, setPisos] = useState([]);
  const [selectedPisoId, setSelectedPisoId] = useState("");
  
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const [turnos, setTurnos] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [rotativasDetectadas, setRotativasDetectadas] = useState([]); 

  const [loading, setLoading] = useState(false);
  const [loadingAssign, setLoadingAssign] = useState(false); // Estado para la carga masiva
  const [error, setError] = useState(null);

  // 1. Carga Inicial
  useEffect(() => {
    const init = async () => {
      const servicioId = localStorage.getItem("servicioId");
      if (!servicioId) return;

      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      setFechaInicio(firstDay.toISOString().split('T')[0]);
      setFechaFin(lastDay.toISOString().split('T')[0]);

      try {
        const [resPisos, resPersonal] = await Promise.all([
          axiosInstance.get(`${API_PISOS}/servicio/${servicioId}`),
          axiosInstance.get(`${API_USUARIOS}/por-servicio/${servicioId}`)
        ]);
        
        const pisosData = Array.isArray(resPisos.data) ? resPisos.data : (resPisos.data.content || []);
        setPisos(pisosData);
        if (pisosData.length > 0) setSelectedPisoId(pisosData[0].idPiso || pisosData[0].id);

        const docs = resPersonal.data.filter(u => u.rol === 'MEDICO' || u.rol === 'ENFERMERO' || u.rol === 'TENS' || u.rol === 'JEFATURA'); 
        setMedicos(docs);

        if (onDataSaved) onDataSaved();

      } catch (err) {
        console.error("Error cargando datos:", err);
        setError("Error cargando datos iniciales.");
      }
    };
    init();
  }, []);

  // 2. Cargar Turnos
  const fetchTurnos = async () => {
    if (!selectedPisoId || !fechaInicio || !fechaFin) return;
    setLoading(true);
    setError(null);
    
    try {
      const res = await axiosInstance.get(`${API_TURNOS}/asignacion`, {
        params: {
            idPiso: selectedPisoId,
            fechaInicio: fechaInicio,
            fechaFin: fechaFin
        }
      });
      
      setTurnos(res.data);
      detectarRotativas(res.data);

    } catch (err) {
      console.error(err);
      setError("Error al cargar los turnos generados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTurnos();
  }, [selectedPisoId, fechaInicio, fechaFin]);

  // 3. Detectar Grupos
  const detectarRotativas = (listaTurnos) => {
    const grupos = {};
    
    listaTurnos.forEach(t => {
        const idRef = t.idTipoTurnoRef;
        const nombreTipo = t.tipoTurno || "Manual";
        const key = idRef ? `ROT_${idRef}` : `MANUAL_${nombreTipo}`;
        
        if (!grupos[key]) {
            grupos[key] = {
                id: key,
                idRef: idRef,
                nombre: nombreTipo,
                total: 0,
                asignados: 0,
                medicosSet: new Set(),
                medicoId: "" 
            };
        }
        
        grupos[key].total++;
        if (t.idMedico) {
            grupos[key].asignados++;
            grupos[key].medicosSet.add(t.idMedico);
        }
    });

    const listaGrupos = Object.values(grupos).map(g => {
        if (g.medicosSet.size === 1) {
            g.medicoId = [...g.medicosSet][0];
        }
        return g;
    });

    setRotativasDetectadas(listaGrupos);
  };

  // 4. Handler Asignación Masiva
  const handleAsignarMasivo = async (rotativa, idMedicoSeleccionado) => {
    if (!rotativa.idRef) {
        alert("Turnos manuales deben asignarse uno a uno.");
        return;
    }
    
    const medico = medicos.find(m => m.idPersonal === Number(idMedicoSeleccionado));
    const nombreMedico = medico ? `${medico.nombre} ${medico.apellidoPaterno}` : "VACANTE";

    if(!window.confirm(`¿Asignar a ${nombreMedico} a los ${rotativa.total} turnos de esta rotativa?`)) return;

    setLoadingAssign(true); // Activa el overlay de carga
    try {
        const payload = {
            idMedico: idMedicoSeleccionado || null,
            idTipoTurnoRef: rotativa.idRef,
            idPiso: Number(selectedPisoId),
            fechaInicio: fechaInicio,
            fechaFin: fechaFin
        };

        // AQUÍ ESTÁ EL TRUCO DEL TIMEOUT:
        // Sobreescribimos el timeout solo para esta llamada.
        // 300000 ms = 5 minutos. Suficiente para miles de turnos.
        await axiosInstance.put(`${API_TURNOS}/asignacion-masiva`, payload, {
            timeout: 300000 
        });

        await fetchTurnos(); 
        alert("Asignación completada con éxito.");
        
    } catch (e) {
        console.error(e);
        // Manejo específico si es timeout
        if (e.code === 'ECONNABORTED') {
            alert("La operación tardó demasiado, pero es probable que el servidor siga trabajando. Recarga en unos minutos.");
        } else {
            alert("Error al asignar turnos.");
        }
    } finally {
        setLoadingAssign(false); // Desactiva el overlay
    }
  };

  // 5. Render Calendario
  const renderCalendar = () => {
    const turnosPorDia = {};
    const start = new Date(fechaInicio + 'T12:00:00');
    const end = new Date(fechaFin + 'T12:00:00');
    
    const startCalendar = new Date(start);
    const day = startCalendar.getDay();
    const diff = startCalendar.getDate() - day + (day === 0 ? -6 : 1);
    startCalendar.setDate(diff);

    turnos.forEach(t => {
        if(!turnosPorDia[t.diaInicioTurno]) turnosPorDia[t.diaInicioTurno] = [];
        turnosPorDia[t.diaInicioTurno].push(t);
    });

    const days = [];
    let curr = new Date(startCalendar);
    while (curr <= end || days.length % 7 !== 0) {
        days.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
    }

    return (
        <div className="p6-calendar-grid">
            {DIAS_SEMANA_HEADER.map(d => <div key={d} className="p6-cal-header">{d}</div>)}
            {days.map((dateObj, i) => {
                const dateStr = dateObj.toISOString().split('T')[0];
                const dayTurnos = turnosPorDia[dateStr] || [];
                const isOut = dateObj < start || dateObj > end;
                
                return (
                    <div key={i} className={`p6-cal-day ${isOut ? 'out' : ''}`}>
                        <div className="p6-day-num">{dateObj.getDate()}</div>
                        <div className="p6-day-content">
                            {dayTurnos.map((t, idx) => (
                                <div 
                                    key={idx} 
                                    className={`p6-turno-chip ${t.idMedico ? 'assigned' : 'vacant'}`}
                                    title={`${t.nombre} - ${t.medicoNombre || 'Vacante'}`}
                                >
                                    <span className="p6-t-name">{t.nombre.substring(0, 12)}</span>
                                    <span className="p6-t-doc">
                                        {t.medicoNombre ? t.medicoNombre.split(' ')[0] : "VACANTE"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
  };

  return (
    <div className="paso6-container">
      {/* --- OVERLAY DE CARGA --- */}
      {loadingAssign && (
        <div className="p6-loading-overlay">
          <div className="p6-spinner"></div>
          <div className="p6-loading-text">
            <h3>Procesando Asignación Masiva</h3>
            <p>Esto puede tomar unos minutos, por favor no cierres la página...</p>
          </div>
        </div>
      )}

      <div className="p6-header">
        <h2>Asignar Personal</h2>
        <p>Gestiona la cobertura médica llenando las rotativas generadas.</p>
      </div>

      {error && <div className="p6-error">{error}</div>}

      <div className="p6-controls">
          <div className="p6-field">
              <label>Piso</label>
              <select value={selectedPisoId} onChange={e => setSelectedPisoId(e.target.value)}>
                  {pisos.map(p => <option key={p.idPiso || p.id} value={p.idPiso || p.id}>{p.nombre}</option>)}
              </select>
          </div>
          <div className="p6-field">
              <label>Desde</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}/>
          </div>
          <div className="p6-field">
              <label>Hasta</label>
              <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}/>
          </div>
          <button className="p6-btn-refresh" onClick={fetchTurnos} disabled={loading}>
              {loading ? "..." : "↻ Actualizar"}
          </button>
      </div>

      <div className="p6-workspace">
          {/* Sidebar Rotativas */}
          <aside className="p6-sidebar">
              <h3>Rotativas ({rotativasDetectadas.length})</h3>
              <div className="p6-rot-list">
                  {rotativasDetectadas.map((rot, idx) => (
                      <div key={idx} className="p6-rotativa-card">
                          <div className="p6-rot-header">
                              <strong>{rot.nombre}</strong>
                              <span className={`p6-badge ${rot.asignados === rot.total ? 'ok' : 'warn'}`}>
                                  {rot.asignados}/{rot.total}
                              </span>
                          </div>
                          <div className="p6-rot-assign">
                              <label>Médico:</label>
                              <select 
                                  onChange={(e) => handleAsignarMasivo(rot, e.target.value)}
                                  disabled={loadingAssign || !rot.idRef}
                                  value={rot.medicoId || ""}
                              >
                                  <option value="">-- Vacante --</option>
                                  {medicos.map(m => (
                                      <option key={m.idPersonal} value={m.idPersonal}>
                                          {m.nombre} {m.apellidoPaterno}
                                      </option>
                                  ))}
                              </select>
                          </div>
                      </div>
                  ))}
                  {rotativasDetectadas.length === 0 && !loading && <p className="p6-empty">No hay rotativas detectadas en este rango.</p>}
              </div>
          </aside>

          {/* Calendario Principal */}
          <main className="p6-main">
              {renderCalendar()}
          </main>
      </div>
    </div>
  );
}