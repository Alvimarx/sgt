package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.OfertaGeneralEntity;
import com.pingeso.HUAP.Entity.PostulacionEntity;
import com.pingeso.HUAP.Entity.SolicitudEntity;
import com.pingeso.HUAP.Entity.TipoSolicitudEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.OfertaGeneralRepository;
import com.pingeso.HUAP.Repository.PostulacionRepository;
import com.pingeso.HUAP.Repository.SolicitudRepository;
import com.pingeso.HUAP.Repository.TipoSolicitudRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import com.pingeso.HUAP.Security.SeguridadServicio;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static com.pingeso.HUAP.Entity.OfertaGeneralEntity.EstadoOferta.ABIERTA;
import static com.pingeso.HUAP.Entity.OfertaGeneralEntity.EstadoOferta.CERRADA;
import static com.pingeso.HUAP.Entity.OfertaGeneralEntity.EstadoOferta.PENDIENTE_APROBACION;
import static com.pingeso.HUAP.Entity.OfertaGeneralEntity.EstadoOferta.RECHAZADA;
import static com.pingeso.HUAP.Entity.SolicitudEntity.EstadoSolicitud.APROBADA;
import static com.pingeso.HUAP.Entity.SolicitudEntity.EstadoSolicitud.PENDIENTE;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Regla del 23 oct 2026: una solicitud o una oferta general pendiente cuyo turno ya empezó deja de
 * estar vigente y se cierra sola (RECHAZADA con «Venció: el turno ya comenzó», sin migración). Se
 * cierra con la tarea programada, al leer las listas y antes de resolverla, y deja un evento de
 * sistema, sin actor humano, en la bitácora. Mockito puro, con la hora fijada; sin personas ni RUT reales.
 */
class VencimientoPorInicioDelTurnoTest {

    /** Viernes 23 oct 2026, 12:00. */
    private static final LocalDateTime AHORA = LocalDateTime.of(2026, 10, 23, 12, 0);
    private static final LocalDate HOY = AHORA.toLocalDate();
    private static final long RESOLUTOR = 90L;

    private final SolicitudRepository solicitudRepository = mock(SolicitudRepository.class);
    private final FuncionarioRepository funcionarioRepository = mock(FuncionarioRepository.class);
    private final TipoSolicitudRepository tipoSolicitudRepository = mock(TipoSolicitudRepository.class);
    private final TurnoRepository turnoRepository = mock(TurnoRepository.class);
    private final OfertaGeneralRepository ofertaGeneralRepository = mock(OfertaGeneralRepository.class);
    private final PostulacionRepository postulacionRepository = mock(PostulacionRepository.class);
    private final BitacoraService bitacoraService = mock(BitacoraService.class);
    private final SeguridadServicio seguridadServicio = mock(SeguridadServicio.class);

    private final SolicitudService solicitudes = new SolicitudService(
            solicitudRepository, funcionarioRepository, tipoSolicitudRepository, turnoRepository, bitacoraService,
            new ValidadorAsignacionTurnoService(), seguridadServicio) {
        @Override
        LocalDateTime ahora() {
            return AHORA;
        }
    };

    private final OfertaGeneralService ofertas = new OfertaGeneralService(
            ofertaGeneralRepository, postulacionRepository, funcionarioRepository, turnoRepository, bitacoraService,
            new ValidadorAsignacionTurnoService(), seguridadServicio) {
        @Override
        LocalDateTime ahora() {
            return AHORA;
        }
    };

    {
        when(seguridadServicio.esAdministrador()).thenReturn(true);
        when(seguridadServicio.idUsuarioActual()).thenReturn(RESOLUTOR);
        when(solicitudRepository.save(any(SolicitudEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(ofertaGeneralRepository.save(any(OfertaGeneralEntity.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ---------------------------------------------------------------- datos

    private static FuncionarioEntity persona(long id) {
        return FuncionarioEntity.builder().idFuncionario(id).nombre("Funcionario" + id).build();
    }

    /** Turno de 12 horas que parte ese día a esa hora. */
    private static TurnoEntity turno(long id, LocalDate dia, int hora, long idDueno) {
        LocalDateTime inicio = dia.atTime(hora, 0);
        LocalDateTime fin = inicio.plusHours(12);
        return TurnoEntity.builder().idTurno(id)
                .diaInicioTurno(dia).horaInicio(inicio.toLocalTime())
                .diaFinalTurno(fin.toLocalDate()).horaFin(fin.toLocalTime())
                .funcionario(persona(idDueno)).build();
    }

    /** Empezó a las 08:00 de hoy: a las 12:00 va en curso. */
    private static TurnoEntity turnoEmpezado(long id) {
        return turno(id, HOY, 8, 11L);
    }

    /** Empieza mañana. */
    private static TurnoEntity turnoFuturo(long id) {
        return turno(id, HOY.plusDays(1), 8, 11L);
    }

    private static SolicitudEntity solicitud(long id, int tipo, TurnoEntity turno, TurnoEntity turnoReceptor,
                                             SolicitudEntity.EstadoSolicitud estado) {
        return SolicitudEntity.builder().idSolicitud(id)
                .funcionario(persona(11L)).funcionarioReceptor(persona(12L))
                .tipoSolicitud(TipoSolicitudEntity.builder().idTipoSolicitud((long) tipo).tipo(tipo).build())
                .turno(turno).turnoReceptor(turnoReceptor).estado(estado).build();
    }

    /** Las solicitudes pasan por el lock al cerrarse: el mock entrega la misma instancia. */
    private SolicitudEntity enLaBase(SolicitudEntity s) {
        when(solicitudRepository.findById(s.getIdSolicitud())).thenReturn(Optional.of(s));
        when(solicitudRepository.findByIdForUpdate(s.getIdSolicitud())).thenReturn(Optional.of(s));
        return s;
    }

    private static OfertaGeneralEntity oferta(long id, TurnoEntity turno, OfertaGeneralEntity.EstadoOferta estado) {
        return OfertaGeneralEntity.builder().idOfertaGeneral(id).ofertor(persona(11L)).turno(turno)
                .estado(estado).postulaciones(new ArrayList<>()).build();
    }

    private OfertaGeneralEntity enLaBase(OfertaGeneralEntity o) {
        when(ofertaGeneralRepository.findByIdForUpdate(o.getIdOfertaGeneral())).thenReturn(Optional.of(o));
        return o;
    }

    private static void assertVencida(SolicitudEntity s) {
        assertEquals(SolicitudEntity.EstadoSolicitud.RECHAZADA, s.getEstado());
        assertTrue(s.getMotivo().startsWith(SolicitudService.MOTIVO_VENCIDA), s.getMotivo());
    }

    // ============================ Regla 1 · solicitudes: la tarea ============================

    @Test
    void tarea_cierraLasPendientesDeTodosLosTiposCuyoTurnoYaEmpezo() {
        SolicitudEntity permiso = enLaBase(solicitud(1L, 1, turnoEmpezado(101L), null, PENDIENTE));
        SolicitudEntity botar = enLaBase(solicitud(2L, 2, turnoEmpezado(102L), null, PENDIENTE));
        SolicitudEntity cobertura = enLaBase(solicitud(3L, 3, turnoEmpezado(103L), null, PENDIENTE));
        SolicitudEntity intercambio = enLaBase(solicitud(4L, 4, turnoEmpezado(104L), turnoFuturo(105L), PENDIENTE));
        SolicitudEntity particular = enLaBase(solicitud(5L, 5, turnoEmpezado(106L), null, PENDIENTE));
        when(solicitudRepository.findByEstado(PENDIENTE))
                .thenReturn(List.of(permiso, botar, cobertura, intercambio, particular));

        int cerradas = solicitudes.vencerPendientesDeTurnosEmpezados();

        assertEquals(5, cerradas);
        List.of(permiso, botar, cobertura, intercambio, particular).forEach(VencimientoPorInicioDelTurnoTest::assertVencida);
        // Evento de sistema: sin actor humano (idFuncionario null).
        for (long id = 1; id <= 5; id++) {
            verify(bitacoraService).registrarEvento("SOLICITUD_VENCIDA", id, null);
        }
    }

    @Test
    void tarea_cierraElIntercambioSiSoloElTurnoQueSeEntregaYaEmpezo() {
        SolicitudEntity intercambio = enLaBase(solicitud(4L, 4, turnoFuturo(104L), turnoEmpezado(105L), PENDIENTE));
        when(solicitudRepository.findByEstado(PENDIENTE)).thenReturn(List.of(intercambio));

        assertEquals(1, solicitudes.vencerPendientesDeTurnosEmpezados());
        assertVencida(intercambio);
    }

    @Test
    void tarea_noTocaLoQueSigueVigente() {
        SolicitudEntity futura = enLaBase(solicitud(1L, 3, turnoFuturo(101L), null, PENDIENTE));
        SolicitudEntity permisoSinTurno = enLaBase(solicitud(2L, 1, null, null, PENDIENTE));
        SolicitudEntity yaAprobada = enLaBase(solicitud(3L, 2, turnoEmpezado(103L), null, APROBADA));
        when(solicitudRepository.findByEstado(PENDIENTE)).thenReturn(List.of(futura, permisoSinTurno));

        assertEquals(0, solicitudes.vencerPendientesDeTurnosEmpezados());

        assertEquals(PENDIENTE, futura.getEstado());
        assertEquals(PENDIENTE, permisoSinTurno.getEstado());
        assertEquals(APROBADA, yaAprobada.getEstado());
        verify(solicitudRepository, never()).save(any());
        verifyNoInteractions(bitacoraService);
    }

    @Test
    void tarea_unTurnoQueEmpiezaJustoAhoraYaEmpezo_yUnoQueEmpiezaUnMinutoDespuesNo() {
        TurnoEntity justoAhora = turno(101L, HOY, 12, 11L);
        TurnoEntity unMinutoDespues = TurnoEntity.builder().idTurno(102L)
                .diaInicioTurno(HOY).horaInicio(LocalTime.of(12, 1))
                .diaFinalTurno(HOY).horaFin(LocalTime.of(20, 0)).funcionario(persona(11L)).build();
        SolicitudEntity a = enLaBase(solicitud(1L, 2, justoAhora, null, PENDIENTE));
        SolicitudEntity b = enLaBase(solicitud(2L, 2, unMinutoDespues, null, PENDIENTE));
        when(solicitudRepository.findByEstado(PENDIENTE)).thenReturn(List.of(a, b));

        assertEquals(1, solicitudes.vencerPendientesDeTurnosEmpezados());
        assertVencida(a);
        assertEquals(PENDIENTE, b.getEstado());
    }

    @Test
    void tarea_conservaElMotivoOriginal() {
        SolicitudEntity s = enLaBase(solicitud(1L, 2, turnoEmpezado(101L), null, PENDIENTE));
        s.setMotivo("Control médico");
        when(solicitudRepository.findByEstado(PENDIENTE)).thenReturn(List.of(s));

        solicitudes.vencerPendientesDeTurnosEmpezados();

        assertEquals("Venció: el turno ya comenzó · motivo original: Control médico", s.getMotivo());
    }

    @Test
    void tarea_siOtroLaResolvioEntreMedio_noLaPisa() {
        SolicitudEntity s = solicitud(1L, 2, turnoEmpezado(101L), null, PENDIENTE);
        when(solicitudRepository.findByEstado(PENDIENTE)).thenReturn(List.of(s));
        SolicitudEntity yaResuelta = solicitud(1L, 2, turnoEmpezado(101L), null, APROBADA);
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(yaResuelta));

        assertEquals(0, solicitudes.vencerPendientesDeTurnosEmpezados());
        assertEquals(APROBADA, yaResuelta.getEstado());
        verifyNoInteractions(bitacoraService);
    }

    // ============================ Regla 1 · solicitudes: al leer ============================

    @Test
    void alLeerLaLista_laVencidaYaNoSaleComoPendiente_aunqueLaTareaNoHayaCorrido() {
        SolicitudEntity vencida = enLaBase(solicitud(1L, 3, turnoEmpezado(101L), null, PENDIENTE));
        SolicitudEntity vigente = enLaBase(solicitud(2L, 3, turnoFuturo(102L), null, PENDIENTE));
        when(solicitudRepository.findAll()).thenReturn(List.of(vencida, vigente));

        List<SolicitudEntity> lista = solicitudes.findAllSolicitudes();

        assertEquals(2, lista.size());
        assertVencida(vencida);
        assertEquals(PENDIENTE, vigente.getEstado());
        verify(bitacoraService).registrarEvento("SOLICITUD_VENCIDA", 1L, null);
        verify(bitacoraService, never()).registrarEvento(eq("SOLICITUD_VENCIDA"), eq(2L), any());
    }

    @Test
    void alLeerLasListasDeUnaPersona_tambienSeCierran() {
        SolicitudEntity propia = enLaBase(solicitud(1L, 2, turnoEmpezado(101L), null, PENDIENTE));
        when(solicitudRepository.findByFuncionario_IdFuncionario(11L)).thenReturn(List.of(propia));
        SolicitudEntity recibida = enLaBase(solicitud(2L, 5, turnoEmpezado(102L), null, PENDIENTE));
        when(solicitudRepository.findByFuncionarioReceptor_IdFuncionario(12L)).thenReturn(List.of(recibida));

        solicitudes.findByFuncionario(11L);
        solicitudes.findByFuncionarioReceptor(12L);

        assertVencida(propia);
        assertVencida(recibida);
    }

    // ============================ Regla 1 · solicitudes: antes de resolver ============================

    @Test
    void aprobarUnaVencida_409YQuedaCerrada_sinMoverNingunTurno() {
        TurnoEntity turno = turnoEmpezado(101L);
        turno.setFuncionario(null);
        SolicitudEntity s = enLaBase(solicitud(1L, 3, turno, null, PENDIENTE));

        VencidoPorInicioException ex = assertThrows(VencidoPorInicioException.class,
                () -> solicitudes.cambiarEstado(1L, APROBADA));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertVencida(s);
        assertNull(turno.getFuncionario(), "el turno no se asignó");
        verify(turnoRepository, never()).save(any());
        verify(bitacoraService).registrarEvento("SOLICITUD_VENCIDA", 1L, null);
        verify(bitacoraService, never()).registrarEvento(eq("CAMBIO_ESTADO_APROBADA"), any(), any());
    }

    @Test
    void rechazarUnaVencida_tambien409YQuedaComoVencida() {
        SolicitudEntity s = enLaBase(solicitud(1L, 2, turnoEmpezado(101L), null, PENDIENTE));

        assertThrows(VencidoPorInicioException.class, () -> solicitudes.cambiarEstado(1L, SolicitudEntity.EstadoSolicitud.RECHAZADA));

        assertVencida(s);
    }

    @Test
    void elReceptorQueRespondeUnaVencida_409() {
        SolicitudEntity s = enLaBase(solicitud(1L, 5, turnoEmpezado(101L), null, PENDIENTE));
        when(seguridadServicio.idUsuarioActual()).thenReturn(12L); // el receptor

        assertThrows(VencidoPorInicioException.class, () -> solicitudes.responderOfertaParticular(1L, true));

        assertVencida(s);
        assertNull(s.getAceptadoReceptor());
    }

    @Test
    void elEmisorQueCancelaUnaVencida_409YQuedaComoVencida_noComoCancelada() {
        SolicitudEntity s = enLaBase(solicitud(1L, 2, turnoEmpezado(101L), null, PENDIENTE));
        when(seguridadServicio.idUsuarioActual()).thenReturn(11L); // el emisor

        assertThrows(VencidoPorInicioException.class, () -> solicitudes.cancelarSolicitud(1L));

        assertVencida(s);
        verify(bitacoraService, never()).registrarEvento(eq("SOLICITUD_CANCELADA"), any(), any());
    }

    // ============================ Regla 1 · ofertas generales ============================

    @Test
    void tareaDeOfertas_cierraLasPendientesDeAperturaYLasAbiertasCuyoTurnoYaEmpezo_tengaPostulacionesOno() {
        OfertaGeneralEntity pendiente = enLaBase(oferta(1L, turnoEmpezado(101L), PENDIENTE_APROBACION));
        OfertaGeneralEntity abierta = enLaBase(oferta(2L, turnoEmpezado(102L), ABIERTA));
        OfertaGeneralEntity conPostulante = enLaBase(oferta(3L, turnoEmpezado(103L), ABIERTA));
        conPostulante.getPostulaciones().add(PostulacionEntity.builder().idPostulacion(1L).postulante(persona(13L)).build());
        OfertaGeneralEntity futura = enLaBase(oferta(4L, turnoFuturo(104L), ABIERTA));
        OfertaGeneralEntity cerrada = enLaBase(oferta(5L, turnoEmpezado(105L), CERRADA));
        when(ofertaGeneralRepository.findByEstadoIn(List.of(PENDIENTE_APROBACION, ABIERTA)))
                .thenReturn(List.of(pendiente, abierta, conPostulante, futura));

        int cerradas = ofertas.vencerOfertasDeTurnosEmpezados();

        assertEquals(3, cerradas);
        for (OfertaGeneralEntity o : List.of(pendiente, abierta, conPostulante)) {
            assertEquals(RECHAZADA, o.getEstado());
            assertTrue(o.getMotivo().startsWith(OfertaGeneralService.MOTIVO_VENCIDA));
        }
        assertEquals(ABIERTA, futura.getEstado());
        assertEquals(CERRADA, cerrada.getEstado());
        for (long id = 1; id <= 3; id++) {
            verify(bitacoraService).registrarEventoOferta("OFERTA_GENERAL_VENCIDA", id, null);
        }
        verify(bitacoraService, never()).registrarEventoOferta(eq("OFERTA_GENERAL_VENCIDA"), eq(4L), any());
    }

    @Test
    void tareaDeOfertas_conservaElMotivoDeQuienLaPublico() {
        OfertaGeneralEntity o = enLaBase(oferta(1L, turnoEmpezado(101L), ABIERTA));
        o.setMotivo("Congreso");
        when(ofertaGeneralRepository.findByEstadoIn(any())).thenReturn(List.of(o));

        ofertas.vencerOfertasDeTurnosEmpezados();

        assertEquals("Venció: el turno ya comenzó · motivo original: Congreso", o.getMotivo());
    }

    @Test
    void alLeerLasOfertasDelServicio_laVencidaNoSaleAbierta_yElMedicoYaNoLaVe() {
        OfertaGeneralEntity vencida = enLaBase(oferta(1L, turnoEmpezado(101L), ABIERTA));
        OfertaGeneralEntity vigente = enLaBase(oferta(2L, turnoFuturo(102L), ABIERTA));
        when(ofertaGeneralRepository.findByTurno_Servicio_IdServicio(4L)).thenReturn(List.of(vencida, vigente));
        when(seguridadServicio.esAdministrador()).thenReturn(false);
        when(seguridadServicio.esGestionDelServicio()).thenReturn(false);
        when(seguridadServicio.idUsuarioActual()).thenReturn(13L); // un médico que no la publicó

        List<OfertaGeneralEntity> vistas = ofertas.findByServicio(4L);

        assertEquals(List.of(vigente), vistas);
        assertEquals(RECHAZADA, vencida.getEstado());
    }

    @Test
    void alLeerLasOfertasDelServicio_laGestionVeLaVencidaComoCerrada() {
        OfertaGeneralEntity vencida = enLaBase(oferta(1L, turnoEmpezado(101L), PENDIENTE_APROBACION));
        when(ofertaGeneralRepository.findByTurno_Servicio_IdServicio(4L)).thenReturn(List.of(vencida));
        when(seguridadServicio.esAdministrador()).thenReturn(false);
        when(seguridadServicio.esGestionDelServicio()).thenReturn(true);

        List<OfertaGeneralEntity> vistas = ofertas.findByServicio(4L);

        assertEquals(1, vistas.size());
        assertEquals(RECHAZADA, vistas.get(0).getEstado());
        assertTrue(vistas.get(0).getMotivo().startsWith(OfertaGeneralService.MOTIVO_VENCIDA));
    }

    @Test
    void abrirUnaOfertaVencida_409YQuedaCerrada() {
        OfertaGeneralEntity o = enLaBase(oferta(1L, turnoEmpezado(101L), PENDIENTE_APROBACION));

        VencidoPorInicioException ex = assertThrows(VencidoPorInicioException.class, () -> ofertas.aprobarOferta(1L));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertEquals(RECHAZADA, o.getEstado());
        verify(bitacoraService).registrarEventoOferta("OFERTA_GENERAL_VENCIDA", 1L, null);
        verify(bitacoraService, never()).registrarEventoOferta(eq("OFERTA_GENERAL_APROBADA"), any(), any());
    }

    @Test
    void postularAUnaOfertaVencida_409YNoSeGuardaLaPostulacion() {
        OfertaGeneralEntity o = enLaBase(oferta(1L, turnoEmpezado(101L), ABIERTA));
        when(seguridadServicio.idUsuarioActual()).thenReturn(13L);

        assertThrows(VencidoPorInicioException.class, () -> ofertas.postular(1L));

        assertEquals(RECHAZADA, o.getEstado());
        verify(postulacionRepository, never()).save(any());
    }

    @Test
    void elegirPostulanteDeUnaOfertaVencida_409YElTurnoNoCambiaDeDueno() {
        TurnoEntity turno = turnoEmpezado(101L);
        OfertaGeneralEntity o = enLaBase(oferta(1L, turno, ABIERTA));

        assertThrows(VencidoPorInicioException.class, () -> ofertas.seleccionarPostulante(1L, 7L));

        assertEquals(RECHAZADA, o.getEstado());
        assertEquals(11L, turno.getFuncionario().getIdFuncionario());
        verify(turnoRepository, never()).save(any());
    }

    @Test
    void retirarUnaOfertaVencida_409YQuedaVencida_noRetirada() {
        OfertaGeneralEntity o = enLaBase(oferta(1L, turnoEmpezado(101L), ABIERTA));
        when(seguridadServicio.idUsuarioActual()).thenReturn(11L); // quien la publicó

        assertThrows(VencidoPorInicioException.class, () -> ofertas.retirarOferta(1L));

        assertEquals(RECHAZADA, o.getEstado());
        verify(bitacoraService, never()).registrarEventoOferta(eq("OFERTA_GENERAL_RETIRADA"), any(), any());
    }

    // ============================ La tarea programada ============================

    @Test
    void laTareaProgramada_correLasDosMitades_yUnFalloNoImpideLaOtra() {
        SolicitudService soloFalla = mock(SolicitudService.class);
        OfertaGeneralService otra = mock(OfertaGeneralService.class);
        when(soloFalla.vencerPendientesDeTurnosEmpezados()).thenThrow(new IllegalStateException("base caída"));
        when(otra.vencerOfertasDeTurnosEmpezados()).thenReturn(2);

        new VencimientoProgramado(soloFalla, otra).ejecutar();

        verify(soloFalla).vencerPendientesDeTurnosEmpezados();
        verify(otra).vencerOfertasDeTurnosEmpezados();
    }
}
