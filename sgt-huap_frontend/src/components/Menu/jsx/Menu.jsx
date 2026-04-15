import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useMediaQuery } from "react-responsive";
import logoHUAP from "/huap_bitmap.svg";
import adminIcon from "/admin-icon-white.svg";
import userIcon from "/admin-icon-white.svg";
import calendarIcon from "/calendar.svg";
import requestIcon from "/request.svg";
import shiftIcon from "/shifts.svg";
import notificationIcon from "/notification-bell.svg";
import doctorIcon from "/doctor-icon.svg";

import "../css/pc/Menu-PC.css";
import "../css/tablet/Menu-Tablet.css";
import "../css/movil/Menu-Movil.css";
import "../css/Menu-Account.css";
import { useAuth, Roles } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import adminService from '../../../services/adminService'

// Mapeo de rutas a nombres
const ROUTE_NAMES = {
    '/notificaciones': 'NOTIFICACIONES',
    '/calendario': 'CALENDARIO',
    '/solicitudes': 'SOLICITUDES',
    '/turnos': 'MIS TURNOS',
    '/administracion': 'ADMINISTRACIÓN'
};

export default function Menu() {
    const [isOpen, setIsOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const accountRef = useRef(null);
    const scrollLockRef = useRef({ body: '', html: '' });
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useMediaQuery({ maxWidth: 768 });
    const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });
    const isDesktop = useMediaQuery({ minWidth: 1025 });

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    const closeMenu = () => {
        setIsOpen(false);
    };

    const handleCambiarServicio = () => {
        // 1. Recuperamos los servicios que el usuario tiene (deberías tenerlos en el context o cargarlos)
        // Si no los tienes a mano, lo ideal es guardarlos en localStorage al hacer login
        const servicios = localStorage.getItem('user_services_list');
        const userData = auth.user; // O como obtengas los datos del usuario actual

        if (servicios && userData) {
            // 2. Reponemos la información que espera el componente 'EligeServicio'
            sessionStorage.setItem('pendingUserData', JSON.stringify(userData));
            sessionStorage.setItem('availableServices', servicios);

            // 3. Cerramos el modal y navegamos
            setAccountOpen(false);
            navigate('/seleccionar-servicio');
        } else {
            console.error("No se encontraron servicios disponibles para cambiar.");
            // Opcional: podrías re-ejecutar la llamada a getServiciosPorRut(rut) aquí
        }
    };

    // auth context
    const auth = useAuth()
    const user = auth.user || { nombre: 'Dr. Álvaro Lopez', rol: Roles.MEDICO, rotativa: 'Rotativa A' }

    // Detalle ampliado de la cuenta (fetch desde API cuando el dropdown se abre)
    const [accountDetails, setAccountDetails] = useState(null)
    const [loadingAccount, setLoadingAccount] = useState(false)

    // notification context
    const { unreadCount } = useNotifications()

    // Función para obtener el nombre de la ruta actual
    const getCurrentRouteName = () => {
        return ROUTE_NAMES[location.pathname] || '';
    };

    
    const esMultiServicio = localStorage.getItem('serv_multi') === 'true';


    // cerrar dropdown de cuenta al hacer clic fuera
    useEffect(() => {
        function onDocClick(e) {
            if (accountRef.current && !accountRef.current.contains(e.target)) {
                setAccountOpen(false);
            }
        }
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    // Cuando se abre el dropdown de cuenta, cargar detalles del usuario desde backend
    useEffect(() => {
        const loadAccount = async () => {
            try {
                if (!auth || !auth.user || !accountOpen) return
                const id = auth.user.id || auth.user.userId || auth.userId
                if (!id) return
                setLoadingAccount(true)
                const data = await adminService.usuarios.getById(id)
                // backend devuelve 'correo' y 'horasAsignadas' en el summary
                setAccountDetails(data)
            } catch (e) {
                console.warn('Error cargando detalles de cuenta:', e)
            } finally {
                setLoadingAccount(false)
            }
        }
        if (accountOpen) loadAccount()
    }, [accountOpen])

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const body = document.body;
        const html = document.documentElement;
        if (isMobile && isOpen) {
            scrollLockRef.current = {
                body: body.style.overflow,
                html: html.style.overflow,
            };
            body.style.overflow = 'hidden';
            html.style.overflow = 'hidden';
            return () => {
                body.style.overflow = scrollLockRef.current.body || '';
                html.style.overflow = scrollLockRef.current.html || '';
            };
        }
        body.style.overflow = scrollLockRef.current.body || '';
        html.style.overflow = scrollLockRef.current.html || '';
        return () => {
            body.style.overflow = scrollLockRef.current.body || '';
            html.style.overflow = scrollLockRef.current.html || '';
        };
    }, [isMobile, isOpen]);

    const handleLogout = () => {
        auth.logout()
        navigate('/login')
    }

    // Determinar el texto a mostrar según el dispositivo
    const getLinkText = (mobileText, desktopText) => {
        if (isMobile) return mobileText;
        if (isTablet) return mobileText;
        return desktopText;
    };

    // Logo Clicleable
    const [logoClicks, setLogoClicks] = useState(0);
    const clickTimeout = useRef(null);

    const handleLogoClick = (e) => {
        e.preventDefault();

        // Si ya había un timeout, lo reseteamos
        if (clickTimeout.current) {
            clearTimeout(clickTimeout.current);
        }

        setLogoClicks(prev => {
            const newCount = prev + 1;

            if (newCount >= 5) {
                // 🎉 Easter Egg activado
                setLogoClicks(0);
                return 0;
            }

            return newCount;
        });

        // Reiniciar el contador si pasan más de 1 segundo entre clics
        clickTimeout.current = setTimeout(() => {
            setLogoClicks(0);
        }, 1000);
    };

    // Función para generar la clase 'active'
    const getActiveClass = (path) => {
        return location.pathname === path ? 'active' : '';
    };

    return (
        <nav className="topbar-menu">
            <div className="topbar-menu-container">
                {/* Logo con breadcrumb en móvil */}
                <div className="topbar-menu-logo" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                        onClick={handleLogoClick}
                        style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                    >
                        <img src={logoHUAP} alt="Logo HUAP" className="logo-img" />
                    </button>
                    <div className="topbar-menu-logo-text-container">
                        <span className="topbar-menu-logo-text">SGT HUAP</span>
                        {isMobile && getCurrentRouteName() && (
                            <>
                                <span className="topbar-menu-breadcrumb-separator"> / </span>
                                <span className="topbar-menu-breadcrumb-route">{getCurrentRouteName()}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Botón hamburguesa en móvil */}
                {isMobile && (
                    <button
                        className="topbar-menu-toggle"
                        onClick={toggleMenu}
                        aria-label="Abrir menú"
                        aria-expanded={isOpen}
                        style={{ display: 'flex' }}
                    >
                        {isOpen ? "✕" : "☰"}
                    </button>
                )}

                {/* Links principales con iconos */}
                <ul className={`topbar-menu-links ${isOpen ? "open" : ""} ${isMobile ? "mobile" : ""}`}>
                    <li>
                        <Link to="/notificaciones" onClick={closeMenu} className={`topbar-menu-link-item ${getActiveClass('/notificaciones')}`}>
                            {/*contenedor para el ícono*/}
                            <div className="topbar-menu-icon-wrapper">
                                <img src={notificationIcon} alt="Notificaciones" className="topbar-menu-icon" />
                                {/*muestra la insignia solo si unreadCount es mayor que 0 */}
                                {unreadCount > 0 && (
                                    <span className="topbar-menu-notification-badge">{unreadCount}</span>
                                )}
                            </div>
                            {/* El texto del enlace */}
                            <span>{getLinkText("NOTIFICACIONES", "NOTIFICACIONES")}</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/calendario" onClick={closeMenu} className={`topbar-menu-link-item ${getActiveClass('/calendario')}`}>
                            <img src={calendarIcon} alt="Calendario" className="topbar-menu-icon" />
                            {getLinkText("CALENDARIO", "CALENDARIO")}
                        </Link>
                    </li>
                    <li>
                        <Link to="/solicitudes" onClick={closeMenu} className={`topbar-menu-link-item ${getActiveClass('/solicitudes')}`}>
                            <img src={requestIcon} alt="Solicitudes" className="topbar-menu-icon" />
                            {getLinkText("SOLICITUDES", "SOLICITUDES")}
                        </Link>
                    </li>
                    <li>
                        <Link to="/turnos" onClick={closeMenu} className={`topbar-menu-link-item ${getActiveClass('/turnos')}`}>
                            <img src={shiftIcon} alt="Turnos" className="topbar-menu-icon" />
                            {getLinkText("MIS TURNOS", "MIS TURNOS")}
                        </Link>
                    </li>
                    {auth.hasRole([Roles.JEFATURA, Roles.JEFATURA_SUB]) && (
                        <li>
                            <Link to="/administracion" onClick={closeMenu} className={`topbar-menu-link-item ${getActiveClass('/administracion')}`}>
                                <img src={adminIcon} alt="Administración" className="topbar-menu-icon" />
                                {getLinkText("PANEL DE ADMINISTRADOR", "ADMINISTRACIÓN")}
                            </Link>
                        </li>
                    )}
                    <li className="topbar-menu-account" ref={accountRef}>
                        <button
                            className="topbar-menu-link-item topbar-menu-account-button"
                            onClick={(e) => { e.preventDefault(); setAccountOpen(s => !s); }}
                            aria-haspopup="true"
                            aria-expanded={accountOpen}
                        >
        <span className="topbar-menu-account-avatar" aria-hidden>
    <img src={doctorIcon} alt="" className="topbar-menu-icon topbar-menu-user-icon" />
</span>
                            {getLinkText("MI CUENTA", "MI CUENTA")}
                            <span className={`topbar-menu-caret ${accountOpen ? 'open' : ''}`} aria-hidden>▾</span>
                        </button>

                        {isMobile ? (
                            accountOpen && (
                                <div className="account-overlay" role="dialog" aria-label="Mi cuenta" onClick={() => setAccountOpen(false)}>
                                    <div className="topbar-menu-mobile-account-sheet account-sheet" onClick={(e) => e.stopPropagation()}>
                                        <div className="account-close-wrap">
                                            <button aria-label="Cerrar" className="account-close-btn" onClick={() => setAccountOpen(false)}>✕</button>
                                        </div>
                                        <div className="topbar-menu-account-top-vertical account-top">
                                            <div className="topbar-menu-account-avatar-lg center account-avatar-lg">
                                                <img src={userIcon} alt="Avatar" className="account-avatar-img" />
                                            </div>
                                            <div className="account-main-info">
                                                {loadingAccount ? (
                                                    <div> Cargando datos de la cuenta... </div>
                                                ) : (
                                                    <>
                                                        <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '6px' }}>{accountDetails?.nombre || user.nombre}</div>
                                                        <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#333', flexWrap: 'wrap' }}>
                                                            <div>{accountDetails?.rol || user.rol}</div>
                                                        </div>

                                                        <div className="account-fields">
                                                            <div className="account-field"><span className="account-label">👤 RUT:</span> <span className="account-value">{accountDetails?.rut || '—'}</span></div>
                                                            <div className="account-field"><span className="account-label">🏥 Profesión:</span> <span className="account-value">{accountDetails?.profesionNombre || accountDetails?.especialidad || '—'}</span></div>
                                                            <div className="account-field"><span className="account-label">💼 Tipo Cargo:</span> <span className="account-value">{accountDetails?.tipoCargoNombre || '—'}</span></div>
                                                            <div className="account-field"><span className="account-label">📋 Estado:</span> <span className="account-value">{accountDetails?.estado || '—'}</span></div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="account-actions">
                                            {/* BOTÓN AZUL - MÓVIL: Hereda .topbar-menu-logout-btn para el hover */}
                                            {esMultiServicio && (
                                                <button
                                                    className="topbar-menu-logout-btn"
                                                    onClick={handleCambiarServicio}
                                                    style={{
                                                        background: '#1976d2',
                                                        marginTop: '0',
                                                        marginBottom: '8px',
                                                        borderTop: 'none'
                                                    }}
                                                >
                                                    Cambiar servicios
                                                </button>
                                            )}
                                            <button className="topbar-menu-logout-btn" onClick={() => { setAccountOpen(false); handleLogout(); }}>
                                                Cerrar sesión
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className={`topbar-menu-account-dropdown ${accountOpen ? 'open' : ''}`} role="dialog" aria-label="Mi cuenta">
                                <div className="topbar-menu-account-top-vertical">
                                    <div className="topbar-menu-account-avatar-lg center">
                                        <img src={userIcon} alt="Avatar" className="account-avatar-img" />
                                    </div>
                                    <div className="topbar-menu-account-details-vertical">
                                        {loadingAccount ? (
                                            <div className="account-loading">Cargando datos de la cuenta...</div>
                                        ) : (
                                            <>
                                                <div className="topbar-menu-account-field">
                                                    <div className="topbar-menu-field-label">Nombre</div>
                                                    <div className="topbar-menu-field-value">{accountDetails?.nombre || user.nombre}</div>
                                                </div>
                                                <div className="topbar-menu-account-field">
                                                    <div className="topbar-menu-field-label">Rol</div>
                                                    <div className="topbar-menu-field-value">{accountDetails?.rol || user.rol}</div>
                                                </div>
                                                <div className="topbar-menu-account-field">
                                                    <div className="topbar-menu-field-label">👤 RUT</div>
                                                    <div className="topbar-menu-field-value">{accountDetails?.rut || '—'}</div>
                                                </div>
                                                <div className="topbar-menu-account-field">
                                                    <div className="topbar-menu-field-label">🏥 Profesión</div>
                                                    <div className="topbar-menu-field-value">{accountDetails?.profesionNombre || accountDetails?.especialidad || '—'}</div>
                                                </div>
                                                <div className="topbar-menu-account-field">
                                                    <div className="topbar-menu-field-label">💼 Tipo Cargo</div>
                                                    <div className="topbar-menu-field-value">{accountDetails?.tipoCargoNombre || '—'}</div>
                                                </div>
                                                <div className="topbar-menu-account-field">
                                                    <div className="topbar-menu-field-label">📋 Estado</div>
                                                    <div className="topbar-menu-field-value">{accountDetails?.estado || '—'}</div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="topbar-menu-account-actions">
                                        {/* BOTÓN AZUL - DESKTOP: Hereda .topbar-menu-logout-btn para el hover */}
                                        {esMultiServicio && (
                                            <button
                                                className="topbar-menu-logout-btn"
                                                onClick={handleCambiarServicio}
                                                style={{
                                                    background: '#1976d2',
                                                    marginTop: '0',
                                                    marginBottom: '8px',
                                                    borderTop: 'none'
                                                }}
                                            >
                                                Cambiar servicios
                                            </button>
                                        )}
                                        <button className="topbar-menu-logout-btn" onClick={handleLogout}>
                                            Cerrar sesión
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </li>
                </ul>

                {/* Overlay para móvil */}
                {isMobile && isOpen && (
                    <div className="topbar-menu-overlay" onClick={closeMenu} />
                )}
            </div>
        </nav>
    );
}
