/**
 * exportacionService.js
 * Servicio de exportación de datos a archivos descargables (CSV).
 */
import axiosInstance from '../utils/axiosConfig';

const API_BASE = '/exportaciones';

/**
 * Extrae el nombre de archivo de la cabecera Content-Disposition.
 * @param {string} contentDisposition - Valor de la cabecera 'content-disposition'.
 * @param {string} fallback - Nombre a usar si la cabecera no está presente.
 * @returns {string}
 */
const getFilenameFromDisposition = (contentDisposition, fallback) => {
    if (!contentDisposition) return fallback;

    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    return match?.[1] || fallback;
};

/**
 * Pide un CSV al backend y dispara su descarga en el navegador (crea un blob y
 * un enlace temporal). El nombre sale de Content-Disposition o de
 * `nombrePorDefecto`. Lanza el error de axios si la petición falla.
 */
const descargarCsv = async (url, params, nombrePorDefecto) => {
    const response = await axiosInstance.get(url, {
        params,
        responseType: 'blob',
    });

    const filename = getFilenameFromDisposition(
        response.headers['content-disposition'],
        nombrePorDefecto
    );

    const blob = new Blob([response.data], {
        type: 'text/csv;charset=utf-8;',
    });

    const enlaceUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = enlaceUrl;
    link.download = filename;

    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(enlaceUrl);
};

/**
 * Descarga un CSV con los turnos de un servicio para un mes/año dados.
 * @async
 * @param {Object} params
 * @param {number} params.anio - Año a exportar.
 * @param {number} params.mes - Mes a exportar (1-12).
 * @param {number} params.idServicio - Servicio del que exportar los turnos.
 * @param {number|null} [params.idFuncionario] - Filtro opcional por funcionario.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const exportarTurnosCsv = async ({ anio, mes, idServicio, idFuncionario = null }) => {
    try {
        if (!anio || !mes) {
            throw new Error('Debe seleccionar un mes para exportar.');
        }

        if (!idServicio) {
            throw new Error('No hay servicio seleccionado.');
        }

        const params = {
            anio,
            mes,
            idServicio,
        };

        if (idFuncionario) {
            params.idFuncionario = idFuncionario;
        }

        await descargarCsv(
            `${API_BASE}/turnos/csv`,
            params,
            `turnos_${anio}_${String(mes).padStart(2, '0')}_servicio_${idServicio}.csv`
        );

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error.message || 'Error al exportar turnos.',
        };
    }
};

/**
 * Descarga la nómina de un servicio en CSV (C-21): GET
 * /exportaciones/servicios/{id}/funcionarios/csv. El backend exige rol de
 * gestión y que el servicio sea el de la sesión.
 * @async
 * @param {number} idServicio - Servicio cuya nómina se exporta.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const exportarNominaServicioCsv = async (idServicio) => {
    try {
        if (!idServicio) {
            throw new Error('No hay servicio seleccionado.');
        }

        await descargarCsv(
            `${API_BASE}/servicios/${idServicio}/funcionarios/csv`,
            undefined,
            `funcionarios_servicio_${idServicio}.csv`
        );

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error.message || 'Error al exportar la nómina.',
        };
    }
};
