package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.*;
import com.pingeso.HUAP.Repository.BitacoraRepository;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.OfertaGeneralRepository;
import com.pingeso.HUAP.Repository.SolicitudRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import com.pingeso.HUAP.Security.SeguridadServicio;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * C-17 (BUG-007, HU-BIT-01 criterio 3): la gestión ve solo los eventos de bitácora de su
 * servicio. Un evento es del servicio de su turno, de su solicitud o del turno de su oferta
 * general; los que no se pueden atribuir (resúmenes de planificación) solo los ve el
 * ADMINISTRADOR.
 */
class BitacoraAlcanceServicioTest {

    private static final long URGENCIAS = 4L;
    private static final long ENFERMERIA = 2L;

    private final BitacoraRepository bitacoraRepository = mock(BitacoraRepository.class);
    private final FuncionarioRepository funcionarioRepository = mock(FuncionarioRepository.class);
    private final OfertaGeneralRepository ofertaGeneralRepository = mock(OfertaGeneralRepository.class);
    private final SeguridadServicio seguridadServicio = mock(SeguridadServicio.class);
    private final TurnoRepository turnoRepository = mock(TurnoRepository.class);

    private final BitacoraService service = new BitacoraService(
            bitacoraRepository, mock(SolicitudRepository.class), funcionarioRepository, ofertaGeneralRepository,
            seguridadServicio, turnoRepository);

    private static ServicioEntity servicio(long id) {
        return ServicioEntity.builder().idServicio(id).nombre("Servicio " + id).build();
    }

    private static TurnoEntity turnoDe(long id, long idServicio) {
        return TurnoEntity.builder().idTurno(id).servicio(servicio(idServicio)).build();
    }

    private static FuncionarioEntity funcionario(long id, long... servicios) {
        FuncionarioEntity f = FuncionarioEntity.builder().idFuncionario(id).nombre("F" + id)
                .serviciosFuncionario(new ArrayList<>()).build();
        for (long s : servicios) f.getServiciosFuncionario().add(new ServiciosFuncionarioEntity(f, servicio(s), null));
        return f;
    }

    private final BitacoraEntity generacionUrgencias = BitacoraEntity.builder().idEvento(1L)
            .tipoEvento("GENERACION_TURNO").turno(turnoDe(100L, URGENCIAS)).build();
    private final BitacoraEntity solicitudEnfermeria = BitacoraEntity.builder().idEvento(2L)
            .tipoEvento("SOLICITUD_CREADA").solicitud(SolicitudEntity.builder().idSolicitud(20L)
                    .funcionario(funcionario(20L, ENFERMERIA)).turno(turnoDe(200L, ENFERMERIA)).build()).build();
    private final BitacoraEntity permisoUrgencias = BitacoraEntity.builder().idEvento(3L)
            .tipoEvento("SOLICITUD_CREADA").solicitud(SolicitudEntity.builder().idSolicitud(21L)
                    .funcionario(funcionario(11L, URGENCIAS)).build()).build();
    private final BitacoraEntity ofertaUrgencias = BitacoraEntity.builder().idEvento(4L)
            .tipoEvento("OFERTA_GENERAL_CREADA").motivo("idOferta=9").build();
    private final BitacoraEntity resumenPlanificacion = BitacoraEntity.builder().idEvento(5L)
            .tipoEvento("GENERACION_PLANIFICACION").observaciones("Vigencia generada").build();

    private final List<BitacoraEntity> todos = List.of(
            generacionUrgencias, solicitudEnfermeria, permisoUrgencias, ofertaUrgencias, resumenPlanificacion);

    {
        OfertaGeneralEntity oferta = OfertaGeneralEntity.builder().idOfertaGeneral(9L).turno(turnoDe(101L, URGENCIAS)).build();
        when(ofertaGeneralRepository.findById(9L)).thenReturn(Optional.of(oferta));
    }

    private void gestionDe(long servicio) {
        when(seguridadServicio.esAdministrador()).thenReturn(false);
        when(seguridadServicio.esGestionDelServicio()).thenReturn(true);
        when(seguridadServicio.idUsuarioActual()).thenReturn(305L);
        when(seguridadServicio.idServicioActual()).thenReturn(servicio);
        doAnswer(inv -> {
            Long pedido = inv.getArgument(0);
            if (pedido == null || pedido != servicio) throw new AccessDeniedException("No tienes acceso a datos de otro servicio");
            return null;
        }).when(seguridadServicio).exigirMismoServicio(any());
    }

    @Test
    void listados_laGestionVeSoloLosEventosDeSuServicio() {
        gestionDe(URGENCIAS);
        when(bitacoraRepository.findAll()).thenReturn(todos);
        when(bitacoraRepository.findByTipoEvento("SOLICITUD_CREADA")).thenReturn(List.of(solicitudEnfermeria, permisoUrgencias));

        assertEquals(List.of(generacionUrgencias, permisoUrgencias, ofertaUrgencias), service.findAll());
        assertEquals(List.of(1L, 3L, 4L), service.findAllDTO().stream().map(d -> d.getIdEvento()).toList());
        assertEquals(List.of(permisoUrgencias), service.findByTipoEvento("SOLICITUD_CREADA"));
    }

    @Test
    void listados_elAdministradorVeTodo_inclusoLoQueNoSeAtribuyeAUnServicio() {
        when(seguridadServicio.esAdministrador()).thenReturn(true);
        when(bitacoraRepository.findAll()).thenReturn(todos);

        assertEquals(todos, service.findAll());
    }

    @Test
    void porId_eventoDeOtroServicioONoAtribuible_403() {
        gestionDe(ENFERMERIA);
        when(bitacoraRepository.findById(1L)).thenReturn(Optional.of(generacionUrgencias));
        when(bitacoraRepository.findById(5L)).thenReturn(Optional.of(resumenPlanificacion));
        when(bitacoraRepository.findById(2L)).thenReturn(Optional.of(solicitudEnfermeria));

        assertThrows(AccessDeniedException.class, () -> service.findById(1L));
        assertThrows(AccessDeniedException.class, () -> service.findByIdDTO(1L));
        assertThrows(AccessDeniedException.class, () -> service.findById(5L));
        assertTrue(service.findById(2L).isPresent());
    }

    @Test
    void porTurno_deOtroServicio_403_aunqueNoTengaEventos() {
        gestionDe(ENFERMERIA);
        when(turnoRepository.findById(100L)).thenReturn(Optional.of(turnoDe(100L, URGENCIAS)));
        when(turnoRepository.findById(101L)).thenReturn(Optional.of(turnoDe(101L, URGENCIAS)));
        when(bitacoraRepository.findByTurno_IdTurno(100L)).thenReturn(List.of(generacionUrgencias));

        assertThrows(AccessDeniedException.class, () -> service.findByTurno(100L));
        assertThrows(AccessDeniedException.class, () -> service.findByTurno(101L));
        verify(bitacoraRepository, never()).findByTurno_IdTurno(any());
    }

    // ============================ C-06: «Ver historial» del turno ============================

    private void medico(long id, long servicio) {
        when(seguridadServicio.esAdministrador()).thenReturn(false);
        when(seguridadServicio.esGestionDelServicio()).thenReturn(false);
        when(seguridadServicio.idUsuarioActual()).thenReturn(id);
        when(seguridadServicio.idServicioActual()).thenReturn(servicio);
    }

    private static TurnoEntity turnoDeServicioYDueno(long id, long idServicio, Long idDueno) {
        TurnoEntity t = turnoDe(id, idServicio);
        t.setFuncionario(idDueno != null ? funcionario(idDueno, idServicio) : null);
        return t;
    }

    @Test
    void historialDelTurno_elMedicoVeElDeSuTurnoDeHoy() {
        medico(369L, URGENCIAS);
        when(turnoRepository.findById(100L)).thenReturn(Optional.of(turnoDeServicioYDueno(100L, URGENCIAS, 369L)));
        when(bitacoraRepository.findByTurno_IdTurno(100L)).thenReturn(List.of(generacionUrgencias));

        assertEquals(List.of(generacionUrgencias), service.findByTurno(100L));
    }

    @Test
    void historialDelTurno_elMedico_conUnTurnoAjenoOLibre_403SinLeerLaBitacora() {
        medico(369L, URGENCIAS);
        when(turnoRepository.findById(100L)).thenReturn(Optional.of(turnoDeServicioYDueno(100L, URGENCIAS, 368L)));
        when(turnoRepository.findById(101L)).thenReturn(Optional.of(turnoDeServicioYDueno(101L, URGENCIAS, null)));

        AccessDeniedException ajeno = assertThrows(AccessDeniedException.class, () -> service.findByTurno(100L));
        assertEquals("Solo puedes ver el historial de tus turnos", ajeno.getMessage());
        assertThrows(AccessDeniedException.class, () -> service.findByTurno(101L));
        verify(bitacoraRepository, never()).findByTurno_IdTurno(any());
    }

    @Test
    void historialDelTurno_laGestionVeLosDeSuServicio_yElAdministradorTodos() {
        gestionDe(URGENCIAS);
        when(turnoRepository.findById(100L)).thenReturn(Optional.of(turnoDeServicioYDueno(100L, URGENCIAS, 368L)));
        when(bitacoraRepository.findByTurno_IdTurno(100L)).thenReturn(List.of(generacionUrgencias));
        assertEquals(List.of(generacionUrgencias), service.findByTurno(100L));

        when(seguridadServicio.esAdministrador()).thenReturn(true);
        when(turnoRepository.findById(200L)).thenReturn(Optional.of(turnoDeServicioYDueno(200L, ENFERMERIA, 20L)));
        assertTrue(service.findByTurno(200L).isEmpty());
    }

    @Test
    void historialDelTurno_turnoInexistente_404() {
        medico(369L, URGENCIAS);
        when(turnoRepository.findById(999L)).thenReturn(Optional.empty());

        org.springframework.web.server.ResponseStatusException ex = assertThrows(
                org.springframework.web.server.ResponseStatusException.class, () -> service.findByTurno(999L));
        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    void historialDelTurno_esLaUnicaRutaDeLaBitacoraAbiertaAlMedico() {
        for (java.lang.reflect.Method m : com.pingeso.HUAP.Controller.BitacoraController.class.getDeclaredMethods()) {
            org.springframework.security.access.prepost.PreAuthorize regla =
                    m.getAnnotation(org.springframework.security.access.prepost.PreAuthorize.class);
            if (regla == null) continue;
            boolean abiertaAlMedico = regla.value().contains("MEDICO");
            assertEquals(m.getName().equals("getByTurno"), abiertaAlMedico, m.getName() + ": " + regla.value());
        }
    }

    @Test
    void porSolicitud_deOtroServicio_403() {
        gestionDe(URGENCIAS);
        when(bitacoraRepository.findBySolicitud_IdSolicitud(20L)).thenReturn(List.of(solicitudEnfermeria));
        when(bitacoraRepository.findBySolicitud_IdSolicitud(21L)).thenReturn(List.of(permisoUrgencias));

        assertThrows(AccessDeniedException.class, () -> service.findBySolicitud(20L));
        assertEquals(List.of(permisoUrgencias), service.findBySolicitud(21L));
    }

    @Test
    void eventoDeServicio_quitarSubrogancia_loVeLaGestionDeEseServicioYNoLaDeOtro() {
        service.registrarEventoDeServicio("SUBROGANCIA_QUITADA", URGENCIAS, funcionario(305L, URGENCIAS),
                "Ana Rojas deja de ser subrogante de Urgencias y queda como Médico");
        org.mockito.ArgumentCaptor<BitacoraEntity> guardado = org.mockito.ArgumentCaptor.forClass(BitacoraEntity.class);
        verify(bitacoraRepository).save(guardado.capture());
        BitacoraEntity evento = guardado.getValue();
        assertEquals("idServicio=4", evento.getMotivo());
        assertEquals(305L, evento.getFuncionario().getIdFuncionario());
        assertNotNull(evento.getFechaModificacion());

        when(bitacoraRepository.findAll()).thenReturn(List.of(evento, resumenPlanificacion));
        gestionDe(URGENCIAS);
        assertEquals(List.of(evento), service.findAll());
        gestionDe(ENFERMERIA);
        assertTrue(service.findAll().isEmpty());
    }

    @Test
    void porFuncionario_personaDeOtroServicio_403() {
        gestionDe(ENFERMERIA);
        when(funcionarioRepository.findById(11L)).thenReturn(Optional.of(funcionario(11L, URGENCIAS)));

        assertThrows(AccessDeniedException.class, () -> service.findByFuncionario(11L));
        verify(bitacoraRepository, never()).findByFuncionario_IdFuncionario(any());
    }

    @Test
    void porFuncionario_personaDelServicio_traeSoloLosEventosDeEseServicio() {
        gestionDe(URGENCIAS);
        when(funcionarioRepository.findById(11L)).thenReturn(Optional.of(funcionario(11L, URGENCIAS, ENFERMERIA)));
        when(bitacoraRepository.findByFuncionario_IdFuncionario(11L))
                .thenReturn(List.of(permisoUrgencias, solicitudEnfermeria, resumenPlanificacion));

        assertEquals(List.of(permisoUrgencias), service.findByFuncionario(11L));
    }
}
