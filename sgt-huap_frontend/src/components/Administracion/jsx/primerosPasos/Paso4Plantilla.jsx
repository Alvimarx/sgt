import React, { useState, useEffect, useMemo } from 'react';
import axiosInstance from "../../../../utils/axiosConfig";
import '../../css/primerosPasos/Paso4Plantilla.css';
import PlantillaPreview from '../PlantillaPreview';

const API_TURNOS_BASE = "/turnos-base";
const API_PLANTILLAS = "/plantillas-piso";
const API_LINEAS = "/plantillas-piso-linea";

const DIAS_SEMANA = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
const TURNO_CREADO_ID = "TURNO_CREADO";

const createEmptyLine = (id) => ({
  id: id,
  nombre: "",
  dias: [null, null, null, null, null, null, null]
});

const getStartDayIndex = (turnoBase) => {
  try {
    if (!turnoBase.tipoTurno || !turnoBase.tipoTurno.matrizPatron) return -1;
    const data = JSON.parse(turnoBase.tipoTurno.matrizPatron);
    const matriz = data.matriz;
    if (!matriz || !Array.isArray(matriz)) return -1;
    for (const semana of matriz) {
      const diaIndex = semana.findIndex(val => val === TURNO_CREADO_ID);
      if (diaIndex !== -1) return diaIndex;
    }
    return -1;
  } catch (e) { return -1; }
};

export default function Paso4Plantilla({ onDataSaved }) {

  // --- Estados de Datos ---
  const [turnosBase, setTurnosBase] = useState([]);
  const [plantillas, setPlantillas] = useState([]); // Lista para el selector

  // --- Estados del Formulario ---
  const [nombrePlantilla, setNombrePlantilla] = useState("");
  const [editingId, setEditingId] = useState(null); // ID de la plantilla que se está editando

  const [lineas, setLineas] = useState([createEmptyLine(1)]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const servicioId = localStorage.getItem("servicioId");
      if (!servicioId) {
        setLoading(false);
        return;
      }
      try {
        const [resTurnos, resPlantillas] = await Promise.all([
          axiosInstance.get(`${API_TURNOS_BASE}/by-servicio/${servicioId}`),
          axiosInstance.get(`${API_PLANTILLAS}/`)
        ]);

        setTurnosBase(resTurnos.data);
        const plantillasData = Array.isArray(resPlantillas.data) ? resPlantillas.data : [];
        setPlantillas(plantillasData);

      } catch (err) {
        console.error("Error cargando datos:", err);
        if (err.response && err.response.status === 401) {
          setError("Sesión expirada. Recarga la página.");
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // --- Lógica de Edición ---
  const handleSelectTemplateToEdit = async (e) => {
    const id = e.target.value;
    if (!id) {
      handleCancelEdit();
      return;
    }

    try {
      const plantilla = plantillas.find(p => p.idPlantillaPiso === Number(id));
      if (!plantilla) return;

      // Cargar líneas
      const resLineas = await axiosInstance.get(`${API_LINEAS}/by-plantilla/${id}`);
      // Hidratar líneas
      const lineasHidratadas = hidratarLineas(resLineas.data);

      setEditingId(Number(id));
      setNombrePlantilla(plantilla.nombre);
      setLineas(lineasHidratadas.length > 0 ? lineasHidratadas : [createEmptyLine(Date.now())]);

    } catch (err) {
      console.error("Error cargando plantilla para editar:", err);
      alert("Error al cargar la plantilla.");
    }
  };

  const hidratarLineas = (lineasRaw) => {
    const turnosMap = {};
    turnosBase.forEach(t => turnosMap[t.idTurnoBase] = t);

    return lineasRaw.map(l => {
      let diasIds = [];
      try { diasIds = JSON.parse(l.matrizSemana || "[]"); } catch (e) { }
      const diasObj = diasIds.map(id => id ? turnosMap[id] : null);
      return { id: l.idPlantillaLinea || Date.now() + Math.random(), nombre: l.nombreLinea, dias: diasObj };
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNombrePlantilla("");
    setLineas([createEmptyLine(Date.now())]);
  };

  // --- Handlers de Líneas ---
  const handleAddLine = () => setLineas([...lineas, createEmptyLine(Date.now())]);
  const handleRemoveLine = (lineaId) => {
    if (lineas.length === 1) { alert("Debe haber al menos una línea."); return; }
    setLineas(lineas.filter(l => l.id !== lineaId));
  };
  const handleLineNameChange = (lineaId, newName) => {
    setLineas(lineas.map(l => l.id === lineaId ? { ...l, nombre: newName } : l));
  };
  const openSelectionModal = (lineaId, diaIndex) => {
    setModalTarget({ lineaId, diaIndex });
    setIsModalOpen(true);
  };
  const handleSelectTurno = (turno) => {
    if (!modalTarget) return;
    setLineas(lineas.map(l => {
      if (l.id === modalTarget.lineaId) {
        const newDias = [...l.dias];
        newDias[modalTarget.diaIndex] = turno;
        return { ...l, dias: newDias };
      }
      return l;
    }));
    setIsModalOpen(false);
    setModalTarget(null);
  };
  const handleClearTurno = () => {
    if (!modalTarget) return;
    setLineas(lineas.map(l => {
      if (l.id === modalTarget.lineaId) {
        const newDias = [...l.dias];
        newDias[modalTarget.diaIndex] = null;
        return { ...l, dias: newDias };
      }
      return l;
    }));
    setIsModalOpen(false);
    setModalTarget(null);
  };

  // --- Guardar ---
  const handleSave = async () => {
    if (!nombrePlantilla.trim()) {
      alert("Debes poner un nombre a la plantilla.");
      return;
    }

    const idCreador = localStorage.getItem("userId");
    setSaving(true);
    setError(null);
    setSuccessMessage("");

    try {
      let plantillaId = editingId;

      if (editingId) {
        // --- MODO EDICIÓN ---
        await axiosInstance.put(`${API_PLANTILLAS}/${editingId}`, { nombre: nombrePlantilla });
        await axiosInstance.delete(`${API_LINEAS}/by-plantilla/${editingId}`);
      } else {
        // --- MODO CREACIÓN ---
        const payloadPlantilla = {
          nombre: nombrePlantilla,
          creador: { idPersonal: Number(idCreador) }
        };
        const resPlantilla = await axiosInstance.post(`${API_PLANTILLAS}/`, payloadPlantilla);
        plantillaId = resPlantilla.data.idPlantillaPiso;
      }

      // Guardar Líneas
      const lineasPromises = lineas.map((linea, index) => {
        const turnosIdsJson = linea.dias.map(t => t ? t.idTurnoBase : null);
        const payloadLinea = {
          nombreLinea: linea.nombre || `Línea ${index + 1}`,
          orden: index,
          matrizSemana: JSON.stringify(turnosIdsJson),
          plantillaPiso: { idPlantillaPiso: plantillaId }
        };
        return axiosInstance.post(`${API_LINEAS}/`, payloadLinea);
      });
      await Promise.all(lineasPromises);

      // Feedback y Actualización
      if (editingId) {
        setSuccessMessage("✅ Plantilla actualizada correctamente.");
        const resP = await axiosInstance.get(`${API_PLANTILLAS}/`);
        setPlantillas(resP.data);
        handleCancelEdit();
      } else {
        setSuccessMessage("✅ Plantilla creada exitosamente.");
        const resP = await axiosInstance.get(`${API_PLANTILLAS}/`);
        setPlantillas(resP.data);
        setNombrePlantilla("");
        setLineas([createEmptyLine(Date.now())]);
      }

      // AVISAR AL LAYOUT PADRE (Tutorial)
      if (onDataSaved) onDataSaved();

    } catch (err) {
      console.error("Error al guardar:", err);
      setError("Error al guardar la plantilla.");
    } finally {
      setSaving(false);
    }
  };

  const filteredTurnosBase = useMemo(() => {
    if (!modalTarget) return [];
    return turnosBase.filter(tb => {
      const startDay = getStartDayIndex(tb);
      return startDay === modalTarget.diaIndex;
    });
  }, [turnosBase, modalTarget]);

  return (
    <div className="paso4-container">
      <div className="cpt-header">
        <h2>Diseñador de Plantilla Maestra</h2>
        <p>Crea o edita las plantillas de turnos.</p>
      </div>

      {error && <div className="cpt-error">{error}</div>}
      {successMessage && <div className="cpt-success-bar">{successMessage}</div>}

      {/* 1. Configuración Grid */}
      <section className="cpt-config-section" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '40px',
        marginBottom: '30px',
        alignItems: 'start'
      }}>

        {/* IZQUIERDA: NOMBRE */}
        <div className="cpt-field" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '400px', margin: '0 auto'
        }}>
          <label style={{ alignSelf: 'flex-start', color: editingId ? '#d97706' : '#334155', fontWeight: 'bold' }}>
            {editingId ? "EDITANDO NOMBRE:" : "1. Crear Nueva Plantilla (Nombre)"}
          </label>
          <input
            type="text"
            value={nombrePlantilla}
            onChange={e => setNombrePlantilla(e.target.value)}
            placeholder="Ej: Rotativa Invierno 2025"
            style={{
              width: '100%',
              borderColor: editingId ? '#d97706' : '#ccc',
              backgroundColor: editingId ? '#fffbeb' : 'white'
            }}
          />
          {editingId && (
            <button
              onClick={handleCancelEdit}
              style={{
                backgroundColor: '#ef4444', color: 'white', border: 'none',
                padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginTop: '8px',
                fontSize: '0.85rem', alignSelf: 'flex-start'
              }}
            >
              ✕ Cancelar Edición
            </button>
          )}
        </div>

        {/* DERECHA: SELECTOR */}
        <div className="cpt-field" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '400px', margin: '0 auto'
        }}>
          <label style={{ alignSelf: 'flex-start', color: '#64748b' }}>2. O editar una existente:</label>
          <select
            value={editingId || ""}
            onChange={handleSelectTemplateToEdit}
            style={{
              padding: '10px', borderRadius: '6px', border: '1px solid #ccc',
              width: '100%', fontSize: '1rem', backgroundColor: '#f8fafc'
            }}
          >
            <option value="">-- Seleccionar Plantilla --</option>
            {plantillas.map(p => (
              <option key={p.idPlantillaPiso} value={p.idPlantillaPiso}>{p.nombre}</option>
            ))}
          </select>
        </div>
      </section>

      {/* 2. Editor de Líneas */}
      <section className="cpt-editor-section">
        <div className="cpt-grid-header">
          <div className="cpt-col-name">Nombre Línea</div>
          {DIAS_SEMANA.map(d => <div key={d} className="cpt-col-day">{d}</div>)}
          <div className="cpt-col-action"></div>
        </div>
        {lineas.map((linea, index) => (
          <div key={linea.id} className="cpt-line-row">
            <div className="cpt-cell-name">
              <input type="text" value={linea.nombre} onChange={e => handleLineNameChange(linea.id, e.target.value)} placeholder={`Línea ${index + 1}`} />
            </div>
            {linea.dias.map((turno, diaIndex) => (
              <div key={diaIndex} className={`cpt-cell-day ${turno ? 'filled' : 'empty'}`} onClick={() => openSelectionModal(linea.id, diaIndex)}>
                {turno ? (
                  <div className="cpt-turno-chip" title={turno.nombre}>
                    <span className="chip-name">{turno.nombre}</span>
                    <span className="chip-time">{turno.horaInicio ? turno.horaInicio.substring(0, 5) : ''}</span>
                  </div>
                ) : <span className="cpt-plus">+</span>}
              </div>
            ))}
            <div className="cpt-cell-action">
              <button className="cpt-btn-icon delete" onClick={() => handleRemoveLine(linea.id)} title="Eliminar línea">✕</button>
            </div>
          </div>
        ))}
        <button className="cpt-btn-add-line" onClick={handleAddLine}>+ Agregar Nueva Línea (Franja)</button>
      </section>

      {/* 3. Preview */}
      <section className="cpt-preview-section">
        <h3 style={{ marginTop: 0, color: '#17416c' }}>Previsualización (Motor de Pintado)</h3>
        <PlantillaPreview lineas={lineas} />
      </section>

      {/* Botones Finales */}
      <div className="cpt-actions">
        <button className={`cpt-btn ${editingId ? 'warning' : 'save'}`} onClick={handleSave} disabled={saving}>
          {saving ? "Procesando..." : (editingId ? "Guardar Cambios" : "Guardar Plantilla")}
        </button>
      </div>

      {/* Modal Selección */}
      {isModalOpen && (
        <div className="cpt-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="cpt-modal" onClick={e => e.stopPropagation()}>
            <h3>Seleccionar Turno ({modalTarget ? DIAS_SEMANA[modalTarget.diaIndex] : ''})</h3>
            <div className="cpt-modal-list">
              {filteredTurnosBase.length === 0 && (
                <p className="cpt-modal-empty">No hay turnos base configurados para iniciar un {modalTarget ? DIAS_SEMANA[modalTarget.diaIndex].toLowerCase() : ''}.</p>
              )}
              {filteredTurnosBase.map(tb => (
                <div key={tb.idTurnoBase} className="cpt-modal-item" onClick={() => handleSelectTurno(tb)}>
                  <strong>{tb.nombre}</strong>
                  <span>{tb.tipoTurno?.nombre} ({tb.horaInicio} - {tb.horaFin})</span>
                </div>
              ))}
            </div>
            <div className="cpt-modal-footer">
              <button className="cpt-btn delete" onClick={handleClearTurno}>Quitar Turno</button>
              <button className="cpt-btn cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}