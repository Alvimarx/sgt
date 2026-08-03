// dateUtils.js
// Helpers para mostrar fechas en la UI de forma consistente

// Zona horaria del hospital. Centraliza aquí el cálculo de "hoy" para que ningún componente
// calcule su propia fecha actual con new Date().toISOString() (eso convierte a UTC primero y
// puede desfasar el día cerca de la medianoche en Chile). Ver corrección funcional "Inicio no
// debe mostrar fechas pasadas".
export const ZONA_HORARIA_HOSPITAL = 'America/Santiago';

/**
 * Fecha (YYYY-MM-DD) de un instante dado, tal como se ve en la zona horaria del hospital.
 * Usa Intl.DateTimeFormat (locale 'en-CA' produce el formato YYYY-MM-DD de forma nativa) en vez de
 * convertir a UTC, que es la causa de que "hoy" pudiera calcularse mal cerca de medianoche.
 */
export function fechaISOEnZonaHospital(instante = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: ZONA_HORARIA_HOSPITAL,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(instante);
}

/** Atajo: la fecha de hoy (YYYY-MM-DD) en la zona horaria del hospital. */
export function hoyISOEnZonaHospital() {
    return fechaISOEnZonaHospital(new Date());
}

export function formatDisplayDate(input, { locale = 'es-CL', withTime = false } = {}) {
    if (!input) return null
    // Si ya es un número (timestamp) o Date, convertirlo
    let d
    if (input instanceof Date) d = input
    else if (typeof input === 'number') d = new Date(input)
    else if (typeof input === 'string') {
        // Normalizar strings como 'YYYY-MM-DD' o ISO 'YYYY-MM-DDTHH:mm:ss'
        // Algunos backends pueden enviar '2025-12-01T00:00:00' (sin zona); Date puede parsearlo.
        d = new Date(input)
    } else {
        return String(input)
    }

    if (isNaN(d.getTime())) return String(input)

    try {
        if (withTime) {
            return d.toLocaleString(locale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        }
        return d.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
    } catch (e) {
        // Fallback sencillo
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${day}-${m}-${y}`
    }
}

export default { formatDisplayDate, fechaISOEnZonaHospital, hoyISOEnZonaHospital, ZONA_HORARIA_HOSPITAL }
