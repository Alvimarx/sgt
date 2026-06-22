// feriadosService.js
// Días feriados (tabla en BD, solo lectura). Se usan para marcar/colorear el preview
// de la planificación. El ajuste de horas real lo aplica el backend.

import axiosInstance from '../utils/axiosConfig';

const API_BASE = '/feriados';

/** Normaliza una fecha del backend ([Y,M,D] | "YYYY-MM-DD...") a "YYYY-MM-DD". */
const toISODate = (fecha) => {
    if (!fecha) return null;
    if (Array.isArray(fecha)) {
        const [y, m, d] = fecha;
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return String(fecha).substring(0, 10);
};

export const feriadosService = {
    /** GET /feriados?desde&hasta — devuelve un Set de fechas "YYYY-MM-DD". */
    getFechas: async ({ desde, hasta } = {}) => {
        const params = {};
        if (desde) params.desde = desde;
        if (hasta) params.hasta = hasta;
        const res = await axiosInstance.get(API_BASE, { params });
        const lista = Array.isArray(res.data) ? res.data : [];
        return new Set(lista.map(f => toISODate(f.fecha)).filter(Boolean));
    },
};

export default feriadosService;
