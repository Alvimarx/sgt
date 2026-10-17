package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.AlterarTurnoRequest;
import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.ServiciosFuncionarioRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import com.pingeso.HUAP.Security.SeguridadServicio;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Asignación manual de turnos ({@link GestionTurnoService#alterarTurno}).
 *
 * <ul>
 *   <li>C-04 (HU-SOL-14, criterio 5): asignar o reasignar a mano aplica R13 con el mismo
 *   validador y el mismo mensaje de las solicitudes, sin excepción de emergencia.</li>
 *   <li>§5.1 (P-01): el cruce de horario responde 409 con su mensaje; antes se lanzaba como
 *   {@code Exception} y {@code /turnos/alterar} respondía 500.</li>
 * </ul>
 *
 * <p>Mockito puro, sin contexto Spring; el lock pesimista queda apagado (el campo {@code @Value}
 * no se inyecta), así que el turno se lee con {@code findById}.
 */
class GestionTurnoServiceTest {

    private static final long URGENCIAS = 4L;
    private static final long JEFATURA = 305L;
    private static final long MEDICO = 369L;
    private static final long OTRO_MEDICO = 368L;
    /** Lunes 8 de junio de 2026. */
    private static final LocalDate LUNES = LocalDate.of(2026, 6, 8);

    private final TurnoRepository turnoRepository = mock(TurnoRepository.class);
    private final FuncionarioRepository funcionarioRepository = mock(FuncionarioRepository.class);
    private final TurnoService turnoService = mock(TurnoService.class);
    private final BitacoraService bitacoraService = mock(BitacoraService.class);
    private final NotificacionService notificacionService = mock(NotificacionService.class);
    private final ServiciosFuncionarioRepository serviciosFuncionarioRepository = mock(ServiciosFuncionarioRepository.class);
    private final SeguridadServicio seguridadServicio = mock(SeguridadServicio.class);
    private final SolicitudService solicitudService = mock(SolicitudService.class);

    private final GestionTurnoService service = new GestionTurnoService(
            turnoRepository, funcionarioRepository, turnoService, bitacoraService, notificacionService,
            serviciosFuncionarioRepository, seguridadServicio, new ValidadorAsignacionTurnoService(), solicitudService);

    {
        when(seguridadServicio.idUsuarioActual()).thenReturn(JEFATURA);
        when(funcionarioRepository.findById(JEFATURA)).thenReturn(Optional.of(persona(JEFATURA, "Jefa", "Turno")));
        when(funcionarioRepository.findById(MEDICO)).thenReturn(Optional.of(persona(MEDICO, "Ana", "Rojas")));
        when(funcionarioRepository.findById(OTRO_MEDICO)).thenReturn(Optional.of(persona(OTRO_MEDICO, "Luis", "Soto")));
        when(serviciosFuncionarioRepository.existsByServicio_IdServicioAndFuncionario_IdFuncionarioAndFuncionario_EliminadoFalse(
                eq(URGENCIAS), any())).thenReturn(true);
    }

    private static FuncionarioEntity persona(long id, String nombre, String apellido) {
        return FuncionarioEntity.builder().idFuncionario(id).nombre(nombre).apelPat(apellido).build();
    }

    /** Turno de Urgencias de 12 horas que parte el día y la hora indicados. */
    private static TurnoEntity turno(long id, LocalDate dia, int horaInicio, FuncionarioEntity dueno) {
        LocalDateTime inicio = dia.atTime(horaInicio, 0);
        LocalDateTime fin = inicio.plusHours(12);
        return TurnoEntity.builder()
                .idTurno(id)
                .diaInicioTurno(dia).horaInicio(inicio.toLocalTime())
                .diaFinalTurno(fin.toLocalDate()).horaFin(fin.toLocalTime())
                .servicio(ServicioEntity.builder().idServicio(URGENCIAS).build())
                .funcionario(dueno)
                .build();
    }

    private TurnoEntity existe(TurnoEntity turno) {
        when(turnoRepository.findById(turno.getIdTurno())).thenReturn(Optional.of(turno));
        return turno;
    }

    /** El calendario de la persona en los días del turno (lo que devuelve la consulta de conflictos). */
    private void calendario(long idFuncionario, TurnoEntity... turnos) {
        when(turnoRepository.findConflictosByFuncionario(eq(idFuncionario), any(), any())).thenReturn(List.of(turnos));
    }

    private static AlterarTurnoRequest pedido(long idTurno, String accion, Long idNuevo) {
        AlterarTurnoRequest r = new AlterarTurnoRequest();
        r.setIdTurno(idTurno);
        r.setAccion(accion);
        r.setIdNuevoMedico(idNuevo);
        r.setMotivo("Prueba");
        return r;
    }

    private static final String R13_NOCHE_DIA = "No es posible asignar el turno a Ana Rojas porque sale de su turno "
            + "de noche (lun 8 jun, 20:00 a mar 9 jun, 08:00) la mañana de ese mismo día. Se permite un día "
            + "seguido de su noche (24 horas corridas), pero no una noche seguida de día.";

    // ============================ C-04: R13 al asignar y reasignar a mano ============================

    @Test
    void asignar_unDiaLaMananaEnQueSaleDeSuNoche_409ConElMensajeDeR13() {
        TurnoEntity dia = existe(turno(10L, LUNES.plusDays(1), 8, null));
        calendario(MEDICO, turno(11L, LUNES, 20, persona(MEDICO, "Ana", "Rojas")));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.alterarTurno(pedido(10L, "ASIGNAR", MEDICO)));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertEquals(R13_NOCHE_DIA, ex.getReason());
        assertNull(dia.getFuncionario(), "el cupo sigue libre");
        verify(turnoRepository, never()).save(any());
        verifyNoInteractions(bitacoraService, notificacionService, solicitudService);
    }

    @Test
    void reasignar_tambienAplicaR13() {
        existe(turno(10L, LUNES.plusDays(1), 8, persona(OTRO_MEDICO, "Luis", "Soto")));
        calendario(MEDICO, turno(11L, LUNES, 20, persona(MEDICO, "Ana", "Rojas")));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.alterarTurno(pedido(10L, "REASIGNAR", MEDICO)));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertEquals(R13_NOCHE_DIA, ex.getReason());
        verify(turnoRepository, never()).save(any());
    }

    @Test
    void asignar_laNocheQueTerminaLaMananaDeSuTurnoDeDia_409() {
        existe(turno(10L, LUNES, 20, null));
        calendario(MEDICO, turno(12L, LUNES.plusDays(1), 8, persona(MEDICO, "Ana", "Rojas")));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.alterarTurno(pedido(10L, "ASIGNAR", MEDICO)));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().startsWith("No es posible asignar el turno a Ana Rojas porque saldría de ese turno "
                + "de noche la misma mañana en que empieza su turno de día (mar 9 jun, 08:00 a mar 9 jun, 20:00)"), ex.getReason());
    }

    @Test
    void asignar_elDiaYLaNocheDelMismoDia_24HorasCorridas_sePermite() {
        TurnoEntity noche = existe(turno(10L, LUNES, 20, null));
        calendario(MEDICO, turno(13L, LUNES, 8, persona(MEDICO, "Ana", "Rojas")));

        Map<String, Object> r = service.alterarTurno(pedido(10L, "ASIGNAR", MEDICO));

        assertEquals("asignado", r.get("accion"));
        assertEquals(MEDICO, noche.getFuncionario().getIdFuncionario());
        verify(turnoRepository).save(noche);
    }

    @Test
    void asignar_unDiaDespuesDeOtroDia_sePermite() {
        existe(turno(10L, LUNES.plusDays(1), 8, null));
        calendario(MEDICO, turno(14L, LUNES, 8, persona(MEDICO, "Ana", "Rojas")));

        assertEquals("asignado", service.alterarTurno(pedido(10L, "ASIGNAR", MEDICO)).get("accion"));
    }

    // ============================ §5.1: cruce de horario, 409 y no 500 ============================

    @Test
    void asignar_conUnTurnoQueSeCruza_409ConElMensaje() {
        existe(turno(10L, LUNES, 8, null));
        TurnoEntity cruzado = TurnoEntity.builder().idTurno(15L)
                .diaInicioTurno(LUNES).horaInicio(LocalTime.of(14, 0))
                .diaFinalTurno(LUNES).horaFin(LocalTime.of(22, 0)).build();
        calendario(MEDICO, cruzado);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.alterarTurno(pedido(10L, "ASIGNAR", MEDICO)));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertEquals("El funcionario ya tiene otro turno asignado en este rango horario.", ex.getReason());
        verify(turnoRepository, never()).save(any());
    }

    @Test
    void cambiarHoras_conCruce_409YNoErrorInterno() throws Exception {
        existe(turno(10L, LUNES, 8, persona(MEDICO, "Ana", "Rojas")));
        when(turnoService.saveTurno(any())).thenThrow(new Exception(
                "Conflicto: El funcionario seleccionado ya tiene otro turno asignado en este rango de fechas."));
        AlterarTurnoRequest r = pedido(10L, "CAMBIAR_HORAS", null);
        r.setNuevaHoraInicio(LocalTime.of(9, 0));
        r.setNuevaHoraFin(LocalTime.of(21, 0));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.alterarTurno(r));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertEquals("Conflicto: El funcionario seleccionado ya tiene otro turno asignado en este rango de fechas.",
                ex.getReason());
        verify(notificacionService, never()).crearNotificacionSistema(any(), anyString());
    }

    // ============================ §5.1: la asignación manual cierra las solicitudes pendientes ============================

    @Test
    void asignar_rechazaLasSolicitudesPendientesDelTurno() {
        existe(turno(10L, LUNES, 8, null));
        calendario(MEDICO);

        service.alterarTurno(pedido(10L, "ASIGNAR", MEDICO));

        verify(solicitudService).rechazarPendientesPorCambioManual(10L, JEFATURA,
                "Rechazo automático: El turno fue asignado manualmente.");
    }

    @Test
    void reasignarAOtraPersona_rechazaLasPendientes_yAQuienYaLoTiene_no() {
        existe(turno(10L, LUNES, 8, persona(OTRO_MEDICO, "Luis", "Soto")));
        calendario(MEDICO);
        calendario(OTRO_MEDICO);

        service.alterarTurno(pedido(10L, "REASIGNAR", MEDICO));
        verify(solicitudService).rechazarPendientesPorCambioManual(10L, JEFATURA,
                "Rechazo automático: El turno fue reasignado manualmente.");

        reset(solicitudService);
        existe(turno(20L, LUNES, 8, persona(OTRO_MEDICO, "Luis", "Soto")));
        service.alterarTurno(pedido(20L, "REASIGNAR", OTRO_MEDICO));
        verifyNoInteractions(solicitudService);
    }

    @Test
    void liberar_rechazaLasPendientes_yLiberarUnCupoYaLibre_noLasToca() {
        existe(turno(10L, LUNES, 8, persona(MEDICO, "Ana", "Rojas")));

        service.alterarTurno(pedido(10L, "DESASIGNAR", null));
        verify(solicitudService).rechazarPendientesPorCambioManual(10L, JEFATURA,
                "Rechazo automático: El turno fue liberado manualmente.");

        reset(solicitudService);
        existe(turno(20L, LUNES, 8, null));
        service.alterarTurno(pedido(20L, "DESASIGNAR", null));
        verifyNoInteractions(solicitudService);
    }

    @Test
    void cambiarHoras_noTocaLasSolicitudes() throws Exception {
        TurnoEntity t = existe(turno(10L, LUNES, 8, persona(MEDICO, "Ana", "Rojas")));
        when(turnoService.saveTurno(any())).thenReturn(t);
        AlterarTurnoRequest r = pedido(10L, "CAMBIAR_HORAS", null);
        r.setNuevaHoraInicio(LocalTime.of(9, 0));
        r.setNuevaHoraFin(LocalTime.of(21, 0));

        service.alterarTurno(r);

        verifyNoInteractions(solicitudService);
    }
}
