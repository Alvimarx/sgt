import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './EligeServicio.css';

export default function EligeServicio() {
    const [servicios, setServicios] = useState([]);
    const [userData, setUserData] = useState(null);
    const navigate = useNavigate();
    const auth = useAuth();

    useEffect(() => {
        const pendingData = sessionStorage.getItem('pendingUserData');
        const available = sessionStorage.getItem('availableServices');

        if (!pendingData || !available) {
            navigate('/login');
            return;
        }

        setUserData(JSON.parse(pendingData));
        setServicios(JSON.parse(available));
    }, [navigate]);

    const handleSelect = (perfil) => {
        const finalUserData = {
            ...userData,
            servicioId: perfil.idServicio,
            rol: perfil.rol,
            jefatura: perfil.jefatura
        };

        if (auth && typeof auth.updateUser === 'function') {
            auth.updateUser(finalUserData);
        }

        // --- Persistencia de datos ---
        localStorage.setItem('userId', String(finalUserData.userId));
        localStorage.setItem('servicioId', String(finalUserData.servicioId));
        // Se guarda la variable que solicitaste
        localStorage.setItem('serv_multi', 'true');

        // Limpieza de sesión temporal
        sessionStorage.removeItem('pendingUserData');
        sessionStorage.removeItem('availableServices');

        navigate('/calendario');
    };

    if (!userData) return null;

    return (
        <div className="selector-overlay">
            <div className="selector-modal">
                <header className="selector-header">
                    <img src="/gif/logo_huap.png" alt="HUAP" className="selector-logo" />
                    <h1>Seleccione su Perfil</h1>
                    <p>Múltiples servicios detectados. Elija el contexto para iniciar sesión.</p>
                </header>

                <div className="services-grid">
                    {servicios.map((perfil, index) => (
                        <button
                            key={index}
                            className="service-item-card"
                            onClick={() => handleSelect(perfil)}
                        >
                            <div className="service-details">
                                <span className="role-badge">{perfil.rol}</span>
                                <span className="service-id">ID Servicio: {perfil.idServicio}</span>
                            </div>
                            <div className="action-indicator">
                                Ingresar →
                            </div>
                        </button>
                    ))}
                </div>

                <button className="cancel-link" onClick={() => navigate('/login')}>
                    Volver al inicio de sesión
                </button>
            </div>
        </div>
    );
}