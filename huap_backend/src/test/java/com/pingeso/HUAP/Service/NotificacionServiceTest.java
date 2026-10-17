package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.CrearNotificacionDTO;
import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.NotificacionEntity;
import com.pingeso.HUAP.Entity.SolicitudEntity;
import com.pingeso.HUAP.Repository.NotificacionRepository;
import com.pingeso.HUAP.Repository.SolicitudRepository;
import com.pingeso.HUAP.Security.SeguridadServicio;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * C-17 (BUG-006): control de dueño en las notificaciones. El dueño es el emisor o el receptor
 * de la solicitud ligada (la regla de la bandeja); el ADMINISTRADOR queda exento.
 */
class NotificacionServiceTest {

    private static final long EMISOR = 10L;
    private static final long RECEPTOR = 11L;
    private static final long AJENO = 12L;

    private final NotificacionRepository notificacionRepository = mock(NotificacionRepository.class);
    private final SolicitudRepository solicitudRepository = mock(SolicitudRepository.class);
    private final SeguridadServicio seguridadServicio = mock(SeguridadServicio.class);

    private final NotificacionService service =
            new NotificacionService(notificacionRepository, solicitudRepository, seguridadServicio);

    private final SolicitudEntity solicitud = SolicitudEntity.builder().idSolicitud(7L)
            .funcionario(FuncionarioEntity.builder().idFuncionario(EMISOR).nombre("E").build())
            .funcionarioReceptor(FuncionarioEntity.builder().idFuncionario(RECEPTOR).nombre("R").build())
            .build();

    private NotificacionEntity notificacion(long id, SolicitudEntity s) {
        NotificacionEntity n = NotificacionEntity.builder().idNotificacion(id).estado("NO_LEIDO").solicitud(s).build();
        when(notificacionRepository.findById(id)).thenReturn(Optional.of(n));
        return n;
    }

    private void actor(long id, boolean admin) {
        when(seguridadServicio.idUsuarioActual()).thenReturn(id);
        when(seguridadServicio.esAdministrador()).thenReturn(admin);
    }

    @Test
    void getPorId_emisorYReceptor_laLeen() {
        NotificacionEntity n = notificacion(1L, solicitud);

        actor(EMISOR, false);
        assertSame(n, service.findNotificacionById(1L));
        actor(RECEPTOR, false);
        assertSame(n, service.findNotificacionById(1L));
    }

    @Test
    void getPorId_ajena_403() {
        notificacion(1L, solicitud);
        actor(AJENO, false);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () -> service.findNotificacionById(1L));
        assertEquals("No tienes acceso a una notificación de otro funcionario", ex.getMessage());
    }

    @Test
    void getPorId_inexistente_404() {
        when(notificacionRepository.findById(99L)).thenReturn(Optional.empty());
        actor(EMISOR, false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.findNotificacionById(99L));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void sinSolicitud_soloLaVeElAdministrador() {
        NotificacionEntity n = notificacion(2L, null);

        actor(EMISOR, false);
        assertThrows(AccessDeniedException.class, () -> service.findNotificacionById(2L));
        actor(1L, true);
        assertSame(n, service.findNotificacionById(2L));
    }

    @Test
    void leerYEliminar_ajena_403YNoGuarda() {
        notificacion(1L, solicitud);
        actor(AJENO, false);

        assertThrows(AccessDeniedException.class, () -> service.marcarLeido(1L));
        assertThrows(AccessDeniedException.class, () -> service.marcarComoEliminado(1L));
        verify(notificacionRepository, never()).save(any());
    }

    @Test
    void leerYEliminar_propia_cambiaElEstado() {
        NotificacionEntity n = notificacion(1L, solicitud);
        actor(RECEPTOR, false);

        assertTrue(service.marcarLeido(1L));
        assertEquals("LEIDO", n.getEstado());
        assertTrue(service.marcarComoEliminado(1L));
        assertEquals("ELIMINADO", n.getEstado());
    }

    @Test
    void leerYEliminar_inexistente_devuelveFalse() {
        when(notificacionRepository.findById(99L)).thenReturn(Optional.empty());
        actor(EMISOR, false);

        assertFalse(service.marcarLeido(99L));
        assertFalse(service.marcarComoEliminado(99L));
    }

    @Test
    void porSolicitud_soloQuienParticipa() {
        NotificacionEntity n = NotificacionEntity.builder().idNotificacion(1L).solicitud(solicitud).build();
        when(solicitudRepository.findById(7L)).thenReturn(Optional.of(solicitud));
        when(notificacionRepository.findBySolicitud_IdSolicitud(7L)).thenReturn(Optional.of(n));

        actor(EMISOR, false);
        assertSame(n, service.findByIdSolicitud(7L));

        actor(AJENO, false);
        assertThrows(AccessDeniedException.class, () -> service.findByIdSolicitud(7L));
    }

    @Test
    void porSolicitud_solicitudInexistente_404() {
        when(solicitudRepository.findById(99L)).thenReturn(Optional.empty());
        actor(EMISOR, false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.findByIdSolicitud(99L));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void crear_sobreUnaSolicitudAjena_403YNoGuarda() {
        when(solicitudRepository.findById(7L)).thenReturn(Optional.of(solicitud));
        CrearNotificacionDTO dto = new CrearNotificacionDTO();
        dto.setIdSolicitud(7L);
        dto.setMensaje("Mensaje de prueba");

        actor(AJENO, false);
        assertThrows(AccessDeniedException.class, () -> service.crearNotificacion(dto));
        verify(notificacionRepository, never()).save(any());

        actor(EMISOR, false);
        when(notificacionRepository.save(any(NotificacionEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        assertEquals("NO_LEIDO", service.crearNotificacion(dto).getEstado());
    }
}
