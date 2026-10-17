// rolesServicio.js
// Rol de una persona en un servicio, tal como lo informa /funcionarios/summary
// (servicios: [{ idServicio, idRolServicio, rolServicioNombre }]). El nombre del
// rol viene en mayúsculas: JEFATURA, SUBROGANTE, MEDICO.

/**
 * Relación de la persona con el servicio, solo si tiene un rol asignado ahí. A
 * los administradores del sistema el backend los informa como JEFATURA en todos
 * los servicios, sin rol de servicio (idRolServicio null): esos no cuentan.
 */
export const relacionEnServicio = (funcionario, idServicio) =>
  (funcionario?.servicios || []).find(
    (s) => String(s.idServicio) === String(idServicio) && s.idRolServicio != null,
  ) || null;

/** Nombre del rol en el servicio, en mayúsculas ('' si no tiene). */
export const rolEnServicio = (funcionario, idServicio) =>
  String(relacionEnServicio(funcionario, idServicio)?.rolServicioNombre || '').toUpperCase();

export const esRolJefatura = (rol) => /JEF/i.test(String(rol || ''));
export const esRolSubrogante = (rol) => /SUBROG/i.test(String(rol || ''));

/** Ids de rol de servicio que espera PUT /funcionarios/{id}. */
export const ID_ROL_SERVICIO = { jefatura: 1, subrogante: 2, medico: 3 };
