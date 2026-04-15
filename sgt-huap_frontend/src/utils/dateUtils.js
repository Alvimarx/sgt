// dateUtils.js
// Helpers para mostrar fechas en la UI de forma consistente

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

export default { formatDisplayDate }
