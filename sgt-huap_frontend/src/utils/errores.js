// errores.js
// Texto que la interfaz muestra cuando falla una llamada al backend.

/**
 * El mensaje del backend ({ error } o { message }, o un texto) si lo hay; si la
 * petición no llegó al backend, el mensaje del propio error (por ejemplo, «No se
 * pudo conectar con el servidor», que pone axiosConfig); si no, `porDefecto`.
 * Siempre devuelve texto: guardar el objeto de la respuesta y dibujarlo deja la
 * pantalla en blanco («Objects are not valid as a React child»).
 */
export function mensajeDeError(error, porDefecto = 'Ocurrió un error. Intenta de nuevo.') {
  const datos = error?.response?.data;
  // Un texto plano corto, no una página de error HTML del proxy.
  if (typeof datos === 'string' && datos.trim() && !datos.trim().startsWith('<') && datos.length <= 300) return datos.trim();
  if (datos && typeof datos === 'object') {
    if (typeof datos.error === 'string' && datos.error.trim()) return datos.error;
    if (typeof datos.message === 'string' && datos.message.trim()) return datos.message;
  }
  if (!error?.response && typeof error?.message === 'string' && error.message.trim()) return error.message;
  return porDefecto;
}
