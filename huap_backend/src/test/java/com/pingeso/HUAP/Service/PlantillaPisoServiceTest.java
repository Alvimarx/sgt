package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.PlantillaPisoEntity;
import com.pingeso.HUAP.Repository.PlantillaPisoRepository;
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
class PlantillaPisoServiceTest {

    @Mock
    private PlantillaPisoRepository repository;

    @InjectMocks
    private PlantillaPisoService service;

    private PlantillaPisoEntity plantillaEjemplo;

    @BeforeEach
    void setUp() {
        plantillaEjemplo = new PlantillaPisoEntity();
        plantillaEjemplo.setIdPlantillaPiso(1L);
        plantillaEjemplo.setNombre("Plantilla General");
    }

    @Test
    @DisplayName("Debe encontrar todas las plantillas")
    void findAllTest() {
        when(repository.findAll()).thenReturn(List.of(plantillaEjemplo));
        List<PlantillaPisoEntity> result = service.findAll();
        assertFalse(result.isEmpty());
        assertEquals(1, result.size());
        verify(repository).findAll();
    }

    @Test
    @DisplayName("Debe encontrar plantilla por ID")
    void findByIdTest() {
        when(repository.findById(1L)).thenReturn(Optional.of(plantillaEjemplo));
        Optional<PlantillaPisoEntity> result = service.findById(1L);
        assertTrue(result.isPresent());
        assertEquals(1L, result.get().getIdPlantillaPiso());
    }

    @Test
    @DisplayName("Debe guardar una plantilla correctamente")
    void saveTest() {
        when(repository.save(any(PlantillaPisoEntity.class))).thenReturn(plantillaEjemplo);
        PlantillaPisoEntity result = service.save(new PlantillaPisoEntity());
        assertNotNull(result);
        verify(repository).save(any());
    }

    @Test
    @DisplayName("Debe retornar true al eliminar una plantilla existente")
    void deleteSuccessTest() {
        when(repository.existsById(1L)).thenReturn(true);
        boolean result = service.delete(1L);
        assertTrue(result);
        verify(repository).deleteById(1L);
    }

    @Test
    @DisplayName("Debe retornar false al intentar eliminar una plantilla inexistente")
    void deleteFailTest() {
        when(repository.existsById(99L)).thenReturn(false);
        boolean result = service.delete(99L);
        assertFalse(result);
        verify(repository, never()).deleteById(anyLong());
    }
}