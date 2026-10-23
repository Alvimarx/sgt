package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.AlterarTurnoRequest;
import com.pingeso.HUAP.Entity.BitacoraEntity;
import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.ServiciosFuncionarioRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import com.pingeso.HUAP.Security.SeguridadServicio;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Regla del 23 oct 2026: en un turno que ya terminó, la jefatura del servicio, el subrogante y el
 * administrador pueden asignar, quitar o cambiar al médico (corrección del registro de quién lo hizo
 * de verdad). Se mantienen el choque de horario y la separación por servicio; el descanso posterior a
 * una noche (R13) avisa y no bloquea; el médico común no puede. Deja un evento propio,
 * {@code CORRECCION_TURNO_PASADO}, con quién lo hizo, el titular anterior y el nuevo. Mockito puro,
 * con la hora fijada; sin personas ni RUT reales.
 */
class CorreccionTurnoPasadoTest {

    private static final long URGENCIAS = 4L;
    private static final long OTRO_SERVICIO = 5L;
    private static final long JEFATURA = 305L;
    private static final long TITULAR = 369L;
    private static final long REEMPLAZO = 368L;

    /** Viernes 23 oct 2026, 12:00. */
    private static final LocalDateTime AHORA = LocalDateTime.of(2026, 10, 23, 12, 0);
    private static final LocalDate HOY = AHORA.toLocalDate();
    private static final LocalDate AYER = HOY.minusDays(1);

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
            serviciosFuncionarioRepository, seguridadServicio, new ValidadorAsignacionTurnoService(), solicitudService) {
        @Override
        LocalDateTime ahora() {
            return AHORA;
        }
    };

    {
        when(seguridadServicio.idUsuarioActual()).thenReturn(JEFATURA);
        // Por defecto, la jefatura del servicio de la sesión.
        when(seguridadServicio.esAdministrador()).thenReturn(false);
        when(seguridadServicio.esGestionDelServicio()).thenReturn(true);
        when(funcionarioRepository.findById(JEFATURA)).thenReturn(Optional.of(persona(JEFATURA, "Jefatura")));
        when(funcionarioRepository.findById(TITULAR)).thenReturn(Optional.of(persona(TITULAR, "Titular")));
        when(funcionarioRepository.findById(REEMPLAZO)).thenReturn(Optional.of(persona(REEMPLAZO, "Reemplazo")));
        when(serviciosFuncionarioRepository.existsByServicio_IdServicioAndFuncionario_IdFuncionarioAndFuncionario_EliminadoFalse(
                eq(URGENCIAS), any())).thenReturn(true);
    }

    // ---------------------------------------------------------------- datos

    private static FuncionarioEntity persona(long id, String nombre) {
        return FuncionarioEntity.builder().idFuncionario(id).nombre(nombre).apelPat("Prueba").build();
    }

    /** Turno de 12 horas de un servicio que parte ese día a esa hora. */
    private static TurnoEntity turno(long id, long servicio, LocalDate dia, int hora, FuncionarioEntity dueno) {
        LocalDateTime inicio = dia.atTime(hora, 0);
        LocalDateTime fin = inicio.plusHours(12);
        return TurnoEntity.builder().idTurno(id)
                .diaInicioTurno(dia).horaInicio(inicio.toLocalTime())
                .diaFinalTurno(fin.toLocalDate()).horaFin(fin.toLocalTime())
                .servicio(ServicioEntity.builder().idServicio(servicio).build())
                .funcionario(dueno).build();
    }

    private TurnoEntity existe(TurnoEntity turno) {
        when(turnoRepository.findById(turno.getIdTurno())).thenReturn(Optional.of(turno));
        return turno;
    }

    private void calendario(long idFuncionario, TurnoEntity... turnos) {
        when(turnoRepository.findConflictosByFuncionario(eq(idFuncionario), any(), any())).thenReturn(List.of(turnos));
    }

    private static AlterarTurnoRequest pedido(long idTurno, String accion, Long idNuevo) {
        AlterarTurnoRequest r = new AlterarTurnoRequest();
        r.setIdTurno(idTurno);
        r.setAccion(accion);
        r.setIdNuevoMedico(idNuevo);
        r.setMotivo("Reemplazo de último minuto");
        return r;
    }

    private BitacoraEntity eventoGuardado() {
        ArgumentCaptor<BitacoraEntity> captor = ArgumentCaptor.forClass(BitacoraEntity.class);
        verify(bitacoraService).save(captor.capture());
        return captor.getValue();
    }

    private void comoAdministrador() {
        when(seguridadServicio.esAdministrador()).thenReturn(true);
        when(seguridadServicio.esGestionDelServicio()).thenReturn(false);
    }

    private void comoSubrogante() {
        // El subrogante tiene el rol de gestión en su servicio: igual que la jefatura para el servicio.
        when(seguridadServicio.esAdministrador()).thenReturn(false);
        when(seguridadServicio.esGestionDelServicio()).thenReturn(true);
    }

    private void comoMedico() {
        when(seguridadServicio.esAdministrador()).thenReturn(false);
        when(seguridadServicio.esGestionDelServicio()).thenReturn(false);
    }

    // ============================ Quién puede ============================

    @Test
    void laJefatura_asignaUnCupoLibreDeUnTurnoTerminado_yQuedaElEventoPropio() {
        TurnoEntity pasado = existe(turno(10L, URGENCIAS, AYER, 8, null));
        calendario(TITULAR);

        Map<String, Object> r = service.alterarTurno(pedido(10L, "ASIGNAR", TITULAR));

        assertEquals(TITULAR, pasado.getFuncionario().getIdFuncionario());
        assertEquals("asignado", r.get("accion"));
        assertEquals(true, r.get("correccionTurnoPasado"));
        assertFalse(r.containsKey("advertencia"));
        BitacoraEntity evento = eventoGuardado();
        assertEquals("CORRECCION_TURNO_PASADO", evento.getTipoEvento());
        assertEquals(JEFATURA, evento.getFuncionario().getIdFuncionario(), "quién hizo la corrección");
        assertTrue(evento.getObservaciones().contains("titular anterior sin titular"), evento.getObservaciones());
        assertTrue(evento.getObservaciones().contains("titular nuevo Titular Prueba"), evento.getObservaciones());
        assertEquals("Reemplazo de último minuto", evento.getMotivo());
        verify(solicitudService).rechazarPendientesPorCambioManual(eq(10L), eq(JEFATURA), anyString());
    }

    @Test
    void laJefatura_cambiaAlMedicoDeUnTurnoTerminado_elEventoDiceElTitularAnteriorYElNuevo() {
        TurnoEntity pasado = existe(turno(10L, URGENCIAS, AYER, 8, persona(TITULAR, "Titular")));
        calendario(REEMPLAZO);

        Map<String, Object> r = service.alterarTurno(pedido(10L, "REASIGNAR", REEMPLAZO));

        assertEquals(REEMPLAZO, pasado.getFuncionario().getIdFuncionario());
        assertEquals(true, r.get("correccionTurnoPasado"));
        BitacoraEntity evento = eventoGuardado();
        assertEquals("CORRECCION_TURNO_PASADO", evento.getTipoEvento());
        assertTrue(evento.getObservaciones().contains("titular anterior Titular Prueba"), evento.getObservaciones());
        assertTrue(evento.getObservaciones().contains("titular nuevo Reemplazo Prueba"), evento.getObservaciones());
    }

    @Test
    void laJefatura_quitaAlMedicoDeUnTurnoTerminado() {
        TurnoEntity pasado = existe(turno(10L, URGENCIAS, AYER, 8, persona(TITULAR, "Titular")));

        Map<String, Object> r = service.alterarTurno(pedido(10L, "DESASIGNAR", null));

        assertNull(pasado.getFuncionario());
        assertEquals("desasignado", r.get("accion"));
        BitacoraEntity evento = eventoGuardado();
        assertEquals("CORRECCION_TURNO_PASADO", evento.getTipoEvento());
        assertTrue(evento.getObservaciones().contains("titular anterior Titular Prueba"), evento.getObservaciones());
        assertTrue(evento.getObservaciones().contains("titular nuevo sin titular"), evento.getObservaciones());
    }

    @Test
    void elSubrogante_tambienPuedeCorregirUnTurnoTerminado() {
        comoSubrogante();
        TurnoEntity pasado = existe(turno(10L, URGENCIAS, AYER, 8, persona(TITULAR, "Titular")));
        calendario(REEMPLAZO);

        service.alterarTurno(pedido(10L, "REASIGNAR", REEMPLAZO));

        assertEquals(REEMPLAZO, pasado.getFuncionario().getIdFuncionario());
        assertEquals("CORRECCION_TURNO_PASADO", eventoGuardado().getTipoEvento());
    }

    @Test
    void elAdministrador_tambienPuedeCorregirUnTurnoTerminado() {
        comoAdministrador();
        TurnoEntity pasado = existe(turno(10L, URGENCIAS, AYER, 8, null));
        calendario(TITULAR);

        service.alterarTurno(pedido(10L, "ASIGNAR", TITULAR));

        assertEquals(TITULAR, pasado.getFuncionario().getIdFuncionario());
        assertEquals("CORRECCION_TURNO_PASADO", eventoGuardado().getTipoEvento());
    }

    @Test
    void elMedicoComun_noPuedeNiAsignarNiQuitarNiCambiarUnTurnoTerminado() {
        comoMedico();
        TurnoEntity pasado = existe(turno(10L, URGENCIAS, AYER, 8, persona(TITULAR, "Titular")));

        for (String accion : List.of("ASIGNAR", "REASIGNAR", "DESASIGNAR")) {
            assertThrows(AccessDeniedException.class,
                    () -> service.alterarTurno(pedido(10L, accion, REEMPLAZO)), accion);
        }

        assertEquals(TITULAR, pasado.getFuncionario().getIdFuncionario(), "el registro no cambió");
        verify(turnoRepository, never()).save(any());
        verifyNoInteractions(bitacoraService, notificacionService, solicitudService);
    }

    // ============================ Qué se mantiene ============================

    @Test
    void elChoqueDeHorarioSiBloquea_tambienEnUnTurnoPasado() {
        existe(turno(10L, URGENCIAS, AYER, 8, null));
        // Ya hizo otro turno ayer de 14 a 02: se cruza con el de 08 a 20.
        calendario(TITULAR, turno(11L, URGENCIAS, AYER, 14, persona(TITULAR, "Titular")));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.alterarTurno(pedido(10L, "ASIGNAR", TITULAR)));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("se superpone"), ex.getReason());
        verify(turnoRepository, never()).save(any());
        verifyNoInteractions(bitacoraService);
    }

    @Test
    void elDescansoPostNocturnoR13_noBloqueaEnUnTurnoPasado_peroAvisa() {
        TurnoEntity pasado = existe(turno(10L, URGENCIAS, AYER, 8, null));
        // Hizo la noche de anteayer (20:00 a 08:00 de ayer) y ahora se registra que hizo el día de ayer: noche seguida de día.
        calendario(TITULAR, turno(11L, URGENCIAS, AYER.minusDays(1), 20, persona(TITULAR, "Titular")));

        Map<String, Object> r = service.alterarTurno(pedido(10L, "ASIGNAR", TITULAR));

        assertEquals(TITULAR, pasado.getFuncionario().getIdFuncionario(), "se registró igual");
        String aviso = (String) r.get("advertencia");
        assertNotNull(aviso, "avisa sin impedir");
        assertTrue(aviso.contains("noche seguida de día"), aviso);
        BitacoraEntity evento = eventoGuardado();
        assertEquals("CORRECCION_TURNO_PASADO", evento.getTipoEvento());
        assertTrue(evento.getObservaciones().contains("R13"), evento.getObservaciones());
    }

    @Test
    void elDescansoPostNocturnoR13_siBloqueaEnUnTurnoQueNoHaTerminado() {
        // Turno de hoy 08:00 a 20:00, en curso a las 12:00: no es pasado, así que R13 sigue bloqueando.
        existe(turno(10L, URGENCIAS, HOY, 8, null));
        calendario(TITULAR, turno(11L, URGENCIAS, AYER, 20, persona(TITULAR, "Titular")));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.alterarTurno(pedido(10L, "ASIGNAR", TITULAR)));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("noche seguida de día"), ex.getReason());
        verifyNoInteractions(bitacoraService);
    }

    @Test
    void unTurnoEnCurso_seSigueAsignandoComoAntes_conSuEventoDeAsignacionManual() {
        TurnoEntity enCurso = existe(turno(10L, URGENCIAS, HOY, 8, null));
        calendario(TITULAR);

        Map<String, Object> r = service.alterarTurno(pedido(10L, "ASIGNAR", TITULAR));

        assertEquals(TITULAR, enCurso.getFuncionario().getIdFuncionario());
        assertFalse(r.containsKey("correccionTurnoPasado"));
        assertEquals("ASIGNACION_MANUAL_TURNO", eventoGuardado().getTipoEvento());
    }

    @Test
    void unTurnoQueTerminoJustoAhora_yaEsPasado_yUnoQueTerminaUnMinutoDespues_no() {
        // Terminó a las 12:00 exactas: pasado. Se asigna con el evento propio.
        LocalDateTime inicio = AHORA.minusHours(12);
        TurnoEntity justo = existe(TurnoEntity.builder().idTurno(10L)
                .diaInicioTurno(inicio.toLocalDate()).horaInicio(inicio.toLocalTime())
                .diaFinalTurno(AHORA.toLocalDate()).horaFin(AHORA.toLocalTime())
                .servicio(ServicioEntity.builder().idServicio(URGENCIAS).build()).build());
        calendario(TITULAR);

        Map<String, Object> r = service.alterarTurno(pedido(10L, "ASIGNAR", TITULAR));
        assertEquals(true, r.get("correccionTurnoPasado"));
        assertEquals(TITULAR, justo.getFuncionario().getIdFuncionario());

        // Termina a las 12:01: aún en curso, no es pasado.
        TurnoEntity casi = existe(TurnoEntity.builder().idTurno(12L)
                .diaInicioTurno(inicio.toLocalDate()).horaInicio(inicio.toLocalTime().plusMinutes(1))
                .diaFinalTurno(AHORA.toLocalDate()).horaFin(AHORA.toLocalTime().plusMinutes(1))
                .servicio(ServicioEntity.builder().idServicio(URGENCIAS).build()).build());
        Map<String, Object> r2 = service.alterarTurno(pedido(12L, "ASIGNAR", REEMPLAZO));
        assertFalse(r2.containsKey("correccionTurnoPasado"));
        assertEquals(REEMPLAZO, casi.getFuncionario().getIdFuncionario());
    }

    @Test
    void unaNocheQueTerminoEstaMananaYaEsPasada() {
        TurnoEntity noche = existe(turno(10L, URGENCIAS, AYER, 20, null)); // ayer 20:00 a hoy 08:00
        calendario(TITULAR);

        Map<String, Object> r = service.alterarTurno(pedido(10L, "ASIGNAR", TITULAR));

        assertEquals(true, r.get("correccionTurnoPasado"));
        assertEquals(TITULAR, noche.getFuncionario().getIdFuncionario());
    }

    @Test
    void elMedicoTieneQuePertenecerAlServicioDelTurno_tambienEnUnTurnoPasado() {
        TurnoEntity pasado = existe(turno(10L, URGENCIAS, AYER, 8, null));
        when(serviciosFuncionarioRepository.existsByServicio_IdServicioAndFuncionario_IdFuncionarioAndFuncionario_EliminadoFalse(
                URGENCIAS, REEMPLAZO)).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> service.alterarTurno(pedido(10L, "ASIGNAR", REEMPLAZO)));

        assertEquals("El funcionario seleccionado no pertenece al servicio del turno.", ex.getMessage());
        assertNull(pasado.getFuncionario());
        verifyNoInteractions(bitacoraService);
    }

    @Test
    void laSeparacionPorServicio_seMantieneEnUnTurnoPasado() {
        TurnoEntity deOtroServicio = existe(turno(10L, OTRO_SERVICIO, AYER, 8, persona(TITULAR, "Titular")));
        doThrow(new AccessDeniedException("No tienes acceso a datos de otro servicio"))
                .when(seguridadServicio).exigirMismoServicio(OTRO_SERVICIO);

        assertThrows(AccessDeniedException.class, () -> service.alterarTurno(pedido(10L, "REASIGNAR", REEMPLAZO)));

        assertEquals(TITULAR, deOtroServicio.getFuncionario().getIdFuncionario());
        verifyNoInteractions(bitacoraService);
    }

    @Test
    void losAvisosALasPersonasHablanDeUnaCorreccion_noDeUnaAsignacionNueva() {
        existe(turno(10L, URGENCIAS, AYER, 8, persona(TITULAR, "Titular")));
        calendario(REEMPLAZO);

        service.alterarTurno(pedido(10L, "REASIGNAR", REEMPLAZO));

        ArgumentCaptor<String> mensajes = ArgumentCaptor.forClass(String.class);
        verify(notificacionService, times(2)).crearNotificacionSistema(any(FuncionarioEntity.class), mensajes.capture());
        assertTrue(mensajes.getAllValues().stream().anyMatch(m -> m.startsWith("Se corrigió el registro del turno")), mensajes.getAllValues().toString());
        assertTrue(mensajes.getAllValues().stream().anyMatch(m -> m.startsWith("Se registró que hiciste el turno")), mensajes.getAllValues().toString());
    }
}
