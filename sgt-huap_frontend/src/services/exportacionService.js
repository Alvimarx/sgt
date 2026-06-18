import axiosInstance from '../utils/axiosConfig';

const API_BASE = '/exportaciones';

const getFilenameFromDisposition = (contentDisposition, fallback) => {
    if (!contentDisposition) return fallback;

    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    return match?.[1] || fallback;
};

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