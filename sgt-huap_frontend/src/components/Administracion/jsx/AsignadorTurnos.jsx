import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from "../../../utils/axiosConfig";
import '../css/AsignadorTurnos.css';
import StepNavigator from './StepNavigator';

const API_PISOS = "/pisos";
const API_TURNOS = "/turnos";
const API_USUARIOS = "/usuarios";

const DIAS_SEMANA_HEADER = ["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"];

export default function AsignadorTurnos() {
    const navigate = useNavigate();

    // --- Estados ---
    const [pisos, setPisos] = useState([]);
    const [selectedPisoId, setSelectedPisoId] = useState("");

    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");

    const [turnos, setTurnos] = useState([]);
    const [medicos, setMedicos] = useState([]);
    const [rotativasDetectadas, setRotativasDetectadas] = useState([]);

    const [loading, setLoading] = useState(false);
    const [loadingAssign, setLoadingAssign] = useState(false);
    const [error, setError] = useState(null);

    // 1. Carga Inicial (CORREGIDA)
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
                    // CORRECCIÓN: Usar endpoint filtrado por servicio
                    axiosInstance.get(`${API_USUARIOS}/por-servicio/${servicioId}`)
                ]);

                const pisosData = Array.isArray(resPisos.data) ? resPisos.data : (resPisos.data.content || []);
                setPisos(pisosData);
                // Usamos idPiso si existe, sino id
                if (pisosData.length > 0) setSelectedPisoId(pisosData[0].idPiso || pisosData[0].id);

                // Filtrar roles válidos
                const docs = resPersonal.data.filter(u => u.rol === 'MEDICO' || u.rol === 'ENFERMERO' || u.rol === 'TENS' || u.rol === 'JEFATURA');
                setMedicos(docs);

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
            setError("Error cargando turnos del mes.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTurnos();
    }, [selectedPisoId, fechaInicio, fechaFin]);


    // 3. Detectar Grupos (Rotativas)
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
            alert("Estos son turnos manuales sin patrón. Debes asignarlos individualmente.");
            return;
        }

        // Obtener nombre del médico para confirmación
        const medico = medicos.find(m => m.idPersonal === Number(idMedicoSeleccionado));
        const nombreMedico = medico ? `${medico.nombre} ${medico.apellidoPaterno}` : "VACANTE";

        if (!window.confirm(`¿Asignar a ${nombreMedico} a los ${rotativa.total} turnos?`)) return;

        setLoadingAssign(true);
        try {
            const payload = {
                idMedico: idMedicoSeleccionado || null,
                idTipoTurnoRef: rotativa.idRef,
                idPiso: Number(selectedPisoId),
                fechaInicio: fechaInicio,
                fechaFin: fechaFin
            };

            await axiosInstance.put(`${API_TURNOS}/asignacion-masiva`, payload);
            await fetchTurnos();

        } catch (e) {
            console.error(e);
            alert("Error al asignar turnos.");
        } finally {
            setLoadingAssign(false);
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
            if (!turnosPorDia[t.diaInicioTurno]) turnosPorDia[t.diaInicioTurno] = [];
            turnosPorDia[t.diaInicioTurno].push(t);
        });

        const days = [];
        let curr = new Date(startCalendar);
        while (curr <= end || days.length % 7 !== 0) {
            days.push(new Date(curr));
            curr.setDate(curr.getDate() + 1);
        }

        return (
            <div className="at-calendar-grid">
                {DIAS_SEMANA_HEADER.map(d => <div key={d} className="at-cal-header">{d}</div>)}
                {days.map((dateObj, i) => {
                    const dateStr = dateObj.toISOString().split('T')[0];
                    const dayTurnos = turnosPorDia[dateStr] || [];
                    const isOut = dateObj < start || dateObj > end;

                    return (
                        <div key={i} className={`at-cal-day ${isOut ? 'out' : ''}`}>
                            <div className="at-day-num">{dateObj.getDate()}</div>
                            <div className="at-day-content">
                                {dayTurnos.map((t, idx) => (
                                    <div
                                        key={idx}
                                        className={`at-turno-chip ${t.idMedico ? 'assigned' : 'vacant'}`}
                                        title={`${t.nombre} - ${t.medicoNombre || 'Vacante'}`}
                                    >
                                        <span className="at-t-name">{t.nombre}</span>
                                        <span className="at-t-doc">
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
        <div className="at-page">
            <div className="at-container">
                <header className="at-header">
                    <h1>Asignación de Turnos</h1>
                    <p>Gestión inteligente de cobertura médica.</p>
                </header>

                {error && <div className="at-error">{error}</div>}

                <div className="at-controls">
                    <div className="at-field">
                        <label>Piso</label>
                        <select value={selectedPisoId} onChange={e => setSelectedPisoId(e.target.value)}>
                            {pisos.map(p => <option key={p.idPiso || p.id} value={p.idPiso || p.id}>{p.nombre}</option>)}
                        </select>
                    </div>
                    <div className="at-field">
                        <label>Desde</label>
                        <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
                    </div>
                    <div className="at-field">
                        <label>Hasta</label>
                        <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
                    </div>
                    <button className="at-btn-refresh" onClick={fetchTurnos} disabled={loading}>
                        {loading ? "..." : "↻ Actualizar"}
                    </button>
                </div>

                <div className="at-workspace">
                    <aside className="at-sidebar">
                        <h3>Rotativas ({rotativasDetectadas.length})</h3>
                        <div className="at-rot-list">
                            {rotativasDetectadas.map((rot, idx) => (
                                <div key={idx} className="at-rotativa-card">
                                    <div className="at-rot-header">
                                        <strong>{rot.nombre}</strong>
                                        <span className={`at-badge ${rot.asignados === rot.total ? 'ok' : 'warn'}`}>
                                            {rot.asignados}/{rot.total}
                                        </span>
                                    </div>
                                    <div className="at-rot-assign">
                                        <label>Asignar a:</label>
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
                            {rotativasDetectadas.length === 0 && !loading && <p className="at-empty">No hay rotativas detectadas.</p>}
                        </div>
                    </aside>

                    <main className="at-main">
                        {renderCalendar()}
                    </main>
                </div>
                <StepNavigator nextLabel="Finalizar Workflow" onNext={() => navigate('/administracion')} />
            </div>
        </div>
    );
}