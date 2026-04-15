package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.CategoriaTipoTurnoEntity;
import com.pingeso.HUAP.Repository.CategoriaTipoTurnoRepository;
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
class CategoriaTipoTurnoServiceTest {

    @Mock
    private CategoriaTipoTurnoRepository repository;

    @InjectMocks
    private CategoriaTipoTurnoService service;

    private CategoriaTipoTurnoEntity categoriaEjemplo;

    @BeforeEach
    void setUp() {
        categoriaEjemplo = new CategoriaTipoTurnoEntity();
        categoriaEjemplo.setIdCategoriaTipoTurno(1L);
        categoriaEjemplo.setNombre("Urgencia");
        categoriaEjemplo.setPrioridad(1);
    }

    @Test
    @DisplayName("Debe reordenar categorías masivamente")
    void reorderCategoriasTest() {
        // Arrange
        CategoriaTipoTurnoEntity cat2 = new CategoriaTipoTurnoEntity();
        cat2.setIdCategoriaTipoTurno(2L);
        cat2.setPrioridad(2);

        List<CategoriaTipoTurnoEntity> lista = List.of(categoriaEjemplo, cat2);

        when(repository.findById(1L)).thenReturn(Optional.of(categoriaEjemplo));
        when(repository.findById(2L)).thenReturn(Optional.of(cat2));

        // Act
        service.reorderCategorias(lista);

        // Assert
        verify(repository, times(2)).save(any(CategoriaTipoTurnoEntity.class));
    }

    @Test
    @DisplayName("Debe ignorar reordenamiento si la lista es nula o vacía")
    void reorderCategoriasEmptyTest() {
        service.reorderCategorias(null);
        service.reorderCategorias(new ArrayList<>());
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("Debe ignorar categorías no encontradas durante el reordenamiento")
    void reorderCategoriasNotFoundTest() {
        when(repository.findById(anyLong())).thenReturn(Optional.empty());
        service.reorderCategorias(List.of(categoriaEjemplo));
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("Debe encontrar todas las categorías")
    void findAllTest() {
        when(repository.findAll()).thenReturn(List.of(categoriaEjemplo));
        List<CategoriaTipoTurnoEntity> result = service.findAll();
        assertFalse(result.isEmpty());
        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("Debe encontrar por ID")
    void findByIdTest() {
        when(repository.findById(1L)).thenReturn(Optional.of(categoriaEjemplo));
        Optional<CategoriaTipoTurnoEntity> result = service.findById(1L);
        assertTrue(result.isPresent());
    }

    @Test
    @DisplayName("Debe guardar una categoría")
    void saveTest() {
        when(repository.save(any())).thenReturn(categoriaEjemplo);
        CategoriaTipoTurnoEntity result = service.save(new CategoriaTipoTurnoEntity());
        assertNotNull(result);
    }

    @Test
    @DisplayName("Debe actualizar una categoría existente")
    void updateSuccessTest() {
        CategoriaTipoTurnoEntity nuevaData = new CategoriaTipoTurnoEntity();
        nuevaData.setNombre("Nuevo Nombre");
        nuevaData.setPrioridad(10);

        when(repository.findById(1L)).thenReturn(Optional.of(categoriaEjemplo));
        when(repository.save(any())).thenReturn(categoriaEjemplo);

        CategoriaTipoTurnoEntity result = service.update(1L, nuevaData);

        assertNotNull(result);
        assertEquals("Nuevo Nombre", categoriaEjemplo.getNombre());
        assertEquals(10, categoriaEjemplo.getPrioridad());
    }

    @Test
    @DisplayName("Debe retornar null al actualizar una categoría inexistente")
    void updateNotFoundTest() {
        when(repository.findById(1L)).thenReturn(Optional.empty());
        CategoriaTipoTurnoEntity result = service.update(1L, new CategoriaTipoTurnoEntity());
        assertNull(result);
    }

    @Test
    @DisplayName("Debe eliminar una categoría si existe")
    void deleteSuccessTest() {
        when(repository.existsById(1L)).thenReturn(true);
        boolean deleted = service.delete(1L);
        assertTrue(deleted);
        verify(repository).deleteById(1L);
    }

    @Test
    @DisplayName("Debe retornar false al eliminar una categoría inexistente")
    void deleteFailTest() {
        when(repository.existsById(1L)).thenReturn(false);
        boolean deleted = service.delete(1L);
        assertFalse(deleted);
        verify(repository, never()).deleteById(anyLong());
    }

    @Test
    @DisplayName("Debe buscar por servicio y orden de prioridad")
    void findByServicioOrderByPrioridadTest() {
        when(repository.findByServicioIdServicioOrderByPrioridadAsc(100L)).thenReturn(List.of(categoriaEjemplo));
        List<CategoriaTipoTurnoEntity> result = service.findByServicioOrderByPrioridad(100L);
        assertEquals(1, result.size());
        verify(repository).findByServicioIdServicioOrderByPrioridadAsc(100L);
    }
}