package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.CrearSolicitudDTO;
import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.SolicitudEntity;
import com.pingeso.HUAP.Entity.TipoSolicitudEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.SolicitudRepository;
import com.pingeso.HUAP.Repository.TipoSolicitudRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
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

    private final SolicitudService service = new SolicitudService(
            solicitudRepository, funcionarioRepository, tipoSolicitudRepository, turnoRepository, bitacoraService,
            validadorAsignacion);

    private static FuncionarioEntity funcionario(long id) {
        return FuncionarioEntity.builder().idFuncionario(id).nombre("Func" + id).build();
    }

    private static TurnoEntity turno(long id) {
        return TurnoEntity.builder().idTurno(id).build();
    }

    private static final LocalDate LUNES = LocalDate.of(2026, 6, 8);

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
        when(turnoRepository.findById(50L)).thenReturn(Optional.of(turno(50L)));
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
        when(turnoRepository.findById(70L)).thenReturn(Optional.of(turno(70L))); // turno deseado
        when(turnoRepository.findById(71L)).thenReturn(Optional.of(turno(71L))); // turno propio entregado
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
        when(turnoRepository.findById(80L)).thenReturn(Optional.of(turno(80L)));
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
        when(turnoRepository.findById(70L)).thenReturn(Optional.of(turno(70L)));
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

        assertThrows(RuntimeException.class, () -> service.cambiarEstado(1L, APROBADA, 9L));
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

        SolicitudEntity resultado = service.cambiarEstado(1L, APROBADA, 9L);

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

        service.cambiarEstado(1L, APROBADA, 9L);

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

        SolicitudEntity resultado = service.cambiarEstado(1L, APROBADA, 9L);

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

        service.cambiarEstado(1L, APROBADA, 9L);

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

        assertThrows(RuntimeException.class, () -> service.cambiarEstado(1L, APROBADA, 9L));
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
                .funcionario(emisor).funcionarioReceptor(receptor)
                .turno(turnoDeseado).turnoReceptor(turnoPropio).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));
        when(solicitudRepository.findByTurno_IdTurno(1L)).thenReturn(List.of(solicitud));
        solicitudSaveDevuelveArgumento();

        service.cambiarEstado(1L, APROBADA, 9L);

        assertSame(emisor, turnoDeseado.getFuncionario());
        assertSame(receptor, turnoPropio.getFuncionario());
        verify(turnoRepository).save(turnoDeseado);
        verify(turnoRepository).save(turnoPropio);
    }

    @Test
    void cambiarEstado_tipoIntercambio_aprobada_conTurnoDeseadoNull_lanzaRuntimeException() {
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 4))
                .funcionario(funcionario(5L)).funcionarioReceptor(funcionario(6L))
                .turno(null).turnoReceptor(turno(2L)).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));

        assertThrows(RuntimeException.class, () -> service.cambiarEstado(1L, APROBADA, 9L));
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void cambiarEstado_tipoIntercambio_aprobada_conTurnoPropioNull_lanzaRuntimeException() {
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 4))
                .funcionario(funcionario(5L)).funcionarioReceptor(funcionario(6L))
                .turno(turno(1L)).turnoReceptor(null).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));
        when(solicitudRepository.findByTurno_IdTurno(1L)).thenReturn(List.of(solicitud));

        assertThrows(RuntimeException.class, () -> service.cambiarEstado(1L, APROBADA, 9L));
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void cambiarEstado_tipoOfertaParticular_aprobada_asignaFuncionarioReceptorAlTurno() {
        TurnoEntity turno = turno(1L);
        FuncionarioEntity receptor = funcionario(6L);
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 5))
                .funcionario(funcionario(5L)).funcionarioReceptor(receptor)
                .turno(turno).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));
        when(solicitudRepository.findByTurno_IdTurno(1L)).thenReturn(List.of(solicitud));
        solicitudSaveDevuelveArgumento();

        service.cambiarEstado(1L, APROBADA, 9L);

        assertSame(receptor, turno.getFuncionario());
        verify(turnoRepository).save(turno);
    }

    @Test
    void cambiarEstado_tipoOfertaParticular_aprobada_conTurnoNull_lanzaRuntimeException() {
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).tipoSolicitud(tipoSolicitud(10L, 5))
                .funcionario(funcionario(5L)).funcionarioReceptor(funcionario(6L))
                .turno(null).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));

        assertThrows(RuntimeException.class, () -> service.cambiarEstado(1L, APROBADA, 9L));
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

        SolicitudEntity resultado = service.cambiarEstado(1L, RECHAZADA, 9L);

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

        service.cambiarEstado(1L, APROBADA, 999L);

        verify(bitacoraService).registrarEvento("CAMBIO_ESTADO_APROBADA", 1L, null);
    }

    @Test
    void cambiarEstado_aprobada_rechazaAutomaticamenteSoloLasCompetidorasPendientesDelMismoTurno() {
        TurnoEntity turno = turno(1L);
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

        service.cambiarEstado(1L, APROBADA, 9L);

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
        assertThrows(RuntimeException.class, () -> service.responderOfertaParticular(1L, 6L, true));
    }

    @Test
    void responderOfertaParticular_receptorNoCoincide_lanzaYNoGuarda() {
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).funcionarioReceptor(funcionario(6L)).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        assertThrows(RuntimeException.class, () -> service.responderOfertaParticular(1L, 7L, true));
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void responderOfertaParticular_sinFuncionarioReceptorAsociado_lanzaYNoGuarda() {
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).funcionarioReceptor(null).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        assertThrows(RuntimeException.class, () -> service.responderOfertaParticular(1L, 6L, true));
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void responderOfertaIntercambio_sinFuncionarioReceptorAsociado_lanzaYNoGuarda() {
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).funcionarioReceptor(null).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        assertThrows(RuntimeException.class, () -> service.responderOfertaIntercambio(1L, 6L, true));
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

        SolicitudEntity resultado = service.responderOfertaParticular(1L, 6L, true);

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

        SolicitudEntity resultado = service.responderOfertaParticular(1L, 6L, false);

        assertFalse(resultado.getAceptadoReceptor());
        assertEquals(RECHAZADA, resultado.getEstado());
        verify(bitacoraService).registrarEvento("OFERTA_PARTICULAR_RECHAZADA_POR_RECEPTOR", 1L, 6L);
    }

    // ============================ responderOfertaIntercambio ============================

    @Test
    void responderOfertaIntercambio_solicitudInexistente_lanza() {
        when(solicitudRepository.findById(1L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> service.responderOfertaIntercambio(1L, 6L, true));
    }

    @Test
    void responderOfertaIntercambio_receptorNoCoincide_lanzaYNoGuarda() {
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(1L).funcionarioReceptor(funcionario(6L)).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        assertThrows(RuntimeException.class, () -> service.responderOfertaIntercambio(1L, 7L, true));
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

        SolicitudEntity resultado = service.responderOfertaIntercambio(1L, 6L, true);

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

        SolicitudEntity resultado = service.responderOfertaIntercambio(1L, 6L, false);

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
                .idSolicitud(1L).estado(PENDIENTE).motivo("motivo original").build();
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

        assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> service.cambiarEstado(1L, APROBADA, 9L));
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
                .funcionario(emisor).funcionarioReceptor(receptor)
                .turno(turnoDeseado).turnoReceptor(turnoPropio).estado(PENDIENTE).build();
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(funcionario(9L)));
        // El emisor no tiene otros turnos (queda libre tras entregar turnoPropio) -> sin conflicto para él.
        when(turnoRepository.findByFuncionario_IdFuncionario(5L)).thenReturn(List.of(turnoPropio));
        // El receptor ya tiene un turno de 12h inmediatamente adyacente al que recibiría (turnoPropio).
        TurnoEntity chocaConReceptor = turnoConHorario(70L, LUNES.plusDays(6), LocalTime.of(8, 0), 12);
        when(turnoRepository.findByFuncionario_IdFuncionario(6L)).thenReturn(List.of(turnoDeseado, chocaConReceptor));

        assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> service.cambiarEstado(1L, APROBADA, 9L));
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

        assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> service.responderOfertaParticular(1L, 6L, true));
        assertNull(solicitud.getAceptadoReceptor(), "no debe marcarse aceptado si hay conflicto");
        verify(solicitudRepository, never()).save(any());
    }
}