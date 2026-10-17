// roles.js
// Rol de sistema de la sesión (el user de AuthContext). El backend emite y
// acepta solo dos valores, ADMINISTRADOR y USUARIO, y reconoce al
// administrador solo por ADMINISTRADOR (C-18, 17 oct 2026); la interfaz, igual
// que Mi Perfil. El rol en el servicio activo (JEFATURA, SUBROGANTE, MEDICO)
// viene aparte, en user.rol.

/** ¿La sesión es de un administrador del sistema? */
export const esAdministrador = (user) => user?.rolSistema === 'ADMINISTRADOR';
