import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import adminService from '../../../services/adminService';
import Onboarding from './Onboarding.jsx'
import { useNavigate } from 'react-router-dom'

const AdminOnboardingGuard = ({ children }) => {
  const [hasPisos, setHasPisos] = useState(null); // null: loading, true: has pisos, false: no pisos
  const auth = useAuth();
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    const checkPisos = async () => {
      if (!auth || !auth.user || !auth.user.servicioId) {
        if (!mounted) return
        setHasPisos(false); // Si no hay user o servicioId, asumir no hay pisos
        return;
      }

      try {
        const pisos = await adminService.pisos.getByServicio(auth.user.servicioId);
        if (!mounted) return
        setHasPisos(pisos && pisos.length > 0);
      } catch (err) {
        console.warn('Error verificando pisos en AdminOnboardingGuard:', err);
        if (!mounted) return
        setHasPisos(false); // En caso de error, asumir no hay pisos para mostrar onboarding
      }
    };

    checkPisos();
    return () => { mounted = false }
  }, [auth]);

  // Si la comprobación aún no termina, NO mostramos overlay: renderizamos children
  // en segundo plano. Si más tarde resulta que no hay pisos, redirigimos a /onboarding.
  useEffect(() => {
    if (hasPisos === false) {
      // Navegar al onboarding para completar configuración
      navigate('/onboarding')
    }
  }, [hasPisos, navigate])

  // Mientras loading (hasPisos === null) devolvemos los hijos para evitar "pantallazo".
  // La navegación al onboarding ocurrirá automáticamente cuando se determine el resultado.
  if (hasPisos === false) {
    // Si por alguna razón quisieras renderizar Onboarding inline en vez de navegar,
    // puedes devolver <Onboarding /> aquí. Actualmente preferimos navegación.
    return null
  }

  return children;
}

export default AdminOnboardingGuard;