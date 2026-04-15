package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.TurnoBaseEntity;
import com.pingeso.HUAP.Repository.TurnoBaseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TurnoBaseServiceTest {

    @Mock
    private TurnoBaseRepository turnoBaseRepository;

    @InjectMocks
    private TurnoBaseService service;

    private TurnoBaseEntity turnoEjemplo;

    @BeforeEach
    void setUp() {
        turnoEjemplo = new TurnoBaseEntity();
        turnoEjemplo.setIdTurnoBase(1L);
        turnoEjemplo.setNombre("Turno Mañana");
        turnoEjemplo.setHoraInicio(LocalTime.of(8, 0));
        turnoEjemplo.setHoraFin(LocalTime.of(20, 0));
    }

    // --- Tests CRUD Básico ---

    @Test
    @DisplayName("Debe encontrar todos los turnos base")
    void findAllTest() {
        when(turnoBaseRepository.findAll()).thenReturn(List.of(turnoEjemplo));
        List<TurnoBaseEntity> result = service.findAll();
        assertFalse(result.isEmpty());
        assertEquals(1, result.size());
        verify(turnoBaseRepository).findAll();
    }

    @Test
    @DisplayName("Debe encontrar un turno por ID")
    void findByIdTest() {
        when(turnoBaseRepository.findById(1L)).thenReturn(Optional.of(turnoEjemplo));
        Optional<TurnoBaseEntity> result = service.findById(1L);
        assertTrue(result.isPresent());
        assertEquals("Turno Mañana", result.get().getNombre());
    }

    @Test
    @DisplayName("Debe guardar un turno base")
    void saveTest() {
        when(turnoBaseRepository.save(any(TurnoBaseEntity.class))).thenReturn(turnoEjemplo);
        TurnoBaseEntity result = service.save(new TurnoBaseEntity());
        assertNotNull(result);
        verify(turnoBaseRepository).save(any());
    }

    @Test
    @DisplayName("Debe actualizar un turno existente")
    void updateSuccessTest() {
        TurnoBaseEntity actualizado = new TurnoBaseEntity();
        actualizado.setNombre("Turno Noche");
        actualizado.setHoraInicio(LocalTime.of(20, 0));

        when(turnoBaseRepository.findById(1L)).thenReturn(Optional.of(turnoEjemplo));
        when(turnoBaseRepository.save(any(TurnoBaseEntity.class))).thenReturn(turnoEjemplo);

        TurnoBaseEntity result = service.update(1L, actualizado);

        assertNotNull(result);
        assertEquals("Turno Noche", result.getNombre());
        verify(turnoBaseRepository).save(any());
    }

    @Test
    @DisplayName("Debe retornar null al actualizar un ID inexistente")
    void updateNotFoundTest() {
        when(turnoBaseRepository.findById(1L)).thenReturn(Optional.empty());
        TurnoBaseEntity result = service.update(1L, new TurnoBaseEntity());
        assertNull(result);
        verify(turnoBaseRepository, never()).save(any());
    }

    @Test
    @DisplayName("Debe retornar true al eliminar un registro existente")
    void deleteSuccessTest() {
        when(turnoBaseRepository.existsById(1L)).thenReturn(true);
        boolean result = service.delete(1L);
        assertTrue(result);
        verify(turnoBaseRepository).deleteById(1L);
    }

    @Test
    @DisplayName("Debe retornar false al eliminar un registro inexistente")
    void deleteFailTest() {
        when(turnoBaseRepository.existsById(1L)).thenReturn(false);
        boolean result = service.delete(1L);
        assertFalse(result);
        verify(turnoBaseRepository, never()).deleteById(anyLong());
    }

    // --- Tests de Búsqueda ---

    @Test
    @DisplayName("Debe buscar por nombre")
    void findByNombreTest() {
        when(turnoBaseRepository.findByNombre("Mañana")).thenReturn(List.of(turnoEjemplo));
        List<TurnoBaseEntity> result = service.findByNombre("Mañana");
        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("Debe buscar por tipo de turno")
    void findByTipoTurnoTest() {
        when(turnoBaseRepository.findByTipoTurno(2L)).thenReturn(List.of(turnoEjemplo));
        List<TurnoBaseEntity> result = service.findByTipoTurno(2L);
        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("Debe buscar por servicio")
    void findByServicioTest() {
        when(turnoBaseRepository.findByServicioIdServicio(5L)).thenReturn(List.of(turnoEjemplo));
        List<TurnoBaseEntity> result = service.findByServicio(5L);
        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("Debe buscar por creador")
    void findByCreadorTest() {
        when(turnoBaseRepository.findByCreadorIdPersonal(10L)).thenReturn(List.of(turnoEjemplo));
        List<TurnoBaseEntity> result = service.findByCreador(10L);
        assertEquals(1, result.size());
    }
}