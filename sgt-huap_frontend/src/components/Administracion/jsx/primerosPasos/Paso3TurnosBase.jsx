import React, { useState, useEffect } from 'react';
import axiosInstance from "../../../../utils/axiosConfig";
import '../../css/primerosPasos/Paso3TurnosBase.css';

const API_BASE = "/turnos-base";
const API_CATEGORIAS = "/categorias-tipo-turno";
const API_TIPOS_TURNO = "/tipos-turno";

export default function Paso3TurnosBase({ onDataSaved }) {

  // --- Estados Generales ---
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');

  // --- Estados Multi-Selección Global ---
  const [selectedTiposIds, setSelectedTiposIds] = useState([]);
  const [nombresMap, setNombresMap] = useState({});
  // NUEVO: Guardamos datos extra para no perder el rastro al cambiar de categoría
  const [selectedMeta, setSelectedMeta] = useState({});

  // --- Estados Listas ---
  const [categorias, setCategorias] = useState([]);
  const [tiposTurno, setTiposTurno] = useState([]); // Solo muestra los de la categoría ACTUAL
  const [selectedCategoriaId, setSelectedCategoriaId] = useState(null);

  // --- Estado Edición ---
  const [editingId, setEditingId] = useState(null);
  const [nombreEdit, setNombreEdit] = useState('');

  const [listaTurnosBase, setListaTurnosBase] = useState([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [loadingTiposTurno, setLoadingTiposTurno] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchCategorias();
    fetchTurnosCreados();
  }, []);

  // --- CAMBIO CLAVE 1: Al cambiar categoría NO reseteamos la selección ---
  useEffect(() => {
    if (selectedCategoriaId) {
      fetchTiposTurno(selectedCategoriaId);
    } else {
      setTiposTurno([]);
    }
  }, [selectedCategoriaId]);

  // --- Fetchers (Igual que antes) ---
  const fetchTurnosCreados = async () => {
    const servicioId = localStorage.getItem('servicioId');
    if (!servicioId) return;
    try {
      const response = await axiosInstance.get(`${API_BASE}/by-servicio/${servicioId}`);
      setListaTurnosBase(response.data);
      if (response.data.length > 0 && onDataSaved) onDataSaved();
    } catch (err) { console.warn(err); }
  };

  const fetchCategorias = async () => {
    const servicioId = localStorage.getItem("servicioId");
    if (!servicioId) return;
    try {
      setLoadingCategorias(true);
      const response = await axiosInstance.get(`${API_CATEGORIAS}/by-servicio/${servicioId}`);
      setCategorias(response.data);
      if (response.data.length > 0 && !selectedCategoriaId) setSelectedCategoriaId(response.data[0].idCategoriaTipoTurno);
    } catch (err) { console.error(err); } finally { setLoadingCategorias(false); }
  };

  const fetchTiposTurno = async (categoriaId) => {
    try {
      setLoadingTiposTurno(true);
      const response = await axiosInstance.get(`${API_TIPOS_TURNO}/by-categoria/${categoriaId}`);
      setTiposTurno(response.data);
    } catch (err) { console.error(err); } finally { setLoadingTiposTurno(false); }
  };

  // --- CAMBIO CLAVE 2: Guardamos metadata al seleccionar ---
  const handleToggleTipo = (tipo) => {
    const id = tipo.idTipoTurno;

    // --- MODO EDICIÓN: Selección Única (Reemplazo) ---
    if (editingId) {
      setSelectedTiposIds([id]);

      const catActual = categorias.find(c => c.idCategoriaTipoTurno === selectedCategoriaId);
      setSelectedMeta({
        [id]: {
          originalName: tipo.nombre,
          catName: catActual?.nombre || 'General',
          catId: selectedCategoriaId
        }
      });
      return;
    }

    // --- MODO CREACIÓN (Original) ---
    if (selectedTiposIds.includes(id)) {
      setSelectedTiposIds(prev => prev.filter(item => item !== id));
      const newMap = { ...nombresMap }; delete newMap[id]; setNombresMap(newMap);
      const newMeta = { ...selectedMeta }; delete newMeta[id]; setSelectedMeta(newMeta);
    } else {
      setSelectedTiposIds(prev => [...prev, id]);
      setNombresMap(prev => ({ ...prev, [id]: tipo.nombre }));

      const catActual = categorias.find(c => c.idCategoriaTipoTurno === selectedCategoriaId);
      setSelectedMeta(prev => ({
        ...prev,
        [id]: {
          originalName: tipo.nombre,
          catName: catActual?.nombre || 'General',
          catId: selectedCategoriaId
        }
      }));
    }
  };

  const handleNombreChange = (id, val) => {
    setNombresMap(prev => ({ ...prev, [id]: val }));
  };

  const handleStartEdit = (turno) => {
    setEditingId(turno.idTurnoBase);
    setNombreEdit(turno.nombre);
    setHoraInicio(turno.horaInicio);
    setHoraFin(turno.horaFin);
    setError(null); setSuccessMessage("");

    // --- LÓGICA DE PRE-SELECCIÓN PARA EDICIÓN ---
    if (turno.tipoTurno) {
      const tId = turno.tipoTurno.idTipoTurno;
      setSelectedTiposIds([tId]);

      if (turno.tipoTurno.categoria) {
        setSelectedCategoriaId(turno.tipoTurno.categoria.idCategoriaTipoTurno);
      }

      setSelectedMeta({
        [tId]: {
          originalName: turno.tipoTurno.nombre,
          catName: turno.tipoTurno.categoria?.nombre || '?',
          catId: turno.tipoTurno.categoria?.idCategoriaTipoTurno
        }
      });
    } else {
      setSelectedTiposIds([]); setNombresMap({}); setSelectedMeta({});
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null); setNombreEdit(''); setSelectedTiposIds([]); setNombresMap({}); setSelectedMeta({});
    setHoraInicio(''); setHoraFin(''); setSuccessMessage(""); setError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true); setError(null); setSuccessMessage("");

    const idCreador = localStorage.getItem("userId");
    const servicioId = localStorage.getItem("servicioId");

    if (!idCreador || !servicioId) { setError("Faltan datos de sesión."); setLoading(false); return; }

    try {
      if (editingId) {
        // Validamos selección única
        if (selectedTiposIds.length === 0) {
          setError("Debes mantener seleccionado un patrón."); setLoading(false); return;
        }
        const finalTipoId = selectedTiposIds[0];

        const payload = {
          nombre: nombreEdit.trim(), horaInicio, horaFin,
          tipoTurno: { idTipoTurno: finalTipoId },
          creador: { idPersonal: Number(idCreador) }, servicio: { idServicio: Number(servicioId) }
        };
        await axiosInstance.put(`${API_BASE}/${editingId}`, payload);
        setSuccessMessage(`✅ Actualizado.`);
        handleCancelEdit();
      } else {
        // Lógica Crear Masivo
        if (selectedTiposIds.length === 0) { setError("Selecciona al menos un patrón."); setLoading(false); return; }

        const promesas = selectedTiposIds.map(idTipo => {
          return axiosInstance.post(`${API_BASE}/`, {
            nombre: nombresMap[idTipo] || "Sin nombre",
            horaInicio, horaFin,
            tipoTurno: { idTipoTurno: idTipo },
            creador: { idPersonal: Number(idCreador) },
            servicio: { idServicio: Number(servicioId) }
          });
        });

        await Promise.all(promesas);
        setSuccessMessage(`✅ Se crearon ${selectedTiposIds.length} turnos correctamente.`);

        setSelectedTiposIds([]); setNombresMap({}); setSelectedMeta({});
        setHoraInicio(''); setHoraFin('');
      }
      setTimeout(() => fetchTurnosCreados(), 500);
      if (onDataSaved) onDataSaved();
    } catch (err) { console.error(err); setError("Error al guardar."); } finally { setLoading(false); }
  };

  // Helper para saber si una categoría tiene items seleccionados (para ponerle un puntito visual)
  const countSelectionInCat = (catId) => {
    return Object.values(selectedMeta).filter(m => m.catId === catId).length;
  };

  return (
    <div className="paso3-container">
      <div className="p3-header">
        <h2>Definir Horarios (Multi-Categoría)</h2>
        <p>Navega entre categorías y selecciona todos los que necesites.</p>
      </div>

      {error && <div className="p3-error-bar">{error}</div>}
      {successMessage && <div className="p3-success-bar">{successMessage}</div>}

      <div className="p3-main-layout">

        <form className={`p3-form-section ${editingId ? 'is-editing-mode' : ''}`} onSubmit={handleSubmit}>

          {editingId && (
            <div className="p3-editing-indicator">
              <span>Editando: <strong>{nombreEdit}</strong></span>
              <button type="button" className="p3-btn-mini-cancel" onClick={handleCancelEdit}>✕ Cancelar</button>
            </div>
          )}

          <div className="p3-selectors-row">
            {/* COLUMNA 1: CATEGORÍAS */}
            <div className="p3-col">
              <h3>1. Categoría</h3>
              <div className="p3-list-box small">
                {loadingCategorias ? <p>Cargando...</p> :
                  categorias.map((cat) => {
                    const count = countSelectionInCat(cat.idCategoriaTipoTurno);
                    return (
                      <div
                        key={cat.idCategoriaTipoTurno}
                        className={`p3-list-item ${cat.idCategoriaTipoTurno === selectedCategoriaId ? 'selected' : ''}`}
                        onClick={() => setSelectedCategoriaId(cat.idCategoriaTipoTurno)}
                        style={{ display: 'flex', justifyContent: 'space-between' }}
                      >
                        <span>{cat.nombre}</span>
                        {count > 0 && <span className="p3-badge-count">{count}</span>}
                      </div>
                    )
                  })
                }
              </div>
            </div>

            {/* COLUMNA 2: PATRONES */}
            <div className="p3-col">
              <h3>2. Patrón (Multiselección)</h3>
              <div className="p3-list-box small">
                {loadingTiposTurno ? <p>Cargando...</p> :
                  (tiposTurno.length === 0 ? <p className="p3-empty">Selecciona categoría</p> :
                    tiposTurno.map((tt) => {
                      const isSelected = selectedTiposIds.includes(tt.idTipoTurno);
                      return (
                        <div
                          key={tt.idTipoTurno}
                          className={`p3-list-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleToggleTipo(tt)}
                          style={{ display: 'flex', justifyContent: 'space-between' }}
                        >
                          <span>{tt.nombre}</span>
                          {isSelected && <span>✓</span>}
                        </div>
                      );
                    }))
                }
              </div>
            </div>
          </div>

          <div className="p3-inputs-card">
            <h3>3. Configuración Global</h3>
            <div className="p3-time-row">
              <div className="p3-field-group">
                <label>Inicio (Todos)</label>
                <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required className="p3-input" />
              </div>
              <div className="p3-field-group">
                <label>Fin (Todos)</label>
                <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} required className="p3-input" />
              </div>
            </div>

            <hr className="p3-divider" />

            <div className="p3-names-section">
              <label>Asignar Nombres ({selectedTiposIds.length} seleccionados):</label>

              {/* INPUTS DINÁMICOS */}
              {!editingId && selectedTiposIds.length > 0 ? (
                <div className="p3-dynamic-names-list">
                  {selectedTiposIds.map(id => {
                    // Recuperamos la info desde selectedMeta (porque puede que el item no esté visible en la lista de arriba)
                    const meta = selectedMeta[id] || { originalName: 'Turno', catName: '?' };
                    return (
                      <div key={id} className="p3-dynamic-row" style={{ marginBottom: '8px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ width: '100px', fontSize: '0.8rem', lineHeight: '1.1' }}>
                          <strong>{meta.originalName}</strong>
                          <div style={{ color: '#666', fontSize: '0.7rem' }}>{meta.catName}</div>
                        </div>
                        <input
                          type="text"
                          className="p3-input small"
                          value={nombresMap[id] || ''}
                          onChange={(e) => handleNombreChange(id, e.target.value)}
                          placeholder={`Nombre para ${meta.originalName}`}
                          required
                          style={{ flex: 1 }}
                        />
                      </div>
                    )
                  })}
                </div>
              ) : (
                !editingId && <p className="p3-hint-text">Navega por las categorías y selecciona los patrones que quieras poner las mismas horas.</p>
              )}

              {/* INPUT EDICIÓN SIMPLE */}
              {editingId && (
                <input type="text" className="p3-input" value={nombreEdit} onChange={(e) => setNombreEdit(e.target.value)} />
              )}
            </div>

            <div className="p3-actions-row">
              <button type="submit" className={`p3-btn-submit ${editingId ? 'is-edit' : ''}`} disabled={loading}>
                {loading ? 'Guardando...' : (editingId ? 'Guardar Cambios' : `Crear ${selectedTiposIds.length} Turnos`)}
              </button>
            </div>
          </div>
        </form>

        {/* DERECHA: LISTA (Sin cambios importantes) */}
        <div className="p3-list-created-section">
          <h3>Creados</h3>
          <div className="p3-created-list">
            {listaTurnosBase.map((tb, index) => (
              <div key={index} className={`p3-created-card ${editingId === tb.idTurnoBase ? 'active-editing' : ''}`} onClick={() => handleStartEdit(tb)}>
                <div className="p3-created-info">
                  <span className="p3-created-name">{tb.nombre}</span>
                  <span className="p3-created-time">{tb.horaInicio} - {tb.horaFin}</span>
                </div>
                <div className="p3-created-badge">{tb.tipoTurno?.nombre}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}