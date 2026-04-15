import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../../utils/axiosConfig';
import '../../css/primerosPasos/Paso1CrearPisos.css';

const Paso1CrearPisos = ({ onDataSaved }) => {
    // --- Estados ---
    const [nombre, setNombre] = useState('');
    const [colorHexa, setColorHexa] = useState('#FF0000');
    const [mensaje, setMensaje] = useState('');
    const [listaPisos, setListaPisos] = useState([]);

    // Estado para controlar la edición (null = creando, ID = editando)
    const [editingId, setEditingId] = useState(null);

    const colores = [
        "#FF0000", "#FF7A00", "#FFB300", "#FFE600", "#A8FF00",
        "#00C837", "#00E0C8", "#00A4FF", "#004BFF", "#8F00FF"
    ];
    const navigate = useNavigate();

    // --- Carga Inicial ---
    useEffect(() => {
        fetchPisos();
    }, []);

    const fetchPisos = async () => {
        const servicioId = localStorage.getItem('servicioId');
        if (!servicioId) return;

        try {
            const response = await axiosInstance.get(`/pisos/servicio/${servicioId}`);
            setListaPisos(response.data);
            if (response.data && response.data.length > 0 && onDataSaved) {
                onDataSaved();
            }
        } catch (error) {
            console.error("Error cargando pisos:", error);
        }
    };

    // --- Lógica de Edición ---
    const handleStartEdit = (piso) => {
        setEditingId(piso.id); // Asumiendo que tu backend devuelve 'idPiso'
        setNombre(piso.nombre);
        setColorHexa(piso.colorHexa);
        setMensaje(''); // Limpiar mensajes previos
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setNombre('');
        setColorHexa('#FF0000');
        setMensaje('');
    };

    // --- Submit (Crear o Actualizar) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        const servicioId = localStorage.getItem('servicioId');
        setMensaje('');

        if (!servicioId) {
            alert("Error: No se encontró el ID del servicio.");
            return;
        }

        const payload = {
            nombre: nombre,
            colorHexa: colorHexa,
            servicioId: parseInt(servicioId)
        };

        try {
            if (editingId) {
                // MODO EDICIÓN: PUT
                await axiosInstance.put(`/pisos/${editingId}`, payload);
                setMensaje(`✅ Piso "${nombre}" actualizado correctamente.`);
            } else {
                // MODO CREACIÓN: POST
                await axiosInstance.post('/pisos', payload);
                setMensaje(`✅ Piso "${nombre}" creado correctamente.`);
            }

            // Limpieza y refresco
            if (editingId) handleCancelEdit(); // Salir del modo edición
            else setNombre(''); // Solo limpiar nombre si creamos

            fetchPisos(); // Recargar lista

            if (onDataSaved) onDataSaved();

        } catch (error) {
            console.error("Error al guardar piso:", error);
            setMensaje("❌ Hubo un error al procesar la solicitud.");
        }
    };

    // --- Eliminar Piso ---
    const handleDelete = async (id) => {
        if (!window.confirm("¿Estás seguro de que deseas eliminar este piso? Esta acción eliminará permanentemente todos los turnos, solicitudes y configuraciones asociadas a este piso.")) {
            return;
        }

        try {
            await axiosInstance.delete(`/pisos/${id}`);
            setMensaje(`✅ Piso eliminado correctamente.`);
            handleCancelEdit(); // Salir del modo edición
            fetchPisos(); // Recargar lista
            if (onDataSaved) onDataSaved();
        } catch (error) {
            console.error("Error al eliminar piso:", error);
            setMensaje("❌ Error al eliminar el piso. Verifica que no tenga dependencias críticas imposibles de borrar.");
        }
    };

    return (
        <div className="paso1-layout">
            <div className="paso1-card">
                <div className="card-grid">

                    {/* --- SECCIÓN IZQUIERDA: FORMULARIO --- */}
                    <div className={`paso1-form-section ${editingId ? 'is-editing' : ''}`}>
                        <h2>Definir Pisos</h2>
                        <p>Crea las ubicaciones físicas de tu servicio.</p>

                        <form onSubmit={handleSubmit}>

                            {/* INDICADOR DE EDICIÓN */}
                            {editingId && (
                                <div style={{
                                    backgroundColor: '#ffebee',
                                    color: '#c62828',
                                    padding: '10px',
                                    borderRadius: '6px',
                                    marginBottom: '15px',
                                    fontSize: '0.9rem',
                                    border: '1px solid #ef9a9a',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span>⚠️ Editando: <strong>{nombre}</strong></span>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Nombre del Piso / Unidad:</label>
                                <input
                                    type="text"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    required
                                    placeholder="Ej: Piso 3 - Cardiología"
                                    autoFocus // Mantiene el foco al escribir
                                />
                            </div>

                            <div className="form-group section-colors">
                                <label>Color Identificativo:</label>
                                <div className="paleta-colores">
                                    {colores.map((color) => (
                                        <div
                                            key={color}
                                            className={`color-circle ${colorHexa === color ? 'selected' : ''}`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setColorHexa(color)}
                                        />
                                    ))}
                                </div>

                                <div className="custom-color-container">
                                    <span>Personalizado:</span>
                                    <input
                                        type="color"
                                        value={colorHexa}
                                        onChange={(e) => setColorHexa(e.target.value)}
                                        className="input-color-custom"
                                    />
                                </div>
                            </div>

                            {mensaje && <div className="mensaje-exito" style={{ marginBottom: '10px' }}>{mensaje}</div>}

                            {/* BOTONES DINÁMICOS */}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                {editingId && (
                                    <>
                                        <button
                                            type="button"
                                            className="btn-guardar-piso"
                                            style={{ backgroundColor: '#dc3545', marginRight: 'auto' }} // Rojo para eliminar
                                            onClick={() => handleDelete(editingId)}
                                        >
                                            Eliminar Piso
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-guardar-piso"
                                            style={{ backgroundColor: '#6c757d' }}
                                            onClick={handleCancelEdit}
                                        >
                                            Cancelar
                                        </button>
                                    </>
                                )}
                                <button type="submit" className="btn-guardar-piso">
                                    {editingId ? 'Guardar Cambios' : 'Guardar Piso'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Divider entre columnas */}
                    <div className="vertical-divider" aria-hidden="true" />

                    {/* --- SECCIÓN DERECHA: LISTA --- */}
                    <div className="paso1-list-section">
                        <div className="paso1-list-card">
                            <h3>
                                Pisos Creados
                                <span className="count-badge" aria-hidden="true">{listaPisos.length}</span>
                            </h3>
                            <p className="list-subtitle">Clic en un piso para editarlo.</p>

                            {listaPisos.length === 0 ? (
                                <div className="empty-state">
                                    <p>No tienes pisos creados aún.</p>
                                </div>
                            ) : (
                                <div className="pisos-grid">
                                    {listaPisos.map((piso, index) => (
                                        <div
                                            // CORRECCIÓN: Usar piso.id
                                            key={piso.id || index}
                                            className="piso-card"
                                            style={{
                                                borderLeft: `4px solid ${piso.colorHexa}`,
                                                // CORRECCIÓN: Comparar con piso.id
                                                backgroundColor: editingId === piso.id ? '#f0f7ff' : 'white',
                                                border: editingId === piso.id ? `2px solid ${piso.colorHexa}` : undefined,
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => handleStartEdit(piso)}
                                            title="Click para editar"
                                        >
                                            <div className="piso-info">
                                                <span className="piso-nombre">{piso.nombre}</span>
                                            </div>
                                            <div
                                                className="piso-badge"
                                                style={{ backgroundColor: piso.colorHexa }}
                                            ></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Paso1CrearPisos;