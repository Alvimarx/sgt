package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.CrearOfertaGeneralDTO;
import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.OfertaGeneralEntity;
import com.pingeso.HUAP.Entity.PostulacionEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.OfertaGeneralRepository;
import com.pingeso.HUAP.Repository.PostulacionRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import com.pingeso.HUAP.Security.SeguridadServicio;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static com.pingeso.HUAP.Entity.OfertaGeneralEntity.EstadoOferta.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Pruebas unitarias de {@link OfertaGeneralService} — el flujo de "oferta general" (un
 * funcionario ofrece un turno a todo el servicio y otros postulan), distinto del tipo 5
 * "oferta particular" dentro de {@link SolicitudEntity}. Estilo Mockito puro, sin contexto Spring.
 *
 * <p>El actor (ofertor/jefatura/postulante) ya no se recibe como parámetro de los métodos del
 * service — se deriva de {@link SeguridadServicio#idUsuarioActual()} (identidad del JWT, ver
 * corrección C-02/H-02). {@link #actorAutenticado(long)} configura ese mock por test. Por
 * defecto {@code esAdministrador()} devuelve {@code true} para no activar el nuevo chequeo de
 * alcance por servicio (los turnos de prueba no tienen servicio asociado) — este archivo prueba
 * la lógica de negocio, no la autorización.
 */
class OfertaGeneralServiceTest {

    private final OfertaGeneralRepository ofertaGeneralRepository = mock(OfertaGeneralRepository.class);
    private final PostulacionRepository postulacionRepository = mock(PostulacionRepository.class);
    private final FuncionarioRepository funcionarioRepository = mock(FuncionarioRepository.class);
    private final TurnoRepository turnoRepository = mock(TurnoRepository.class);
    private final BitacoraService bitacoraService = mock(BitacoraService.class);
    private final ValidadorAsignacionTurnoService validadorAsignacion = new ValidadorAsignacionTurnoService();
    private final SeguridadServicio seguridadServicio = mock(SeguridadServicio.class);

    private final OfertaGeneralService service = new OfertaGeneralService(
            ofertaGeneralRepository, postulacionRepository, funcionarioRepository, turnoRepository, bitacoraService,
            validadorAsignacion, seguridadServicio);

    {
        when(seguridadServicio.esAdministrador()).thenReturn(true);
        when(seguridadServicio.idUsuarioActual()).thenReturn(1L);
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

    private static final LocalDate LUNES = LocalDate.of(2026, 6, 8);

    private static TurnoEntity turnoConHorario(long id, LocalDate dia, LocalTime horaInicio, int duracionHoras) {
        LocalDateTime fin = dia.atTime(horaInicio).plusHours(duracionHoras);
        return TurnoEntity.builder()
                .idTurno(id).diaInicioTurno(dia).horaInicio(horaInicio)
                .diaFinalTurno(fin.toLocalDate()).horaFin(fin.toLocalTime())
                .build();
    }

    private static OfertaGeneralEntity oferta(long id, FuncionarioEntity ofertor, TurnoEntity turno,
                                               OfertaGeneralEntity.EstadoOferta estado) {
        return OfertaGeneralEntity.builder()
                .idOfertaGeneral(id).ofertor(ofertor).turno(turno).estado(estado).build();
    }

    private void ofertaSaveDevuelveArgumento() {
        when(ofertaGeneralRepository.save(any(OfertaGeneralEntity.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ============================ crearOferta ============================

    @Test
    void crearOferta_ofertorInexistente_lanzaYNoGuarda() {
        CrearOfertaGeneralDTO dto = new CrearOfertaGeneralDTO();
        dto.setIdFuncionario(1L);
        dto.setIdTurno(1L);
        when(funcionarioRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.crearOferta(dto));
        verify(ofertaGeneralRepository, never()).save(any());
    }

    @Test
    void crearOferta_turnoInexistente_lanzaYNoGuarda() {
        CrearOfertaGeneralDTO dto = new CrearOfertaGeneralDTO();
        dto.setIdFuncionario(1L);
        dto.setIdTurno(1L);
        when(funcionarioRepository.findById(1L)).thenReturn(Optional.of(funcionario(1L)));
        when(turnoRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.crearOferta(dto));
        verify(ofertaGeneralRepository, never()).save(any());
    }

    @Test
    void crearOferta_happyPath_quedaPendienteDeAprobacion() {
        FuncionarioEntity ofertor = funcionario(1L);
        TurnoEntity turno = turno(1L);
        when(funcionarioRepository.findById(1L)).thenReturn(Optional.of(ofertor));
        when(turnoRepository.findById(1L)).thenReturn(Optional.of(turno));
        ofertaSaveDevuelveArgumento();

        CrearOfertaGeneralDTO dto = new CrearOfertaGeneralDTO();
        dto.setIdFuncionario(1L);
        dto.setIdTurno(1L);
        dto.setMotivo("No puedo cubrir este turno");

        OfertaGeneralEntity creada = service.crearOferta(dto);

        assertEquals(PENDIENTE_APROBACION, creada.getEstado());
        assertSame(ofertor, creada.getOfertor());
        assertSame(turno, creada.getTurno());
        assertEquals("No puedo cubrir este turno", creada.getMotivo());
        assertNotNull(creada.getFechaCreacion());
        verify(bitacoraService).registrarEventoOferta(eq("OFERTA_GENERAL_CREADA"), any(), eq(1L));
    }

    // ============================ aprobarOferta ============================

    @Test
    void aprobarOferta_ofertaInexistente_lanza() {
        when(ofertaGeneralRepository.findById(1L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> service.aprobarOferta(1L));
    }

    @Test
    void aprobarOferta_estadoNoPendiente_lanzaYNoGuarda() {
        OfertaGeneralEntity o = oferta(1L, funcionario(1L), turno(1L), ABIERTA);
        when(ofertaGeneralRepository.findById(1L)).thenReturn(Optional.of(o));

        assertThrows(RuntimeException.class, () -> service.aprobarOferta(1L));
        verify(ofertaGeneralRepository, never()).save(any());
    }

    @Test
    void aprobarOferta_happyPath_pasaAAbierta() {
        OfertaGeneralEntity o = oferta(1L, funcionario(1L), turno(1L), PENDIENTE_APROBACION);
        when(ofertaGeneralRepository.findById(1L)).thenReturn(Optional.of(o));
        ofertaSaveDevuelveArgumento();

        actorAutenticado(9L);
        OfertaGeneralEntity resultado = service.aprobarOferta(1L);

        assertEquals(ABIERTA, resultado.getEstado());
        verify(bitacoraService).registrarEventoOferta("OFERTA_GENERAL_APROBADA", 1L, 9L);
    }

    // ============================ rechazarOferta ============================

    @Test
    void rechazarOferta_ofertaInexistente_lanza() {
        when(ofertaGeneralRepository.findById(1L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> service.rechazarOferta(1L));
    }

    @Test
    void rechazarOferta_estadoNoPendiente_lanzaYNoGuarda() {
        OfertaGeneralEntity o = oferta(1L, funcionario(1L), turno(1L), CERRADA);
        when(ofertaGeneralRepository.findById(1L)).thenReturn(Optional.of(o));

        assertThrows(RuntimeException.class, () -> service.rechazarOferta(1L));
        verify(ofertaGeneralRepository, never()).save(any());
    }

    @Test
    void rechazarOferta_happyPath_pasaARechazada() {
        OfertaGeneralEntity o = oferta(1L, funcionario(1L), turno(1L), PENDIENTE_APROBACION);
        when(ofertaGeneralRepository.findById(1L)).thenReturn(Optional.of(o));
        ofertaSaveDevuelveArgumento();

        actorAutenticado(9L);
        OfertaGeneralEntity resultado = service.rechazarOferta(1L);

        assertEquals(RECHAZADA, resultado.getEstado());
        verify(bitacoraService).registrarEventoOferta("OFERTA_GENERAL_RECHAZADA", 1L, 9L);
    }

    // ============================ postular ============================

    @Test
    void postular_ofertaInexistente_lanza() {
        when(ofertaGeneralRepository.findById(1L)).thenReturn(Optional.empty());
        actorAutenticado(2L);
        assertThrows(RuntimeException.class, () -> service.postular(1L));
    }

    @Test
    void postular_ofertaNoAbierta_lanza() {
        OfertaGeneralEntity o = oferta(1L, funcionario(1L), turno(1L), PENDIENTE_APROBACION);
        when(ofertaGeneralRepository.findById(1L)).thenReturn(Optional.of(o));

        actorAutenticado(2L);
        assertThrows(RuntimeException.class, () -> service.postular(1L));
        verify(postulacionRepository, never()).save(any());
    }

    @Test
    void postular_ofertorPostulaASuPropiaOferta_lanza() {
        FuncionarioEntity ofertor = funcionario(1L);
        OfertaGeneralEntity o = oferta(1L, ofertor, turno(1L), ABIERTA);
        when(ofertaGeneralRepository.findById(1L)).thenReturn(Optional.of(o));

        actorAutenticado(1L);
        assertThrows(RuntimeException.class, () -> service.postular(1L));
        verify(postulacionRepository, never()).save(any());
    }

    @Test
    void postular_yaExistePostulacionDelMismoFuncionario_lanza() {
        OfertaGeneralEntity o = oferta(1L, funcionario(1L), turno(1L), ABIERTA);
        when(ofertaGeneralRepository.findById(1L)).thenReturn(Optional.of(o));
        when(postulacionRepository.existsByOfertaGeneral_IdOfertaGeneralAndPostulante_IdFuncionario(1L, 2L))
                .thenReturn(true);

        actorAutenticado(2L);
        assertThrows(RuntimeException.class, () -> service.postular(1L));
        verify(postulacionRepository, never()).save(any());
    }

    @Test
    void postular_funcionarioInexistente_lanza() {
        OfertaGeneralEntity o = oferta(1L, funcionario(1L), turno(1L), ABIERTA);
        when(ofertaGeneralRepository.findById(1L)).thenReturn(Optional.of(o));
        when(postulacionRepository.existsByOfertaGeneral_IdOfertaGeneralAndPostulante_IdFuncionario(1L, 2L))
                .thenReturn(false);
        when(funcionarioRepository.findById(2L)).thenReturn(Optional.empty());

        actorAutenticado(2L);
        assertThrows(RuntimeException.class, () -> service.postular(1L));
        verify(postulacionRepository, never()).save(any());
    }

    @Test
    void postular_happyPath_creaPostulacionNoSeleccionada() {
        OfertaGeneralEntity o = oferta(1L, funcionario(1L), turno(1L), ABIERTA);
        FuncionarioEntity postulante = funcionario(2L);
        when(ofertaGeneralRepository.findById(1L)).thenReturn(Optional.of(o));
        when(postulacionRepository.existsByOfertaGeneral_IdOfertaGeneralAndPostulante_IdFuncionario(1L, 2L))
                .thenReturn(false);
        when(funcionarioRepository.findById(2L)).thenReturn(Optional.of(postulante));
        when(postulacionRepository.save(any(PostulacionEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        actorAutenticado(2L);
        PostulacionEntity creada = service.postular(1L);

        assertSame(o, creada.getOfertaGeneral());
        assertSame(postulante, creada.getPostulante());
        assertFalse(creada.getSeleccionado());
        assertNotNull(creada.getFechaPostulacion());
        verify(bitacoraService).registrarEventoOferta("POSTULACION_CREADA", 1L, 2L);
    }

    // ============================ retirarPostulacion ============================

    @Test
    void retirarPostulacion_postulacionInexistente_lanza() {
        when(postulacionRepository.findById(1L)).thenReturn(Optional.empty());
        actorAutenticado(2L);
        assertThrows(RuntimeException.class, () -> service.retirarPostulacion(1L));
    }

    @Test
    void retirarPostulacion_noEsElTitular_lanzaYNoGuarda() {
        FuncionarioEntity postulante = funcionario(2L);
        PostulacionEntity postulacion = PostulacionEntity.builder()
                .idPostulacion(1L).postulante(postulante)
                .ofertaGeneral(oferta(1L, funcionario(1L), turno(1L), ABIERTA)).build();
        when(postulacionRepository.findById(1L)).thenReturn(Optional.of(postulacion));

        actorAutenticado(999L);
        assertThrows(RuntimeException.class, () -> service.retirarPostulacion(1L));
        verify(ofertaGeneralRepository, never()).save(any());
    }

    @Test
    void retirarPostulacion_ofertaYaNoAbierta_lanzaYNoGuarda() {
        FuncionarioEntity postulante = funcionario(2L);
        OfertaGeneralEntity o = oferta(1L, funcionario(1L), turno(1L), CERRADA);
        PostulacionEntity postulacion = PostulacionEntity.builder()
                .idPostulacion(1L).postulante(postulante).ofertaGeneral(o).build();
        when(postulacionRepository.findById(1L)).thenReturn(Optional.of(postulacion));

        actorAutenticado(2L);
        assertThrows(RuntimeException.class, () -> service.retirarPostulacion(1L));
        verify(ofertaGeneralRepository, never()).save(any());
    }

    @Test
    void retirarPostulacion_happyPath_laQuitaDeLaOfertaYGuarda() {
        FuncionarioEntity postulante = funcionario(2L);
        OfertaGeneralEntity o = oferta(1L, funcionario(1L), turno(1L), ABIERTA);
        PostulacionEntity postulacion = PostulacionEntity.builder()
                .idPostulacion(1L).postulante(postulante).ofertaGeneral(o).build();
        o.getPostulaciones().add(postulacion);
        when(postulacionRepository.findById(1L)).thenReturn(Optional.of(postulacion));
        ofertaSaveDevuelveArgumento();

        actorAutenticado(2L);
        service.retirarPostulacion(1L);

        assertFalse(o.getPostulaciones().contains(postulacion));
        verify(ofertaGeneralRepository).save(o);
        verify(bitacoraService).registrarEventoOferta("POSTULACION_RETIRADA", 1L, 2L);
    }

    // ============================ seleccionarPostulante ============================

    @Test
    void seleccionarPostulante_ofertaInexistente_lanza() {
        when(ofertaGeneralRepository.findByIdForUpdate(1L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> service.seleccionarPostulante(1L, 1L));
    }

    @Test
    void seleccionarPostulante_ofertaNoAbierta_lanza() {
        OfertaGeneralEntity o = oferta(1L, funcionario(1L), turno(1L), PENDIENTE_APROBACION);
        when(ofertaGeneralRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(o));

        assertThrows(RuntimeException.class, () -> service.seleccionarPostulante(1L, 1L));
    }

    @Test
    void seleccionarPostulante_postulacionInexistente_lanza() {
        OfertaGeneralEntity o = oferta(1L, funcionario(1L), turno(1L), ABIERTA);
        when(ofertaGeneralRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(o));
        when(postulacionRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.seleccionarPostulante(1L, 1L));
    }

    @Test
    void seleccionarPostulante_happyPath_asignaTurnoYCierraOferta() {
        TurnoEntity turno = turno(1L);
        OfertaGeneralEntity o = oferta(1L, funcionario(1L), turno, ABIERTA);
        FuncionarioEntity postulante = funcionario(2L);
        PostulacionEntity postulacion = PostulacionEntity.builder()
                .idPostulacion(5L).ofertaGeneral(o).postulante(postulante).seleccionado(false).build();
        when(ofertaGeneralRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(o));
        when(postulacionRepository.findById(5L)).thenReturn(Optional.of(postulacion));
        ofertaSaveDevuelveArgumento();

        actorAutenticado(9L);
        OfertaGeneralEntity resultado = service.seleccionarPostulante(1L, 5L);

        assertSame(postulante, turno.getFuncionario());
        verify(turnoRepository).save(turno);
        assertTrue(postulacion.getSeleccionado());
        verify(postulacionRepository).save(postulacion);
        assertEquals(CERRADA, resultado.getEstado());
        verify(bitacoraService).registrarEventoOferta("OFERTA_GENERAL_CERRADA", 1L, 9L);
    }

    @Test
    void seleccionarPostulante_conPostulacionDeOtraOferta_lanzaYNoMutaElTurno() {
        TurnoEntity turnoDeEstaOferta = turno(1L);
        OfertaGeneralEntity estaOferta = oferta(1L, funcionario(1L), turnoDeEstaOferta, ABIERTA);
        OfertaGeneralEntity otraOferta = oferta(2L, funcionario(3L), turno(2L), ABIERTA);
        FuncionarioEntity postulanteDeOtraOferta = funcionario(4L);
        PostulacionEntity postulacionDeOtraOferta = PostulacionEntity.builder()
                .idPostulacion(99L).ofertaGeneral(otraOferta).postulante(postulanteDeOtraOferta).seleccionado(false).build();
        when(ofertaGeneralRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(estaOferta));
        when(postulacionRepository.findById(99L)).thenReturn(Optional.of(postulacionDeOtraOferta));

        assertThrows(RuntimeException.class, () -> service.seleccionarPostulante(1L, 99L));
        assertNull(turnoDeEstaOferta.getFuncionario());
        verify(turnoRepository, never()).save(any());
        verify(ofertaGeneralRepository, never()).save(any());
    }

    @Test
    void seleccionarPostulante_conConflicto12hParaElPostulante_lanzaYNoAsignaNiCierra() {
        TurnoEntity turnoOfrecido = turnoConHorario(1L, LUNES.plusDays(1), LocalTime.of(8, 0), 12);
        OfertaGeneralEntity o = oferta(1L, funcionario(1L), turnoOfrecido, ABIERTA);
        FuncionarioEntity postulante = funcionario(2L);
        PostulacionEntity postulacion = PostulacionEntity.builder()
                .idPostulacion(5L).ofertaGeneral(o).postulante(postulante).seleccionado(false).build();
        when(ofertaGeneralRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(o));
        when(postulacionRepository.findById(5L)).thenReturn(Optional.of(postulacion));
        // El postulante ya tiene un nocturno de 12h que termina justo cuando empezaría el turno ofrecido.
        TurnoEntity chocaConPostulante = turnoConHorario(61L, LUNES, LocalTime.of(20, 0), 12);
        when(turnoRepository.findByFuncionario_IdFuncionario(2L)).thenReturn(List.of(chocaConPostulante));

        assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> service.seleccionarPostulante(1L, 5L));
        assertNull(turnoOfrecido.getFuncionario(), "no debe asignarse el turno si hay conflicto");
        assertFalse(postulacion.getSeleccionado());
        verify(turnoRepository, never()).save(any());
        verify(ofertaGeneralRepository, never()).save(any());
    }

    // ============================ lecturas ============================

    @Test
    void findByServicio_delegaAlRepository() {
        OfertaGeneralEntity o = oferta(1L, funcionario(1L), turno(1L), ABIERTA);
        when(ofertaGeneralRepository.findByTurno_Servicio_IdServicio(7L)).thenReturn(List.of(o));

        assertEquals(List.of(o), service.findByServicio(7L));
    }

    @Test
    void findByOfertor_delegaAlRepository() {
        OfertaGeneralEntity o = oferta(1L, funcionario(1L), turno(1L), ABIERTA);
        when(ofertaGeneralRepository.findByOfertor_IdFuncionario(1L)).thenReturn(List.of(o));

        assertEquals(List.of(o), service.findByOfertor(1L));
    }
}
