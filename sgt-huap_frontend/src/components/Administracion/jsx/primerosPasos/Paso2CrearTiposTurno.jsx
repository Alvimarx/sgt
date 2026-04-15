import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axiosInstance from "../../../../utils/axiosConfig";
import '../../css/primerosPasos/Paso2CrearTiposTurno.css';

// --- Constantes ---
const API_CATEGORIAS = "/categorias-tipo-turno";
const API_TIPOS_TURNO = "/tipos-turno";
const DIAS_SEMANA = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
const TURNO_CREADO_ID = "TURNO_CREADO";
const MAX_HISTORY_STEPS = 5;
const NUEVO_TIPO_TURNO_ID = "new-tipo-turno-id";

const VIDEO_TUTORIAL_SRC = "/videos/Uso_Tipo_Turno.webm";

// --- Helpers de Matriz ---
const initWeek = (semanaNum) => ({
  id: semanaNum,
  dias: DIAS_SEMANA.map(dia => ({
    type: 'placeholder',
    value: `${dia}_S${semanaNum}`,
    isSourceOfDuplication: false
  }))
});
const initialState = [initWeek(1)];

// --- Helper para reordenar listas ---
const reorderList = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

export default function Paso2CrearTiposTurno({ onDataSaved }) {

  // --- Estados del Formulario ---
  const [nombreTipoTurno, setNombreTipoTurno] = useState("");
  const [selectedCategoriaId, setSelectedCategoriaId] = useState(null);

  // --- Estado de Edición de Tipo de Turno ---
  const [editingId, setEditingId] = useState(null); // null = Modo Crear

  // Estados de UI
  const [showHelp, setShowHelp] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  // --- Estados de Listas ---
  const [categorias, setCategorias] = useState([]);
  const [tiposTurno, setTiposTurno] = useState([]);
  const [newTurnIndex, setNewTurnIndex] = useState(0);

  // --- Estados de Matriz ---
  const [semanas, setSemanas] = useState(initialState);
  const [history, setHistory] = useState([]);
  const [draggedBlock, setDraggedBlock] = useState(null);
  const [dndMode, setDndMode] = useState('move');

  // --- Estado DnD Listas ---
  const [draggedListInfo, setDraggedListInfo] = useState(null);

  // --- Estados Carga/Error ---
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [loadingTiposTurno, setLoadingTiposTurno] = useState(false);
  const [error, setError] = useState(null);
  const [loadingSaveTipoTurno, setLoadingSaveTipoTurno] = useState(false);

  // --- ESTADOS MODAL CATEGORÍA ---
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState('create'); // 'create' | 'edit'
  const [categoryNameInput, setCategoryNameInput] = useState("");
  const [loadingSaveCategory, setLoadingSaveCategory] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");

  // --- Carga Inicial ---
  useEffect(() => {
    fetchCategorias();
  }, []);

  useEffect(() => {
    if (selectedCategoriaId) {
      fetchTiposTurno(selectedCategoriaId);
    } else {
      setTiposTurno([]);
    }
    handleCancelEdit();
  }, [selectedCategoriaId]);

  // --- Fetchers ---
  const fetchCategorias = async () => {
    const servicioId = localStorage.getItem("servicioId");
    if (!servicioId) return;
    try {
      setLoadingCategorias(true);
      const response = await axiosInstance.get(`${API_CATEGORIAS}/by-servicio/${servicioId}`);
      setCategorias(response.data);
      if (response.data.length > 0 && !selectedCategoriaId) {
        setSelectedCategoriaId(response.data[0].idCategoriaTipoTurno);
      }
    } catch (err) { console.error(err); } finally { setLoadingCategorias(false); }
  };

  const fetchTiposTurno = async (categoriaId) => {
    try {
      setLoadingTiposTurno(true);
      const response = await axiosInstance.get(`${API_TIPOS_TURNO}/by-categoria/${categoriaId}`);
      setTiposTurno(response.data);
      if (response.data && response.data.length > 0 && onDataSaved) onDataSaved();
    } catch (err) { console.error(err); } finally { setLoadingTiposTurno(false); }
  };

  // --- Lista Visual DnD ---
  const visualTiposTurnoList = useMemo(() => {
    const nuevoTurno = {
      idTipoTurno: NUEVO_TIPO_TURNO_ID,
      nombre: (!editingId ? (nombreTipoTurno.trim() || "Nuevo Esquema de Turno") : "--- Crear Nuevo ---"),
      isNew: true
    };
    const result = Array.from(tiposTurno);
    result.splice(newTurnIndex, 0, nuevoTurno);
    return result;
  }, [nombreTipoTurno, tiposTurno, newTurnIndex, editingId]);

  // --- Lógica de Edición ---
  const handleStartEdit = (turno) => {
    if (turno.isNew) {
      handleCancelEdit();
      return;
    }

    setEditingId(turno.idTipoTurno);
    setNombreTipoTurno(turno.nombre);
    setError(null);
    setSuccessMessage("");
    setHistory([]);

    try {
      if (turno.matrizPatron) {
        let data;
        if (typeof turno.matrizPatron === 'string') {
          data = JSON.parse(turno.matrizPatron);
        } else {
          data = turno.matrizPatron;
        }

        const deltas = data.matriz || [];
        const numSemanas = Math.max(deltas.length, 1);

        const fullSemanas = [];
        for (let i = 0; i < numSemanas; i++) {
          const semanaId = i + 1;
          const semanaDeltas = deltas[i] || [];

          const newWeek = {
            id: semanaId,
            dias: DIAS_SEMANA.map((dia, j) => {
              const deltaValue = semanaDeltas[j];
              const originalValue = `${dia}_S${semanaId}`;

              const bloque = {
                type: 'placeholder',
                value: originalValue,
                isSourceOfDuplication: false
              };

              if (deltaValue === TURNO_CREADO_ID) {
                bloque.type = 'creado';
                bloque.value = TURNO_CREADO_ID;
              } else if (deltaValue !== null && deltaValue !== undefined) {
                bloque.type = 'placeholder';
                bloque.value = deltaValue;
                if (deltaValue === originalValue) {
                  bloque.isSourceOfDuplication = true;
                }
              }
              return bloque;
            })
          };
          fullSemanas.push(newWeek);
        }
        setSemanas(fullSemanas);
      } else {
        setSemanas(initialState);
      }
    } catch (e) {
      console.error("Error parseando matriz:", e);
      setSemanas(initialState);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNombreTipoTurno("");
    setSemanas(initialState);
    setHistory([]);
    setError(null);
    setSuccessMessage("");
    setNewTurnIndex(0);
  };

  // --- Handlers DnD ---
  const handleDragStartList = (index, type) => { setDraggedListInfo({ index, type }); };
  const handleDragOverList = (e) => { e.preventDefault(); };
  const handleDropList = async (targetIndex, type) => {
    if (!draggedListInfo || draggedListInfo.type !== type) return;
    const sourceIndex = draggedListInfo.index;
    if (sourceIndex === targetIndex) return;

    if (type === 'categorias') {
      const reordered = reorderList(categorias, sourceIndex, targetIndex);
      setCategorias(reordered);
    }
    if (type === 'tipos-turno') {
      const reorderedVisual = reorderList(visualTiposTurnoList, sourceIndex, targetIndex);
      const newItemIndex = reorderedVisual.findIndex(item => item.idTipoTurno === NUEVO_TIPO_TURNO_ID);
      const existingItems = reorderedVisual.filter(item => item.idTipoTurno !== NUEVO_TIPO_TURNO_ID);

      setNewTurnIndex(newItemIndex);
      setTiposTurno(existingItems);

      const payload = existingItems.map((tt, index) => ({
        idTipoTurno: tt.idTipoTurno,
        prioridadInterna: (index >= newItemIndex ? index + 1 : index)
      }));
      try { await axiosInstance.post(`${API_TIPOS_TURNO}/reorder`, payload); }
      catch (err) { fetchTiposTurno(selectedCategoriaId); }
    }
  };
  const handleDragEndList = () => { setDraggedListInfo(null); };

  // --- Handlers Modal Categoría ---
  const openCreateCategoryModal = () => {
    setCategoryModalMode('create');
    setCategoryNameInput("");
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = () => {
    const cat = categorias.find(c => c.idCategoriaTipoTurno === selectedCategoriaId);
    if (!cat) return;
    setCategoryModalMode('edit');
    setCategoryNameInput(cat.nombre);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    const servicioId = localStorage.getItem("servicioId");
    if (!categoryNameInput.trim()) return;
    setLoadingSaveCategory(true);

    try {
      if (categoryModalMode === 'create') {
        const payload = {
          nombre: categoryNameInput,
          prioridad: categorias.length,
          servicio: { idServicio: Number(servicioId) || 0 }
        };
        const response = await axiosInstance.post(`${API_CATEGORIAS}/`, payload);
        if (response.data && response.data.idCategoriaTipoTurno) {
          setSelectedCategoriaId(response.data.idCategoriaTipoTurno);
        }
      } else {
        const currentCat = categorias.find(c => c.idCategoriaTipoTurno === selectedCategoriaId);
        if (!currentCat) throw new Error("Categoría no encontrada");

        const payload = {
          nombre: categoryNameInput,
          prioridad: currentCat.prioridad,
          servicio: { idServicio: Number(servicioId) || 0 }
        };
        await axiosInstance.put(`${API_CATEGORIAS}/${selectedCategoriaId}`, payload);
      }

      await fetchCategorias();
      setIsCategoryModalOpen(false);
      setCategoryNameInput("");

    } catch (err) { setError("Error al guardar categoría."); }
    finally { setLoadingSaveCategory(false); }
  };

  // --- Lógica Matriz ---
  const updateSemanas = (newSemanas) => {
    setHistory(prev => {
      const newHistory = [...prev, semanas];
      return newHistory.length > MAX_HISTORY_STEPS ? newHistory.slice(newHistory.length - MAX_HISTORY_STEPS) : newHistory;
    });
    setSemanas(newSemanas);
  };
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setSemanas(lastState);
    setHistory(prev => prev.slice(0, prev.length - 1));
  }, [history]);

  const handleReset = () => {
    updateSemanas(initialState);
    setSemanas(initialState);
    setHistory([]);
  };

  const handleAddSemana = () => { if (semanas.length < 52) updateSemanas([...semanas, initWeek(semanas.length + 1)]); };
  const handleRemoveSemana = () => { if (semanas.length > 1) updateSemanas(semanas.slice(0, -1)); };

  const handleBlockClick = (semanaId, diaIndex) => {
    const newSemanas = semanas.map(semana => {
      if (semana.id === semanaId) {
        const nuevosDias = semana.dias.map((dia, index) => {
          if (index === diaIndex) {
            if (dia.type === 'placeholder') {
              return { type: 'creado', value: TURNO_CREADO_ID, isSourceOfDuplication: false };
            } else {
              return { type: 'placeholder', value: `${DIAS_SEMANA[diaIndex]}_S${semana.id}`, isSourceOfDuplication: false };
            }
          }
          return dia;
        });
        return { ...semana, dias: nuevosDias };
      }
      return semana;
    });
    updateSemanas(newSemanas);
  };

  const handleDragStartMatriz = (semanaId, diaIndex) => { setDraggedBlock({ semanaId, diaIndex }); };

  const handleDropMatriz = (targetSemanaId, targetDiaIndex) => {
    if (!draggedBlock) return;
    const sourceCoords = draggedBlock;
    const targetCoords = { semanaId: targetSemanaId, diaIndex: targetDiaIndex };

    if (sourceCoords.semanaId === targetCoords.semanaId && sourceCoords.diaIndex === targetCoords.diaIndex) return;

    const newSemanas = JSON.parse(JSON.stringify(semanas));
    const sWeek = newSemanas[sourceCoords.semanaId - 1];
    const tWeek = newSemanas[targetCoords.semanaId - 1];
    const sBlock = sWeek.dias[sourceCoords.diaIndex];
    const tBlock = tWeek.dias[targetCoords.diaIndex];

    if (dndMode === 'move') {
      sBlock.isSourceOfDuplication = false;
      tBlock.isSourceOfDuplication = false;
      sWeek.dias[sourceCoords.diaIndex] = tBlock;
      tWeek.dias[targetCoords.diaIndex] = sBlock;
    } else {
      sBlock.isSourceOfDuplication = true;
      tWeek.dias[targetCoords.diaIndex] = { ...sBlock, isSourceOfDuplication: false };
    }
    updateSemanas(newSemanas);
    setDraggedBlock(null);
  };
  const handleDragEndMatriz = () => { setDraggedBlock(null); };

  const getBlockClassName = (bloque, semanaId, diaIndex) => {
    if (bloque.type === 'creado') return 'block-tipo-creado';
    const originalValue = `${DIAS_SEMANA[diaIndex]}_S${semanaId}`;
    if (bloque.value !== originalValue || bloque.isSourceOfDuplication) return 'block-placeholder-moved';
    return 'block-placeholder';
  };

  const handleSaveTipoTurno = async () => {
    const idCreador = localStorage.getItem("userId");
    if (!nombreTipoTurno.trim() || !selectedCategoriaId || !idCreador) {
      setError("Faltan datos clave."); return;
    }
    setLoadingSaveTipoTurno(true); setError(null);

    const matrizDeltas = semanas.map(semana => {
      return semana.dias.map((bloque, diaIndex) => {
        const originalValue = `${DIAS_SEMANA[diaIndex]}_S${semana.id}`;
        if (bloque.type === 'creado') return TURNO_CREADO_ID;
        if (bloque.value !== originalValue) return bloque.value;
        if (bloque.isSourceOfDuplication) return bloque.value;
        return null;
      });
    });

    const payload = {
      nombre: nombreTipoTurno.trim(),
      prioridadInterna: newTurnIndex,
      matrizPatron: JSON.stringify({ matriz: matrizDeltas }),
      categoria: { idCategoriaTipoTurno: Number(selectedCategoriaId) },
      creador: { idPersonal: Number(idCreador) }
    };

    try {
      if (editingId) {
        await axiosInstance.put(`${API_TIPOS_TURNO}/${editingId}`, payload);
        setSuccessMessage(`✅ Patrón "${nombreTipoTurno}" actualizado.`);
        handleCancelEdit();
      } else {
        await axiosInstance.post(`${API_TIPOS_TURNO}/`, payload);
        setSuccessMessage(`✅ Patrón "${nombreTipoTurno}" creado.`);
        setNombreTipoTurno("");
        setSemanas(initialState);
        setHistory([]);
      }

      fetchTiposTurno(selectedCategoriaId);
      if (onDataSaved) onDataSaved();

      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) { setError("Error al guardar."); }
    finally { setLoadingSaveTipoTurno(false); }
  };

  return (
    <div className="paso2-container">
      <header className="ctt-header">
        <h1>Creador de Esquemas de Turno</h1>
        <p>Define un patrón de rotativa y su prioridad de pintado.</p>
      </header>

      {error && <div className="ctt-error-bar">{error}</div>}
      {successMessage && (
        <div className="ctt-success-bar" style={{ backgroundColor: '#dcfce7', border: '1px solid #22c55e', color: '#15803d', padding: '10px', borderRadius: '8px', marginBottom: '15px', textAlign: 'center' }}>
          {successMessage}
        </div>
      )}

      {/* --- SECCIÓN PRINCIPAL --- */}
      <section className="ctt-priority-layout">

        <div className="ctt-help-box" onClick={() => setShowHelp(!showHelp)} style={{ cursor: 'pointer' }}>
          <div className="ctt-help-icon">?</div>
          <div className="ctt-help-content">
            {showHelp && <p>El orden vertical define la prioridad: Los turnos de arriba sobrescriben a los de abajo si coinciden en fecha.</p>}
          </div>
        </div>

        {/* 1. Categorías */}
        <div className="ctt-priority-column">
          <h2>Categorías de Esquemas</h2>
          <div className="priority-list" onDragOver={handleDragOverList}>
            {loadingCategorias ? <p>Cargando...</p> : (
              categorias.map((cat, index) => (
                <div
                  key={cat.idCategoriaTipoTurno}
                  className={`priority-item ${cat.idCategoriaTipoTurno === selectedCategoriaId ? 'is-selected' : ''}`}
                  onClick={() => setSelectedCategoriaId(cat.idCategoriaTipoTurno)}
                  draggable={!editingId}
                  onDragStart={() => handleDragStartList(index, 'categorias')}
                  onDrop={() => handleDropList(index, 'categorias')}
                  onDragEnd={handleDragEndList}
                >
                  <span>{cat.nombre}</span>
                  <span className="priority-badge">Nivel de Prioridad: {index}</span>
                </div>
              ))
            )}
          </div>

          {/* BOTONES CATEGORÍA: NUEVA + EDITAR */}
          <div className="ctt-category-btn-row">
            <button
              className="ctt-btn-add-full"
              onClick={openCreateCategoryModal}
            >
              + Nueva Categoría
            </button>

            <button
              className="ctt-btn-add-full btn-edit"
              onClick={openEditCategoryModal}
              disabled={!selectedCategoriaId}
              title="Editar nombre de la categoría seleccionada"
              style={!selectedCategoriaId ? { backgroundColor: '#f9f9f9', color: '#ccc', borderColor: '#eee', cursor: 'not-allowed' } : {}}
            >
              ✎ Editar
            </button>
          </div>
        </div>

        {/* 2. Tipos de Turno */}
        <div className="ctt-priority-column">
          <h2>Esquema de Turno</h2>

          <div className="ctt-field" style={{ position: 'relative' }}>
            {editingId && (
              <div className="ctt-editing-badge">
                EDITANDO
              </div>
            )}
            <label htmlFor="nombre" style={editingId ? { color: '#b91c1c' } : {}}>
              {editingId ? 'EDITANDO NOMBRE:' : 'NOMBRE DEL NUEVO ESQUEMA:'}
            </label>
            <input
              id="nombre"
              type="text"
              value={nombreTipoTurno}
              onChange={e => setNombreTipoTurno(e.target.value)}
              placeholder="Ej: Volante de Sabado"
              style={editingId ? { borderColor: '#b91c1c', backgroundColor: '#fff5f5' } : {}}
            />
          </div>

          <div className="priority-list" onDragOver={handleDragOverList}>
            {loadingTiposTurno ? <p>Cargando...</p> : (
              visualTiposTurnoList.map((tt, index) => {
                const isEditingThis = tt.idTipoTurno === editingId;
                return (
                  <div
                    key={tt.idTipoTurno}
                    className={`priority-item ${tt.isNew ? 'item-new' : ''}`}
                    style={isEditingThis ? { border: '2px solid #b91c1c', backgroundColor: '#fff1f2' } : {}}
                    onClick={() => handleStartEdit(tt)}
                    draggable="true"
                    onDragStart={() => handleDragStartList(index, 'tipos-turno')}
                    onDrop={() => handleDropList(index, 'tipos-turno')}
                    onDragEnd={handleDragEndList}
                    title={tt.isNew ? "Crear nuevo" : "Clic para editar"}
                  >
                    <span>{tt.nombre}</span>
                    {isEditingThis ? <span style={{ fontSize: '0.7em', color: 'red' }}>EDITANDO</span> : <span className="priority-badge">Nivel de Prioridad: {index}</span>}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </section>

      {/* --- 3. Matriz Editor --- */}
      <section className="ctt-matriz-section">
        <div className="ctt-matriz-header">
          <div className="ctt-header-info">
            {editingId ? (
              <h2 style={{ color: '#b91c1c' }}>Editando Patrón: {nombreTipoTurno}</h2>
            ) : (
              <h2>Nuevo Patrón de Semanas</h2>
            )}
            <p style={{ margin: '4px 0 0 0' }}>Los bloques azules son turnos alterados por el esquema. Los rojos son el dia que debera ir quien se le asigne este esquema de turno.</p>
          </div>

          <div className="ctt-matriz-controls">
            <button className="ctt-video-help-btn" onClick={() => setShowVideoModal(true)}>?</button>
            <div className="ctt-mode-toggle">
              <span>Modo:</span>
              <button className={`ctt-btn-mode ${dndMode === 'move' ? 'active' : ''}`} onClick={() => setDndMode('move')}>Intercambio</button>
              <button className={`ctt-btn-mode ${dndMode === 'duplicate' ? 'active' : ''}`} onClick={() => setDndMode('duplicate')}>Duplicar</button>
            </div>
          </div>
        </div>

        <div className="ctt-matriz-container" style={editingId ? { border: '2px solid #fee2e2' } : {}}>
          {semanas.map(semana => (
            <div key={semana.id} className="ctt-semana-grid">
              <h3>SEMANA {semana.id}</h3>
              <div className="ctt-dias-container">
                {semana.dias.map((bloque, index) => {
                  const isDragging = draggedBlock && draggedBlock.semanaId === semana.id && draggedBlock.diaIndex === index;
                  const blockText = bloque.type === 'creado' ? (nombreTipoTurno.trim() || "Turno") : bloque.value;
                  return (
                    <div key={index} className="ctt-dia-columna">
                      <h4>{DIAS_SEMANA[index]}</h4>
                      <div className="ctt-dia-slot" onDragOver={(e) => e.preventDefault()} onDrop={() => handleDropMatriz(semana.id, index)}>
                        <div
                          className={`ctt-block ${getBlockClassName(bloque, semana.id, index)} ${isDragging ? 'is-dragging' : ''}`}
                          onClick={() => handleBlockClick(semana.id, index)}
                          draggable="true"
                          onDragStart={() => handleDragStartMatriz(semana.id, index)}
                          onDragEnd={handleDragEndMatriz}
                        >
                          {blockText}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="ctt-semana-actions">
          <button className="ctt-btn secondary" onClick={handleAddSemana}>+ Semana</button>
          <button className="ctt-btn cancel" onClick={handleRemoveSemana} disabled={semanas.length <= 1}>- Semana</button>
        </div>
      </section>

      {/* --- Acciones Finales --- */}
      <section className="ctt-actions-section" style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <div className="ctt-actions-right" style={{ display: 'flex', gap: '12px' }}>
          {editingId && (
            <button className="ctt-btn cancel" onClick={handleCancelEdit}>Cancelar Edición</button>
          )}

          <button className="ctt-btn warning" onClick={handleUndo} disabled={history.length === 0}>Deshacer</button>
          <button className="ctt-btn cancel" onClick={handleReset}>Limpiar</button>

          <button
            className={`ctt-btn ${editingId ? 'warning' : 'primary'}`}
            onClick={handleSaveTipoTurno}
            disabled={loadingSaveTipoTurno || !nombreTipoTurno.trim() || !selectedCategoriaId}
          >
            {loadingSaveTipoTurno ? "Guardando..." : (editingId ? "Guardar Cambios" : "Crear Patrón")}
          </button>
        </div>
      </section>

      {/* --- Modales --- */}
      {isCategoryModalOpen && (
        <div className="ctt-modal-backdrop" onClick={() => setIsCategoryModalOpen(false)}>
          <div className="ctt-modal-content" onClick={e => e.stopPropagation()}>
            <h2>{categoryModalMode === 'create' ? 'Nueva Categoría' : 'Editar Categoría'}</h2>
            <div className="ctt-field">
              <input
                type="text"
                value={categoryNameInput}
                onChange={e => setCategoryNameInput(e.target.value)}
                placeholder="Nombre de la Categoría"
                autoFocus
              />
            </div>
            <div className="ctt-modal-actions">
              <button className="ctt-btn cancel" onClick={() => setIsCategoryModalOpen(false)}>Cancelar</button>
              <button
                className="ctt-btn primary"
                onClick={handleSaveCategory}
                disabled={loadingSaveCategory || !categoryNameInput.trim()}
              >
                {loadingSaveCategory ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showVideoModal && (
        <div className="ctt-modal-backdrop" onClick={() => setShowVideoModal(false)}>
          <div className="ctt-modal-content video-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <button className="ctt-btn cancel" onClick={() => setShowVideoModal(false)} style={{ float: 'right' }}>✕</button>
            <video controls autoPlay style={{ width: '100%' }}>
              <source src={VIDEO_TUTORIAL_SRC} type="video/webm" />
            </video>
          </div>
        </div>
      )}
    </div>
  );
}

