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
 * Descarga un CSV con los turnos de un servicio para un mes/año dados.
 * Dispara la descarga en el navegador (crea un blob y un enlace temporal).
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

        const response = await axiosInstance.get(`${API_BASE}/turnos/csv`, {
            params,
            responseType: 'blob',
        });

        const filename = getFilenameFromDisposition(
            response.headers['content-disposition'],
            `turnos_${anio}_${String(mes).padStart(2, '0')}_servicio_${idServicio}.csv`
        );

        const blob = new Blob([response.data], {
            type: 'text/csv;charset=utf-8;',
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();

        link.remove();
        window.URL.revokeObjectURL(url);

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error.message || 'Error al exportar turnos.',
        };
    }
};