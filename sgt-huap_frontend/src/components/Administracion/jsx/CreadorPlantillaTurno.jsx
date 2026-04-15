import React, { useState, useEffect, useMemo } from 'react';
import { ClipboardList, AlertTriangle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../css/CreadorPlantillaTurno.css';
import axiosInstance from "../../../utils/axiosConfig";
import PlantillaPreview from './PlantillaPreview';
import StepNavigator from './StepNavigator';

// --- Constantes ---
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

// --- Componente Tooltip Personalizado (estética y comportamiento similar a Gestor de Esquemas)
const CustomTooltip = ({ children, isVisible, position = 'top', windowWidth }) => {
  if (!isVisible || !children) return null;

  const isMobile = windowWidth <= 768;
  const adjustedPosition = isMobile ? 'bottom' : position;

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  return (
    <div className={`absolute z-50 ${positionClasses[adjustedPosition]} ${isMobile ? 'w-72 max-w-[calc(100vw-2rem)]' : 'w-96'} p-3 bg-white border-2 border-blue-200 rounded-lg shadow-xl transition-all duration-200 ease-in-out`}>
      <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-800 leading-relaxed`}>
        {children}
      </div>
      <div className={`absolute w-3 h-3 bg-white border-2 border-blue-200 transform rotate-45 ${
        adjustedPosition === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-2 border-t-0 border-l-0' :
        adjustedPosition === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-2 border-b-0 border-r-0' :
        adjustedPosition === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-2 border-l-0 border-b-0' :
        'right-full top-1/2 -translate-y-1/2 -mr-2 border-r-0 border-t-0'
      }`}></div>
    </div>
  );
};

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

export default function CreadorPlantillaTurno() {
  const navigate = useNavigate();

  // Tooltip UI state (for step instructions)
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  useEffect(() => {
    const loadData = async () => {
      const servicioId = localStorage.getItem("servicioId");
      if (!servicioId) {
        setError("No se encontró el ID del servicio. Inicia sesión nuevamente.");
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
          setError("Sesión expirada. Por favor, recarga la página.");
        } else {
          setError("Error al cargar datos.");
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
    // Mapa para búsqueda rápida
    const turnosMap = {};
    turnosBase.forEach(t => turnosMap[t.idTurnoBase] = t);

    return lineasRaw.map(l => {
      let diasIds = [];
      try { diasIds = JSON.parse(l.matrizSemana || "[]"); } catch (e) { }
      const diasObj = diasIds.map(id => id ? turnosMap[id] : null);
      // Usamos timestamp para ID único en frontend para evitar conflictos de keys si hay repetidos, aunque el ID de BD sirve
      return { id: l.idPlantillaLinea || Date.now() + Math.random(), nombre: l.nombreLinea, dias: diasObj };
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNombrePlantilla("");
    setLineas([createEmptyLine(Date.now())]);
  };


  // --- Handlers de Líneas y Modal (Sin cambios) ---
  const handleAddLine = () => setLineas([...lineas, createEmptyLine(Date.now())]);
  const handleRemoveLine = (lineaId) => {
    if (lineas.length === 1) { alert("Debe haber al menos una línea de turnos."); return; }
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

  // --- Guardado (ACTUALIZADO: EDICIÓN vs CREACIÓN) ---
  const handleSave = async () => {
    if (!nombrePlantilla.trim()) {
      alert("Debes poner un nombre a la plantilla.");
      return;
    }

    const idCreador = localStorage.getItem("userId");
    setSaving(true);
    setError(null);

    try {
      let plantillaId = editingId;

      if (editingId) {
        // --- MODO EDICIÓN ---
        // 1. Actualizar Nombre
        await axiosInstance.put(`${API_PLANTILLAS}/${editingId}`, { nombre: nombrePlantilla });

        // 2. Borrar líneas viejas
        await axiosInstance.delete(`${API_LINEAS}/by-plantilla/${editingId}`);

        // (El backend ahora está limpio de líneas para esta plantilla)

      } else {
        // --- MODO CREACIÓN ---
        const payloadPlantilla = {
          nombre: nombrePlantilla,
          creador: { idPersonal: Number(idCreador) }
        };
        const resPlantilla = await axiosInstance.post(`${API_PLANTILLAS}/`, payloadPlantilla);
        plantillaId = resPlantilla.data.idPlantillaPiso;
      }

      // 3. Guardar Nuevas Líneas (Igual para ambos modos)
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

      // Feedback
      if (editingId) {
        alert("✅ Plantilla actualizada correctamente.");
        // Recargar lista de plantillas para reflejar cambio de nombre si hubo
        const resP = await axiosInstance.get(`${API_PLANTILLAS}/`);
        setPlantillas(resP.data);
        handleCancelEdit(); // Salir modo edición
      } else {
        alert("✅ Plantilla creada exitosamente.");
        // Recargar y limpiar
        const resP = await axiosInstance.get(`${API_PLANTILLAS}/`);
        setPlantillas(resP.data);
        setNombrePlantilla("");
        setLineas([createEmptyLine(Date.now())]);
      }

    } catch (err) {
      console.error("Error al guardar:", err);
      setError("Error al guardar la plantilla. Intente nuevamente.");
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
    <div className="cpt-page">
      <div className="cpt-container">
        <header className="cpt-header">
          <h1>Gestor de Plantillas Maestras</h1>
          <p>Crea nuevas plantillas o edita las existentes.</p>
        </header>
        {error && <div className="cpt-error">{error}</div>}

        <section className="cpt-config-section" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '40px',
          marginBottom: '30px',
          alignItems: 'start' // Alineación vertical superior
        }}>

          {/* IZQUIERDA: NOMBRE (CREAR O EDITAR) */}
          <div className="cpt-field" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: '400px', // Ancho máximo para que no se estire demasiado
            margin: '0 auto'  // Centrado horizontal en su celda
          }}>
            <label style={{ alignSelf: 'flex-start', color: editingId ? '#d97706' : '#334155', fontWeight: 'bold' }}>
              <div className="relative inline-block" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span
                  className="enumeration-icon"
                  style={{
                    display: 'inline-block',
                    width: '26px',
                    height: '26px',
                    backgroundColor: '#17416c',
                    color: 'white',
                    borderRadius: '50%',
                    textAlign: 'center',
                    lineHeight: '26px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginRight: '4px',
                    cursor: 'help'
                  }}
                  onMouseEnter={() => setActiveTooltip('plant_step1')}
                  onMouseLeave={() => setActiveTooltip(null)}
                >1</span>
                <CustomTooltip isVisible={activeTooltip === 'plant_step1'} position="top" windowWidth={windowWidth}>
                  <div className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <ClipboardList size={16} />
                    PASO 1 - NOMBRE
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">•</span>
                      <span>Escribe un nombre descriptivo para la plantilla (ej. Rotativa Invierno).</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Info size={14} className="text-blue-600 mt-0.5" />
                      <span>Si editas, el nombre se actualizará al guardar.</span>
                    </div>
                  </div>
                </CustomTooltip>
              </div>
              {editingId ? "EDITANDO NOMBRE:" : "Crear Nueva Plantilla (Nombre)"}
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

          {/* DERECHA: SELECTOR DE EDICIÓN */}
          <div className="cpt-field" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: '400px',
            margin: '0 auto'
          }}>
            <label style={{ alignSelf: 'flex-start', color: '#64748b' }}>
              <div className="relative inline-block" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span
                  className="enumeration-icon"
                  style={{
                    display: 'inline-block',
                    width: '26px',
                    height: '26px',
                    backgroundColor: '#17416c',
                    color: 'white',
                    borderRadius: '50%',
                    textAlign: 'center',
                    lineHeight: '26px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginRight: '4px',
                    cursor: 'help'
                  }}
                  onMouseEnter={() => setActiveTooltip('plant_step2')}
                  onMouseLeave={() => setActiveTooltip(null)}
                >2</span>
                <CustomTooltip isVisible={activeTooltip === 'plant_step2'} position="top" windowWidth={windowWidth}>
                  <div className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <ClipboardList size={16} />
                    PASO 2 - EDITAR PLANTILLA
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">•</span>
                      <span>Selecciona una plantilla existente para cargar sus líneas y turnos.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={14} className="text-red-600 mt-0.5" />
                      <span><strong>Atención:</strong> Esto reemplazará el editor con los datos cargados.</span>
                    </div>
                  </div>
                </CustomTooltip>
              </div>
              O editar una existente:
            </label>
            <select
              value={editingId || ""}
              onChange={handleSelectTemplateToEdit}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                width: '100%',
                fontSize: '1rem',
                backgroundColor: '#f8fafc'
              }}
            >
              <option value="">-- Seleciona una plantilla para editarla --</option>
              {plantillas.map(p => (
                <option key={p.idPlantillaPiso} value={p.idPlantillaPiso}>{p.nombre}</option>
              ))}
            </select>
          </div>

        </section>

        <section className="cpt-editor-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div className="relative inline-block">
              <span
                className="enumeration-icon"
                style={{
                  display: 'inline-block',
                  width: '26px',
                  height: '26px',
                  backgroundColor: '#17416c',
                  color: 'white',
                  borderRadius: '50%',
                  textAlign: 'center',
                  lineHeight: '26px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'help'
                }}
                onMouseEnter={() => setActiveTooltip('plant_step3')}
                onMouseLeave={() => setActiveTooltip(null)}
              >3</span>
              <CustomTooltip isVisible={activeTooltip === 'plant_step3'} position="top" windowWidth={windowWidth}>
                <div className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <ClipboardList size={16} />
                  PASO 3 - EDITAR LINEAS
                </div>
                <div className="space-y-1">
                  <div className="flex items-start gap-2"><span className="text-green-600 mt-0.5">•</span><span>Agrega líneas y asigna turnos a cada día.</span></div>
                  <div className="flex items-start gap-2"><Info size={14} className="text-blue-600 mt-0.5" /><span>Haz clic en una celda para elegir un turno base que inicie ese día.</span></div>
                </div>
              </CustomTooltip>
            </div>
            <h3 style={{ margin: 0 }}>Editor de Líneas</h3>
          </div>
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

        <section className="cpt-preview-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="relative inline-block">
              <span
                className="enumeration-icon"
                style={{
                  display: 'inline-block',
                  width: '26px',
                  height: '26px',
                  backgroundColor: '#17416c',
                  color: 'white',
                  borderRadius: '50%',
                  textAlign: 'center',
                  lineHeight: '26px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'help'
                }}
                onMouseEnter={() => setActiveTooltip('plant_step4')}
                onMouseLeave={() => setActiveTooltip(null)}
              >4</span>
              <CustomTooltip isVisible={activeTooltip === 'plant_step4'} position="top" windowWidth={windowWidth}>
                <div className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <ClipboardList size={16} />
                  PASO 4 - PREVISUALIZACIÓN
                </div>
                <div className="space-y-1">
                  <div className="flex items-start gap-2"><span className="text-green-600 mt-0.5">•</span><span>Revisa cómo se verá la plantilla antes de guardar.</span></div>
                  <div className="flex items-start gap-2"><Info size={14} className="text-blue-600 mt-0.5" /><span>Corrige líneas o celdas si algo no coincide.</span></div>
                </div>
              </CustomTooltip>
            </div>
            <h2>Previsualización (Motor de Pintado)</h2>
          </div>
          <PlantillaPreview lineas={lineas} />
        </section>

        <StepNavigator>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="relative inline-block">
              <span
                className="enumeration-icon"
                style={{
                  display: 'inline-block',
                  width: '26px',
                  height: '26px',
                  backgroundColor: '#17416c',
                  color: 'white',
                  borderRadius: '50%',
                  textAlign: 'center',
                  lineHeight: '26px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'help'
                }}
                onMouseEnter={() => setActiveTooltip('plant_step5')}
                onMouseLeave={() => setActiveTooltip(null)}
              >5</span>
              <CustomTooltip isVisible={activeTooltip === 'plant_step5'} position="top" windowWidth={windowWidth}>
                <div className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <ClipboardList size={16} />
                  PASO 5 - GUARDAR
                </div>
                <div className="space-y-1">
                  <div className="flex items-start gap-2"><span className="text-green-600 mt-0.5">•</span><span>Revisa y guarda la plantilla. En edición se actualizarán las líneas.</span></div>
                </div>
              </CustomTooltip>
            </div>
            <button className={`cpt-btn ${editingId ? 'warning' : 'save'}`} onClick={handleSave} disabled={saving}>
              {saving ? "Procesando..." : (editingId ? "Guardar Cambios" : "Guardar Plantilla")}
            </button>
          </div>
        </StepNavigator>
      </div>

      {isModalOpen && (
        <div className="cpt-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="cpt-modal" onClick={e => e.stopPropagation()}>
            <h3>Seleccionar Turno para {modalTarget ? DIAS_SEMANA[modalTarget.diaIndex] : ''}</h3>
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