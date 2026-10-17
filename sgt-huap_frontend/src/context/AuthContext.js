// Contexto de la sesión. El proveedor (AuthProvider) vive en AuthProvider.jsx
// para que este archivo no mezcle componentes con el hook y las constantes
// (fast refresh de Vite).
import { createContext, useContext } from 'react'

// Roles usados en la aplicación (mapeo del backend)
export const Roles = {
    JEFATURA: 'JEFATURA',
    JEFATURA_SUB: 'SUBROGANTE',
    MEDICO: 'MEDICO'
}

const AuthContext = createContext(null)

export function useAuth() {
    return useContext(AuthContext)
}

export default AuthContext
