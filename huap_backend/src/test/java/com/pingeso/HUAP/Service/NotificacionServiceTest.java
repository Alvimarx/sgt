package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.NotificacionDTO;
import com.pingeso.HUAP.Entity.NotificacionEntity;
import com.pingeso.HUAP.Entity.PersonalEntity;
import com.pingeso.HUAP.Repository.NotificacionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificacionServiceTest {

    @Mock
    private NotificacionRepository notificacionRepository;

    @InjectMocks
    private NotificacionService notificacionService;

    private NotificacionEntity notificacionEjemplo;

    @BeforeEach
    void setUp() {
        notificacionEjemplo = new NotificacionEntity();
        notificacionEjemplo.setId(1L);
        notificacionEjemplo.setTipoSolicitud("Intercambio");
        notificacionEjemplo.setLeido(false);
        notificacionEjemplo.setEliminado(false);
    }

    @Test
    @DisplayName("Debe encontrar todas las notificaciones")
    void findAllTest() {
        when(notificacionRepository.findAll()).thenReturn(List.of(notificacionEjemplo));
        List<NotificacionEntity> result = notificacionService.findAll();
        assertEquals(1, result.size());
        verify(notificacionRepository).findAll();
    }

    @Test
    @DisplayName("Debe buscar por tipo de solicitud")
    void findByTipoSolicitudTest() {
        when(notificacionRepository.findByTipoSolicitud("Intercambio")).thenReturn(List.of(notificacionEjemplo));
        List<NotificacionEntity> result = notificacionService.findByTipoSolicitud("Intercambio");
        assertFalse(result.isEmpty());
        assertEquals("Intercambio", result.get(0).getTipoSolicitud());
    }

    @Test
    @DisplayName("Debe buscar por ID de emisor")
    void findByEmisorIdTest() {
        when(notificacionRepository.findByEmisorIdPersonal(10L)).thenReturn(List.of(notificacionEjemplo));
        List<NotificacionEntity> result = notificacionService.findByEmisorId(10L);
        assertFalse(result.isEmpty());
        verify(notificacionRepository).findByEmisorIdPersonal(10L);
    }

    @Test
    @DisplayName("Debe buscar por ID de receptor")
    void findByReceptorIdTest() {
        when(notificacionRepository.findByReceptorIdPersonal(20L)).thenReturn(List.of(notificacionEjemplo));
        List<NotificacionEntity> result = notificacionService.findByReceptorId(20L);
        assertFalse(result.isEmpty());
        verify(notificacionRepository).findByReceptorIdPersonal(20L);
    }

    @Test
    @DisplayName("Debe obtener NotificacionDTO por ID de usuario")
    void obtenerNotificacionesUsuarioTest() {
        // Usamos el constructor de 7 argumentos del DTO
        NotificacionDTO dto = new NotificacionDTO(1L, "Intercambio", "Mensaje", "Pendiente", new Date(), false, false);
        when(notificacionRepository.findNotificacionesPorUsuario(1L)).thenReturn(List.of(dto));

        List<NotificacionDTO> result = notificacionService.obtenerNotificacionesUsuario(1L);

        assertEquals(1, result.size());
        verify(notificacionRepository).findNotificacionesPorUsuario(1L);
    }

    @Test
    @DisplayName("Debe encontrar por ID")
    void findByIdTest() {
        when(notificacionRepository.findById(1L)).thenReturn(Optional.of(notificacionEjemplo));
        Optional<NotificacionEntity> result = notificacionService.findById(1L);
        assertTrue(result.isPresent());
        assertEquals(1L, result.get().getId());
    }

    @Test
    @DisplayName("Debe marcar como leído exitosamente")
    void marcarComoLeidoSuccessTest() {
        when(notificacionRepository.findById(1L)).thenReturn(Optional.of(notificacionEjemplo));

        boolean result = notificacionService.marcarComoLeido(1L);

        assertTrue(result);
        assertTrue(notificacionEjemplo.getLeido());
        verify(notificacionRepository).save(notificacionEjemplo);
    }

    @Test
    @DisplayName("Debe retornar false al marcar como leído una notificación inexistente")
    void marcarComoLeidoFailTest() {
        when(notificacionRepository.findById(99L)).thenReturn(Optional.empty());
        boolean result = notificacionService.marcarComoLeido(99L);
        assertFalse(result);
    }

    @Test
    @DisplayName("Debe marcar como eliminado exitosamente")
    void marcarComoEliminadoSuccessTest() {
        when(notificacionRepository.findById(1L)).thenReturn(Optional.of(notificacionEjemplo));

        boolean result = notificacionService.marcarComoEliminado(1L);

        assertTrue(result);
        assertTrue(notificacionEjemplo.getEliminado());
        verify(notificacionRepository).save(notificacionEjemplo);
    }

    @Test
    @DisplayName("Debe retornar false al marcar como eliminado una notificación inexistente")
    void marcarComoEliminadoFailTest() {
        when(notificacionRepository.findById(99L)).thenReturn(Optional.empty());
        boolean result = notificacionService.marcarComoEliminado(99L);
        assertFalse(result);
    }

    @Test
    @DisplayName("Debe contar no leídas por usuario")
    void contarNoLeidasTest() {
        when(notificacionRepository.contarNoLeidasPorUsuario(1L)).thenReturn(5L);
        Long result = notificacionService.contarNoLeidasPorUsuario(1L);
        assertEquals(5L, result);
    }

    @Test
    @DisplayName("crearNotificacion: Cobertura total de creación y persistencia")
    void crearNotificacionTest() {
        // 1. Datos de entrada
        String tipo = "CAMBIO_TURNO";
        String msg = "Mensaje para receptor";
        String msgEmisor = "Mensaje para emisor";
        String estado = "PENDIENTE";

        PersonalEntity emisor = new PersonalEntity();
        emisor.setIdPersonal(1L);

        PersonalEntity receptor = new PersonalEntity();
        receptor.setIdPersonal(2L);

        // 2. Mock: Capturamos el objeto guardado para verificar valores internos
        when(notificacionRepository.save(any(NotificacionEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // 3. Act
        NotificacionEntity resultado = notificacionService.crearNotificacion(
                tipo, msg, msgEmisor, estado, emisor, receptor
        );

        // 4. Assertions (Verificamos que cada línea del método se ejecutó correctamente)
        assertNotNull(resultado);
        assertEquals(tipo, resultado.getTipoSolicitud());
        assertEquals(msg, resultado.getMensaje());
        assertEquals(msgEmisor, resultado.getMensajeParaEmisor());
        assertEquals(estado, resultado.getEstado());
        assertEquals(emisor, resultado.getEmisor());
        assertEquals(receptor, resultado.getReceptor());

        // Específicos para tu entidad (Boolean)
        assertFalse(resultado.getLeido());
        assertFalse(resultado.getEliminado());
        assertNotNull(resultado.getFechaEnvio());

        // Verificamos interacción con repositorio
        verify(notificacionRepository, times(1)).save(any(NotificacionEntity.class));
    }
}