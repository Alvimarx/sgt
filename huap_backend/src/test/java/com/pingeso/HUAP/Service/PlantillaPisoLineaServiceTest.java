package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.PlantillaPisoLineaEntity;
import com.pingeso.HUAP.Repository.PlantillaPisoLineaRepository;
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
class PlantillaPisoLineaServiceTest {

    @Mock
    private PlantillaPisoLineaRepository repository;

    @InjectMocks
    private PlantillaPisoLineaService service;

    private PlantillaPisoLineaEntity lineaEjemplo;

    @BeforeEach
    void setUp() {
        lineaEjemplo = new PlantillaPisoLineaEntity();
        lineaEjemplo.setIdPlantillaLinea(1L);
        lineaEjemplo.setOrden(1);
    }

    @Test
    @DisplayName("Debe buscar líneas por ID de plantilla")
    void findByPlantillaTest() {
        when(repository.findByPlantillaPisoIdPlantillaPisoOrderByOrdenAsc(10L))
                .thenReturn(List.of(lineaEjemplo));

        List<PlantillaPisoLineaEntity> result = service.findByPlantilla(10L);

        assertFalse(result.isEmpty());
        assertEquals(1, result.size());
        verify(repository).findByPlantillaPisoIdPlantillaPisoOrderByOrdenAsc(10L);
    }

    @Test
    @DisplayName("Debe guardar una línea exitosamente")
    void saveTest() {
        when(repository.save(any(PlantillaPisoLineaEntity.class))).thenReturn(lineaEjemplo);

        PlantillaPisoLineaEntity result = service.save(new PlantillaPisoLineaEntity());

        assertNotNull(result);
        verify(repository).save(any());
    }

    @Test
    @DisplayName("Debe eliminar una línea si existe")
    void deleteSuccessTest() {
        when(repository.existsById(1L)).thenReturn(true);

        boolean deleted = service.delete(1L);

        assertTrue(deleted);
        verify(repository).deleteById(1L);
    }

    @Test
    @DisplayName("Debe retornar false al eliminar una línea inexistente")
    void deleteFailTest() {
        when(repository.existsById(1L)).thenReturn(false);

        boolean deleted = service.delete(1L);

        assertFalse(deleted);
        verify(repository, never()).deleteById(anyLong());
    }

    @Test
    @DisplayName("Debe reordenar líneas masivamente")
    void reorderLineasTest() {
        // Arrange
        PlantillaPisoLineaEntity l2 = new PlantillaPisoLineaEntity();
        l2.setIdPlantillaLinea(2L);
        l2.setOrden(2);
        List<PlantillaPisoLineaEntity> lista = List.of(lineaEjemplo, l2);

        when(repository.findById(1L)).thenReturn(Optional.of(lineaEjemplo));
        when(repository.findById(2L)).thenReturn(Optional.of(l2));

        // Act
        service.reorderLineas(lista);

        // Assert
        verify(repository, times(2)).save(any(PlantillaPisoLineaEntity.class));
    }

    @Test
    @DisplayName("Debe ignorar líneas no encontradas durante el reordenamiento")
    void reorderLineasNotFoundTest() {
        when(repository.findById(anyLong())).thenReturn(Optional.empty());

        service.reorderLineas(List.of(lineaEjemplo));

        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("Debe eliminar masivamente por ID de plantilla")
    void deleteByPlantillaTest() {
        // Act
        service.deleteByPlantilla(10L);

        // Assert
        verify(repository).deleteByPlantillaPisoIdPlantillaPiso(10L);
    }
}