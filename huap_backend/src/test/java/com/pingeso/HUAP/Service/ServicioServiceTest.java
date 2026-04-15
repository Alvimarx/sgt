package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.PersonalEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Repository.PersonalRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
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
class ServicioServiceTest {

    @Mock
    private ServicioRepository servicioRepository;

    @Mock
    private PersonalRepository personalRepository;

    @InjectMocks
    private ServicioService servicioService;

    private ServicioEntity servicioTest;
    private PersonalEntity responsable;
    private PersonalEntity subrogante;

    @BeforeEach
    void setUp() {
        // Configuración de entidades de prueba
        responsable = new PersonalEntity();
        responsable.setIdPersonal(1L);
        responsable.setNombre("Claudio");
        responsable.setApellidoPaterno("Arrau");

        subrogante = new PersonalEntity();
        subrogante.setIdPersonal(2L);
        subrogante.setNombre("Gabriela");
        subrogante.setApellidoPaterno("Mistral");

        servicioTest = new ServicioEntity(10, "UCI", 1, 2, true);

        // Inyección de campos lazy/read-only para Summary
        injectPrivateField(servicioTest, "responsable", responsable);
        injectPrivateField(servicioTest, "subrogante", subrogante);
    }

    private void injectPrivateField(Object target, String fieldName, Object value) {
        try {
            java.lang.reflect.Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // --- MÉTODOS DE LECTURA (GET) ---

    @Test
    @DisplayName("Debe obtener todos los servicios y sus resúmenes")
    void testGetAllServiciosAndSummary() {
        when(servicioRepository.findAll()).thenReturn(List.of(servicioTest));

        assertNotNull(servicioService.getAllServicios());
        List<Map<String, Object>> summary = servicioService.getAllServiciosSummary();

        assertFalse(summary.isEmpty());
        assertEquals("Claudio Arrau", summary.get(0).get("nombreResponsable"));
        verify(servicioRepository, times(2)).findAll();
    }

    @Test
    @DisplayName("Debe cubrir getServicioById en todos sus estados")
    void testGetServicioById_Paths() {
        when(servicioRepository.findById(10)).thenReturn(Optional.of(servicioTest));
        when(servicioRepository.findById(99)).thenReturn(Optional.empty());

        assertNotNull(servicioService.getServicioById(10));
        assertNull(servicioService.getServicioById(99));
        assertNull(servicioService.getServicioById(null));
    }

    @Test
    @DisplayName("Debe obtener resumen por ID o retornar null")
    void testGetServicioSummary_Paths() {
        when(servicioRepository.findById(10)).thenReturn(Optional.of(servicioTest));

        assertNotNull(servicioService.getServicioSummary(10));
        assertNull(servicioService.getServicioSummary(null));

        when(servicioRepository.findById(99)).thenReturn(Optional.empty());
        assertNull(servicioService.getServicioSummary(99));
    }

    @Test
    @DisplayName("Debe buscar por nombre y filtrar activos")
    void testSearchAndFilter() {
        when(servicioRepository.findByNombre("UCI")).thenReturn(Optional.of(servicioTest));
        when(servicioRepository.findAll()).thenReturn(List.of(servicioTest));

        assertNotNull(servicioService.getServicioByNombre("UCI"));
        assertNull(servicioService.getServicioByNombre(null));
        assertEquals(1, servicioService.getServiciosActivos().size());
    }

    // --- MÉTODOS DE CREACIÓN (CREATE) ---

    @Test
    @DisplayName("Create: Cubrir éxito y asignación manual de ID")
    void testCreateServicio_Success() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("nombre", "Pediatría");
        payload.put("idServicio", "101"); // Probar conversión de String a Integer
        payload.put("estado", true);

        when(servicioRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        ServicioEntity result = servicioService.createServicio(payload);
        assertEquals(101, result.getIdServicio());
        assertEquals("Pediatría", result.getNombre());
    }

    @Test
    @DisplayName("Create: Cubrir bloques catch y advertencias de log (idServicio e idResponsable)")
    void testCreateServicio_CatchBlocks() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("nombre", "Error Test");
        payload.put("idServicio", "INVALIDO"); // Dispara catch de idServicio
        payload.put("idResponsable", 999);
        payload.put("idSubrogante", "INVALIDO"); // Dispara catch de idSubrogante

        when(personalRepository.findById(999L)).thenReturn(Optional.empty()); // Dispara logger.warn
        when(servicioRepository.save(any())).thenReturn(servicioTest);

        assertDoesNotThrow(() -> servicioService.createServicio(payload));
    }

    @Test
    @DisplayName("Create: Lanza excepción si falta nombre")
    void testCreateServicio_Exception() {
        assertThrows(RuntimeException.class, () -> servicioService.createServicio(new HashMap<>()));
    }

    // --- MÉTODOS DE ACTUALIZACIÓN (UPDATE) ---

    @Test
    @DisplayName("Update: Cubrir actualización de todos los campos e idResponsable null")
    void testUpdateServicio_Full() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("nombre", "UCI Editada");
        payload.put("estado", "false"); // Prueba instanceof String
        payload.put("idResponsable", null); // Setear a null

        when(servicioRepository.findById(10)).thenReturn(Optional.of(servicioTest));
        when(servicioRepository.save(any())).thenReturn(servicioTest);

        Map<String, Object> result = servicioService.updateServicio(10, payload);
        assertNotNull(result);
        verify(servicioRepository).save(argThat(s -> s.getIdResponsable() == null));
    }

    @Test
    @DisplayName("Update: Cubrir excepciones en actualización de personal")
    void testUpdateServicio_ErrorCatch() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("idSubrogante", "ERROR_FORMATO");

        when(servicioRepository.findById(10)).thenReturn(Optional.of(servicioTest));

        assertThrows(RuntimeException.class, () -> servicioService.updateServicio(10, payload));
    }

    // --- MÉTODOS DE ELIMINACIÓN Y USUARIOS ---

    @Test
    @DisplayName("Delete: Cubrir éxito, fallo y catch de excepción")
    void testDeleteServicio_AllPaths() {
        // No existe
        when(servicioRepository.findById(99)).thenReturn(Optional.empty());
        assertFalse(servicioService.deleteServicio(99));

        // Excepción en repositorio
        when(servicioRepository.findById(10)).thenReturn(Optional.of(servicioTest));
        doThrow(new RuntimeException("DB Error")).when(servicioRepository).deleteById(10);
        assertFalse(servicioService.deleteServicio(10));
    }

    @Test
    @DisplayName("GetUsuarios: Cubrir concatenación de apellidos y lista vacía")
    void testGetUsuariosByServicio_Coverage() {
        // Caso con apellidos completos
        PersonalEntity p1 = new PersonalEntity();
        p1.setIdPersonal(1L);
        p1.setApellidoPaterno("Perez");
        p1.setApellidoMaterno("Gonzalez");

        // Caso sin apellidos
        PersonalEntity p2 = new PersonalEntity();
        p2.setIdPersonal(2L);

        when(personalRepository.findAllByServicioId(10L)).thenReturn(List.of(p1, p2));

        List<Map<String, Object>> result = servicioService.getUsuariosByServicio(10);
        assertEquals(2, result.size());
        assertEquals("Perez Gonzalez", result.get(0).get("apellidos"));
        assertEquals("", result.get(1).get("apellidos"));

        assertTrue(servicioService.getUsuariosByServicio(null).isEmpty());
    }

    @Test
    @DisplayName("Update: Cobertura total de ramas y excepciones")
    void testUpdateServicio_FullCoverage() {
        // Preparar el servicio existente
        when(servicioRepository.findById(10)).thenReturn(Optional.of(servicioTest));
        when(servicioRepository.save(any(ServicioEntity.class))).thenReturn(servicioTest);

        // 1. Probar actualización de estado como Boolean y idResponsable como null
        Map<String, Object> payload1 = new HashMap<>();
        payload1.put("estado", false); // Cubre: estadoObj instanceof Boolean
        payload1.put("idResponsable", null); // Cubre: else { servicio.setIdResponsable(null); }

        servicioService.updateServicio(10, payload1);
        verify(servicioRepository, atLeastOnce()).save(argThat(s -> s.getEstado() == false && s.getIdResponsable() == null));

        // 2. Probar estado como String y responsable que no existe (Logger warn)
        Map<String, Object> payload2 = new HashMap<>();
        payload2.put("estado", "true"); // Cubre: else if (estadoObj instanceof String)
        payload2.put("idResponsable", 999);

        when(personalRepository.findById(999L)).thenReturn(Optional.empty()); // Cubre: if (responsable.isEmpty()) { logger.warn... }

        servicioService.updateServicio(10, payload2);

        // 3. Probar error de formato en subrogante (Logger error y RuntimeException)
        Map<String, Object> payload3 = new HashMap<>();
        payload3.put("idSubrogante", "texto-invalido"); // Dispara el catch de Integer.valueOf

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            servicioService.updateServicio(10, payload3);
        });

        assertTrue(exception.getMessage().contains("Error al actualizar subrogante"));
    }

    @Test
    @DisplayName("Update: Retorno null si no existe el ID o el servicio")
    void testUpdateServicio_NullPaths() {
        // Caso id null
        assertNull(servicioService.updateServicio(null, new HashMap<>()));

        // Caso servicio no encontrado en DB
        when(servicioRepository.findById(99)).thenReturn(Optional.empty());
        assertNull(servicioService.updateServicio(99, new HashMap<>()));
    }

    @Test
    @DisplayName("Create: Cobertura de estado como String y catch de idServicio")
    void testCreateServicio_EstadoStringAndCatchId() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("nombre", "Servicio Test");
        // 1. Cubre: else if (estadoObj instanceof String)
        payload.put("estado", "true");
        // 2. Cubre: catch (Exception e) en idServicio (al pasar algo que no sea número)
        payload.put("idServicio", "ABC");

        when(servicioRepository.save(any(ServicioEntity.class))).thenAnswer(i -> i.getArguments()[0]);

        ServicioEntity result = servicioService.createServicio(payload);

        assertTrue(result.getEstado());
        assertNull(result.getIdServicio()); // El catch silencia el error y no asigna el ID
        verify(servicioRepository).save(any());
    }

    @Test
    @DisplayName("Create: Cobertura de catch en responsable y subrogante no encontrado")
    void testCreateServicio_CatchesAndWarnings() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("nombre", "Servicio Especial");
        // 1. Cubre: catch (Exception e) en idResponsable (enviando algo que no se pueda convertir a Integer)
        payload.put("idResponsable", "ERROR_CONVERSION");

        // 2. Cubre: if (subrogante.isEmpty()) { logger.warn... }
        payload.put("idSubrogante", 999);
        when(personalRepository.findById(999L)).thenReturn(Optional.empty());

        when(servicioRepository.save(any(ServicioEntity.class))).thenAnswer(i -> i.getArguments()[0]);

        ServicioEntity result = servicioService.createServicio(payload);

        assertNotNull(result);
        // Verificamos que aunque el responsable falló por el catch, el subrogante se asignó tras el warn
        assertEquals(999, result.getIdSubrogante());
        verify(personalRepository).findById(999L);
    }

    @Test
    @DisplayName("Summary: Cobertura de ramas ELSE para responsables y subrogantes nulos")
    void testSummaryNullBranches() {
        // Creamos un servicio donde Responsable y Subrogante son NULL
        ServicioEntity sNull = new ServicioEntity(11, "Vacio", null, null, false);

        when(servicioRepository.findAll()).thenReturn(List.of(sNull));
        when(servicioRepository.findById(11)).thenReturn(Optional.of(sNull));

        // Ejecuta getAllServiciosSummary (Cubre m.put("nombreSubrogante", null))
        List<Map<String, Object>> list = servicioService.getAllServiciosSummary();
        // Ejecuta getServicioSummary (Cubre m.put("nombreResponsable", null) y subrogante null)
        Map<String, Object> summary = servicioService.getServicioSummary(11);

        assertNull(list.get(0).get("nombreSubrogante"));
        assertNull(summary.get("nombreResponsable"));
        assertNull(summary.get("nombreSubrogante"));
    }

    @Test
    @DisplayName("Update: Cobertura de Catch blocks que lanzan RuntimeException")
    void testUpdateUpdateCatchBlocks() {
        when(servicioRepository.findById(10)).thenReturn(Optional.of(servicioTest));

        // 1. Provocar catch en responsable
        Map<String, Object> p1 = new HashMap<>();
        p1.put("idResponsable", "TEXTO_INVALIDO");
        assertThrows(RuntimeException.class, () -> servicioService.updateServicio(10, p1));

        // 2. Provocar catch en subrogante
        Map<String, Object> p2 = new HashMap<>();
        p2.put("idSubrogante", "TEXTO_INVALIDO");
        assertThrows(RuntimeException.class, () -> servicioService.updateServicio(10, p2));
    }

    @Test
    @DisplayName("Update: Cobertura de subrogante no encontrado y limpieza a null")
    void testUpdateSubroganteBranches() {
        when(servicioRepository.findById(10)).thenReturn(Optional.of(servicioTest));
        when(servicioRepository.save(any())).thenReturn(servicioTest);

        // 1. Cubre: if (subrogante.isEmpty()) { logger.warn... }
        Map<String, Object> p1 = new HashMap<>();
        p1.put("idSubrogante", 999);
        when(personalRepository.findById(999L)).thenReturn(Optional.empty());

        servicioService.updateServicio(10, p1);
        verify(personalRepository).findById(999L);

        // 2. Cubre: else { servicio.setIdSubrogante(null); }
        Map<String, Object> p2 = new HashMap<>();
        p2.put("idSubrogante", null);

        servicioService.updateServicio(10, p2);
        verify(servicioRepository, atLeastOnce()).save(argThat(s -> s.getIdSubrogante() == null));
    }

    @Test
    @DisplayName("Create: Cobertura de catch silencioso en responsable")
    void testCreateResponsableCatch() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("nombre", "Servicio Test");
        payload.put("idResponsable", "ERROR_FORMATO"); // Dispara el catch de Integer.valueOf

        when(servicioRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        // No debe lanzar excepción, solo loguear el error internamente
        ServicioEntity res = servicioService.createServicio(payload);
        assertNull(res.getIdResponsable());
    }

    @Test
    @DisplayName("Delete: Cobertura del bloque try (eliminación exitosa)")
    void testDeleteServicio_SuccessPath() {
        // 1. Preparamos el mock para que encuentre el servicio (pasa el primer IF)
        when(servicioRepository.findById(10)).thenReturn(Optional.of(servicioTest));

        // 2. Simulamos que deleteById no lanza ninguna excepción
        doNothing().when(servicioRepository).deleteById(10);

        // 3. Ejecutamos: Esto entrará al bloque try, ejecutará la línea y retornará true
        boolean resultado = servicioService.deleteServicio(10);

        // 4. Verificaciones
        assertTrue(resultado);
        verify(servicioRepository, times(1)).deleteById(10);
    }
}