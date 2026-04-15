package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.*;
import com.pingeso.HUAP.Repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PisoServiceTest {

    @Mock
    private PisoRepository pisoRepository;

    @Mock
    private ServicioRepository servicioRepository;

    @Mock
    private PlantillaPisoRepository plantillaPisoRepository;

    @InjectMocks
    private PisoService pisoService;

    private PisoEntity pisoEjemplo;
    private ServicioEntity servicioEjemplo;

    @BeforeEach
    void setUp() {
        servicioEjemplo = new ServicioEntity();
        servicioEjemplo.setIdServicio(1);
        servicioEjemplo.setNombre("Urgencias");

        pisoEjemplo = new PisoEntity();
        pisoEjemplo.setId(10L);
        pisoEjemplo.setNombre("Piso 3 Test");
        pisoEjemplo.setServicio(servicioEjemplo);
        pisoEjemplo.setColorHexa("#FF5733");
    }

    // --- PRUEBAS DE LECTURA (GET) ---

    @Test
    @DisplayName("Debe retornar resumen de todos los pisos sin filtro de servicio")
    void getAllPisosSummaryNoFilterTest() {
        when(pisoRepository.findAll()).thenReturn(List.of(pisoEjemplo));
        List<Map<String, Object>> result = pisoService.getAllPisosSummary(null);
        assertNotNull(result);
        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("Debe retornar resumen de todos los pisos filtrados por servicio")
    void getAllPisosSummaryFilteredTest() {
        when(pisoRepository.findAll()).thenReturn(List.of(pisoEjemplo));
        List<Map<String, Object>> result = pisoService.getAllPisosSummary(1L);
        assertEquals(1, result.size());
        assertEquals(1, result.get(0).get("servicioId"));
    }

    @Test
    @DisplayName("Debe manejar búsqueda por ID nulo o inexistente")
    void getPisoByIdNullAndNotFoundTest() {
        assertNull(pisoService.getPisoById(null));
        when(pisoRepository.findById(99L)).thenReturn(Optional.empty());
        assertNull(pisoService.getPisoById(99L));
    }

    @Test
    @DisplayName("Debe manejar resumen por ID nulo o inexistente")
    void getPisoSummaryNullAndNotFoundTest() {
        assertNull(pisoService.getPisoSummary(null));
        when(pisoRepository.findById(99L)).thenReturn(Optional.empty());
        assertNull(pisoService.getPisoSummary(99L));
    }

    @Test
    @DisplayName("Debe buscar por nombre y manejar nulos")
    void getPisoByNombreTest() {
        assertNull(pisoService.getPisoByNombre(null));
        when(pisoRepository.findByNombre("Test")).thenReturn(Optional.of(pisoEjemplo));
        assertEquals(pisoEjemplo, pisoService.getPisoByNombre("Test"));
    }

    @Test
    @DisplayName("Debe obtener pisos por servicio ID y manejar nulos")
    void getPisosByServicioIdTest() {
        assertTrue(pisoService.getPisosByServicioId(null).isEmpty());
        when(pisoRepository.findAll()).thenReturn(List.of(pisoEjemplo));
        assertEquals(1, pisoService.getPisosByServicioId(1L).size());
    }

    // --- PRUEBAS DE CREACIÓN ---

    @Test
    @DisplayName("Debe crear un piso exitosamente con servicio asociado")
    void createPisoSuccessTest() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("nombre", "Piso Nuevo");
        payload.put("servicioId", 1);
        payload.put("colorHexa", "#000000");

        when(servicioRepository.findById(1)).thenReturn(Optional.of(servicioEjemplo));
        when(pisoRepository.save(any(PisoEntity.class))).thenAnswer(i -> i.getArgument(0));

        PisoEntity result = pisoService.createPiso(payload);
        assertNotNull(result);
        assertEquals("Piso Nuevo", result.getNombre());
    }

    @Test
    @DisplayName("Debe lanzar excepción si el servicio no existe al crear")
    void createPisoServiceNotFoundTest() {
        Map<String, Object> payload = Map.of("nombre", "X", "servicioId", 99);
        when(servicioRepository.findById(99)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> pisoService.createPiso(payload));
    }

    @Test
    @DisplayName("Debe lanzar excepción si ocurre un error inesperado al asignar servicio")
    void createPisoErrorTest() {
        Map<String, Object> payload = Map.of("nombre", "X", "servicioId", "no-es-numero");
        assertThrows(RuntimeException.class, () -> pisoService.createPiso(payload));
    }

    // --- PRUEBAS DE ACTUALIZACIÓN ---

    @Test
    @DisplayName("Debe actualizar el piso y su plantilla correctamente")
    void updatePisoWithPlantillaTest() {
        Long idPiso = 10L;
        Long idPlantilla = 500L;

        Map<String, Object> payload = new HashMap<>();
        payload.put("nombre", "Piso Actualizado");
        payload.put("colorHexa", "#123456");
        payload.put("servicioId", 1);

        Map<String, Object> plantillaMap = new HashMap<>();
        plantillaMap.put("idPlantillaPiso", idPlantilla);
        payload.put("plantillaPiso", plantillaMap);

        PlantillaPisoEntity plantilla = new PlantillaPisoEntity();
        plantilla.setIdPlantillaPiso(idPlantilla);

        when(pisoRepository.findById(idPiso)).thenReturn(Optional.of(pisoEjemplo));
        when(servicioRepository.findById(1)).thenReturn(Optional.of(servicioEjemplo));
        when(plantillaPisoRepository.findById(idPlantilla)).thenReturn(Optional.of(plantilla));
        when(pisoRepository.save(any(PisoEntity.class))).thenReturn(pisoEjemplo);

        Map<String, Object> result = pisoService.updatePiso(idPiso, payload);
        assertNotNull(result);
        verify(pisoRepository).save(any(PisoEntity.class));
    }

    @Test
    @DisplayName("Debe manejar errores de actualización de servicio y nulos en update")
    void updatePisoErrorsTest() {
        assertNull(pisoService.updatePiso(null, new HashMap<>()));
        when(pisoRepository.findById(1L)).thenReturn(Optional.empty());
        assertNull(pisoService.updatePiso(1L, new HashMap<>()));

        // Error de casteo en servicioId
        when(pisoRepository.findById(10L)).thenReturn(Optional.of(pisoEjemplo));
        Map<String, Object> payloadError = Map.of("servicioId", "error");
        assertThrows(RuntimeException.class, () -> pisoService.updatePiso(10L, payloadError));
    }

    @Test
    @DisplayName("Debe desasignar plantilla si el payload viene como null")
    void updatePisoDesasignarPlantillaTest() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("plantillaPiso", null);

        when(pisoRepository.findById(10L)).thenReturn(Optional.of(pisoEjemplo));
        when(pisoRepository.save(any(PisoEntity.class))).thenReturn(pisoEjemplo);

        pisoService.updatePiso(10L, payload);
        verify(pisoRepository).save(argThat(p -> p.getPlantillaPiso() == null));
    }

    // --- PRUEBAS DE ELIMINACIÓN ---

    @Test
    @DisplayName("Debe retornar false al intentar eliminar un piso inexistente o con error")
    void deletePisoErrorsTest() {
        assertFalse(pisoService.deletePiso(null));
        when(pisoRepository.findById(99L)).thenReturn(Optional.empty());
        assertFalse(pisoService.deletePiso(99L));

        // Forzar catch de excepción
        when(pisoRepository.findById(10L)).thenReturn(Optional.of(pisoEjemplo));
        doThrow(new RuntimeException("Error DB")).when(pisoRepository).deleteById(10L);
        assertFalse(pisoService.deletePiso(10L));
    }

    @Test
    @DisplayName("Debe retornar true al eliminar exitosamente")
    void deletePisoSuccessTest() {
        when(pisoRepository.findById(10L)).thenReturn(Optional.of(pisoEjemplo));
        assertTrue(pisoService.deletePiso(10L));
        verify(pisoRepository).deleteById(10L);
    }

    @Test
    @DisplayName("Debe retornar la lista de todos los pisos sin filtros (Método simple)")
    void getAllPisosTest() {
        // Cubre el método getAllPisos() que devuelve List<PisoEntity>
        when(pisoRepository.findAll()).thenReturn(List.of(pisoEjemplo));
        List<PisoEntity> result = pisoService.getAllPisos();
        assertEquals(1, result.size());
        verify(pisoRepository).findAll();
    }

    @Test
    @DisplayName("Debe actualizar nombre y color sin afectar servicio ni plantilla")
    void updatePisoBasicFieldsOnlyTest() {
        // Cubre las ramas de updatePiso donde solo cambian nombre/color
        Map<String, Object> payload = new HashMap<>();
        payload.put("nombre", "Nuevo Nombre");
        payload.put("colorHexa", "#FFFFFF");
        // No incluimos servicioId ni plantillaPiso

        when(pisoRepository.findById(10L)).thenReturn(Optional.of(pisoEjemplo));
        when(pisoRepository.save(any(PisoEntity.class))).thenReturn(pisoEjemplo);

        pisoService.updatePiso(10L, payload);

        verify(pisoRepository).save(argThat(p ->
                p.getNombre().equals("Nuevo Nombre") &&
                        p.getColorHexa().equals("#FFFFFF")
        ));
    }

    @Test
    @DisplayName("Debe manejar el caso donde idPlantillaPiso no viene en el mapa de plantilla")
    void updatePisoPlantillaSinIdTest() {
        // Cubre la rama: else if (plantillaMap.containsKey("idPlantillaPiso")) siendo falso
        Map<String, Object> payload = new HashMap<>();
        payload.put("plantillaPiso", new HashMap<>()); // Mapa vacío, no tiene la key

        when(pisoRepository.findById(10L)).thenReturn(Optional.of(pisoEjemplo));
        when(pisoRepository.save(any(PisoEntity.class))).thenReturn(pisoEjemplo);

        pisoService.updatePiso(10L, payload);
        verify(pisoRepository).save(any(PisoEntity.class));
    }

    @Test
    @DisplayName("Debe lanzar excepción si falta el nombre en el payload")
    void createPisoFaltaNombreTest() {
        // 1. Setup: Payload sin "nombre"
        Map<String, Object> payload = new HashMap<>();
        payload.put("servicioId", 1);
        payload.put("colorHexa", "#FF0000");

        // 2. Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class, () ->
                pisoService.createPiso(payload)
        );

        assertEquals("Faltan campos requeridos: nombre, servicioId", exception.getMessage());
        verify(pisoRepository, never()).save(any());
    }

    @Test
    @DisplayName("Debe lanzar excepción si falta el servicioId en el payload")
    void createPisoFaltaServicioIdTest() {
        // 1. Setup: Payload sin "servicioId"
        Map<String, Object> payload = new HashMap<>();
        payload.put("nombre", "Piso de Prueba");

        // 2. Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class, () ->
                pisoService.createPiso(payload)
        );

        assertEquals("Faltan campos requeridos: nombre, servicioId", exception.getMessage());
        verify(pisoRepository, never()).save(any());
    }

    @Test
    @DisplayName("Debe lanzar excepción al actualizar si el servicioId no existe")
    void updatePisoServicioNoEncontradoTest() {
        // 1. Setup: Piso existente
        Long idPiso = 10L;
        PisoEntity pisoExistente = new PisoEntity();
        pisoExistente.setId(idPiso);
        pisoExistente.setNombre("Piso Antiguo");

        // 2. Payload con un servicioId que no existe
        Map<String, Object> payload = new HashMap<>();
        payload.put("servicioId", 999);

        // Mocks
        when(pisoRepository.findById(idPiso)).thenReturn(Optional.of(pisoExistente));
        // Simulamos que el servicio NO se encuentra
        when(servicioRepository.findById(999)).thenReturn(Optional.empty());

        // 3. Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class, () ->
                pisoService.updatePiso(idPiso, payload)
        );

        // El mensaje final es "Error al actualizar servicio: ..." debido al catch exterior
        assertTrue(exception.getMessage().contains("Servicio con ID 999 no encontrado"));

        // Verificamos que nunca se llegó a guardar el piso con datos erróneos
        verify(pisoRepository, never()).save(any());
    }
}