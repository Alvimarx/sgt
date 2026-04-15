package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.TipoTurnoEntity;
import com.pingeso.HUAP.Repository.TipoTurnoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TipoTurnoServiceTest {

    @Mock
    private TipoTurnoRepository repository;

    @InjectMocks
    private TipoTurnoService service;

    private TipoTurnoEntity tipoTurnoEjemplo;

    @BeforeEach
    void setUp() {
        tipoTurnoEjemplo = new TipoTurnoEntity();
        tipoTurnoEjemplo.setIdTipoTurno(1L);
        tipoTurnoEjemplo.setNombre("Mañana");
        tipoTurnoEjemplo.setPrioridadInterna(1);
    }

    // --- Tests de Reorder ---

    @Test
    @DisplayName("Debe reordenar tipos de turno masivamente")
    void reorderTiposTurnoTest() {
        TipoTurnoEntity tt2 = new TipoTurnoEntity();
        tt2.setIdTipoTurno(2L);
        tt2.setPrioridadInterna(2);

        List<TipoTurnoEntity> lista = List.of(tipoTurnoEjemplo, tt2);

        when(repository.findById(1L)).thenReturn(Optional.of(tipoTurnoEjemplo));
        when(repository.findById(2L)).thenReturn(Optional.of(tt2));

        service.reorderTiposTurno(lista);

        verify(repository, times(2)).save(any(TipoTurnoEntity.class));
    }

    @Test
    @DisplayName("Debe ignorar reordenamiento si la lista es nula o vacía")
    void reorderTiposTurnoEmptyTest() {
        service.reorderTiposTurno(null);
        service.reorderTiposTurno(new ArrayList<>());
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("Debe ignorar entidades no encontradas en el reordenamiento")
    void reorderTiposTurnoNotFoundTest() {
        when(repository.findById(anyLong())).thenReturn(Optional.empty());
        service.reorderTiposTurno(List.of(tipoTurnoEjemplo));
        verify(repository, never()).save(any());
    }

    // --- Tests CRUD Básico ---

    @Test
    @DisplayName("Debe encontrar todos los tipos de turno")
    void findAllTest() {
        when(repository.findAll()).thenReturn(List.of(tipoTurnoEjemplo));
        List<TipoTurnoEntity> result = service.findAll();
        assertFalse(result.isEmpty());
        verify(repository).findAll();
    }

    @Test
    @DisplayName("Debe encontrar por ID")
    void findByIdTest() {
        when(repository.findById(1L)).thenReturn(Optional.of(tipoTurnoEjemplo));
        Optional<TipoTurnoEntity> result = service.findById(1L);
        assertTrue(result.isPresent());
    }

    @Test
    @DisplayName("Debe guardar un tipo de turno")
    void saveTest() {
        when(repository.save(any())).thenReturn(tipoTurnoEjemplo);
        TipoTurnoEntity result = service.save(new TipoTurnoEntity());
        assertNotNull(result);
    }

    @Test
    @DisplayName("Debe actualizar un tipo de turno existente")
    void updateSuccessTest() {
        TipoTurnoEntity actualizado = new TipoTurnoEntity();
        actualizado.setNombre("Tarde");
        actualizado.setPrioridadInterna(5);

        when(repository.findById(1L)).thenReturn(Optional.of(tipoTurnoEjemplo));
        when(repository.save(any())).thenReturn(tipoTurnoEjemplo);

        TipoTurnoEntity result = service.update(1L, actualizado);

        assertNotNull(result);
        assertEquals("Tarde", result.getNombre());
        assertEquals(5, result.getPrioridadInterna());
    }

    @Test
    @DisplayName("Debe retornar null al actualizar un tipo de turno inexistente")
    void updateNotFoundTest() {
        when(repository.findById(1L)).thenReturn(Optional.empty());
        TipoTurnoEntity result = service.update(1L, new TipoTurnoEntity());
        assertNull(result);
    }

    @Test
    @DisplayName("Debe eliminar un tipo de turno si existe")
    void deleteSuccessTest() {
        when(repository.existsById(1L)).thenReturn(true);
        boolean deleted = service.delete(1L);
        assertTrue(deleted);
        verify(repository).deleteById(1L);
    }

    @Test
    @DisplayName("Debe retornar false al eliminar un tipo de turno inexistente")
    void deleteFailTest() {
        when(repository.existsById(1L)).thenReturn(false);
        boolean deleted = service.delete(1L);
        assertFalse(deleted);
        verify(repository, never()).deleteById(anyLong());
    }

    // --- Tests Métodos Específicos ---

    @Test
    @DisplayName("Debe buscar por categoría ordenado por prioridad")
    void findByCategoriaTest() {
        when(repository.findByCategoriaIdCategoriaTipoTurnoOrderByPrioridadInternaAsc(10L))
                .thenReturn(List.of(tipoTurnoEjemplo));
        List<TipoTurnoEntity> result = service.findByCategoria(10L);
        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("Debe buscar todos por servicio ordenados")
    void findAllByServicioOrdenadoTest() {
        when(repository.findAllByServicioIdOrdenadoParaPintado(5L))
                .thenReturn(List.of(tipoTurnoEjemplo));
        List<TipoTurnoEntity> result = service.findAllByServicioOrdenado(5L);
        assertEquals(1, result.size());
    }
}