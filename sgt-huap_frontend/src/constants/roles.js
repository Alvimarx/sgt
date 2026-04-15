// src/constants/roles.js
// Centralización de roles para consistencia y mantenimiento
export const ROLES = {
  JEFATURA: 'JEFATURA',
  JEFATURA_SUB: 'JEFATURA_SUB',
  MEDICO: 'MEDICO'
};

// Función para mapear roles del backend al display
export const mapRoleToDisplay = (role) => {
  if (!role) return 'Médico';
  const code = (typeof role === 'string') ? role : (role.name || String(role));
  switch (code) {
    case 'SUBROGANTE':
    case 'JEFATURA_SUB':
      return 'Jefatura Subrogante';
    case 'JEFATURA':
      return 'Jefatura';
    case 'MEDICO':
    default:
      return 'Médico';
  }
};

// Función para mapear display al backend
export const mapDisplayToBackend = (display) => {
  if (!display) return 'MEDICO';
  const lower = display.toLowerCase();
  if (lower.includes('subrogante')) return 'SUBROGANTE';
  if (lower.includes('jefatura')) return 'JEFATURA';
  return 'MEDICO';
};