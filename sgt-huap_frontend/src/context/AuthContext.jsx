import React, { createContext, useContext, useEffect, useState } from 'react'
import { isAuthenticated, getCurrentUser, logout as authLogout } from '../services/authService'

// Roles usados en la aplicación (mapeo del backend)
export const Roles = {
    JEFATURA: 'JEFATURA',
    JEFATURA_SUB: 'SUBROGANTE',
    MEDICO: 'MEDICO'
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    // Lógica para cargar la sesión desde JWT al iniciar la app
    useEffect(() => {
        const loadUser = () => {
            try {
                if (isAuthenticated()) {
                    const userData = getCurrentUser()
                    if (userData) {
                        // Mapear los datos del backend al formato del contexto
                        setUser({
                            id: userData.userId,
                            nombre: userData.nombreCompleto || userData.nombre,
                            rol: userData.rol,
                            rolSistema: userData.rolSistema,
                            servicioId: userData.servicioId,
                            userId: userData.userId
                        })
                    }
                }
            } catch (e) {
                console.error("Error al cargar usuario desde token:", e)
            } finally {
                setLoading(false)
            }
        }

        loadUser()
    }, [])

    /**
     * Actualiza el contexto del usuario después del login
     * Llamar después de authService.login()
     */
    const updateUser = (userData) => {
        if (userData) {
            setUser({
                id: userData.userId,
                nombre: userData.nombreCompleto || userData.nombre,
                rol: userData.rol,
                servicioId: userData.servicioId,
                userId: userData.userId
            })
        }
    }

    /**
     * Cierra la sesión del usuario
     */
    const logout = () => {
        authLogout()
        setUser(null)
    }

    /**
     * Método legacy para compatibilidad con código existente
     * @deprecated Usar authService.login() + updateUser() en su lugar
     */
    const loginMock = ({ 
        id = 1,
        nombre = 'Usuario Demo', 
        rol = Roles.MEDICO, 
        rotativa = 'Rotativa A',
        servicioId = null
    } = {}) => {
        console.warn('loginMock está deprecado. Usar authService.login() en su lugar.')
        const u = { id, nombre, rol, rotativa }
        if (servicioId != null) u.servicioId = servicioId
        setUser(u)
    }

    const value = {
        user,
        loading,
        updateUser,
        loginMock, // Mantener por compatibilidad temporal
        logout,
        isLogged: !!user,
        hasRole: (roles) => {
            if (!user) return false
            if (!roles) return true
            const arr = Array.isArray(roles) ? roles : [roles]
            return arr.includes(user.rol)
        }
    }

    // Mostrar loader mientras carga el usuario
    if (loading) {
        return <div>Cargando...</div>
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    return useContext(AuthContext)
}

export default AuthContext