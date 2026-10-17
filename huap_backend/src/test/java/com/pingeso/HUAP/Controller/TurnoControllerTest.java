package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.Entity.PuestoEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.PuestoRepository;
import com.pingeso.HUAP.Security.SeguridadServicio;
import com.pingeso.HUAP.Service.GestionTurnoService;
import com.pingeso.HUAP.Service.TurnoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * C-17 (BUG-004) en {@link TurnoController}: {@code GET /turnos} solo para el administrador y las
 * lecturas por id, por servicio, por funcionario y por puesto acotadas al servicio de la sesión.
 * Mockito puro: {@link SeguridadServicio} es un mock que replica {@code exigirMismoServicio}.
 */
@ExtendWith(MockitoExtension.class)
class TurnoControllerTest {

    private static final long URGENCIAS = 4L;
    private static final long ENFERMERIA = 2L;

    @Mock private TurnoService turnoService;
    @Mock private PuestoRepository puestoRepository;
    @Mock private GestionTurnoService gestionTurnoService;
    @Mock private SeguridadServicio seguridadServicio;

    @InjectMocks private TurnoController controller;

    private void sesionDe(long servicio) {
        lenient().doAnswer(inv -> {
            Long pedido = inv.getArgument(0);
            if (pedido == null || pedido != servicio) throw new AccessDeniedException("No tienes acceso a datos de otro servicio");
            return null;
        }).when(seguridadServicio).exigirMismoServicio(any());
    }

    private static TurnoEntity turnoDe(long id, long idServicio) {
        return TurnoEntity.builder().idTurno(id)
                .servicio(ServicioEntity.builder().idServicio(idServicio).build()).build();
    }

    @Test
    void getTodos_exigeAdministrador() throws NoSuchMethodException {
        PreAuthorize regla = TurnoController.class.getMethod("getAllTurnos").getAnnotation(PreAuthorize.class);
        assertNotNull(regla, "GET /turnos debe declarar @PreAuthorize");
        assertEquals("hasRole('ADMINISTRADOR')", regla.value());
    }

    @Test
    void getPorId_delMismoServicio_200_deOtro_403_inexistente_404() {
        sesionDe(ENFERMERIA);
        when(turnoService.getTurnoById(1L)).thenReturn(Optional.of(turnoDe(1L, ENFERMERIA)));
        when(turnoService.getTurnoById(2L)).thenReturn(Optional.of(turnoDe(2L, URGENCIAS)));
        when(turnoService.getTurnoById(3L)).thenReturn(Optional.empty());

        assertEquals(HttpStatus.OK, controller.getTurnoById(1L).getStatusCode());
        assertThrows(AccessDeniedException.class, () -> controller.getTurnoById(2L));
        assertEquals(HttpStatus.NOT_FOUND, controller.getTurnoById(3L).getStatusCode());
    }

    @Test
    void lecturasPorServicio_deOtroServicio_403SinConsultar() {
        sesionDe(ENFERMERIA);

        assertThrows(AccessDeniedException.class, () -> controller.getTurnosByServicio(URGENCIAS));
        assertThrows(AccessDeniedException.class, () -> controller.getTurnosCalendario(URGENCIAS, 2026, 10));
        assertThrows(AccessDeniedException.class, () -> controller.getTurnosByServicioAndDia(URGENCIAS, "2026-10-17"));
        assertThrows(AccessDeniedException.class, () -> controller.getTurnosSinAsignarByDia(URGENCIAS, "2026-10-17"));
        assertThrows(AccessDeniedException.class, () -> controller.getUnassignedTurnosByServicio(URGENCIAS));
        assertThrows(AccessDeniedException.class, () -> controller.getUnassignedTurnosByServicioAndPeriodo(URGENCIAS, null, null));
        assertThrows(AccessDeniedException.class, () -> controller.getTurnosStatsByServicio(URGENCIAS, null, null));
        assertThrows(AccessDeniedException.class, () -> controller.getTurnosDetalleByServicio(URGENCIAS, null, null));
        assertThrows(AccessDeniedException.class, () -> controller.getFuncionariosConTurnosByServicio(URGENCIAS, null, null));
        assertThrows(AccessDeniedException.class, () -> controller.getFuncionariosStatsByServicio(URGENCIAS, null, null));
        assertThrows(AccessDeniedException.class, () -> controller.getCoberturaByServicio(URGENCIAS, null, null));
        verifyNoInteractions(turnoService);
    }

    @Test
    void lecturaPorServicio_propio_200() {
        sesionDe(URGENCIAS);
        when(turnoService.getTurnosByServicioConDetalles(URGENCIAS)).thenReturn(List.of());

        assertEquals(HttpStatus.OK, controller.getTurnosByServicio(URGENCIAS).getStatusCode());
    }

    @Test
    void porFuncionario_deOtraPersonaDelServicio_traeSoloLosDeEseServicio() {
        Map<String, Object> deUrgencias = Map.of("id", 1L, "idServicio", URGENCIAS);
        Map<String, Object> deCirugia = Map.of("id", 2L, "idServicio", 3L);
        when(turnoService.servicioAlcanceTurnosDe(368L)).thenReturn(URGENCIAS);
        when(turnoService.getTurnosByMedico(368L)).thenReturn(List.of(deUrgencias, deCirugia));
        when(turnoService.getTurnosFuturosFuncionario(368L)).thenReturn(List.of(deCirugia));

        ResponseEntity<List<Map<String, Object>>> todos = controller.getTurnosByFuncionario(368L, null, null);
        assertEquals(List.of(deUrgencias), todos.getBody());
        assertEquals(List.of(), controller.getTurnosFuturos(368L).getBody());
    }

    @Test
    void porFuncionario_deOtroServicio_propagaEl403() {
        when(turnoService.servicioAlcanceTurnosDe(369L)).thenThrow(new AccessDeniedException("No tienes acceso a datos de otro servicio"));

        assertThrows(AccessDeniedException.class, () -> controller.getTurnosByFuncionario(369L, null, null));
        assertThrows(AccessDeniedException.class, () -> controller.getTurnosFuturos(369L));
        verify(turnoService, never()).getTurnosByMedico(any());
    }

    @Test
    void porPuesto_deOtroServicio_403_inexistente_404() {
        sesionDe(ENFERMERIA);
        PuestoEntity deUrgencias = new PuestoEntity();
        deUrgencias.setIdPuesto(7L);
        deUrgencias.setServicio(ServicioEntity.builder().idServicio(URGENCIAS).build());
        when(puestoRepository.findById(7L)).thenReturn(Optional.of(deUrgencias));
        when(puestoRepository.findById(8L)).thenReturn(Optional.empty());

        assertThrows(AccessDeniedException.class, () -> controller.getTurnosByPuesto(7L));
        assertThrows(AccessDeniedException.class, () -> controller.getTurnosParaAsignacion(7L, "2026-10-01", "2026-10-31"));
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> controller.getTurnosByPuesto(8L));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        verifyNoInteractions(turnoService);
    }
}
