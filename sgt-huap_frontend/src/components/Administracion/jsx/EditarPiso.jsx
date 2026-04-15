import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../utils/axiosConfig';
import '../css/EditarPiso.css';

const EditarPiso = () => {
    const [pisos, setPisos] = useState([]);
    const [pisoSeleccionado, setPisoSeleccionado] = useState(null);
    
    // Estados para el formulario de edición
    const [nombre, setNombre] = useState('');
    const [colorHexa, setColorHexa] = useState('#FF0000');

    const colores = [
        "#FF0000", "#FF7A00", "#FFB300", "#FFE600", "#A8FF00",
        "#00C837", "#00E0C8", "#00A4FF", "#004BFF", "#8F00FF"
    ];

    // Cargar pisos al iniciar
    useEffect(() => {
        fetchPisos();
    }, []);

    const fetchPisos = async () => {
        const servicioId = localStorage.getItem('servicioId');
        if (!servicioId) return;

        try {
            const response = await axiosInstance.get(`/pisos/servicio/${servicioId}`);
            setPisos(response.data);
        } catch (error) {
            console.error("Error cargando pisos:", error);
        }
    };

    // Al hacer clic en un piso de la lista
    const seleccionarPiso = (piso) => {
        setPisoSeleccionado(piso);
        setNombre(piso.nombre);
        setColorHexa(piso.colorHexa || '#CCCCCC');
        // Scrollear suavemente hacia el formulario
        document.getElementById('form-edicion')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!pisoSeleccionado) return;

        const payload = {
            nombre: nombre,
            colorHexa: colorHexa,
            servicioId: pisoSeleccionado.servicio?.id // Mantenemos el servicio original
        };

        try {
            await axiosInstance.put(`/pisos/${pisoSeleccionado.id}`, payload);
            alert("Piso actualizado correctamente");
            fetchPisos(); // Recargar la lista para ver cambios
            setPisoSeleccionado(null); // Limpiar selección o mantenerla según prefieras
            setNombre('');
        } catch (error) {
            console.error("Error actualizando:", error);
            alert("Error al actualizar el piso");
        }
    };

    return (
        <div className="editar-piso-container">
            <h2>Editar Pisos</h2>

            {/* LISTA DE PISOS EXISTENTES */}
            <div className="lista-pisos-section">
                <h3>Pisos Existentes (Selecciona uno para editar):</h3>
                <div className="pisos-grid">
                    {pisos.map((piso) => (
                        <div 
                            key={piso.id} 
                            className={`piso-card ${pisoSeleccionado?.id === piso.id ? 'active' : ''}`}
                            onClick={() => seleccionarPiso(piso)}
                        >
                            <div className="mini-color" style={{ backgroundColor: piso.colorHexa }}></div>
                            <span className="piso-nombre">{piso.nombre}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* FORMULARIO DE EDICIÓN (Solo visible si hay selección) */}
            {pisoSeleccionado && (
                <form id="form-edicion" onSubmit={handleUpdate} className="form-edicion-animado">
                    <hr />
                    <h3>Editando: {pisoSeleccionado.nombre}</h3>
                    
                    <div className="form-group">
                        <label>Nombre del Piso:</label>
                        <input 
                            type="text" 
                            value={nombre} 
                            onChange={(e) => setNombre(e.target.value)} 
                            required 
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
                        
                        <div className="preview" style={{backgroundColor: colorHexa}}>
                            <p>Vista previa nuevo color</p>
                        </div>
                    </div>

                    <button type="submit" className="btn-guardar btn-actualizar">
                        Actualizar Piso
                    </button>
                    <button 
                        type="button" 
                        className="btn-cancelar"
                        onClick={() => setPisoSeleccionado(null)}
                    >
                        Cancelar
                    </button>
                </form>
            )}
        </div>
    );
};

export default EditarPiso;