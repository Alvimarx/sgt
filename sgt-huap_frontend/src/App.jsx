import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import './App.css';

// --- Importa tu nuevo componente Mockup ---
import Prop4 from "./components/Admin2/Prop4.jsx";

// --- Importaciones originales ---
import Menu from "./components/Menu/jsx/Menu.jsx";
import Calendario from "./components/Calendario/jsx/Calendario.jsx";
import SolicitudesGeneral from "./components/Solicitudes/jsx/Solicitud-General.jsx";
//import Login from "./components/Login/jsx/Login.jsx";
import AdminPage from "./components/Administracion/jsx/AdminPage.jsx";
import AdminOnboardingGuard from './components/Administracion/jsx/AdminOnboardingGuard.jsx';
import OnboardingLayout from './components/Administracion/jsx/primerosPasos/OnboardingLayout.jsx';
import Notificaciones from "./components/Notificaciones/jsx/Notificaciones.jsx";
import SolicitudesCambio from "./components/Solicitudes/jsx/Solicitud-Cambio.jsx";
import SolicitudesOfrecer from "./components/Solicitudes/jsx/Solicitud-Ofrecer.jsx";
import SolicitudesPermiso from "./components/Solicitudes/jsx/Solicitud-Permiso.jsx";
import SolicitudesTurno from "./components/Solicitudes/jsx/Solicitud-Turno.jsx";
import SolicitudBotarTurno from "./components/Solicitudes/jsx/Solicitud-Botar-Turno.jsx";
import TurnosDisponibles from "./components/Turnos/jsx/TurnosDisponibles.jsx";
import AsignarTurnos from "./components/Administracion/jsx/AsignadorTurnos.jsx";
import TurnBaseCreator from "./components/Administracion/jsx/TurnBaseCreator.jsx";
import EligeServicio from "./components/EligeServicio/EligeServicio.jsx";
import EventsLogs from "./components/Administracion/jsx/EventsLogs.jsx";
import CreatorTipoTurno from "./components/Administracion/jsx/CreatorTipoTurno.jsx";
import CreadorPlantillaTurno from "./components/Administracion/jsx/CreadorPlantillaTurno.jsx";
import GeneradorCalendario from "./components/Administracion/jsx/GeneradorCalendario.jsx";
import CrearPiso from "./components/Administracion/jsx/CrearPiso.jsx";
import EditarPiso from "./components/Administracion/jsx/EditarPiso.jsx";
import { useAuth, Roles } from './context/AuthContext';

function App() {
    // Asegúrate de que <AuthProvider> esté envolviendo <App> en tu main.jsx
    const auth = useAuth(); 

    return (
        <Router>
            <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#e2e8f0' }}>
                <Routes>
                    {/* Rutas de demostración */}
                    <Route path="/" element={<Prop4 />} />
                    <Route path="/home" element={<Navigate to="/" replace />} />
                    <Route path="/agenda-demo" element={<Prop4 />} />

                    {/* Ruta de Login */}
                    <Route path="/login" element={<Prop4 />} />

                    {/* Rutas antiguas de la app */}
                    <Route path="/calendario" element={<><Menu /><Calendario /></>} />
                    <Route path="/notificaciones" element={<><Menu /><Notificaciones /></>} />
                    
                    {/* Onboarding */}
                    <Route path="/onboarding" element={
                        auth && auth.hasRole([Roles.JEFATURA, Roles.JEFATURA_SUB]) ? <OnboardingLayout /> : <Navigate to="/login" replace />
                    } />
                    
                    {/* Administracion */}
                    <Route path="/administracion" element={
                        auth && auth.hasRole([Roles.JEFATURA, Roles.JEFATURA_SUB]) ? <AdminOnboardingGuard><Menu /><AdminPage /></AdminOnboardingGuard> : <Navigate to="/login" replace />
                    } />
                    <Route path="/administracion/asignador-turnos" element={
                        auth && auth.hasRole([Roles.JEFATURA, Roles.JEFATURA_SUB]) ? <AdminOnboardingGuard><Menu /><AsignarTurnos /></AdminOnboardingGuard> : <Navigate to="/login" replace />
                    } />
                    <Route path="/administracion/creador-turno-base" element={
                        auth && auth.hasRole([Roles.JEFATURA, Roles.JEFATURA_SUB]) ? <AdminOnboardingGuard><Menu /><TurnBaseCreator /></AdminOnboardingGuard> : <Navigate to="/login" replace />
                    } />
                    <Route path="/administracion/bitacora-eventos" element={
                        auth && auth.hasRole([Roles.JEFATURA, Roles.JEFATURA_SUB, Roles.MEDICO]) ? <AdminOnboardingGuard><Menu /><EventsLogs /></AdminOnboardingGuard> : <Navigate to="/login" replace />
                    } />
                    <Route path="/administracion/creador-tipo-turno" element={
                        auth && auth.hasRole([Roles.JEFATURA, Roles.JEFATURA_SUB, Roles.MEDICO]) ? <AdminOnboardingGuard><Menu /><CreatorTipoTurno /></AdminOnboardingGuard> : <Navigate to="/login" replace />
                    } />
                    <Route path="/administracion/creador-plantilla-turno" element={
                        auth && auth.hasRole([Roles.JEFATURA, Roles.JEFATURA_SUB, Roles.MEDICO]) ? <AdminOnboardingGuard><Menu /><CreadorPlantillaTurno /></AdminOnboardingGuard> : <Navigate to="/login" replace />
                    } />
                    <Route path="/administracion/generador-calendario" element={
                        auth && auth.hasRole([Roles.JEFATURA, Roles.JEFATURA_SUB, Roles.MEDICO]) ? <AdminOnboardingGuard><Menu /><GeneradorCalendario /></AdminOnboardingGuard> : <Navigate to="/login" replace />
                    } />
                    <Route path="/administracion/creador-piso" element={
                        auth && auth.hasRole([Roles.JEFATURA, Roles.JEFATURA_SUB, Roles.MEDICO]) ? <AdminOnboardingGuard><Menu /><CrearPiso /></AdminOnboardingGuard> : <Navigate to="/login" replace />
                    } />
                    <Route path="/administracion/editar-piso" element={
                        auth && auth.hasRole([Roles.JEFATURA, Roles.JEFATURA_SUB, Roles.MEDICO]) ? <AdminOnboardingGuard><Menu /><EditarPiso /></AdminOnboardingGuard> : <Navigate to="/login" replace />
                    } />

                    {/* Solicitudes y Turnos */}
                    <Route path="/solicitudes" element={<><Menu /><SolicitudesGeneral /></>} />
                    <Route path="/solicitudes/cambio" element={<><Menu /><SolicitudesCambio /></>} />
                    <Route path="/solicitudes/ofrecer" element={<><Menu /><SolicitudesOfrecer /></>} />
                    <Route path="/solicitudes/permiso" element={<><Menu /><SolicitudesPermiso /></>} />
                    <Route path="/solicitudes/turno" element={<><Menu /><SolicitudesTurno /></>} />
                    <Route path="/solicitudes/botar-turno" element={<><Menu /><SolicitudBotarTurno /></>} />
                    <Route path="/turnos" element={<><Menu /><TurnosDisponibles /></>} />
                    <Route path="/seleccionar-servicio" element={<EligeServicio />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;