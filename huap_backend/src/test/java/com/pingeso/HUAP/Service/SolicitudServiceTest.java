package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.CrearSolicitudDTO;
import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.SolicitudEntity;
import com.pingeso.HUAP.Entity.TipoSolicitudEntity;
import com.pingeso.HUAP.Entity.TipoTurnoEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.SolicitudRepository;
import com.pingeso.HUAP.Repository.TipoSolicitudRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import com.pingeso.HUAP.Security.SeguridadServicio;
import com.pingeso.HUAP.Utils.FormatoFecha;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static com.pingeso.HUAP.Entity.SolicitudEntity.EstadoSolicitud.APROBADA;
import static com.pingeso.HUAP.Entity.SolicitudEntity.EstadoSolicitud.PENDIENTE;
import static com.pingeso.HUAP.Entity.SolicitudEntity.EstadoSolicitud.RECHAZADA;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Pruebas unitarias completas de {@link SolicitudService}: creación, cambio de estado (con las
 * 5 ramas por tipo y el rechazo automático de competidoras), respuesta del receptor a ofertas,
 * modificación de motivo y las lecturas de delegación directa al repositorio.
 * Estilo Mockito puro, sin contexto Spring.
 *
 * <p>El actor (emisor/receptor/asignador) ya no se recibe como parámetro de los métodos del
 * service — se deriva de {@link SeguridadServicio#idUsuarioActual()} (identidad del JWT, ver
 * corrección C-02). {@link #actorAutenticado(long)} configura ese mock por test, reemplazando
 * el antiguo argumento numérico final de cada llamada. Por defecto {@code esAdministrador()}
 * devuelve {@code true} para no activar el nuevo chequeo de alcance por servicio
 * (H-01/H-07), que no es el foco de este archivo — el service en sí valida ese alcance
 * (ver {@link SolicitudService#cambiarEstado}), y aquí se prueba solo la lógica de negocio
 * por tipo de solicitud, no la autorización.
 */
class SolicitudServiceTest {

    private static final long ID_FUNCIONARIO = 1L;
    private static final long ID_TIPO_SOLICITUD = 10L;
    private static final long ID_SOLICITUD_GUARDADA = 100L;

    private final SolicitudRepository solicitudRepository = mock(SolicitudRepository.class);
    private final FuncionarioRepository funcionarioRepository = mock(FuncionarioRepository.class);
    private final TipoSolicitudRepository tipoSolicitudRepository = mock(TipoSolicitudRepository.class);
    private final TurnoRepository turnoRepository = mock(TurnoRepository.class);
    private final BitacoraService bitacoraService = mock(BitacoraService.class);
    private final ValidadorAsignacionTurnoService validadorAsignacion = new ValidadorAsignacionTurnoService();
    private final SeguridadServicio seguridadServicio = mock(SeguridadServicio.class);

    private final SolicitudService service = new SolicitudService(
            solicitudRepository, funcionarioRepository, tipoSolicitudRepository, turnoRepository, bitacoraService,
            validadorAsignacion, seguridadServicio);

    {
        when(seguridadServicio.esAdministrador()).thenReturn(true);
        when(seguridadServicio.idUsuarioActual()).thenReturn(ID_FUNCIONARIO);
    }

    /** Configura el actor autenticado (antes, el parámetro final de cada método del service). */
    private void actorAutenticado(long id) {
        when(seguridadServicio.idUsuarioActual()).thenReturn(id);
    }

    private static FuncionarioEntity funcionario(long id) {
        return FuncionarioEntity.builder().idFuncionario(id).nombre("Func" + id).build();
    }

    private static TurnoEntity turno(long id) {
        return TurnoEntity.builder().idTurno(id).build();
    }

    /** Turno asignado a un funcionario (S-01: botar, ceder o entregar exige que el turno sea propio). */
    private static TurnoEntity turnoDe(long id, long idFuncionario) {
        return TurnoEntity.builder().idTurno(id).funcionario(funcionario(idFuncionario)).build();
    }

    private static com.pingeso.HUAP.Entity.ServicioEntity servicio(long id) {
        return com.pingeso.HUAP.Entity.ServicioEntity.builder().idServicio(id).nombre("Servicio" + id).build();
    }

    private static TurnoEntity turnoDeServicio(long id, com.pingeso.HUAP.Entity.ServicioEntity servicio) {
        return TurnoEntity.builder().idTurno(id).servicio(servicio).build();
    }

    /** Autentica como un actor NO administrador, con servicio de sesión explícito (para probar el scoping real). */
    private void actorNoAdministrador(long id, long servicioSesionId) {
        when(seguridadServicio.idUsuarioActual()).thenReturn(id);
        when(seguridadServicio.esAdministrador()).thenReturn(false);
        when(seguridadServicio.idServicioActual()).thenReturn(servicioSesionId);
    }

    /**
     * Un lunes futuro: crear una solicitud sobre un turno que ya empezó responde 409 (§5.1), así
     * que las pruebas de calendario al crear necesitan turnos que todavía no empiezan.
     */
    private static final LocalDate LUNES = LocalDate.now()
            .with(java.time.temporal.TemporalAdjusters.next(java.time.DayOfWeek.MONDAY)).plusWeeks(1);

    /** Turno con horario real, de la duración indicada, para activar las validaciones de calendario. */
    private static TurnoEntity turnoConHorario(long id, LocalDate dia, LocalTime horaInicio, int duracionHoras) {
        LocalDateTime fin = dia.atTime(horaInicio).plusHours(duracionHoras);
        return TurnoEntity.builder()
                .idTurno(id).diaInicioTurno(dia).horaInicio(horaInicio)
                .diaFinalTurno(fin.toLocalDate()).horaFin(fin.toLocalTime())
                .build();
    }

    private static TipoSolicitudEntity tipoSolicitud(long id, int tipo) {
        return TipoSolicitudEntity.builder().idTipoSolicitud(id).tipo(tipo).build();
    }

    /** save() devuelve el mismo argumento, asignándole un id si no tenía (simula el AUTO_INCREMENT real). */
    private void saveAsignaId() {
        when(solicitudRepository.save(any(SolicitudEntity.class))).thenAnswer(inv -> {
            SolicitudEntity s = inv.getArgument(0);
            if (s.getIdSolicitud() == null) {
                s.setIdSolicitud(ID_SOLICITUD_GUARDADA);
            }
            return s;
        });
    }

    private void mockFuncionarioYTipo(int tipo) {
        when(funcionarioRepository.findById(ID_FUNCIONARIO)).thenReturn(Optional.of(funcionario(ID_FUNCIONARIO)));
        when(tipoSolicitudRepository.findById(ID_TIPO_SOLICITUD)).thenReturn(Optional.of(tipoSolicitud(ID_TIPO_SOLICITUD, tipo)));
    }

    private CrearSolicitudDTO dtoBase() {
        CrearSolicitudDTO dto = new CrearSolicitudDTO();
        dto.setIdFuncionario(ID_FUNCIONARIO);
        dto.setIdTipoSolicitud(ID_TIPO_SOLICITUD);
        dto.setMotivo("Motivo de prueba");
        return dto;
    }

    // ============================ Tipo 1: Permiso ============================

    @Test
    void crear_tipoPermiso_conFechasYSinTurnoNiReceptor_quedaPendiente() {
        mockFuncionarioYTipo(1);
        saveAsignaId();

        CrearSolicitudDTO dto = dtoBase();
        LocalDateTime inicio = LocalDateTime.of(2026, 8, 1, 0, 0);
        LocalDateTime termino = LocalDateTime.of(2026, 8, 5, 0, 0);
        dto.setFechaInicioPermiso(inicio);
        dto.setFechaTerminoPermiso(termino);

        SolicitudEntity creada = service.crearSolicitud(dto);

        assertEquals(SolicitudEntity.EstadoSolicitud.PENDIENTE, creada.getEstado());
        assertEquals(ID_FUNCIONARIO, creada.getFuncionario().getIdFuncionario());
        assertNull(creada.getTurno());
        assertNull(creada.getTurnoReceptor());
        assertNull(creada.getFuncionarioReceptor());
        assertNull(creada.getAceptadoReceptor());
        assertEquals(inicio, creada.getFechaInicioPermiso());
        assertEquals(termino, creada.getFechaTerminoPermiso());
        assertNotNull(creada.getFechaCreacion());

        verify(bitacoraService).registrarEvento("SOLICITUD_CREADA", ID_SOLICITUD_GUARDADA, ID_FUNCIONARIO);
    }

    // ============================ Tipo 2: Botar turno ============================

    @Test
    void crear_tipoBotarTurno_asociaSoloElTurnoABotar() {
        mockFuncionarioYTipo(2);
        when(turnoRepository.findById(50L)).thenReturn(Optional.of(turnoDe(50L, ID_FUNCIONARIO)));
        saveAsignaId();

        CrearSolicitudDTO dto = dtoBase();
        dto.setIdTurno(50L);

        SolicitudEntity creada = service.crearSolicitud(dto);

        assertEquals(50L, creada.getTurno().getIdTurno());
        assertNull(creada.getTurnoReceptor());
        assertNull(creada.getFuncionarioReceptor());
        assertEquals(SolicitudEntity.EstadoSolicitud.PENDIENTE, creada.getEstado());
    }

    // ============================ Tipo 3: Cobertura ============================

    @Test
    void crear_tipoCobertura_asociaElTurnoACubrir() {
        mockFuncionarioYTipo(3);
        when(turnoRepository.findById(60L)).thenReturn(Optional.of(turno(60L)));
        saveAsignaId();

        CrearSolicitudDTO dto = dtoBase();
        dto.setIdTurno(60L);

        SolicitudEntity creada = service.crearSolicitud(dto);

        assertEquals(60L, creada.getTurno().getIdTurno());
        assertNull(creada.getTurnoReceptor());
        assertNull(creada.getFuncionarioReceptor());
    }

    // ============================ Tipo 4: Intercambio ============================

    @Test
    void crear_tipoIntercambio_asociaTurnoDeseadoTurnoPropioYReceptor() {
        mockFuncionarioYTipo(4);
        when(turnoRepository.findById(70L)).thenReturn(Optional.of(turnoDe(70L, 2L))); // turno deseado
        when(turnoRepository.findById(71L)).thenReturn(Optional.of(turnoDe(71L, ID_FUNCIONARIO))); // turno propio entregado
        when(funcionarioRepository.findById(2L)).thenReturn(Optional.of(funcionario(2L))); // receptor
        saveAsignaId();

        CrearSolicitudDTO dto = dtoBase();
        dto.setIdTurno(70L);
        dto.setIdTurnoIntercambio(71L);
        dto.setIdFuncionarioReceptor(2L);

        SolicitudEntity creada = service.crearSolicitud(dto);

        assertEquals(70L, creada.getTurno().getIdTurno());
        assertEquals(71L, creada.getTurnoReceptor().getIdTurno());
        assertEquals(2L, creada.getFuncionarioReceptor().getIdFuncionario());
    }

    // ============================ Tipo 5: Oferta particular ============================

    @Test
    void crear_tipoOfertaParticular_asociaTurnoYReceptorSinTurnoIntercambio() {
        mockFuncionarioYTipo(5);
        when(turnoRepository.findById(80L)).thenReturn(Optional.of(turnoDe(80L, ID_FUNCIONARIO)));
        when(funcionarioRepository.findById(3L)).thenReturn(Optional.of(funcionario(3L)));
        saveAsignaId();

        CrearSolicitudDTO dto = dtoBase();
        dto.setIdTurno(80L);
        dto.setIdFuncionarioReceptor(3L);

        SolicitudEntity creada = service.crearSolicitud(dto);

        assertEquals(80L, creada.getTurno().getIdTurno());
        assertEquals(3L, creada.getFuncionarioReceptor().getIdFuncionario());
        assertNull(creada.getTurnoReceptor());
    }

    // ============================ Casos borde de existencia ============================

    @Test
    void crear_funcionarioInexistente_lanzaYNoGuarda() {
        when(funcionarioRepository.findById(ID_FUNCIONARIO)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.crearSolicitud(dtoBase()));
        verify(solicitudRepository, never()).save(any());
        verifyNoInteractions(bitacoraService);
    }

    @Test
    void crear_tipoSolicitudInexistente_lanzaYNoGuarda() {
        when(funcionarioRepository.findById(ID_FUNCIONARIO)).thenReturn(Optional.of(funcionario(ID_FUNCIONARIO)));
        when(tipoSolicitudRepository.findById(ID_TIPO_SOLICITUD)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.crearSolicitud(dtoBase()));
        verify(solicitudRepository, never()).save(any());
        verifyNoInteractions(bitacoraService);
    }

    @Test
    void crear_receptorInexistente_quedaNullSinLanzar() {
        mockFuncionarioYTipo(5);
        when(funcionarioRepository.findById(999L)).thenReturn(Optional.empty());
        saveAsignaId();

        CrearSolicitudDTO dto = dtoBase();
        dto.setIdFuncionarioReceptor(999L);

        SolicitudEntity creada = service.crearSolicitud(dto);

        assertNull(creada.getFuncionarioReceptor());
        assertEquals(SolicitudEntity.EstadoSolicitud.PENDIENTE, creada.getEstado());
    }

    @Test
    void crear_coberturaDuplicadaMismoTurno_lanzaYNoGuarda() {
        mockFuncionarioYTipo(3);
        when(turnoRepository.findById(70L)).thenReturn(Optional.of(turno(70L)));
        when(solicitudRepository.existsByFuncionario_IdFuncionarioAndTurno_IdTurnoAndEstado(
                1L, 70L, SolicitudEntity.EstadoSolicitud.PENDIENTE)).thenReturn(true);

        CrearSolicitudDTO dto = dtoBase();
        dto.setIdTurno(70L);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.crearSolicitud(dto));
        assertTrue(ex.getMessage().startsWith("Ud. ya solicitó este turno"));
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void crear_conSolicitudPendienteDeOtroFuncionario_noBloquea() {
        // El anti-duplicado es por (funcionario, turno): otro postulante NO impide postular.
        mockFuncionarioYTipo(3);
        when(turnoRepository.findById(70L)).thenReturn(Optional.of(turno(70L)));
        when(solicitudRepository.existsByFuncionario_IdFuncionarioAndTurno_IdTurnoAndEstado(
                1L, 70L, SolicitudEntity.EstadoSolicitud.PENDIENTE)).thenReturn(false);
        saveAsignaId();

        CrearSolicitudDTO dto = dtoBase();
        dto.setIdTurno(70L);

        assertNotNull(service.crearSolicitud(dto));
    }

    @Test
    void crear_turnoComprometidoEnOtraSolicitudPendiente_lanzaYNoGuarda() {
        mockFuncionarioYTipo(3);
        when(turnoRepository.findById(70L)).thenReturn(Optional.of(turno(70L)));
        when(solicitudRepository.existsByFuncionario_IdFuncionarioAndTurno_IdTurnoAndEstado(
                anyLong(), anyLong(), any())).thenReturn(false);
        // Ese turno ya está comprometido, aunque no sea como "turno pedido" (p. ej. lo entrega en un cambio).
        when(solicitudRepository.contarPendientesQueInvolucranTurno(
                1L, 70L, SolicitudEntity.EstadoSolicitud.PENDIENTE)).thenReturn(1L);

        CrearSolicitudDTO dto = dtoBase();
        dto.setIdTurno(70L);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.crearSolicitud(dto));
        assertTrue(ex.getMessage().contains("Cancélela desde Solicitudes"));
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void crear_intercambioConElTurnoPropioYaComprometido_lanzaYNoGuarda() {
        mockFuncionarioYTipo(4);
        when(turnoRepository.findById(70L)).thenReturn(Optional.of(turnoDe(70L, 2L)));
        when(turnoRepository.findById(71L)).thenReturn(Optional.of(turnoDe(71L, ID_FUNCIONARIO)));
        when(funcionarioRepository.findById(2L)).thenReturn(Optional.of(funcionario(2L)));
        when(solicitudRepository.existsByFuncionario_IdFuncionarioAndTurno_IdTurnoAndEstado(
                anyLong(), anyLong(), any())).thenReturn(false);
        when(solicitudRepository.contarPendientesQueInvolucranTurno(
                1L, 70L, SolicitudEntity.EstadoSolicitud.PENDIENTE)).thenReturn(0L);
        when(solicitudRepository.contarPendientesQueInvolucranTurno(
                1L, 71L, SolicitudEntity.EstadoSolicitud.PENDIENTE)).thenReturn(1L);

        CrearSolicitudDTO dto = dtoBase();
        dto.setIdTurno(70L);
        dto.setIdTurnoIntercambio(71L);
        dto.setIdFuncionarioReceptor(2L);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.crearSolicitud(dto));
        assertTrue(ex.getMessage().contains("ya está comprometido"));
        verify(solicitudRepository, never()).save(any());
    }

    // ============================ Cancelación por el propio emisor ============================

    @Test
    void cancelar_solicitudPropiaPendiente_quedaRechazadaConMotivoYBitacora() {
        SolicitudEntity propia = SolicitudEntity.builder()
                .idSolicitud(500L)
                .funcionario(funcionario(ID_FUNCIONARIO))
                .estado(SolicitudEntity.EstadoSolicitud.PENDIENTE)
                .motivo("Necesito el día")
                .build();
        when(solicitudRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(propia));
        when(solicitudRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SolicitudEntity resultado = service.cancelarSolicitud(500L);

        assertEquals(SolicitudEntity.EstadoSolicitud.RECHAZADA, resultado.getEstado());
        assertTrue(resultado.getMotivo().startsWith("Cancelada por el solicitante"));
        assertTrue(resultado.getMotivo().contains("Necesito el día"));
    }

    @Test
    void cancelar_solicitudDeOtroFuncionario_lanzaAccessDenied() {
        SolicitudEntity ajena = SolicitudEntity.builder()
                .idSolicitud(501L)
                .funcionario(funcionario(99L))
                .estado(SolicitudEntity.EstadoSolicitud.PENDIENTE)
                .build();
        when(solicitudRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(ajena));

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.cancelarSolicitud(501L));
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void cancelar_solicitudYaResuelta_lanzaYNoGuarda() {
        SolicitudEntity aprobada = SolicitudEntity.builder()
                .idSolicitud(502L)
                .funcionario(funcionario(ID_FUNCIONARIO))
                .estado(SolicitudEntity.EstadoSolicitud.APROBADA)
                .build();
        when(solicitudRepository.findByIdForUpdate(502L)).thenReturn(Optional.of(aprobada));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.cancelarSolicitud(502L));
        assertTrue(ex.getMessage().contains("no se puede cancelar"));
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void crear_turnoInexistente_quedaNullSinLanzar() {
        mockFuncionarioYTipo(2);
        when(turnoRepository.findById(999L)).thenReturn(Optional.empty());
        saveAsignaId();

        CrearSolicitudDTO dto = dtoBase();
        dto.setIdTurno(999L);

        SolicitudEntity creada = service.crearSolicitud(dto);

        assertNull(creada.getTurno());
    }

    @Test
    void crear_turnoIntercambioInexistente_quedaNullSinLanzar() {
        mockFuncionarioYTipo(4);
        when(turnoRepository.findById(70L)).thenReturn(Optional.of(turnoDe(70L, 2L))); // del receptor
        when(turnoRepository.findById(999L)).thenReturn(Optional.empty());
        when(funcionarioRepository.findById(2L)).thenReturn(Optional.of(funcionario(2L)));
        saveAsignaId();

        CrearSolicitudDTO dto = dtoBase();
        dto.setIdTurno(70L);
        dto.setIdTurnoIntercambio(999L);
        dto.setIdFuncionarioReceptor(2L);

        SolicitudEntity creada = service.crearSolicitud(dto);

        assertEquals(70L, creada.getTurno().getIdTurno());
        assertNull(creada.getTurnoReceptor());
    }

    // ============================ cambiarEstado ============================

    private void solicitudSaveDevuelveArgumento() {
        when(solicitudRepository.save(any(SolicitudEntity.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void cambiarEstado_solicitudInexistente_lanzaYNoGuarda() {
        when(solicitudRepository.findById(1L)).thenReturn(Optional.empty());

        actorAutenticado(9L);
        assertThrows(RuntimeException.class, () -> service.cambiarEstado(1L, APROBADA));
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void cambiarEstado_tipoPermiso_aprobada_conTurno_desasignaFuncionarioDelTurno() {
        TurnoEntity turno = turno(1L);
        turno.setFuncionario(funcionario(5L));
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 1))
                .funcionario(funcionario(5L)).turno(turno).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));
        when(solicitudRepository.findByTurno_IdTurno(1L)).thenReturn(List.of(solicitud));
        solicitudSaveDevuelveArgumento();

        actorAutenticado(9L);
        SolicitudEntity resultado = service.cambiarEstado(1L, APROBADA);

        assertNull(turno.getFuncionario());
        verify(turnoRepository).save(turno);
        assertEquals(APROBADA, resultado.getEstado());
        verify(bitacoraService).registrarEvento("CAMBIO_ESTADO_APROBADA", 1L, 9L);
    }

    @Test
    void cambiarEstado_tipoBotarTurno_aprobada_conTurno_desasignaFuncionarioDelTurno() {
        TurnoEntity turno = turno(1L);
        turno.setFuncionario(funcionario(5L));
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 2))
                .funcionario(funcionario(5L)).turno(turno).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));
        when(solicitudRepository.findByTurno_IdTurno(1L)).thenReturn(List.of(solicitud));
        solicitudSaveDevuelveArgumento();

        actorAutenticado(9L);
        service.cambiarEstado(1L, APROBADA);

        assertNull(turno.getFuncionario());
        verify(turnoRepository).save(turno);
    }

    @Test
    void cambiarEstado_tipoPermisoOBotarTurno_aprobada_conTurnoNull_noLanzaNiGuardaTurno() {
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 1))
                .funcionario(funcionario(5L)).turno(null).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));
        solicitudSaveDevuelveArgumento();

        actorAutenticado(9L);
        SolicitudEntity resultado = service.cambiarEstado(1L, APROBADA);

        assertEquals(APROBADA, resultado.getEstado());
        verify(turnoRepository, never()).save(any());
        // Sin turno asociado, rechazarSolicitudesCompetitivas ni siquiera consulta el repo.
        verify(solicitudRepository, never()).findByTurno_IdTurno(any());
    }

    @Test
    void cambiarEstado_tipoCobertura_aprobada_conTurno_asignaFuncionarioEmisorAlTurno() {
        TurnoEntity turno = turno(1L);
        FuncionarioEntity emisor = funcionario(5L);
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 3))
                .funcionario(emisor).turno(turno).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));
        when(solicitudRepository.findByTurno_IdTurno(1L)).thenReturn(List.of(solicitud));
        solicitudSaveDevuelveArgumento();

        actorAutenticado(9L);
        service.cambiarEstado(1L, APROBADA);

        assertSame(emisor, turno.getFuncionario());
        verify(turnoRepository).save(turno);
    }

    @Test
    void cambiarEstado_tipoCobertura_aprobada_conTurnoNull_lanzaRuntimeException() {
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 3))
                .funcionario(funcionario(5L)).turno(null).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));

        actorAutenticado(9L);
        assertThrows(RuntimeException.class, () -> service.cambiarEstado(1L, APROBADA));
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void cambiarEstado_tipoIntercambio_aprobada_intercambiaFuncionariosEntreAmbosTurnos() {
        TurnoEntity turnoDeseado = turno(1L);
        TurnoEntity turnoPropio = turno(2L);
        FuncionarioEntity emisor = funcionario(5L);
        FuncionarioEntity receptor = funcionario(6L);
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 4))
                .funcionario(emisor).funcionarioReceptor(receptor).aceptadoReceptor(true)
                .turno(turnoDeseado).turnoReceptor(turnoPropio).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));
        when(solicitudRepository.findByTurno_IdTurno(1L)).thenReturn(List.of(solicitud));
        solicitudSaveDevuelveArgumento();

        actorAutenticado(9L);
        service.cambiarEstado(1L, APROBADA);

        assertSame(emisor, turnoDeseado.getFuncionario());
        assertSame(receptor, turnoPropio.getFuncionario());
        verify(turnoRepository).save(turnoDeseado);
        verify(turnoRepository).save(turnoPropio);
    }

    @Test
    void cambiarEstado_tipoIntercambio_aprobada_conTurnoDeseadoNull_lanzaRuntimeException() {
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 4))
                .funcionario(funcionario(5L)).funcionarioReceptor(funcionario(6L)).aceptadoReceptor(true)
                .turno(null).turnoReceptor(turno(2L)).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));

        actorAutenticado(9L);
        assertThrows(RuntimeException.class, () -> service.cambiarEstado(1L, APROBADA));
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void cambiarEstado_tipoIntercambio_aprobada_conTurnoPropioNull_lanzaRuntimeException() {
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 4))
                .funcionario(funcionario(5L)).funcionarioReceptor(funcionario(6L)).aceptadoReceptor(true)
                .turno(turno(1L)).turnoReceptor(null).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));
        when(solicitudRepository.findByTurno_IdTurno(1L)).thenReturn(List.of(solicitud));

        actorAutenticado(9L);
        assertThrows(RuntimeException.class, () -> service.cambiarEstado(1L, APROBADA));
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void cambiarEstado_tipoOfertaParticular_aprobada_asignaFuncionarioReceptorAlTurno() {
        TurnoEntity turno = turnoDe(1L, 5L); // S-01 a: sigue siendo del emisor
        FuncionarioEntity receptor = funcionario(6L);
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 5))
                .funcionario(funcionario(5L)).funcionarioReceptor(receptor).aceptadoReceptor(true)
                .turno(turno).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));
        when(solicitudRepository.findByTurno_IdTurno(1L)).thenReturn(List.of(solicitud));
        solicitudSaveDevuelveArgumento();

        actorAutenticado(9L);
        service.cambiarEstado(1L, APROBADA);

        assertSame(receptor, turno.getFuncionario());
        verify(turnoRepository).save(turno);
    }

    @Test
    void cambiarEstado_tipoOfertaParticular_aprobada_conTurnoNull_lanzaRuntimeException() {
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 5))
                .funcionario(funcionario(5L)).funcionarioReceptor(funcionario(6L)).aceptadoReceptor(true)
                .turno(null).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));

        actorAutenticado(9L);
        assertThrows(RuntimeException.class, () -> service.cambiarEstado(1L, APROBADA));
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void cambiarEstado_aRechazadaDirectamente_noMutaTurnosNiConsultaCompetidoras() {
        TurnoEntity turno = turno(1L);
        turno.setFuncionario(funcionario(5L));
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 1))
                .funcionario(funcionario(5L)).turno(turno).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));
        solicitudSaveDevuelveArgumento();

        actorAutenticado(9L);
        SolicitudEntity resultado = service.cambiarEstado(1L, RECHAZADA);

        assertEquals(RECHAZADA, resultado.getEstado());
        assertNotNull(turno.getFuncionario()); // no se toca el turno al rechazar
        verify(turnoRepository, never()).save(any());
        verify(solicitudRepository, never()).findByTurno_IdTurno(any());
        verify(bitacoraService).registrarEvento("CAMBIO_ESTADO_RECHAZADA", 1L, 9L);
    }

    @Test
    void cambiarEstado_asignadorInexistente_agendaBitacoraConIdAsignadorNull() {
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 1))
                .funcionario(funcionario(5L)).turno(null).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(999L)).thenReturn(Optional.empty());
        solicitudSaveDevuelveArgumento();

        actorAutenticado(999L);
        service.cambiarEstado(1L, APROBADA);

        verify(bitacoraService).registrarEvento("CAMBIO_ESTADO_APROBADA", 1L, null);
    }

    @Test
    void cambiarEstado_aprobada_rechazaAutomaticamenteSoloLasCompetidorasPendientesDelMismoTurno() {
        TurnoEntity turno = turnoDe(1L, 5L); // S-01 a: sigue siendo del emisor
        SolicitudEntity aprobada = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 1))
                .funcionario(funcionario(5L)).turno(turno).estado(PENDIENTE).build();
        SolicitudEntity competidoraPendiente = SolicitudEntity.builder()
                .idSolicitud(2L).turno(turno).estado(PENDIENTE).build();
        SolicitudEntity competidoraYaRechazada = SolicitudEntity.builder()
                .idSolicitud(3L).turno(turno).estado(RECHAZADA).build();
        SolicitudEntity competidoraYaAprobada = SolicitudEntity.builder()
                .idSolicitud(4L).turno(turno).estado(APROBADA).build();

        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(aprobada));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(aprobada));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));
        when(solicitudRepository.findByTurno_IdTurno(1L))
                .thenReturn(List.of(aprobada, competidoraPendiente, competidoraYaRechazada, competidoraYaAprobada));
        solicitudSaveDevuelveArgumento();

        actorAutenticado(9L);
        service.cambiarEstado(1L, APROBADA);

        assertEquals(RECHAZADA, competidoraPendiente.getEstado());
        assertEquals("Rechazo automático: Otra solicitud para este turno fue aprobada.", competidoraPendiente.getMotivo());
        assertNull(competidoraYaRechazada.getMotivo()); // no fue tocada, sigue como estaba
        assertEquals(APROBADA, competidoraYaAprobada.getEstado()); // no fue tocada
        verify(solicitudRepository, never()).save(competidoraYaAprobada);
        verify(solicitudRepository, never()).save(competidoraYaRechazada);
        verify(bitacoraService).registrarEvento("RECHAZO_AUTOMATICO", 2L, 9L);
        // La propia solicitud aprobada no debe auto-rechazarse.
        verify(bitacoraService, never()).registrarEvento("RECHAZO_AUTOMATICO", 1L, 9L);
    }

    // ============================ responderOfertaParticular ============================

    @Test
    void responderOfertaParticular_solicitudInexistente_lanza() {
        when(solicitudRepository.findById(1L)).thenReturn(Optional.empty());
        actorAutenticado(6L);
        assertThrows(RuntimeException.class, () -> service.responderOfertaParticular(1L, true));
    }

    @Test
    void responderOfertaParticular_receptorNoCoincide_lanzaYNoGuarda() {
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).funcionarioReceptor(funcionario(6L)).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        actorAutenticado(7L);
        assertThrows(RuntimeException.class, () -> service.responderOfertaParticular(1L, true));
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void responderOfertaParticular_sinFuncionarioReceptorAsociado_lanzaYNoGuarda() {
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).funcionarioReceptor(null).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        actorAutenticado(6L);
        assertThrows(RuntimeException.class, () -> service.responderOfertaParticular(1L, true));
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void responderOfertaIntercambio_sinFuncionarioReceptorAsociado_lanzaYNoGuarda() {
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).funcionarioReceptor(null).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        actorAutenticado(6L);
        assertThrows(RuntimeException.class, () -> service.responderOfertaIntercambio(1L, true));
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void responderOfertaParticular_acepta_marcaAceptadoReceptorYMantienePendiente() {
        FuncionarioEntity receptor = funcionario(6L);
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).funcionarioReceptor(receptor).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(6L)).thenReturn(Optional.of(receptor));
        solicitudSaveDevuelveArgumento();

        actorAutenticado(6L);
        SolicitudEntity resultado = service.responderOfertaParticular(1L, true);

        assertTrue(resultado.getAceptadoReceptor());
        assertEquals(PENDIENTE, resultado.getEstado()); // aceptar NO aprueba, solo registra la intención
        verify(bitacoraService).registrarEvento("OFERTA_PARTICULAR_ACEPTADA_POR_RECEPTOR", 1L, 6L);
    }

    @Test
    void responderOfertaParticular_rechaza_marcaRechazadaYAceptadoReceptorFalse() {
        FuncionarioEntity receptor = funcionario(6L);
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).funcionarioReceptor(receptor).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(6L)).thenReturn(Optional.of(receptor));
        solicitudSaveDevuelveArgumento();

        actorAutenticado(6L);
        SolicitudEntity resultado = service.responderOfertaParticular(1L, false);

        assertFalse(resultado.getAceptadoReceptor());
        assertEquals(RECHAZADA, resultado.getEstado());
        verify(bitacoraService).registrarEvento("OFERTA_PARTICULAR_RECHAZADA_POR_RECEPTOR", 1L, 6L);
    }

    // ============================ responderOfertaIntercambio ============================

    @Test
    void responderOfertaIntercambio_solicitudInexistente_lanza() {
        when(solicitudRepository.findById(1L)).thenReturn(Optional.empty());
        actorAutenticado(6L);
        assertThrows(RuntimeException.class, () -> service.responderOfertaIntercambio(1L, true));
    }

    @Test
    void responderOfertaIntercambio_receptorNoCoincide_lanzaYNoGuarda() {
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).funcionarioReceptor(funcionario(6L)).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        actorAutenticado(7L);
        assertThrows(RuntimeException.class, () -> service.responderOfertaIntercambio(1L, true));
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void responderOfertaIntercambio_acepta_marcaAceptadoReceptorYMantienePendiente() {
        FuncionarioEntity receptor = funcionario(6L);
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).funcionarioReceptor(receptor).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(6L)).thenReturn(Optional.of(receptor));
        solicitudSaveDevuelveArgumento();

        actorAutenticado(6L);
        SolicitudEntity resultado = service.responderOfertaIntercambio(1L, true);

        assertTrue(resultado.getAceptadoReceptor());
        assertEquals(PENDIENTE, resultado.getEstado());
        verify(bitacoraService).registrarEvento("OFERTA_ACEPTADA_POR_RECEPTOR", 1L, 6L);
    }

    @Test
    void responderOfertaIntercambio_rechaza_marcaRechazadaYAceptadoReceptorFalse() {
        FuncionarioEntity receptor = funcionario(6L);
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).funcionarioReceptor(receptor).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(6L)).thenReturn(Optional.of(receptor));
        solicitudSaveDevuelveArgumento();

        actorAutenticado(6L);
        SolicitudEntity resultado = service.responderOfertaIntercambio(1L, false);

        assertFalse(resultado.getAceptadoReceptor());
        assertEquals(RECHAZADA, resultado.getEstado());
        verify(bitacoraService).registrarEvento("OFERTA_RECHAZADA_POR_RECEPTOR", 1L, 6L);
    }

    // ============================ modificarMotivo ============================

    @Test
    void modificarMotivo_solicitudInexistente_lanza() {
        when(solicitudRepository.findById(1L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> service.modificarMotivo(1L, "nuevo motivo"));
    }

    @Test
    void modificarMotivo_pendiente_actualizaYGuarda() {
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).estado(PENDIENTE).motivo("motivo original")
                .funcionario(funcionario(ID_FUNCIONARIO)).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        solicitudSaveDevuelveArgumento();

        SolicitudEntity resultado = service.modificarMotivo(1L, "nuevo motivo");

        assertEquals("nuevo motivo", resultado.getMotivo());
        verify(solicitudRepository).save(solicitud);
    }

    @Test
    void modificarMotivo_aprobada_lanzaYNoGuarda() {
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).estado(APROBADA).motivo("motivo original").build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        assertThrows(RuntimeException.class, () -> service.modificarMotivo(1L, "nuevo motivo"));
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void modificarMotivo_rechazada_lanzaYNoGuarda() {
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).estado(RECHAZADA).motivo("motivo original").build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        assertThrows(RuntimeException.class, () -> service.modificarMotivo(1L, "nuevo motivo"));
        verify(solicitudRepository, never()).save(any());
    }

    // ============================ lecturas (delegación directa al repositorio) ============================

    @Test
    void findAllSolicitudes_delegaAlRepository() {
        SolicitudEntity solicitud = SolicitudEntity.builder().idSolicitud(1L).build();
        when(solicitudRepository.findAll()).thenReturn(List.of(solicitud));

        assertEquals(List.of(solicitud), service.findAllSolicitudes());
    }

    @Test
    void findByFuncionario_delegaAlRepository() {
        SolicitudEntity solicitud = SolicitudEntity.builder().idSolicitud(1L).build();
        when(solicitudRepository.findByFuncionario_IdFuncionario(5L)).thenReturn(List.of(solicitud));

        assertEquals(List.of(solicitud), service.findByFuncionario(5L));
    }

    @Test
    void findByFuncionarioReceptor_delegaAlRepository() {
        SolicitudEntity solicitud = SolicitudEntity.builder().idSolicitud(1L).build();
        when(solicitudRepository.findByFuncionarioReceptor_IdFuncionario(6L)).thenReturn(List.of(solicitud));

        assertEquals(List.of(solicitud), service.findByFuncionarioReceptor(6L));
    }

    @Test
    void findByTipoSolicitud_delegaAlRepository() {
        SolicitudEntity solicitud = SolicitudEntity.builder().idSolicitud(1L).build();
        when(solicitudRepository.findByTipoSolicitud_IdTipoSolicitud(10L)).thenReturn(List.of(solicitud));

        assertEquals(List.of(solicitud), service.findByTipoSolicitud(10L));
    }

    @Test
    void findByTurno_delegaAlRepository() {
        SolicitudEntity solicitud = SolicitudEntity.builder().idSolicitud(1L).build();
        when(solicitudRepository.findByTurno_IdTurno(1L)).thenReturn(List.of(solicitud));

        assertEquals(List.of(solicitud), service.findByTurno(1L));
    }

    // ============================ Validación de turnos de 12 horas consecutivos (corrección funcional) ============================

    @Test
    void crear_tipoCobertura_conConflicto12hParaElEmisor_lanzaYNoGuarda() {
        mockFuncionarioYTipo(3);
        // El emisor (ID_FUNCIONARIO) ya tiene un nocturno de 12h que termina justo cuando empezaría el turno a cubrir.
        TurnoEntity turnoACubrir = turnoConHorario(60L, LUNES.plusDays(1), LocalTime.of(8, 0), 12);
        TurnoEntity nocturnoExistente = turnoConHorario(61L, LUNES, LocalTime.of(20, 0), 12);
        when(turnoRepository.findById(60L)).thenReturn(Optional.of(turnoACubrir));
        when(turnoRepository.findByFuncionario_IdFuncionario(ID_FUNCIONARIO)).thenReturn(List.of(nocturnoExistente));

        CrearSolicitudDTO dto = dtoBase();
        dto.setIdTurno(60L);

        assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class, () -> service.crearSolicitud(dto));
        verify(solicitudRepository, never()).save(any());
    }

    // ============================ RG-27 (A1-07): el cruce nombra el turno que choca ============================

    /** Le pone tipo y servicio a un turno, para que el aviso de cruce los nombre. */
    private static TurnoEntity conTipoYServicio(TurnoEntity turno, String nombreTipo, ServicioEntity servicio) {
        TipoTurnoEntity tipo = new TipoTurnoEntity();
        tipo.setNombre(nombreTipo);
        turno.setTipoTurno(tipo);
        turno.setServicio(servicio);
        return turno;
    }

    @Test
    void crear_tipoCobertura_conCruce_elAvisoNombraElTurnoQueChoca() {
        mockFuncionarioYTipo(3);
        TurnoEntity turnoACubrir = turnoConHorario(60L, LUNES, LocalTime.of(8, 0), 12);
        turnoACubrir.setServicio(servicio(100L));
        // El emisor ya tiene una Noche de otro servicio que se cruza con el turno a cubrir.
        TurnoEntity queChoca = conTipoYServicio(turnoConHorario(61L, LUNES.minusDays(1), LocalTime.of(20, 0), 13),
                "Noche", servicio(200L));
        when(turnoRepository.findById(60L)).thenReturn(Optional.of(turnoACubrir));
        when(turnoRepository.findByFuncionario_IdFuncionario(ID_FUNCIONARIO)).thenReturn(List.of(queChoca));
        CrearSolicitudDTO dto = dtoBase();
        dto.setIdTurno(60L);

        var ex = assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> service.crearSolicitud(dto));

        String citado = FormatoFecha.intervalo(LUNES.minusDays(1).atTime(20, 0), LUNES.atTime(9, 0));
        assertTrue(ex.getMessage().endsWith("que se superpone (Noche de Servicio200, " + citado + ")."), ex.getMessage());
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void cambiarEstado_tipoIntercambio_conCruceParaElReceptor_elAvisoNombraElTurnoQueChoca() {
        TurnoEntity turnoDeseado = turnoConHorario(1L, LUNES, LocalTime.of(8, 0), 12);        // pasará al emisor
        TurnoEntity turnoPropio = turnoConHorario(2L, LUNES.plusDays(5), LocalTime.of(8, 0), 12); // pasará al receptor
        turnoDeseado.setServicio(servicio(100L));
        turnoPropio.setServicio(servicio(100L));
        FuncionarioEntity emisor = funcionario(5L);
        FuncionarioEntity receptor = funcionario(6L);
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 4))
                .funcionario(emisor).funcionarioReceptor(receptor).aceptadoReceptor(true)
                .turno(turnoDeseado).turnoReceptor(turnoPropio).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));
        when(turnoRepository.findByFuncionario_IdFuncionario(5L)).thenReturn(List.of(turnoPropio));
        // El receptor ya tiene un Día, del mismo servicio, que se cruza con el turno que recibiría.
        TurnoEntity chocaConReceptor = conTipoYServicio(
                turnoConHorario(70L, LUNES.plusDays(5), LocalTime.of(14, 0), 8), "Día", servicio(100L));
        when(turnoRepository.findByFuncionario_IdFuncionario(6L)).thenReturn(List.of(turnoDeseado, chocaConReceptor));

        actorAutenticado(9L);
        var ex = assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> service.cambiarEstado(1L, APROBADA));

        String citado = FormatoFecha.intervalo(LUNES.plusDays(5).atTime(14, 0), LUNES.plusDays(5).atTime(22, 0));
        assertTrue(ex.getMessage().endsWith("que se superpone (Día, " + citado + ")."), ex.getMessage());
        verify(turnoRepository, never()).save(any());
    }

    @Test
    void crear_tipoCobertura_sinConflicto_seCreaNormalmente() {
        mockFuncionarioYTipo(3);
        TurnoEntity turnoACubrir = turnoConHorario(60L, LUNES, LocalTime.of(8, 0), 12);
        when(turnoRepository.findById(60L)).thenReturn(Optional.of(turnoACubrir));
        when(turnoRepository.findByFuncionario_IdFuncionario(ID_FUNCIONARIO)).thenReturn(List.of());
        saveAsignaId();

        CrearSolicitudDTO dto = dtoBase();
        dto.setIdTurno(60L);

        assertDoesNotThrow(() -> service.crearSolicitud(dto));
    }

    @Test
    void cambiarEstado_tipoCobertura_revalidaConCalendarioActual_rechazaSiAhoraHayConflicto() {
        // La solicitud se creó cuando no había conflicto, pero al aprobarla el funcionario ya tomó
        // un turno de 12h que ahora choca (revalidación obligatoria y definitiva, corrección 6).
        TurnoEntity turno = turnoConHorario(1L, LUNES.plusDays(1), LocalTime.of(8, 0), 12);
        FuncionarioEntity emisor = funcionario(5L);
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 3))
                .funcionario(emisor).turno(turno).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));
        TurnoEntity nocturnoNuevo = turnoConHorario(61L, LUNES, LocalTime.of(20, 0), 12);
        when(turnoRepository.findByFuncionario_IdFuncionario(5L)).thenReturn(List.of(nocturnoNuevo));

        actorAutenticado(9L);
        assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> service.cambiarEstado(1L, APROBADA));
        verify(turnoRepository, never()).save(any());
        // No debe haber rechazado solicitudes competidoras: la validación aborta ANTES de tocar nada.
        verify(solicitudRepository, never()).findByTurno_IdTurno(any());
    }

    @Test
    void cambiarEstado_tipoIntercambio_conConflicto12hParaElReceptor_lanzaYNoIntercambiaNada() {
        TurnoEntity turnoDeseado = turnoConHorario(1L, LUNES, LocalTime.of(8, 0), 12);   // pasará al emisor
        TurnoEntity turnoPropio = turnoConHorario(2L, LUNES.plusDays(5), LocalTime.of(20, 0), 12); // pasará al receptor
        FuncionarioEntity emisor = funcionario(5L);
        FuncionarioEntity receptor = funcionario(6L);
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 4))
                .funcionario(emisor).funcionarioReceptor(receptor).aceptadoReceptor(true)
                .turno(turnoDeseado).turnoReceptor(turnoPropio).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));
        // El emisor no tiene otros turnos (queda libre tras entregar turnoPropio) -> sin conflicto para él.
        when(turnoRepository.findByFuncionario_IdFuncionario(5L)).thenReturn(List.of(turnoPropio));
        // El receptor ya tiene un turno de 12h inmediatamente adyacente al que recibiría (turnoPropio).
        TurnoEntity chocaConReceptor = turnoConHorario(70L, LUNES.plusDays(6), LocalTime.of(8, 0), 12);
        when(turnoRepository.findByFuncionario_IdFuncionario(6L)).thenReturn(List.of(turnoDeseado, chocaConReceptor));

        actorAutenticado(9L);
        assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> service.cambiarEstado(1L, APROBADA));
        verify(turnoRepository, never()).save(any());
    }

    @Test
    void responderOfertaParticular_acepta_conConflicto12h_lanzaYNoMarcaAceptado() {
        FuncionarioEntity receptor = funcionario(6L);
        TurnoEntity turnoOfrecido = turnoConHorario(1L, LUNES.plusDays(1), LocalTime.of(8, 0), 12);
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).funcionarioReceptor(receptor).turno(turnoOfrecido)
                .tipoSolicitud(tipoSolicitud(10L, 5)).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(6L)).thenReturn(Optional.of(receptor));
        TurnoEntity chocaConReceptor = turnoConHorario(61L, LUNES, LocalTime.of(20, 0), 12);
        when(turnoRepository.findByFuncionario_IdFuncionario(6L)).thenReturn(List.of(chocaConReceptor));

        actorAutenticado(6L);
        assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> service.responderOfertaParticular(1L, true));
        assertNull(solicitud.getAceptadoReceptor(), "no debe marcarse aceptado si hay conflicto");
        verify(solicitudRepository, never()).save(any());
    }

    // ============================ cambiarEstado: alcance por servicio en intercambio (item 3) ============================

    @Test
    void cambiarEstado_intercambio_turnoDeseadoDeA_turnoReceptorDeB_lanzaAccessDenied() {
        ServicioEntity servicioA = servicio(100L);
        ServicioEntity servicioB = servicio(200L);
        TurnoEntity turnoDeseado = turnoDeServicio(1L, servicioA);
        TurnoEntity turnoPropio = turnoDeServicio(2L, servicioB);
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 4))
                .funcionario(funcionario(5L)).funcionarioReceptor(funcionario(6L))
                .turno(turnoDeseado).turnoReceptor(turnoPropio).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        // JEFATURA del servicio A (donde está el turno deseado) — el turno entregado es de B.
        actorNoAdministrador(9L, 100L);

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.cambiarEstado(1L, APROBADA));
        verify(solicitudRepository, never()).findByIdForUpdate(any());
        verify(turnoRepository, never()).save(any());
    }

    @Test
    void cambiarEstado_intercambio_turnoDeseadoEsDeOtroServicio_lanzaAccessDenied() {
        ServicioEntity servicioA = servicio(100L);
        ServicioEntity servicioB = servicio(200L);
        TurnoEntity turnoDeseado = turnoDeServicio(1L, servicioB);
        TurnoEntity turnoPropio = turnoDeServicio(2L, servicioB);
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 4))
                .funcionario(funcionario(5L)).funcionarioReceptor(funcionario(6L))
                .turno(turnoDeseado).turnoReceptor(turnoPropio).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        // JEFATURA del servicio A; ambos turnos del intercambio son del servicio B.
        actorNoAdministrador(9L, 100L);

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.cambiarEstado(1L, APROBADA));
    }

    @Test
    void cambiarEstado_intercambio_ambosTurnosDelServicioDelActor_permitido() {
        ServicioEntity servicioA = servicio(100L);
        TurnoEntity turnoDeseado = turnoDeServicio(1L, servicioA);
        TurnoEntity turnoPropio = turnoDeServicio(2L, servicioA);
        FuncionarioEntity emisor = funcionario(5L);
        FuncionarioEntity receptor = funcionario(6L);
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 4))
                .funcionario(emisor).funcionarioReceptor(receptor).aceptadoReceptor(true)
                .turno(turnoDeseado).turnoReceptor(turnoPropio).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));
        when(solicitudRepository.findByTurno_IdTurno(1L)).thenReturn(List.of(solicitud));
        solicitudSaveDevuelveArgumento();

        // JEFATURA del servicio A, no participante, y AMBOS turnos son del servicio A.
        actorNoAdministrador(9L, 100L);
        SolicitudEntity resultado = service.cambiarEstado(1L, APROBADA);

        assertEquals(APROBADA, resultado.getEstado());
        assertSame(emisor, turnoDeseado.getFuncionario());
        assertSame(receptor, turnoPropio.getFuncionario());
    }

    @Test
    void cambiarEstado_intercambio_administradorNoParticipante_permitido() {
        ServicioEntity servicioA = servicio(100L);
        ServicioEntity servicioB = servicio(200L);
        TurnoEntity turnoDeseado = turnoDeServicio(1L, servicioA);
        TurnoEntity turnoPropio = turnoDeServicio(2L, servicioB);
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 4))
                .funcionario(funcionario(5L)).funcionarioReceptor(funcionario(6L)).aceptadoReceptor(true)
                .turno(turnoDeseado).turnoReceptor(turnoPropio).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));
        when(solicitudRepository.findByTurno_IdTurno(1L)).thenReturn(List.of(solicitud));
        solicitudSaveDevuelveArgumento();

        // ADMINISTRADOR global, no participante: el chequeo de servicio no aplica, aunque
        // los dos turnos del intercambio sean de servicios distintos entre sí.
        when(seguridadServicio.esAdministrador()).thenReturn(true);
        actorAutenticado(9L);

        SolicitudEntity resultado = service.cambiarEstado(1L, APROBADA);
        assertEquals(APROBADA, resultado.getEstado());
    }

    // ============================ cambiarEstado: segregación de funciones completa (item 4) ============================

    /** Oferta particular ya aceptada por el receptor (C-11: sin eso no se aprueba). */
    private SolicitudEntity solicitudOfertaParticular(FuncionarioEntity emisor, FuncionarioEntity receptor, TurnoEntity turno) {
        return SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 5))
                .funcionario(emisor).funcionarioReceptor(receptor).aceptadoReceptor(true)
                .turno(turno).estado(PENDIENTE).build();
    }

    @Test
    void cambiarEstado_emisorIntentaAprobarSuPropiaSolicitud_lanza403_aunqueSeaJefatura() {
        FuncionarioEntity emisor = funcionario(5L);
        FuncionarioEntity receptor = funcionario(6L);
        ServicioEntity servicioA = servicio(100L);
        SolicitudEntity solicitud = solicitudOfertaParticular(emisor, receptor, turnoDeServicio(1L, servicioA));
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        // El emisor es JEFATURA del servicio A (mismo servicio del turno) — el rol no exime.
        actorNoAdministrador(5L, 100L);

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.cambiarEstado(1L, APROBADA));
        verify(solicitudRepository, never()).findByIdForUpdate(any());
    }

    @Test
    void cambiarEstado_receptorJefaturaIntentaAprobarLaOfertaQueLoBeneficia_lanza403() {
        FuncionarioEntity emisor = funcionario(5L);
        FuncionarioEntity receptor = funcionario(6L);
        ServicioEntity servicioA = servicio(100L);
        SolicitudEntity solicitud = solicitudOfertaParticular(emisor, receptor, turnoDeServicio(1L, servicioA));
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        // El receptor (a quien se le asignaría el turno) es JEFATURA del mismo servicio.
        actorNoAdministrador(6L, 100L);

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.cambiarEstado(1L, APROBADA));
    }

    @Test
    void cambiarEstado_receptorSubroganteIntentaAprobar_lanza403() {
        // Nota: SolicitudService no distingue JEFATURA de SUBROGANTE (esa distinción de rol
        // ya se filtra en SecurityConfig/@PreAuthorize); a nivel de service, ambos son
        // simplemente "no ADMINISTRADOR", y el chequeo de participante aplica igual.
        FuncionarioEntity emisor = funcionario(5L);
        FuncionarioEntity receptor = funcionario(6L);
        ServicioEntity servicioA = servicio(100L);
        SolicitudEntity solicitud = solicitudOfertaParticular(emisor, receptor, turnoDeServicio(1L, servicioA));
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        actorNoAdministrador(6L, 100L);

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.cambiarEstado(1L, APROBADA));
    }

    @Test
    void cambiarEstado_receptorAdministradorIntentaAprobarSuPropiaOferta_lanza403() {
        FuncionarioEntity emisor = funcionario(5L);
        FuncionarioEntity receptor = funcionario(6L);
        SolicitudEntity solicitud = solicitudOfertaParticular(emisor, receptor, turno(1L));
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        // El receptor tiene además rol de sistema ADMINISTRADOR: la exención de ADMIN es
        // SOLO para el chequeo de servicio, nunca para el de participación directa.
        when(seguridadServicio.esAdministrador()).thenReturn(true);
        actorAutenticado(6L);

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.cambiarEstado(1L, APROBADA));
        verify(solicitudRepository, never()).findByIdForUpdate(any());
    }

    @Test
    void cambiarEstado_jefaturaAutorizadaNoParticipante_apruebaYQuedaRegistradaComoAprobadorReal() {
        FuncionarioEntity emisor = funcionario(5L);
        FuncionarioEntity receptor = funcionario(6L);
        ServicioEntity servicioA = servicio(100L);
        TurnoEntity turno = turnoDeServicio(1L, servicioA);
        turno.setFuncionario(emisor); // S-01 a: sigue siendo del emisor
        SolicitudEntity solicitud = solicitudOfertaParticular(emisor, receptor, turno);
        FuncionarioEntity jefatura = funcionario(9L);
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(jefatura));
        when(solicitudRepository.findByTurno_IdTurno(1L)).thenReturn(List.of(solicitud));
        solicitudSaveDevuelveArgumento();

        actorNoAdministrador(9L, 100L);
        SolicitudEntity resultado = service.cambiarEstado(1L, APROBADA);

        assertEquals(APROBADA, resultado.getEstado());
        assertSame(receptor, turno.getFuncionario());
        // La bitácora debe registrar al aprobador REAL (9L, quien está autenticado), no a
        // emisor ni receptor.
        verify(bitacoraService).registrarEvento("CAMBIO_ESTADO_APROBADA", 1L, 9L);
    }

    @Test
    void cambiarEstado_administradorNoParticipante_apruebaYQuedaRegistradaComoAprobadorReal() {
        FuncionarioEntity emisor = funcionario(5L);
        FuncionarioEntity receptor = funcionario(6L);
        TurnoEntity turno = turno(1L);
        turno.setFuncionario(emisor); // S-01 a: sigue siendo del emisor
        SolicitudEntity solicitud = solicitudOfertaParticular(emisor, receptor, turno);
        FuncionarioEntity admin = funcionario(99L);
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(99L)).thenReturn(Optional.of(admin));
        when(solicitudRepository.findByTurno_IdTurno(1L)).thenReturn(List.of(solicitud));
        solicitudSaveDevuelveArgumento();

        when(seguridadServicio.esAdministrador()).thenReturn(true);
        actorAutenticado(99L);
        SolicitudEntity resultado = service.cambiarEstado(1L, APROBADA);

        assertEquals(APROBADA, resultado.getEstado());
        verify(bitacoraService).registrarEvento("CAMBIO_ESTADO_APROBADA", 1L, 99L);
    }

    @Test
    void cambiarEstado_dueñoActualDelTurnoDeseadoIntentaAprobar_lanza403() {
        // Caso defensivo: el emisor/receptor no coinciden con el dueño actual del turno, pero
        // ese dueño también tiene un interés directo (perdería o vería alterado su turno) y
        // no debe poder resolver la solicitud.
        FuncionarioEntity emisor = funcionario(5L);
        FuncionarioEntity receptor = funcionario(6L);
        FuncionarioEntity dueñoActual = funcionario(7L);
        TurnoEntity turno = turno(1L);
        turno.setFuncionario(dueñoActual);
        SolicitudEntity solicitud = solicitudOfertaParticular(emisor, receptor, turno);
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        when(seguridadServicio.esAdministrador()).thenReturn(true);
        actorAutenticado(7L);

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.cambiarEstado(1L, APROBADA));
    }

    // ============================ S-01: dueño del turno y solicitudes ya resueltas ============================

    @Test
    void crear_botarPermisoUOfertaParticular_conUnTurnoAjeno_403YNoGuarda() {
        for (int tipo : new int[]{1, 2, 5}) {
            mockFuncionarioYTipo(tipo);
            when(turnoRepository.findById(50L)).thenReturn(Optional.of(turnoDe(50L, 2L)));
            CrearSolicitudDTO dto = dtoBase();
            dto.setIdTurno(50L);
            dto.setIdFuncionarioReceptor(3L);

            org.springframework.security.access.AccessDeniedException ex = assertThrows(
                    org.springframework.security.access.AccessDeniedException.class, () -> service.crearSolicitud(dto),
                    "tipo " + tipo);
            assertEquals("Ese turno no es tuyo: solo puedes liberar o ceder tus propios turnos", ex.getMessage());
        }
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void crear_botar_unCupoLibre_tampocoEsPropio_403() {
        mockFuncionarioYTipo(2);
        when(turnoRepository.findById(50L)).thenReturn(Optional.of(turno(50L)));
        CrearSolicitudDTO dto = dtoBase();
        dto.setIdTurno(50L);

        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> service.crearSolicitud(dto));
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void crear_intercambio_entregandoUnTurnoAjeno_403YNoGuarda() {
        mockFuncionarioYTipo(4);
        when(turnoRepository.findById(70L)).thenReturn(Optional.of(turnoDe(70L, 2L)));
        when(turnoRepository.findById(71L)).thenReturn(Optional.of(turnoDe(71L, 3L))); // no es del emisor
        when(funcionarioRepository.findById(2L)).thenReturn(Optional.of(funcionario(2L)));
        CrearSolicitudDTO dto = dtoBase();
        dto.setIdTurno(70L);
        dto.setIdTurnoIntercambio(71L);
        dto.setIdFuncionarioReceptor(2L);

        org.springframework.security.access.AccessDeniedException ex = assertThrows(
                org.springframework.security.access.AccessDeniedException.class, () -> service.crearSolicitud(dto));
        assertEquals("El turno que ofreces entregar no es tuyo", ex.getMessage());
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void crear_cobertura_noExigeTurnoPropio() {
        mockFuncionarioYTipo(3);
        when(turnoRepository.findById(60L)).thenReturn(Optional.of(turno(60L)));
        saveAsignaId();
        CrearSolicitudDTO dto = dtoBase();
        dto.setIdTurno(60L);

        assertDoesNotThrow(() -> service.crearSolicitud(dto));
    }

    @Test
    void aprobar_botarOPermiso_siElTurnoYaCambioDeDueno_409YNoLoLibera() {
        for (int tipo : new int[]{1, 2}) {
            TurnoEntity turno = turnoDe(1L, 8L); // la jefatura se lo asignó a otra persona entre medio
            SolicitudEntity solicitud = SolicitudEntity.builder()
                    .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, tipo))
                    .funcionario(funcionario(5L)).turno(turno).estado(PENDIENTE).build();
            when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
            when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));

            actorAutenticado(9L);
            org.springframework.web.server.ResponseStatusException ex = assertThrows(
                    org.springframework.web.server.ResponseStatusException.class, () -> service.cambiarEstado(1L, APROBADA),
                    "tipo " + tipo);
            assertEquals(409, ex.getStatusCode().value());
            assertEquals("El turno ya cambió de dueño: la solicitud quedó obsoleta", ex.getReason());
            assertEquals(8L, turno.getFuncionario().getIdFuncionario());
            assertEquals(PENDIENTE, solicitud.getEstado());
        }
        verify(turnoRepository, never()).save(any());
        verify(solicitudRepository, never()).findByTurno_IdTurno(any());
    }

    @Test
    void aprobar_ofertaParticular_siElTurnoYaCambioDeDueno_409YNoLoEntrega() {
        TurnoEntity turno = turnoDe(1L, 8L);
        SolicitudEntity solicitud = solicitudOfertaParticular(funcionario(5L), funcionario(6L), turno);
        solicitud.setAceptadoReceptor(true);
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));

        actorAutenticado(9L);
        org.springframework.web.server.ResponseStatusException ex = assertThrows(
                org.springframework.web.server.ResponseStatusException.class, () -> service.cambiarEstado(1L, APROBADA));
        assertEquals(409, ex.getStatusCode().value());
        assertEquals(8L, turno.getFuncionario().getIdFuncionario());
        verify(turnoRepository, never()).save(any());
    }

    @Test
    void responder_unaSolicitudYaResuelta_409YNoGuarda() {
        for (SolicitudEntity.EstadoSolicitud estado : new SolicitudEntity.EstadoSolicitud[]{APROBADA, RECHAZADA}) {
            SolicitudEntity solicitud = SolicitudEntity.builder()
                    .idSolicitud(1L).funcionarioReceptor(funcionario(6L)).aceptadoReceptor(true).estado(estado).build();
            when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

            actorAutenticado(6L);
            org.springframework.web.server.ResponseStatusException intercambio = assertThrows(
                    org.springframework.web.server.ResponseStatusException.class,
                    () -> service.responderOfertaIntercambio(1L, false));
            assertEquals(409, intercambio.getStatusCode().value());
            assertEquals("Esta solicitud ya fue resuelta: no se puede responder", intercambio.getReason());
            assertThrows(org.springframework.web.server.ResponseStatusException.class,
                    () -> service.responderOfertaParticular(1L, false));
            assertEquals(estado, solicitud.getEstado(), "no cambia de estado");
        }
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void responder_quienNoEsElReceptor_sigueSiendo400AunqueEsteResuelta() {
        // Primero se revisa quién responde (HU-SOL-08, criterio 4) y después el estado.
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).funcionarioReceptor(funcionario(6L)).estado(APROBADA).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        actorAutenticado(7L);
        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.responderOfertaIntercambio(1L, false));
        assertEquals("No eres el receptor de esta solicitud", ex.getMessage());
    }

    @Test
    void rechazarOVolverAPendiente_unaSolicitudYaResuelta_409() {
        TurnoEntity turno = turnoDe(1L, 6L);
        SolicitudEntity aprobada = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 2))
                .funcionario(funcionario(5L)).turno(turno).estado(APROBADA).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(aprobada));

        actorAutenticado(9L);
        for (SolicitudEntity.EstadoSolicitud nuevo : new SolicitudEntity.EstadoSolicitud[]{RECHAZADA, PENDIENTE}) {
            org.springframework.web.server.ResponseStatusException ex = assertThrows(
                    org.springframework.web.server.ResponseStatusException.class, () -> service.cambiarEstado(1L, nuevo));
            assertEquals(409, ex.getStatusCode().value());
            assertEquals("Esta solicitud ya fue resuelta: no se puede cambiar su estado", ex.getReason());
        }
        assertEquals(APROBADA, aprobada.getEstado());
        verify(solicitudRepository, never()).save(any());
    }

    // ============================ C-11: el receptor acepta antes de que se apruebe ============================

    @Test
    void aprobar_intercambioUOfertaParticular_sinLaAceptacionDelReceptor_409YNoMueveTurnos() {
        for (int tipo : new int[]{4, 5}) {
            for (Boolean aceptado : new Boolean[]{null, false}) {
                TurnoEntity turnoDeseado = turnoDe(1L, 6L);
                TurnoEntity turnoPropio = turnoDe(2L, 5L);
                SolicitudEntity solicitud = SolicitudEntity.builder()
                        .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, tipo))
                        .funcionario(funcionario(5L)).funcionarioReceptor(funcionario(6L)).aceptadoReceptor(aceptado)
                        .turno(tipo == 4 ? turnoDeseado : turnoPropio).turnoReceptor(tipo == 4 ? turnoPropio : null)
                        .estado(PENDIENTE).build();
                when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
                when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));

                actorAutenticado(9L);
                org.springframework.web.server.ResponseStatusException ex = assertThrows(
                        org.springframework.web.server.ResponseStatusException.class,
                        () -> service.cambiarEstado(1L, APROBADA), "tipo " + tipo + ", aceptado " + aceptado);
                assertEquals(409, ex.getStatusCode().value());
                assertEquals("El receptor todavía no acepta esta solicitud: no se puede aprobar", ex.getReason());
                assertEquals(PENDIENTE, solicitud.getEstado());
                assertEquals(6L, turnoDeseado.getFuncionario().getIdFuncionario());
                assertEquals(5L, turnoPropio.getFuncionario().getIdFuncionario());
            }
        }
        verify(turnoRepository, never()).save(any());
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void rechazar_unIntercambioQueElReceptorNoHaAceptado_sePermite() {
        // C-11 limita solo la aprobación: la gestión puede rechazar mientras espera al receptor.
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 4))
                .funcionario(funcionario(5L)).funcionarioReceptor(funcionario(6L))
                .turno(turnoDe(1L, 6L)).turnoReceptor(turnoDe(2L, 5L)).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        solicitudSaveDevuelveArgumento();

        actorAutenticado(9L);
        assertEquals(RECHAZADA, service.cambiarEstado(1L, RECHAZADA).getEstado());
        verify(turnoRepository, never()).save(any());
    }

    // ============================ §5.1: la asignación manual cierra las solicitudes pendientes ============================

    @Test
    void cambioManual_rechazaLasPendientesQuePidenOEntreganElTurno_conMotivoYBitacora() {
        SolicitudEntity cobertura = SolicitudEntity.builder().idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 3))
                .funcionario(funcionario(5L)).turno(turno(30L)).estado(PENDIENTE).motivo("Puedo cubrirlo").build();
        SolicitudEntity intercambio = SolicitudEntity.builder().idSolicitud(2L).tipoSolicitud(tipoSolicitud(10L, 4))
                .funcionario(funcionario(6L)).turno(turno(31L)).turnoReceptor(turno(30L)).estado(PENDIENTE).build();
        SolicitudEntity yaAprobada = SolicitudEntity.builder().idSolicitud(3L).tipoSolicitud(tipoSolicitud(10L, 3))
                .funcionario(funcionario(7L)).turno(turno(30L)).estado(APROBADA).build();
        when(solicitudRepository.findByTurno_IdTurno(30L)).thenReturn(List.of(cobertura, yaAprobada));
        when(solicitudRepository.findByTurnoReceptor_IdTurno(30L)).thenReturn(List.of(intercambio));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(cobertura));
        when(solicitudRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(intercambio));
        solicitudSaveDevuelveArgumento();

        int rechazadas = service.rechazarPendientesPorCambioManual(30L, 9L,
                "Rechazo automático: El turno fue asignado manualmente.");

        assertEquals(2, rechazadas);
        assertEquals(RECHAZADA, cobertura.getEstado());
        assertEquals("Rechazo automático: El turno fue asignado manualmente. · motivo original: Puedo cubrirlo",
                cobertura.getMotivo());
        assertEquals(RECHAZADA, intercambio.getEstado());
        assertEquals("Rechazo automático: El turno fue asignado manualmente.", intercambio.getMotivo());
        assertEquals(APROBADA, yaAprobada.getEstado());
        verify(bitacoraService).registrarEvento("RECHAZO_AUTOMATICO", 1L, 9L);
        verify(bitacoraService).registrarEvento("RECHAZO_AUTOMATICO", 2L, 9L);
        verify(bitacoraService, never()).registrarEvento("RECHAZO_AUTOMATICO", 3L, 9L);
    }

    @Test
    void cambioManual_unaQueSeResolvioEntreMedio_noSeToca() {
        SolicitudEntity listada = SolicitudEntity.builder().idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 2))
                .funcionario(funcionario(5L)).turno(turno(30L)).estado(PENDIENTE).build();
        SolicitudEntity yaCancelada = SolicitudEntity.builder().idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 2))
                .funcionario(funcionario(5L)).turno(turno(30L)).estado(RECHAZADA)
                .motivo("Cancelada por el solicitante").build();
        when(solicitudRepository.findByTurno_IdTurno(30L)).thenReturn(List.of(listada));
        when(solicitudRepository.findByTurnoReceptor_IdTurno(30L)).thenReturn(List.of());
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(yaCancelada));

        assertEquals(0, service.rechazarPendientesPorCambioManual(30L, 9L, "Rechazo automático: El turno fue liberado manualmente."));
        assertEquals("Cancelada por el solicitante", yaCancelada.getMotivo());
        verify(solicitudRepository, never()).save(any());
        verifyNoInteractions(bitacoraService);
    }

    // ============================ P-01: al crear, el turno pedido es del receptor y ninguno empezó ============================

    /** Turno de 12 horas desde las 08:00 del día indicado, asignado a esa persona (o libre, con null). */
    private static TurnoEntity turnoDelDia(long id, LocalDate dia, Long idDueno) {
        TurnoEntity t = turnoConHorario(id, dia, LocalTime.of(8, 0), 12);
        t.setFuncionario(idDueno != null ? funcionario(idDueno) : null);
        return t;
    }

    @Test
    void crear_intercambio_pidiendoUnTurnoQueNoEsDelReceptor_409YNoGuarda() {
        mockFuncionarioYTipo(4);
        when(turnoRepository.findById(70L)).thenReturn(Optional.of(turnoDe(70L, 3L))); // es de un tercero
        when(turnoRepository.findById(71L)).thenReturn(Optional.of(turnoDe(71L, ID_FUNCIONARIO)));
        when(funcionarioRepository.findById(2L)).thenReturn(Optional.of(funcionario(2L)));
        CrearSolicitudDTO dto = dtoBase();
        dto.setIdTurno(70L);
        dto.setIdTurnoIntercambio(71L);
        dto.setIdFuncionarioReceptor(2L);

        org.springframework.web.server.ResponseStatusException ex = assertThrows(
                org.springframework.web.server.ResponseStatusException.class, () -> service.crearSolicitud(dto));
        assertEquals(409, ex.getStatusCode().value());
        assertEquals("El turno que pides no es de la persona con quien quieres intercambiar", ex.getReason());
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void crear_intercambio_sinReceptorOSinElTurnoQuePide_400() {
        mockFuncionarioYTipo(4);
        when(turnoRepository.findById(70L)).thenReturn(Optional.of(turnoDe(70L, 2L)));
        when(turnoRepository.findById(71L)).thenReturn(Optional.of(turnoDe(71L, ID_FUNCIONARIO)));
        when(funcionarioRepository.findById(2L)).thenReturn(Optional.of(funcionario(2L)));

        CrearSolicitudDTO sinReceptor = dtoBase();
        sinReceptor.setIdTurno(70L);
        sinReceptor.setIdTurnoIntercambio(71L);
        CrearSolicitudDTO sinTurnoPedido = dtoBase();
        sinTurnoPedido.setIdTurnoIntercambio(71L);
        sinTurnoPedido.setIdFuncionarioReceptor(2L);

        for (CrearSolicitudDTO dto : List.of(sinReceptor, sinTurnoPedido)) {
            org.springframework.web.server.ResponseStatusException ex = assertThrows(
                    org.springframework.web.server.ResponseStatusException.class, () -> service.crearSolicitud(dto));
            assertEquals(400, ex.getStatusCode().value());
            assertEquals("Para un intercambio, indica a la persona y el turno suyo que quieres", ex.getReason());
        }
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void crear_botarCoberturaIntercambioUOfertaParticular_sobreUnTurnoQueYaEmpezo_409() {
        LocalDate ayer = LocalDate.now().minusDays(1);
        when(funcionarioRepository.findById(2L)).thenReturn(Optional.of(funcionario(2L)));
        when(turnoRepository.findById(71L)).thenReturn(Optional.of(turnoDelDia(71L, LUNES, ID_FUNCIONARIO)));
        for (int tipo : new int[]{2, 3, 4, 5}) {
            mockFuncionarioYTipo(tipo);
            // Botar y ceder: un turno propio; cobertura: un cupo libre; intercambio: uno del receptor.
            Long dueno = tipo == 3 ? null : (tipo == 4 ? 2L : ID_FUNCIONARIO);
            when(turnoRepository.findById(50L)).thenReturn(Optional.of(turnoDelDia(50L, ayer, dueno)));
            CrearSolicitudDTO dto = dtoBase();
            dto.setIdTurno(50L);
            if (tipo == 4) dto.setIdTurnoIntercambio(71L);
            if (tipo == 4 || tipo == 5) dto.setIdFuncionarioReceptor(2L);

            org.springframework.web.server.ResponseStatusException ex = assertThrows(
                    org.springframework.web.server.ResponseStatusException.class, () -> service.crearSolicitud(dto),
                    "tipo " + tipo);
            assertEquals(409, ex.getStatusCode().value());
            assertEquals("Ese turno ya empezó", ex.getReason());
        }
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void crear_intercambio_entregandoUnTurnoQueYaEmpezo_409() {
        mockFuncionarioYTipo(4);
        when(turnoRepository.findById(70L)).thenReturn(Optional.of(turnoDelDia(70L, LUNES, 2L)));
        when(turnoRepository.findById(71L)).thenReturn(Optional.of(turnoDelDia(71L, LocalDate.now().minusDays(2), ID_FUNCIONARIO)));
        when(funcionarioRepository.findById(2L)).thenReturn(Optional.of(funcionario(2L)));
        CrearSolicitudDTO dto = dtoBase();
        dto.setIdTurno(70L);
        dto.setIdTurnoIntercambio(71L);
        dto.setIdFuncionarioReceptor(2L);

        org.springframework.web.server.ResponseStatusException ex = assertThrows(
                org.springframework.web.server.ResponseStatusException.class, () -> service.crearSolicitud(dto));
        assertEquals(409, ex.getStatusCode().value());
        assertEquals("El turno que ofreces entregar ya empezó", ex.getReason());
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void crear_permiso_conUnTurnoPropioQueYaEmpezo_noSeLimita() {
        mockFuncionarioYTipo(1);
        when(turnoRepository.findById(50L)).thenReturn(Optional.of(turnoDelDia(50L, LocalDate.now().minusDays(1), ID_FUNCIONARIO)));
        saveAsignaId();
        CrearSolicitudDTO dto = dtoBase();
        dto.setIdTurno(50L);

        assertEquals(PENDIENTE, service.crearSolicitud(dto).getEstado());
    }

    // ============================ HU-SOL-08: el receptor responde una sola vez ============================

    @Test
    void responder_unaVezDada_laRespuestaNoCambia_409() {
        for (Boolean previa : new Boolean[]{true, false}) {
            SolicitudEntity solicitud = SolicitudEntity.builder()
                    .idSolicitud(1L).funcionario(funcionario(5L)).funcionarioReceptor(funcionario(6L))
                    .aceptadoReceptor(previa).estado(PENDIENTE).build(); // aún espera a la jefatura
            when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

            actorAutenticado(6L);
            for (boolean respuesta : new boolean[]{true, false}) {
                for (org.junit.jupiter.api.function.Executable responder : List.<org.junit.jupiter.api.function.Executable>of(
                        () -> service.responderOfertaIntercambio(1L, respuesta),
                        () -> service.responderOfertaParticular(1L, respuesta))) {
                    org.springframework.web.server.ResponseStatusException ex = assertThrows(
                            org.springframework.web.server.ResponseStatusException.class, responder);
                    assertEquals(409, ex.getStatusCode().value());
                    assertEquals("Ya respondiste esta solicitud", ex.getReason());
                }
            }
            assertEquals(previa, solicitud.getAceptadoReceptor());

            // Quien no es el receptor sigue recibiendo el aviso de antes (HU-SOL-08, criterio 4).
            actorAutenticado(7L);
            RuntimeException ajeno = assertThrows(RuntimeException.class, () -> service.responderOfertaIntercambio(1L, true));
            assertEquals("No eres el receptor de esta solicitud", ajeno.getMessage());
        }
        verify(solicitudRepository, never()).save(any());
        verifyNoInteractions(bitacoraService);
    }
}
