package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.ResumenMesDTO;
import com.pingeso.HUAP.Entity.*;
import com.pingeso.HUAP.Repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PersonalServiceTest {

    @Mock
    private PersonalRepository personalRepository;
    @Mock
    private PisoRepository pisoRepository;
    @Mock
    private SolicitudRepository solicitudRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private ProfesionRepository profesionRepository;
    @Mock
    private TipoCargoRepository tipoCargoRepository;
    @Mock
    private TurnoRepository turnoRepository;

    @InjectMocks
    private PersonalService personalService;

    private PersonalEntity usuarioEjemplo;
    private ProfesionEntity profesionEjemplo;
    private TipoCargoEntity cargoEjemplo;

    @BeforeEach
    void setUp() {
        usuarioEjemplo = new PersonalEntity();
        usuarioEjemplo.setIdPersonal(1L);
        usuarioEjemplo.setNombre("Juan");
        usuarioEjemplo.setApellidoPaterno("Perez");
        usuarioEjemplo.setApellidoMaterno("Soto");
        usuarioEjemplo.setRut("12345678");
        usuarioEjemplo.setDv("K");
        usuarioEjemplo.setClave("hashed_password");
        usuarioEjemplo.setEstado(1);
        usuarioEjemplo.setIdServicio(10);
        usuarioEjemplo.setProfesion(5);

        profesionEjemplo = new ProfesionEntity();
        // Ajustado a tu modelo real
        profesionEjemplo.setIdProfesion(5L);
        profesionEjemplo.setNombre("Médico Cirujano");

        cargoEjemplo = new TipoCargoEntity();
        cargoEjemplo.setIdTipoCargo(1L);
        cargoEjemplo.setNombre("Planta");
    }

    // --- 1. TESTS DE AUTENTICACIÓN ---

    @Test
    @DisplayName("Debe autenticar con RUT sucio y contraseña correcta")
    void authenticateWithPasswordSuccessTest() {
        String rutSucio = "12.345.678-k";
        when(personalRepository.findByRut("12345678")).thenReturn(usuarioEjemplo);
        when(passwordEncoder.matches(eq("password123"), anyString())).thenReturn(true);

        PersonalEntity result = personalService.authenticateWithPassword(rutSucio, "password123");

        assertNotNull(result);
        assertEquals("12345678", result.getRut());
    }

    @Test
    @DisplayName("Debe fallar autenticación por diversos motivos")
    void authenticateFailuresTest() {
        when(personalRepository.findByRut(anyString())).thenReturn(usuarioEjemplo);

        // Contraseña incorrecta
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);
        assertNull(personalService.authenticateWithPassword("12345678", "wrong"));

        // Usuario Inactivo (estado != 1)
        usuarioEjemplo.setEstado(5);
        assertNull(personalService.authenticateWithPassword("12345678", "password123"));

        // RUT o Contraseña nula
        assertNull(personalService.authenticateWithPassword(null, "123"));
        assertNull(personalService.authenticateWithPassword("123", null));
    }

    @Test
    @DisplayName("Debe cubrir método legacy authenticate")
    void authenticateLegacyTest() {
        when(personalRepository.findByRut(anyString())).thenReturn(usuarioEjemplo);

        // Test con RUT limpio y sucio
        assertNotNull(personalService.authenticate("12345678K"));
        assertNotNull(personalService.authenticate("12.345.678-K"));

        // Caso no encontrado
        when(personalRepository.findByRut(anyString())).thenReturn(null);
        assertNull(personalService.authenticate("99999999"));
        assertNull(personalService.authenticate(null));
    }

    // --- 2. TESTS DE RESUMEN Y LISTADOS ---

    @Test
    @DisplayName("Debe generar lista de resúmenes con resolución de nombres")
    void getAllUsersSummaryTest() {
        usuarioEjemplo.setIdTipoCargo(1);
        // Corregido: Uso de Arrays.asList para evitar problemas de tipos en el mock
        when(personalRepository.findAllByServicioId(any())).thenReturn(Arrays.asList(usuarioEjemplo));
        when(profesionRepository.findById(5L)).thenReturn(Optional.of(profesionEjemplo));
        when(tipoCargoRepository.findById(1L)).thenReturn(Optional.of(cargoEjemplo));

        List<Map<String, Object>> result = personalService.getAllUsersSummary(10L);

        assertFalse(result.isEmpty());
        Map<String, Object> m = result.get(0);
        assertEquals("Juan", m.get("nombre"));
        assertEquals("Perez Soto", m.get("apellidos"));
        assertEquals("12345678-K", m.get("rut"));
    }

    @Test
    @DisplayName("Debe manejar ID de servicio nulo en getAllUsers")
    void getAllUsersNullServiceTest() {
        when(personalRepository.findAll()).thenReturn(Arrays.asList(usuarioEjemplo));
        List<PersonalEntity> result = personalService.getAllUsers(null);
        verify(personalRepository).findAll();
        assertFalse(result.isEmpty());
    }

    // --- 3. TESTS DE ESTADÍSTICAS Y DISPONIBILIDAD ---

    @Test
    @DisplayName("Debe calcular disponibilidad (activos vs inactivos)")
    void getAvailabilityByServicioTest() {
        when(personalRepository.countByEstadoAndServicioId(1, 10L)).thenReturn(2L);
        when(personalRepository.findAllByServicioId(10L))
                .thenReturn(Arrays.asList(usuarioEjemplo, new PersonalEntity()));

        Map<String, Object> result = personalService.getAvailabilityByServicio(10L);

        assertEquals(2L, result.get("activos"));
        assertEquals(0L, result.get("inactivos")); // total 1 (usuarioEjemplo) - activos 2 (mock) -> el código maneja
                                                   // lógicas de negocio
    }

    @Test
    @DisplayName("Debe calcular estadísticas de horas y utilización correctamente")
    void getHorasStatsByServicioTest() {
        when(personalRepository.findAllByServicioId(any())).thenReturn(Arrays.asList(usuarioEjemplo));

        // Turno de 10 horas
        TurnoEntity t = new TurnoEntity();
        t.setId(100L);
        t.setDiaInicioTurno(LocalDate.now());
        t.setDiaFinalTurno(LocalDate.now());
        t.setHoraInicio(LocalTime.of(8, 0));
        t.setHoraFin(LocalTime.of(18, 0));

        when(turnoRepository.findByIdMedico(1L)).thenReturn(Arrays.asList(t));

        Map<String, Object> stats = personalService.getHorasStatsByServicio(10L, 0, 10);

        assertNotNull(stats.get("medicos"));
        List<Map<String, Object>> medicos = (List<Map<String, Object>>) stats.get("medicos");
        assertEquals(10.0, medicos.get(0).get("horas_trabajadas"));
        assertEquals(10.0, medicos.get(0).get("horas_semanales"));
        assertEquals(10.0, medicos.get(0).get("horas_mensuales"));
    }

    @Test
    @DisplayName("Debe manejar errores en cálculos de duración de turnos")
    void getHorasStatsDurationErrorTest() {
        TurnoEntity tError = new TurnoEntity();
        tError.setDiaInicioTurno(null); // Esto causará una excepción al calcular LocalDateTime.of

        when(personalRepository.findAllByServicioId(any())).thenReturn(Arrays.asList(usuarioEjemplo));
        when(turnoRepository.findByIdMedico(anyLong())).thenReturn(Arrays.asList(tError));

        Map<String, Object> stats = personalService.getHorasStatsByServicio(10L, 0, 5);
        assertNotNull(stats); // Debe continuar a pesar del error interno (catch)
    }

    // --- 4. TESTS DE ACTUALIZACIÓN Y SOLICITUDES ---

    @Test
    @DisplayName("Debe actualizar usuario y manejar errores de parseo")
    void updateUserFullTest() {
        when(personalRepository.findById(1L)).thenReturn(Optional.of(usuarioEjemplo));

        Map<String, Object> payload = new HashMap<>();
        payload.put("nombre", "Juanito");
        payload.put("rut", "11111111-1");
        payload.put("horasAsignadas", "invalido"); // Forzar catch de NumberFormatException
        payload.put("estado", "activo");

        personalService.updateUser(1L, payload);

        verify(personalRepository).save(any());
        assertEquals("11111111", usuarioEjemplo.getRut());
    }

    @Test
    @DisplayName("Debe manejar errores en solicitudes")
    void solicitudesErrorHandlingTest() {
        when(solicitudRepository.findAllByMedicoSolicitanteServicioId(anyLong()))
                .thenThrow(new RuntimeException("DB Error"));

        assertTrue(personalService.getAllSolicitudesByServicioId(10L).isEmpty());

        when(solicitudRepository.findSolicitudCountsByServicioGroupedByDate(anyLong()))
                .thenThrow(new RuntimeException("DB Error"));

        assertTrue(personalService.getSolicitudCountsByServicioGroupedByDate(10L).isEmpty());
    }

    @Test
    @DisplayName("Debe mapear conteos de solicitudes correctamente")
    void getSolicitudCountsSuccessTest() {
        // 1. Definimos la fila como un Object[]
        Object[] row = new Object[] { "2025-01-01", 5L };

        // 2. Creamos la lista y la casteamos a (List) para que Mockito no se confunda
        // con los genéricos
        List<Object[]> rows = new ArrayList<>();
        rows.add(row);

        // 3. Mockeamos usando la lista tipada correctamente
        when(solicitudRepository.findSolicitudCountsByServicioGroupedByDate(10L))
                .thenReturn(rows);

        // Act
        List<ResumenMesDTO> result = personalService.getSolicitudCountsByServicioGroupedByDate(10L);

        // Assert
        assertFalse(result.isEmpty());
        assertEquals("2025-01-01", result.get(0).getFecha()); // Asegúrate que el DTO use getDia() o getFecha()
        assertEquals(5L, result.get(0).getTotal());
    }

    @Test
    @DisplayName("Debe encontrar usuario por RUT original si falla la búsqueda sin DV")
    void authenticateByOriginalRutTest() {
        String rutOriginal = "12.345.678-K";
        String cleanRut = "12345678K";
        String rutSinDv = "12345678";

        // Simulamos que la primera búsqueda (sin DV) devuelve null
        when(personalRepository.findByRut(rutSinDv)).thenReturn(null);
        // Simulamos que la segunda búsqueda (original) SÍ lo encuentra
        when(personalRepository.findByRut(rutOriginal)).thenReturn(usuarioEjemplo);

        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);

        PersonalEntity result = personalService.authenticateWithPassword(rutOriginal, "password123");

        assertNotNull(result);
        verify(personalRepository).findByRut(rutSinDv); // Primer intento
        verify(personalRepository).findByRut(rutOriginal); // Segundo intento (ÉXITO)
    }

    @Test
    @DisplayName("Debe encontrar usuario por RUT limpio completo si fallan los intentos anteriores")
    void authenticateByCleanRutTest() {
        String rutOriginal = "12.345.678-K";
        String cleanRut = "12345678K";
        String rutSinDv = "12345678";

        // Fallan los dos primeros intentos
        when(personalRepository.findByRut(rutSinDv)).thenReturn(null);
        when(personalRepository.findByRut(rutOriginal)).thenReturn(null);
        // El tercer intento (RUT limpio completo) tiene éxito
        when(personalRepository.findByRut(cleanRut)).thenReturn(usuarioEjemplo);

        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);

        PersonalEntity result = personalService.authenticateWithPassword(rutOriginal, "password123");

        assertNotNull(result);
        verify(personalRepository).findByRut(cleanRut); // Tercer intento (ÉXITO)
    }

    @Test
    @DisplayName("Debe capturar excepción en getAvailabilityByServicio y retornar valores en cero")
    void getAvailabilityByServicioExceptionTest() {
        // 1. Forzamos una excepción al llamar al conteo de activos
        // Se usa leniency o casting si el mockito es muy estricto con los tipos
        when(personalRepository.countByEstadoAndServicioId(eq(1), anyLong()))
                .thenThrow(new RuntimeException("Fallo de conexión a BD"));

        // 2. Ejecutamos el método
        Map<String, Object> out = personalService.getAvailabilityByServicio(10L);

        // 3. Verificamos que se ejecutaron las líneas del catch (valores por defecto)
        assertNotNull(out);
        assertEquals(0L, out.get("activos"));
        assertEquals(0L, out.get("inactivos"));
        assertEquals(0L, out.get("total"));
        assertEquals(0, out.get("porcentajeActivos"));

        // Verificamos que el error se intentó loguear (opcional pero recomendado)
        verify(personalRepository).countByEstadoAndServicioId(eq(1), anyLong());
    }

    @Test
    @DisplayName("Debe manejar activos nulos sin explotar")
    void getAvailabilityWithNullActivosTest() {
        when(personalRepository.countByEstadoAndServicioId(anyInt(), anyLong())).thenReturn(null);
        when(personalRepository.findAllByServicioId(anyLong())).thenReturn(new ArrayList<>());

        Map<String, Object> result = personalService.getAvailabilityByServicio(10L);
        assertEquals(0L, result.get("activos"));
    }

    @Test
    @DisplayName("Debe cubrir ramas alternativas de RUT, estado, rol y servicio en updateUser")
    void updateUserAlternativeBranchesTest() {
        // 1. Preparar el usuario existente en el mock
        when(personalRepository.findById(1L)).thenReturn(Optional.of(usuarioEjemplo));

        // 2. Crear un payload que dispare las ramas que te faltan:
        Map<String, Object> payload = new HashMap<>();

        // Dispara el 'else' de RUT (rut sin guion)
        payload.put("rut", "12345678K");

        // Dispara el 'else' de estado (no activo)
        payload.put("estado", "inactivo");

        // Dispara el bloque de rol
        payload.put("rol", "MEDICO_JEFE");

        // Dispara el bloque de servicioId exitoso
        payload.put("servicioId", "20");

        // Act
        personalService.updateUser(1L, payload);

        // Assert/Verify: Verificamos que el objeto guardado tenga los valores de las
        // ramas 'else'
        verify(personalRepository).save(argThat(u -> u.getRut().equals("12345678K") && // Rama else del RUT
                u.getEstado() == 5 && // Rama else del estado
                u.getRol().equals("MEDICO_JEFE") && // Bloque rol
                u.getIdServicio() == 20 // Bloque servicioId
        ));
    }

    @Test
    @DisplayName("Debe cubrir los bloques catch de errores de parseo en updateUser")
    void updateUserCatchBlocksTest() {
        when(personalRepository.findById(1L)).thenReturn(Optional.of(usuarioEjemplo));

        Map<String, Object> payload = new HashMap<>();
        // Forzar NumberFormatException en servicioId
        payload.put("servicioId", "no-soy-un-numero");
        // Forzar Exception en horasAsignadas
        payload.put("horasAsignadas", "error");

        // Act
        personalService.updateUser(1L, payload);

        // El código debe atrapar las excepciones, loguear el warn y continuar
        verify(personalRepository).save(any(PersonalEntity.class));
    }

    @Test
    @DisplayName("Debe lanzar UnsupportedOperationException al intentar crear un usuario")
    void createUserTest() {
        // No necesitamos un payload real porque el método lanza la excepción
        // inmediatamente
        Map<String, Object> payload = new HashMap<>();

        // Verificamos que se lance la excepción específica
        assertThrows(UnsupportedOperationException.class, () -> {
            personalService.createUser(payload);
        });
    }

    @Test
    @DisplayName("Debe cubrir la rama de usuarios vacíos")
    void getHorasStatsEmptyListTest() {
        // Simula lista vacía para entrar al if (usuarios.isEmpty())
        when(personalRepository.findAllByServicioId(anyLong())).thenReturn(new ArrayList<>());

        Map<String, Object> stats = personalService.getHorasStatsByServicio(1L, 0, 10);

        assertEquals(0, stats.get("total"));
        assertEquals(0.0, stats.get("promedio"));
        assertTrue(((List<?>) stats.get("medicos")).isEmpty());
    }

    @Test
    @DisplayName("Debe cubrir fallback de 160h, ordenamiento y médicos sin horas asignadas")
    void getHorasStatsFallbackAndSortTest() {
        // Medico 1: Sin horas asignadas pero con horas trabajadas (activará el else y
        // el if(horasTrabajadas > 0))
        PersonalEntity m1 = new PersonalEntity();
        m1.setIdPersonal(1L);
        m1.setNombre("Medico");
        m1.setApellidoPaterno("Uno");
        m1.setRut("111");

        // Medico 2: Con horas asignadas para probar el ordenamiento (B.compareTo(A))
        PersonalEntity m2 = new PersonalEntity();
        m2.setIdPersonal(2L);
        m2.setNombre("Medico");
        m2.setApellidoPaterno("Dos");
        m2.setRut("222");

        when(personalRepository.findAllByServicioId(anyLong())).thenReturn(Arrays.asList(m1, m2));

        // Turno para m1: 8 horas trabajadas
        TurnoEntity t1 = new TurnoEntity();
        t1.setDiaInicioTurno(LocalDate.now());
        t1.setDiaFinalTurno(LocalDate.now());
        t1.setHoraInicio(LocalTime.of(8, 0));
        t1.setHoraFin(LocalTime.of(16, 0));

        when(turnoRepository.findByIdMedico(1L)).thenReturn(List.of(t1));
        when(turnoRepository.findByIdMedico(2L)).thenReturn(new ArrayList<>());

        // Act
        Map<String, Object> stats = personalService.getHorasStatsByServicio(1L, 0, 10);

        // Assert
        List<Map<String, Object>> medicos = (List<Map<String, Object>>) stats.get("medicos");
        // Verificar ordenamiento: El de 100 horas debe ir primero que el de 0 horas
        assertEquals(100, medicos.get(0).get("horas_asignadas"));
        assertEquals(0, medicos.get(1).get("horas_asignadas"));

        // Verificar utilización fallback (8 horas trabajadas / 160 * 100 = 5.0%)
        assertEquals(5.0, medicos.get(1).get("utilization"));
    }

    @Test
    @DisplayName("Debe cubrir los bloques catch (Error en turnos y Error general)")
    void getHorasStatsCatchBlocksTest() {
        // Caso 1: Forzar catch interno (Error al obtener turnos para un médico)
        PersonalEntity m1 = new PersonalEntity();
        m1.setIdPersonal(1L);

        when(personalRepository.findAllByServicioId(1L)).thenReturn(List.of(m1));
        // Lanzamos excepción en la búsqueda de turnos
        when(turnoRepository.findByIdMedico(1L)).thenThrow(new RuntimeException("Error DB Turnos"));

        // Caso 2: Forzar catch externo (Error general en el try principal)
        // Lo logramos haciendo que getAllUsers falle cuando servicioId es 2
        when(personalRepository.findAllByServicioId(2L)).thenThrow(new RuntimeException("Error General"));

        // Ejecución Caso 1
        Map<String, Object> stats1 = personalService.getHorasStatsByServicio(1L, 0, 10);
        assertNotNull(stats1); // El flujo continúa por el catch interno

        // Ejecución Caso 2
        Map<String, Object> stats2 = personalService.getHorasStatsByServicio(2L, 0, 10);
        assertTrue(stats2.containsKey("error")); // Entró al catch externo
    }

    @Test
    @DisplayName("Debe resolver el nombre del tipo de cargo si el ID existe en getUserSummary")
    void getUserSummaryConTipoCargoTest() {
        // 1. Setup: Crear la entidad con un ID de tipo cargo
        Long userId = 10L;
        Integer tipoCargoId = 5;

        PersonalEntity usuario = new PersonalEntity();
        usuario.setIdPersonal(userId);
        usuario.setNombre("Claudio");
        usuario.setIdTipoCargo(tipoCargoId);
        usuario.setApellidoPaterno("Perez");
        usuario.setRut("12345678");
        usuario.setDv("9");
        usuario.setRol("MEDICO");
        usuario.setEstado(1);

        // 2. Setup: Crear la entidad de TipoCargo que devolverá el repositorio
        TipoCargoEntity tipoCargo = new TipoCargoEntity();
        tipoCargo.setIdTipoCargo(tipoCargoId.longValue());
        tipoCargo.setNombre("Planta");

        // 3. Mocks
        when(personalRepository.findById(userId)).thenReturn(Optional.of(usuario));
        when(tipoCargoRepository.findById(tipoCargoId.longValue())).thenReturn(Optional.of(tipoCargo));

        // 4. Act
        Map<String, Object> result = personalService.getUserSummary(userId);

        // 5. Assert
        assertNotNull(result);
        assertEquals("Planta", result.get("tipoCargoNombre"));
        verify(tipoCargoRepository, times(1)).findById(tipoCargoId.longValue());
    }

    @Test
    @DisplayName("Debe cubrir la conversión fallback de conteo de solicitudes en PersonalService")
    void getSolicitudCountsByServicioFallbackTest() {
        // 1. Setup: ID de servicio
        Long servicioId = 5L;

        // 2. Mock de datos: Fila donde el segundo elemento es un String "10"
        // Esto provocará un ClassCastException al intentar (Number) row[1]
        Object[] filaString = new Object[] { "2025-12-25", "10" };
        java.util.List<Object[]> rows = new java.util.ArrayList<>();
        rows.add(filaString);

        // Mockeamos el repositorio de solicitudes que usa el PersonalService
        when(solicitudRepository.findSolicitudCountsByServicioGroupedByDate(servicioId))
                .thenReturn(rows);

        // 3. Act
        java.util.List<com.pingeso.HUAP.DTO.ResumenMesDTO> result = personalService
                .getSolicitudCountsByServicioGroupedByDate(servicioId);

        // 4. Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(10L, result.get(0).getTotal()); // Validamos que el String "10" se convirtió a Long 10
        assertEquals("2025-12-25", result.get(0).getFecha());

        // Verificamos la interacción con el repositorio
        verify(solicitudRepository).findSolicitudCountsByServicioGroupedByDate(servicioId);
    }
}