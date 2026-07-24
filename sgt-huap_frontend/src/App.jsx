import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import './App.css';

// --- Importa tu nuevo componente Mockup ---
import Prop4 from "./components/Admin2/Prop4.jsx";


import { useAuth, Roles } from './context/AuthContext';

function App() {
    // Asegúrate de que <AuthProvider> esté envolviendo <App> en tu main.jsx
    const auth = useAuth(); 

    return (
        <Router>
            <div className="app-container">
                <Routes>
                    {/* Rutas de demostración */}
                    <Route path="/" element={<Prop4 />} />
                    <Route path="/home" element={<Navigate to="/" replace />} />
                    <Route path="/agenda-demo" element={<Prop4 />} />

                    {/* Ruta de Login */}
                    <Route path="/login" element={<Prop4 />} />

                    
                </Routes>
            </div>
        </Router>
    );
}

export default App;