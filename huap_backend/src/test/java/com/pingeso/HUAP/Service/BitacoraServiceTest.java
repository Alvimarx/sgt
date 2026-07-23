package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.BitacoraResponseDTO;
import com.pingeso.HUAP.Entity.*;
import com.pingeso.HUAP.Repository.BitacoraRepository;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.OfertaGeneralRepository;
import com.pingeso.HUAP.Repository.SolicitudRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Pruebas unitarias de {@link BitacoraService}. Estilo Mockito puro, sin contexto Spring.
 * Foco en {@code convertToDTO} (la lógica más frágil: enriquecimiento condicional desde
 * "idOferta=X" en el motivo) y en el contrato de {@code registrarEvento}/{@code registrarEventoOferta}
 * de nunca propagar una excepción hacia la transacción que los llama.
 */
class BitacoraServiceTest {

    private final BitacoraRepository bitacoraRepository = mock(BitacoraRepository.class);
    private final SolicitudRepository solicitudRepository = mock(SolicitudRepository.class);
    private final FuncionarioRepository funcionarioRepository = mock(FuncionarioRepository.class);
    private final OfertaGeneralRepository ofertaGeneralRepository = mock(OfertaGeneralRepository.class);

    private final BitacoraService service = new BitacoraService(
            bitacoraRepository, solicitudRepository, funcionarioRepository, ofertaGeneralRepository);

    private static FuncionarioEntity funcionario(long id, String nombre, String apelPat) {
        return FuncionarioEntity.builder().idFuncionario(id).nombre(nombre).apelPat(apelPat).build();
    }

    private static TurnoEntity turno(long id) {
        return TurnoEntity.builder().idTurno(id).build();
    }

    // ============================ save ============================

    @Test
    void save_sinFechaModificacionNiActivo_completaDefaults() {
        BitacoraEntity evento = BitacoraEntity.builder().tipoEvento("X").build();
        when(bitacoraRepository.save(any(BitacoraEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        BitacoraEntity guardado = service.save(evento);

        assertNotNull(guardado.getFechaModificacion());
        assertTrue(guardado.getActivo());
    }

    @Test
    void save_conFechaModificacionYActivoYaSeteados_noLosPisa() {
        LocalDateTime fecha = LocalDateTime.of(2020, 1, 1, 0, 0);
        BitacoraEntity evento = BitacoraEntity.builder()
                .tipoEvento("X").fechaModificacion(fecha).activo(false).build();
        when(bitacoraRepository.save(any(BitacoraEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        BitacoraEntity guardado = service.save(evento);

        assertEquals(fecha, guardado.getFechaModificacion());
        assertFalse(guardado.getActivo());
    }

    // ============================ convertToDTO ============================

    @Test
    void convertToDTO_eventoSimpleSinSolicitudNiTurnoNiMotivo_noExplotaYCamposQuedanNull() {
        BitacoraEntity evento = BitacoraEntity.builder()
                .idEvento(1L).tipoEvento("GENERACION_TURNO").activo(true).build();

        BitacoraResponseDTO dto = service.convertToDTO(evento);

        assertEquals("GENERACION_TURNO", dto.getTipoEvento());
        assertNull(dto.getIdFuncionario());
        assertNull(dto.getIdTurno());
        assertNull(dto.getIdSolicitud());
        assertNull(dto.getNombreOferente());
        assertNull(dto.getNombreAsignado());
    }

    @Test
    void convertToDTO_conSolicitud_mapeaEmisorReceptorYTurnosDeLaSolicitud() {
        FuncionarioEntity emisor = funcionario(1L, "Andrés", "Tigre");
        FuncionarioEntity receptor = funcionario(2L, "Álvaro", "López");
        TurnoEntity turnoSolicitud = turno(10L);
        TurnoEntity turnoReceptor = turno(11L);
        SolicitudEntity solicitud = SolicitudEntity.builder()
                .idSolicitud(5L)
                .tipoSolicitud(TipoSolicitudEntity.builder().tipo(4).build())
                .estado(SolicitudEntity.EstadoSolicitud.APROBADA)
                .funcionario(emisor).funcionarioReceptor(receptor)
                .turno(turnoSolicitud).turnoReceptor(turnoReceptor)
                .build();
        BitacoraEntity evento = BitacoraEntity.builder()
                .idEvento(1L).tipoEvento("CAMBIO_ESTADO_APROBADA").solicitud(solicitud).build();

        BitacoraResponseDTO dto = service.convertToDTO(evento);

        assertEquals(5L, dto.getIdSolicitud());
        assertEquals("Intercambio", dto.getTipoSolicitud());
        assertEquals("APROBADA", dto.getEstadoSolicitud());
        assertEquals(1L, dto.getIdFuncionarioEmisor());
        assertEquals("Andrés Tigre", dto.getNombreFuncionarioEmisor());
        assertEquals(2L, dto.getIdFuncionarioReceptor());
        assertEquals("Álvaro López", dto.getNombreFuncionarioReceptor());
        assertEquals(10L, dto.getIdTurnoSolicitud());
        assertEquals(11L, dto.getIdTurnoReceptor());
    }

    @Test
    void convertToDTO_motivoIdOfertaConOfertaExistente_enriqueceNombreOferenteYTurno() {
        FuncionarioEntity ofertor = funcionario(3L, "Fernando", "Roman");
        TurnoEntity turnoOferta = TurnoEntity.builder().idTurno(20L).build();
        OfertaGeneralEntity oferta = OfertaGeneralEntity.builder()
                .idOfertaGeneral(7L).ofertor(ofertor).turno(turnoOferta).build();
        when(ofertaGeneralRepository.findById(7L)).thenReturn(Optional.of(oferta));

        BitacoraEntity evento = BitacoraEntity.builder()
                .idEvento(1L).tipoEvento("OFERTA_GENERAL_APROBADA").motivo("idOferta=7").build();

        BitacoraResponseDTO dto = service.convertToDTO(evento);

        assertEquals("Fernando Roman", dto.getNombreOferente());
        assertNull(dto.getNombreAsignado()); // solo se completa si tipoEvento == OFERTA_GENERAL_CERRADA
    }

    @Test
    void convertToDTO_motivoIdOfertaNoNumerico_noExplotaYNoEnriquece() {
        BitacoraEntity evento = BitacoraEntity.builder()
                .idEvento(1L).tipoEvento("OFERTA_GENERAL_APROBADA").motivo("idOferta=abc").build();

        BitacoraResponseDTO dto = service.convertToDTO(evento);

        assertNull(dto.getNombreOferente());
        verifyNoInteractions(ofertaGeneralRepository);
    }

    @Test
    void convertToDTO_motivoIdOfertaInexistente_noEnriqueceNiExplota() {
        when(ofertaGeneralRepository.findById(999L)).thenReturn(Optional.empty());
        BitacoraEntity evento = BitacoraEntity.builder()
                .idEvento(1L).tipoEvento("OFERTA_GENERAL_APROBADA").motivo("idOferta=999").build();

        BitacoraResponseDTO dto = service.convertToDTO(evento);

        assertNull(dto.getNombreOferente());
    }

    @Test
    void convertToDTO_ofertaGeneralCerrada_completaNombreAsignadoConElPostulanteSeleccionado() {
        FuncionarioEntity ofertor = funcionario(3L, "Fernando", "Roman");
        FuncionarioEntity postulanteNoSeleccionado = funcionario(4L, "Sergio", "González");
        FuncionarioEntity postulanteSeleccionado = funcionario(5L, "Andrés", "Tigre");
        PostulacionEntity postA = PostulacionEntity.builder()
                .idPostulacion(1L).postulante(postulanteNoSeleccionado).seleccionado(false).build();
        PostulacionEntity postB = PostulacionEntity.builder()
                .idPostulacion(2L).postulante(postulanteSeleccionado).seleccionado(true).build();
        OfertaGeneralEntity oferta = OfertaGeneralEntity.builder()
                .idOfertaGeneral(7L).ofertor(ofertor)
                .postulaciones(List.of(postA, postB)).build();
        when(ofertaGeneralRepository.findById(7L)).thenReturn(Optional.of(oferta));

        BitacoraEntity evento = BitacoraEntity.builder()
                .idEvento(1L).tipoEvento("OFERTA_GENERAL_CERRADA").motivo("idOferta=7").build();

        BitacoraResponseDTO dto = service.convertToDTO(evento);

        assertEquals("Andrés Tigre", dto.getNombreAsignado());
    }

    // ============================ registrarEvento / registrarEventoOferta ============================

    @Test
    void registrarEvento_happyPath_guardaConSolicitudYActor() {
        SolicitudEntity solicitud = SolicitudEntity.builder().idSolicitud(5L).build();
        FuncionarioEntity actor = funcionario(9L, "Jefe", "Uno");
        when(solicitudRepository.findById(5L)).thenReturn(Optional.of(solicitud));
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(actor));

        service.registrarEvento("CAMBIO_ESTADO_APROBADA", 5L, 9L);

        verify(bitacoraRepository).save(argThat(log ->
                "CAMBIO_ESTADO_APROBADA".equals(log.getTipoEvento())
                        && log.getSolicitud() == solicitud
                        && log.getFuncionario() == actor
                        && Boolean.TRUE.equals(log.getActivo())));
    }

    @Test
    void registrarEvento_idsNull_guardaSinSolicitudNiActor() {
        service.registrarEvento("RECHAZO_AUTOMATICO", null, null);

        verify(bitacoraRepository).save(argThat(log ->
                log.getSolicitud() == null && log.getFuncionario() == null));
        verifyNoInteractions(solicitudRepository, funcionarioRepository);
    }

    @Test
    void registrarEvento_repositorioLanzaExcepcion_noPropaga() {
        when(solicitudRepository.findById(5L)).thenReturn(Optional.empty());
        when(bitacoraRepository.save(any())).thenThrow(new RuntimeException("BD caída"));

        assertDoesNotThrow(() -> service.registrarEvento("CAMBIO_ESTADO_APROBADA", 5L, null));
    }

    @Test
    void registrarEventoOferta_happyPath_guardaConMotivoIdOfertaYActor() {
        FuncionarioEntity actor = funcionario(9L, "Jefe", "Uno");
        when(funcionarioRepository.findById(9L)).thenReturn(Optional.of(actor));

        service.registrarEventoOferta("OFERTA_GENERAL_APROBADA", 7L, 9L);

        verify(bitacoraRepository).save(argThat(log ->
                "OFERTA_GENERAL_APROBADA".equals(log.getTipoEvento())
                        && "idOferta=7".equals(log.getMotivo())
                        && log.getFuncionario() == actor));
    }

    @Test
    void registrarEventoOferta_repositorioLanzaExcepcion_noPropaga() {
        when(bitacoraRepository.save(any())).thenThrow(new RuntimeException("BD caída"));

        assertDoesNotThrow(() -> service.registrarEventoOferta("OFERTA_GENERAL_APROBADA", 7L, null));
    }

    // ============================ findAllDTO / findByIdDTO ============================

    @Test
    void findAllDTO_delegaAlRepositoryYConvierteCadaUno() {
        BitacoraEntity evento = BitacoraEntity.builder().idEvento(1L).tipoEvento("X").build();
        when(bitacoraRepository.findAll()).thenReturn(List.of(evento));

        List<BitacoraResponseDTO> dtos = service.findAllDTO();

        assertEquals(1, dtos.size());
        assertEquals("X", dtos.get(0).getTipoEvento());
    }

    @Test
    void findByIdDTO_inexistente_devuelveOptionalVacio() {
        when(bitacoraRepository.findById(99L)).thenReturn(Optional.empty());

        assertTrue(service.findByIdDTO(99L).isEmpty());
    }
}