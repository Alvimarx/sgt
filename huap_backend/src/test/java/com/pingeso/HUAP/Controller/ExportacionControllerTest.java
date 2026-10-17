package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.Security.SeguridadServicio;
import com.pingeso.HUAP.Service.ExportacionService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * C-08 (HU-CAL-07): el médico exporta sus turnos del mes; el backend fuerza que salgan solo los
 * suyos y del servicio de la sesión. La gestión exporta su servicio (HU-CAL-08).
 */
class ExportacionControllerTest {

    private static final long URGENCIAS = 4L;
    private static final long ENFERMERIA = 2L;

    private final ExportacionService exportacionService = mock(ExportacionService.class);
    private final SeguridadServicio seguridadServicio = mock(SeguridadServicio.class);
    private final ExportacionController controller = new ExportacionController(exportacionService);

    {
        ReflectionTestUtils.setField(controller, "seguridadServicio", seguridadServicio);
        when(exportacionService.exportarTurnosCsv(any(), any(), any(), any())).thenReturn(new byte[0]);
    }

    private void sesion(long id, boolean gestion, boolean admin, long servicio) {
        when(seguridadServicio.idUsuarioActual()).thenReturn(id);
        when(seguridadServicio.esGestionDelServicio()).thenReturn(gestion);
        when(seguridadServicio.esAdministrador()).thenReturn(admin);
        when(seguridadServicio.idServicioActual()).thenReturn(servicio);
        doAnswer(inv -> {
            Long pedido = inv.getArgument(0);
            if (!admin && (pedido == null || pedido != servicio)) throw new AccessDeniedException("No tienes acceso a datos de otro servicio");
            return null;
        }).when(seguridadServicio).exigirMismoServicio(any());
    }

    @Test
    void elMedicoPuedeExportar() throws NoSuchMethodException {
        PreAuthorize regla = ExportacionController.class
                .getMethod("exportarTurnosCsv", Integer.class, Integer.class, Long.class, Long.class)
                .getAnnotation(PreAuthorize.class);
        assertTrue(regla.value().contains("'MEDICO'"));
    }

    @Test
    void elMedico_exportaSoloSusTurnos_aunquePidaLosDeOtraPersonaOLosDeTodos() {
        sesion(369L, false, false, URGENCIAS);

        controller.exportarTurnosCsv(2026, 10, 368L, URGENCIAS);
        controller.exportarTurnosCsv(2026, 10, null, URGENCIAS);
        String archivo = controller.exportarTurnosCsv(2026, 10, null, null).getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION);

        verify(exportacionService, times(3)).exportarTurnosCsv(2026, 10, 369L, URGENCIAS);
        verify(exportacionService, never()).exportarTurnosCsv(any(), any(), eq(368L), any());
        assertTrue(archivo.contains("turnos_2026_10_servicio_4_funcionario_369.csv"));
    }

    @Test
    void elMedico_deOtroServicio_403() {
        sesion(369L, false, false, URGENCIAS);

        assertThrows(AccessDeniedException.class, () -> controller.exportarTurnosCsv(2026, 10, 369L, ENFERMERIA));
        verify(exportacionService, never()).exportarTurnosCsv(any(), any(), any(), any());
    }

    @Test
    void laJefatura_exportaTodoSuServicioOLosDeUnaPersona() {
        sesion(305L, true, false, URGENCIAS);

        controller.exportarTurnosCsv(2026, 10, null, URGENCIAS);
        controller.exportarTurnosCsv(2026, 10, 369L, URGENCIAS);

        verify(exportacionService).exportarTurnosCsv(2026, 10, null, URGENCIAS);
        verify(exportacionService).exportarTurnosCsv(2026, 10, 369L, URGENCIAS);
    }

    @Test
    void elAdministrador_exportaLoQuePida() {
        sesion(1L, true, true, URGENCIAS);

        controller.exportarTurnosCsv(2026, 10, null, ENFERMERIA);

        verify(exportacionService).exportarTurnosCsv(2026, 10, null, ENFERMERIA);
        verify(seguridadServicio, never()).idUsuarioActual();
        verify(exportacionService, never()).exportarTurnosCsv(any(), any(), anyLong(), eq(URGENCIAS));
    }
}
