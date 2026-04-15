package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.EventLogEntity;
import com.pingeso.HUAP.Repository.EventLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EventLogServiceTest {

    @Mock
    private EventLogRepository eventLogRepository;

    @InjectMocks
    private EventLogService eventLogService;

    private EventLogEntity eventoEjemplo;

    @BeforeEach
    void setUp() {
        eventoEjemplo = new EventLogEntity();
        // Usamos el nombre de método correcto de tu entidad
        eventoEjemplo.setIdEvento(1L);
        eventoEjemplo.setTipoEvento("SOLICITUD_CREADA");
        eventoEjemplo.setDescripcion("Test de auditoría");
        eventoEjemplo.setActivo(true);
    }

    @Test
    @DisplayName("Debe encontrar todos los eventos")
    void findAllTest() {
        when(eventLogRepository.findAll()).thenReturn(List.of(eventoEjemplo));
        List<EventLogEntity> result = eventLogService.findAll();
        assertEquals(1, result.size());
        verify(eventLogRepository).findAll();
    }

    @Test
    @DisplayName("Debe encontrar evento por ID")
    void findByIdTest() {
        when(eventLogRepository.findById(1L)).thenReturn(Optional.of(eventoEjemplo));
        Optional<EventLogEntity> result = eventLogService.findById(1L);
        assertTrue(result.isPresent());
        // Verificamos usando getIdEvento()
        assertEquals(1L, result.get().getIdEvento());
    }

    @Test
    @DisplayName("Debe encontrar eventos por tipo de evento")
    void findByTipoEventoTest() {
        when(eventLogRepository.findByTipoEvento("SOLICITUD_CREADA")).thenReturn(List.of(eventoEjemplo));
        List<EventLogEntity> result = eventLogService.findByTipoEvento("SOLICITUD_CREADA");
        assertFalse(result.isEmpty());
        assertEquals("SOLICITUD_CREADA", result.get(0).getTipoEvento());
    }

    @Test
    @DisplayName("Debe encontrar eventos por ID de usuario")
    void findByUsuarioIdTest() {
        when(eventLogRepository.findByUsuario_IdPersonal(10L)).thenReturn(List.of(eventoEjemplo));
        List<EventLogEntity> result = eventLogService.findByUsuarioId(10L);
        assertFalse(result.isEmpty());
        verify(eventLogRepository).findByUsuario_IdPersonal(10L);
    }

    @Test
    @DisplayName("Debe encontrar eventos por ID de turno")
    void findByIdTurnoTest() {
        when(eventLogRepository.findByIdTurno(50L)).thenReturn(List.of(eventoEjemplo));
        List<EventLogEntity> result = eventLogService.findByIdTurno(50L);
        assertFalse(result.isEmpty());
        verify(eventLogRepository).findByIdTurno(50L);
    }

    @Test
    @DisplayName("Debe encontrar eventos por ID de solicitud")
    void findByIdSolicitudTest() {
        when(eventLogRepository.findByIdSolicitud(100L)).thenReturn(List.of(eventoEjemplo));
        List<EventLogEntity> result = eventLogService.findByIdSolicitud(100L);
        assertFalse(result.isEmpty());
        verify(eventLogRepository).findByIdSolicitud(100L);
    }

    @Test
    @DisplayName("Debe encontrar solo eventos activos")
    void findActiveTest() {
        when(eventLogRepository.findByActivoTrue()).thenReturn(List.of(eventoEjemplo));
        List<EventLogEntity> result = eventLogService.findActive();
        assertFalse(result.isEmpty());
        assertTrue(result.get(0).getActivo());
    }

    @Test
    @DisplayName("Debe guardar un evento exitosamente")
    void saveTest() {
        when(eventLogRepository.save(any(EventLogEntity.class))).thenReturn(eventoEjemplo);
        EventLogEntity result = eventLogService.save(new EventLogEntity());
        assertNotNull(result);
        assertEquals(1L, result.getIdEvento());
        verify(eventLogRepository).save(any(EventLogEntity.class));
    }
}