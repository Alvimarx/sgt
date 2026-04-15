import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from "../../../utils/axiosConfig";
import '../css/TurnTypeCreator.css';
import StepNavigator from './StepNavigator';
import { Clock, FolderOpen, CheckSquare, Edit3, Plus, AlertCircle, Info } from 'lucide-react';

// CustomTooltip with adaptive positioning to ensure it stays on-screen
const CustomTooltip = ({ children, content, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, adjustedPosition: position, width: 'auto' });

  const showTooltip = () => {
    setIsVisible(true);
    // compute position after a tick so tooltipRef exists
    setTimeout(() => computePosition(position), 0);
  };
  const hideTooltip = () => setIsVisible(false);

  const computePosition = (preferred) => {
    const trig = triggerRef.current;
    const tip = tooltipRef.current;
    if (!trig || !tip) return;
    const rect = trig.getBoundingClientRect();
    const tipW = tip.offsetWidth;
    const tipH = tip.offsetHeight;
    const margin = 8;
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

    // For small screens prefer bottom and full width with margins
    const isMobile = vw <= 768;
    let adjustedPosition = preferred;
    if (isMobile) adjustedPosition = 'bottom';

    let left = rect.left + (rect.width / 2) - (tipW / 2);
    left = Math.max(margin, Math.min(left, vw - tipW - margin));

    let top = 0;
    if (adjustedPosition === 'top') {
      top = rect.top - tipH - margin;
      if (top < margin) {
        adjustedPosition = 'bottom';
      }
    }
    if (adjustedPosition === 'bottom') {
      top = rect.bottom + margin;
      if (top + tipH > vh - margin) {
        adjustedPosition = 'top';
        top = rect.top - tipH - margin;
      }
    }

    // fallback ensure top within viewport
    top = Math.max(margin, Math.min(top, vh - tipH - margin));

    // ensure width not larger than viewport
    const maxWidth = isMobile ? Math.min(vw - 32, 360) : Math.min(420, vw - 32);

    setCoords({ top: Math.round(top), left: Math.round(left), adjustedPosition, width: Math.round(maxWidth) });
  };

  useEffect(() => {
    if (isVisible) computePosition(position);
    const onResize = () => { if (isVisible) computePosition(position) };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize);
    };
  }, [isVisible, position]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={triggerRef}>
      <div
        onMouseEnter={showTooltip}
        onFocus={showTooltip}
        onMouseLeave={hideTooltip}
        onBlur={hideTooltip}
        style={{ cursor: 'pointer' }}
      >
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            left: coords.left,
            top: coords.top,
            zIndex: 1000,
            maxWidth: coords.width,
            width: coords.width === 'auto' ? 'auto' : coords.width,
            backgroundColor: 'white',
            color: '#1f2937',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '0.95rem',
            whiteSpace: 'normal',
            boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
            border: '2px solid #bfdbfe',
            transition: 'opacity 120ms ease',
            pointerEvents: 'none'
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

// Add spinner animation styles
const spinnerStyle = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = spinnerStyle;
  document.head.appendChild(styleSheet);
}

const API_BASE = "/turnos-base";
const API_CATEGORIAS = "/categorias-tipo-turno";
const API_TIPOS_TURNO = "/tipos-turno";

export default function TurnBaseCreator() {
  const navigate = useNavigate();

  // --- Estados Generales ---
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');

  // --- Estados Multi-Selección Global ---
  const [selectedTiposIds, setSelectedTiposIds] = useState([]);
  const [nombresMap, setNombresMap] = useState({});
  const [selectedMeta, setSelectedMeta] = useState({});

  // --- Estados Listas ---
  const [categorias, setCategorias] = useState([]);
  const [tiposTurno, setTiposTurno] = useState([]);
  const [selectedCategoriaId, setSelectedCategoriaId] = useState(null);

  // --- Estado Edición ---
  const [editingId, setEditingId] = useState(null);
  const [nombreEdit, setNombreEdit] = useState('');
  const horaInicioRef = useRef(null);

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

  useEffect(() => {
    if (selectedCategoriaId) {
      fetchTiposTurno(selectedCategoriaId);
    } else {
      setTiposTurno([]);
    }
  }, [selectedCategoriaId]);

  useEffect(() => {
    if (editingId) {
      // ensure the time configuration expands and focus the start time
      setTimeout(() => {
        horaInicioRef.current?.focus?.();
        horaInicioRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      }, 120);
    }
  }, [editingId]);

  const fetchTurnosCreados = async () => {
    const servicioId = localStorage.getItem('servicioId');
    if (!servicioId) return;
    try {
      const response = await axiosInstance.get(`${API_BASE}/by-servicio/${servicioId}`);
      setListaTurnosBase(response.data);
    } catch (err) { console.warn(err); }
  };

  const fetchCategorias = async () => {
    const servicioId = localStorage.getItem("servicioId");
    if (!servicioId) return;
    try {
      setLoadingCategorias(true);
      const response = await axiosInstance.get(`${API_CATEGORIAS}/by-servicio/${servicioId}`);
      setCategorias(response.data);
    } catch (err) { console.error(err); } finally { setLoadingCategorias(false); }
  };

  const fetchTiposTurno = async (categoriaId) => {
    try {
      setLoadingTiposTurno(true);
      const response = await axiosInstance.get(`${API_TIPOS_TURNO}/by-categoria/${categoriaId}`);
      setTiposTurno(response.data);
    } catch (err) { console.error(err); } finally { setLoadingTiposTurno(false); }
  };

  const handleToggleTipo = (tipo) => {
    const id = tipo.idTipoTurno;

    // --- MODO EDICIÓN: Selección Única (Reemplazo) ---
    if (editingId) {
      // En edición, solo permitimos UN tipo seleccionado a la vez (el que estamos asignando)
      setSelectedTiposIds([id]);
      // Solo actualizamos nombresMap si no tienes escrito nada, para no borrar lo que el usuario esté escribiendo
      // Opcional: Si quieres que al cambiar de patrón se resetee el nombre, descomenta la linea de abajo. 
      // Por UX, mejor mantener el nombre si el usuario ya lo editó? 
      // El requerimiento dice "cambiar eso al tipo de turno que yo quiera".
      // Asumiremos que solo cambiamos la referencia del ID.

      // Actualizamos metadata para reflejar el cambio visualmente si usamos metadata para mostrar info
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

    // --- MODO CREACIÓN: Selección Múltiple ---
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
      setSelectedTiposIds([tId]); // Pre-seleccionamos el ID actual

      // Si tiene categoría, navegamos a ella
      if (turno.tipoTurno.categoria) {
        setSelectedCategoriaId(turno.tipoTurno.categoria.idCategoriaTipoTurno);
      }

      // Reconstruimos metadata mínima necesaria para que se pinte en la UI si fuera necesario
      setSelectedMeta({
        [tId]: {
          originalName: turno.tipoTurno.nombre,
          catName: turno.tipoTurno.categoria?.nombre || '?',
          catId: turno.tipoTurno.categoria?.idCategoriaTipoTurno
        }
      });
      // Pre-fill the nombresMap so the "Personalizar Nombres" input shows the current name
      setNombresMap({ [tId]: turno.nombre || turno.tipoTurno.nombre });
    } else {
      setSelectedTiposIds([]);
      setNombresMap({});
      setSelectedMeta({});
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
        // En edición, validamos que haya 1 seleccionado (el nuevo o el mismo)
        if (selectedTiposIds.length === 0) {
          setError("Debes mantener seleccionado un patrón."); setLoading(false); return;
        }
        const finalTipoId = selectedTiposIds[0];
        // Take the edited name from nombresMap if available (the UI input updates nombresMap),
        // fall back to nombreEdit for compatibility.
        const nombreFinal = (nombresMap[finalTipoId] || nombreEdit || '').trim();

        const payload = {
          nombre: nombreFinal, horaInicio, horaFin,
          tipoTurno: { idTipoTurno: finalTipoId },
          creador: { idPersonal: Number(idCreador) }, servicio: { idServicio: Number(servicioId) }
        };
        await axiosInstance.put(`${API_BASE}/${editingId}`, payload);
        setSuccessMessage(`✅ Actualizado.`);
        handleCancelEdit();
      } else {
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

    } catch (err) { console.error(err); setError("Error al guardar."); } finally { setLoading(false); }
  };

  const countSelectionInCat = (catId) => {
    return Object.values(selectedMeta).filter(m => m.catId === catId).length;
  };

  return (
    <div className="turn-type-page">
      {/* Enhanced Header with Icon */}
      <div className="turn-type-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '24px', textAlign: 'center' }}>
        <div>
          <h1 style={{ margin: '0', fontSize: '1.875rem', fontWeight: '700', color: '#1e293b' }}>Definir Turnos Base</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '1rem' }}>
            Asigna horarios específicos a tus esquemas de turno para crear turnos base reutilizables
          </p>
        </div>
      </div>

      {error && (
        <div className="turn-type-error" style={{ 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca', 
          color: '#dc2626', 
          padding: '12px 16px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      
      {successMessage && (
        <div style={{ 
          backgroundColor: '#dcfce7', 
          border: '1px solid #bbf7d0', 
          color: '#166534', 
          padding: '12px 16px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckSquare size={16} />
          {successMessage}
        </div>
      )}

      <div className="turn-type-card" style={{ padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        {/* Simplified Layout: Single Column with Clear Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {/* Configuration Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <FolderOpen size={20} color="#3b82f6" />
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1e293b' }}>Configuración de Turnos</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              {/* Category Selection */}
              <div className="turn-type-field" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <CustomTooltip content="Paso 1: Elige la categoría que contiene los patrones de turno que quieres usar">
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: '#e6f0ff',
                      color: '#1e40af',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'default'
                    }}>1</div>
                  </CustomTooltip>
                  <label style={{ fontWeight: '600', color: '#374151', margin: 0 }}>Seleccionar Categoría</label>
                  <CustomTooltip content="Elige la categoría que contiene los patrones de turno que quieres usar">
                    <Info size={14} color="#6b7280" />
                  </CustomTooltip>
                </div>
                <div style={{ 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '6px', 
                  maxHeight: '200px', 
                  overflowY: 'auto',
                  backgroundColor: '#f9fafb'
                }}>
                  {loadingCategorias ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                      <div className="loading-spinner" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #e2e8f0', borderTop: '2px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      Cargando categorías...
                    </div>
                  ) : categorias.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af' }}>
                      No hay categorías disponibles
                    </div>
                  ) : (
                    categorias.map((cat) => {
                      const count = countSelectionInCat(cat.idCategoriaTipoTurno);
                      const isSelected = cat.idCategoriaTipoTurno === selectedCategoriaId;
                      return (
                        <div
                          key={cat.idCategoriaTipoTurno}
                          onClick={() => setSelectedCategoriaId(cat.idCategoriaTipoTurno)}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#dbeafe' : 'transparent',
                            color: isSelected ? '#1e40af' : '#374151',
                            borderBottom: '1px solid #e2e8f0',
                            transition: 'all 0.2s',
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            ':hover': { backgroundColor: isSelected ? '#dbeafe' : '#f3f4f6' }
                          }}
                        >
                          <span style={{ fontWeight: isSelected ? '600' : '400' }}>{cat.nombre}</span>
                          {count > 0 && (
                            <span style={{ 
                              backgroundColor: '#3b82f6', 
                              color: 'white', 
                              borderRadius: '12px', 
                              padding: '2px 8px', 
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              {count}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Pattern Selection */}
              <div 
                className="turn-type-field" 
                style={{ 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px', 
                  padding: '16px',
                  opacity: !selectedCategoriaId ? 0.5 : 1,
                  pointerEvents: !selectedCategoriaId ? 'none' : 'auto'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <CustomTooltip content="Paso 2: Selecciona los patrones que quieres convertir en turnos base">
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: '#e6f0ff',
                      color: '#1e40af',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'default'
                    }}>2</div>
                  </CustomTooltip>
                  <label style={{ fontWeight: '600', color: '#374151', margin: 0 }}>Seleccionar Patrones</label>
                  <CustomTooltip content="Elige uno o más patrones de turno para asignarles horarios. Puedes crear múltiples turnos base a la vez.">
                    <Info size={14} color="#6b7280" />
                  </CustomTooltip>
                </div>
                <div style={{ 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '6px', 
                  maxHeight: '200px', 
                  overflowY: 'auto',
                  backgroundColor: '#f9fafb'
                }}>
                  {!selectedCategoriaId ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af' }}>
                      Selecciona una categoría primero
                    </div>
                  ) : loadingTiposTurno ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                      <div className="loading-spinner" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #e2e8f0', borderTop: '2px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      Cargando patrones...
                    </div>
                  ) : tiposTurno.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af' }}>
                      No hay patrones en esta categoría
                    </div>
                  ) : (
                    tiposTurno.map((tt) => {
                      const isSelected = selectedTiposIds.includes(tt.idTipoTurno);
                      return (
                        <div
                          key={tt.idTipoTurno}
                          onClick={() => handleToggleTipo(tt)}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#dcfce7' : 'transparent',
                            color: isSelected ? '#166534' : '#374151',
                            borderBottom: '1px solid #e2e8f0',
                            transition: 'all 0.2s',
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            ':hover': { backgroundColor: isSelected ? '#dcfce7' : '#f3f4f6' }
                          }}
                        >
                          <span style={{ fontWeight: isSelected ? '600' : '400' }}>{tt.nombre}</span>
                          {isSelected && <CheckSquare size={16} color="#166534" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Time Configuration Section */}
          {selectedCategoriaId && (
            <div
              style={{
                maxHeight: (editingId || selectedTiposIds.length > 0) ? '1200px' : '0px',
                overflow: 'hidden',
                transition: 'max-height 300ms ease, opacity 200ms ease',
                opacity: (editingId || selectedTiposIds.length > 0) ? 1 : 0,
                pointerEvents: (editingId || selectedTiposIds.length > 0) ? 'auto' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <Clock size={20} color="#3b82f6" />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Configuración de Horarios</span>
                  {editingId && (
                    <span style={{
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Edit3 size={12} /> Modo Edición
                    </span>
                  )}
                </h2>
              </div>

              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <CustomTooltip content="Paso 3: Define las horas que se asignarán a los turnos seleccionados">
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: '#e6f0ff',
                      color: '#1e40af',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'default'
                    }}>3</div>
                  </CustomTooltip>
                  <label style={{ fontWeight: '600', color: '#374151', margin: 0 }}>Definir Horarios</label>
                  <CustomTooltip content="Establece la hora de inicio y fin que se aplicarán a todos los turnos seleccionados">
                    <Info size={14} color="#6b7280" />
                  </CustomTooltip>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div className="turn-type-field">
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>Hora de Inicio</label>
                    <input 
                      ref={horaInicioRef}
                      type="time" 
                      value={horaInicio} 
                      onChange={(e) => setHoraInicio(e.target.value)} 
                      required
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        backgroundColor: 'white'
                      }}
                    />
                  </div>
                  <div className="turn-type-field">
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>Hora de Fin</label>
                    <input 
                      type="time" 
                      value={horaFin} 
                      onChange={(e) => setHoraFin(e.target.value)} 
                      required
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        backgroundColor: 'white'
                      }}
                    />
                  </div>
                </div>

                {/* Name Assignment Section */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Edit3 size={20} color="#3b82f6" />
                    <CustomTooltip content="Paso 4: Personaliza los nombres de los turnos antes de crearlos"><div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: '#e6f0ff',
                      color: '#1e40af',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'default'
                    }}>4</div></CustomTooltip>
                    <label style={{ fontWeight: '600', color: '#374151', margin: 0 }}>Personalizar Nombres</label>
                    <CustomTooltip content="Asigna nombres específicos a cada turno base. Si dejas vacío, se usará el nombre del patrón.">
                      <Info size={14} color="#6b7280" />
                    </CustomTooltip>
                  </div>

                  <div style={{ display: 'grid', gap: '12px' }}>
                    {selectedTiposIds.map(id => {
                      const meta = selectedMeta[id] || { originalName: 'Turno', catName: '?' };
                      return (
                        <div key={id} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px',
                          padding: '12px',
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px'
                        }}>
                          <div style={{ minWidth: '120px', fontSize: '0.875rem', color: '#6b7280' }}>
                            Patrón: <strong>{meta.originalName}</strong>
                          </div>
                          <input
                            type="text"
                            value={nombresMap[id] || ''}
                            onChange={(e) => handleNombreChange(id, e.target.value)}
                            placeholder={`Nombre para ${meta.originalName}`}
                            required
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              backgroundColor: 'white'
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Create / Update Buttons */}
                <div style={{ marginTop: '24px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                  {editingId ? (
                    <>
                      <button
                        type="submit"
                        form="turn-base-form"
                        disabled={loading || selectedTiposIds.length === 0}
                        style={{
                          backgroundColor: loading ? '#9ca3af' : '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '12px 24px',
                          fontSize: '1rem',
                          fontWeight: '600',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {loading ? (
                          <>
                            <div className="loading-spinner" style={{ width: '16px', height: '16px', border: '2px solid #ffffff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Plus size={16} />
                            Actualizar
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        style={{
                          backgroundColor: 'white',
                          color: '#374151',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          padding: '12px 24px',
                          fontSize: '1rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      type="submit"
                      form="turn-base-form"
                      disabled={loading || selectedTiposIds.length === 0}
                      style={{
                        backgroundColor: selectedTiposIds.length > 0 ? '#3b82f6' : '#9ca3af',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 24px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: selectedTiposIds.length > 0 && !loading ? 'pointer' : 'not-allowed',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                      }}
                    >
                      {loading ? (
                        <>
                          <div className="loading-spinner" style={{ width: '16px', height: '16px', border: '2px solid #ffffff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                          Creando turnos...
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          Crear {selectedTiposIds.length} Turno{selectedTiposIds.length !== 1 ? 's' : ''}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          

          {/* Hidden Form for Submit */}
          <form id="turn-base-form" onSubmit={handleSubmit} style={{ display: 'none' }}></form>

          {/* Created Turns List Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <CheckSquare size={20} color="#3b82f6" />
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1e293b' }}>Turnos Base Creados</h2>
              <span style={{ 
                backgroundColor: '#e0f2fe', 
                color: '#0369a1', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {listaTurnosBase.length}
              </span>
            </div>

            <div style={{ 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px', 
              backgroundColor: '#f9fafb',
              minHeight: '300px'
            }}>
              {listaTurnosBase.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px', 
                  color: '#9ca3af'
                }}>
                  <Clock size={48} color="#d1d5db" style={{ marginBottom: '16px' }} />
                  <div style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                    No hay turnos base creados
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>
                    Selecciona patrones y configura horarios para crear tus primeros turnos base
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {listaTurnosBase.map((tb, index) => (
                      <div
                        key={index}
                        onClick={() => handleStartEdit(tb)}
                        style={{
                          border: editingId === tb.idTurnoBase ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '16px',
                          cursor: 'pointer',
                          backgroundColor: editingId === tb.idTurnoBase ? '#fef3c7' : 'white',
                          transition: 'all 0.2s',
                          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                          ':hover': { 
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            transform: 'translateY(-1px)'
                          }
                        }}
                        title="Haz clic para editar este turno"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              fontWeight: '600', 
                              color: '#1e293b', 
                              fontSize: '1rem',
                              marginBottom: '4px'
                            }}>
                              {tb.nombre}
                            </div>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px',
                              fontSize: '0.875rem',
                              color: '#6b7280'
                            }}>
                              <Clock size={14} />
                              <span>{tb.horaInicio} - {tb.horaFin}</span>
                            </div>
                          </div>
                          <div style={{ 
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            maxWidth: '120px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {tb.tipoTurno?.nombre}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Footer Navigation */}
      <StepNavigator />

    </div>
  );
}