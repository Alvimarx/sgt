package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.*;
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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SolicitudServiceTest {

    @Mock
    private SolicitudRepository solicitudRepository;
    @Mock
    private TurnoRepository turnoRepository;
    @Mock
    private PersonalRepository personalRepository;
    @Mock
    private EventLogService eventLogService;

    @InjectMocks
    private SolicitudService solicitudService;

    private PersonalEntity medico1;
    private TurnoEntity turno1;
    private SolicitudEntity solicitud1;

    @BeforeEach
    void setUp() {
        medico1 = new PersonalEntity();
        medico1.setIdPersonal(1L);
        medico1.setNombre("Dr. House");

        PisoEntity pisoDefault = new PisoEntity();
        pisoDefault.setId(10L);
        pisoDefault.setNombre("Piso 10");

        turno1 = new TurnoEntity();
        turno1.setId(100L);
        turno1.setPiso(pisoDefault);
        turno1.setDiaInicioTurno(LocalDate.now());
        turno1.setHoraInicio(LocalTime.of(8, 0));
        turno1.setHoraFin(LocalTime.of(20, 0));

        solicitud1 = new SolicitudEntity();
        solicitud1.setId(500L);
        solicitud1.setTipo("Cambio de turno");
        solicitud1.setEstado("Pendiente");
        solicitud1.setMedicoSolicitante(medico1);
        solicitud1.setTurno(turno1);
    }

    // --- TESTS DE BITÁCORA (registrarEvento) ---

    @Test
    @DisplayName("Debe registrar evento y manejar excepciones en la bitácora")
    void registrarEventoFullTest() throws Exception {
        Method method = SolicitudService.class.getDeclaredMethod("registrarEvento",
                String.class, String.class, PersonalEntity.class, SolicitudEntity.class,
                TurnoEntity.class, String.class, String.class, String.class, LocalDate.class, LocalDate.class);
        method.setAccessible(true);

        // Caso Éxito
        assertDoesNotThrow(() -> method.invoke(solicitudService, "TIPO", "DESC", medico1, solicitud1, turno1, "OLD", "NEW", "MOTIVO", null, null));
        verify(eventLogService, atLeastOnce()).save(any());

        // Caso Error (Catch)
        doThrow(new RuntimeException("Error bitacora")).when(eventLogService).save(any());
        assertDoesNotThrow(() -> method.invoke(solicitudService, "TIPO", "DESC", null, null, null, null, null, null, null, null));
    }

    // --- TESTS DE CONTEXTO DE SEGURIDAD ---

    @Test
    @DisplayName("Debe cubrir las ramas de obtención de usuario desde contexto")
    void obtenerUsuarioDesdeContextoTest() throws Exception {
        SecurityContext securityContext = mock(SecurityContext.class);
        Authentication auth = mock(Authentication.class);
        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(auth);

        Method method = SolicitudService.class.getDeclaredMethod("obtenerUsuarioDesdeContexto");
        method.setAccessible(true);

        // Caso Long
        when(auth.getPrincipal()).thenReturn(1L);
        when(personalRepository.findById(1L)).thenReturn(Optional.of(medico1));
        assertNotNull(method.invoke(solicitudService));

        // Caso String parseable
        when(auth.getPrincipal()).thenReturn("1");
        assertNotNull(method.invoke(solicitudService));

        // Caso Fallo (Contexto nulo)
        when(securityContext.getAuthentication()).thenReturn(null);
        assertNull(method.invoke(solicitudService));
    }

    // --- TESTS DE MAPEO (DTOs) ---

    @Test
    @DisplayName("Debe mapear turno a DetailDTO con las relaciones de la nueva estructura")
    void mapTurnoToDetailDTOTest() throws Exception {
        ServicioEntity servicio = new ServicioEntity();
        servicio.setId(1L);
        servicio.setNombre("Medicina");

        FuncionarioEntity funcionario = new FuncionarioEntity();
        funcionario.setIdFuncionario(5L);
        funcionario.setNombre("Juan");
        funcionario.setApelPat("Perez");

        turno1.setNombre("Turno Mañana");
        turno1.setServicio(servicio);
        turno1.setFuncionario(funcionario);
        turno1.setDiaFinalTurno(LocalDate.now().plusDays(1));

        Method method = SolicitudService.class.getDeclaredMethod("mapTurnoToDetailDTO", TurnoEntity.class);
        method.setAccessible(true);

        TurnoDetailDTO dto = (TurnoDetailDTO) method.invoke(solicitudService, turno1);

        assertEquals(100L, dto.getId());
        assertEquals("Turno Mañana", dto.getNombre());
        assertEquals(10L, dto.getIdPiso());
        assertEquals("Piso 10", dto.getNombrePiso());
        assertEquals(1L, dto.getIdServicio());
        assertEquals("Medicina", dto.getNombreServicio());
        assertEquals(5L, dto.getIdFuncionario());
        assertEquals("Juan Perez", dto.getNombreFuncionario());

        // Caso Nulo
        assertNull(method.invoke(solicitudService, (Object) null));
    }

    @Test
    @DisplayName("Debe mapear SolicitudEntity a ResponseDTO cubriendo tipos específicos")
    void mapToResponseDTOTest() throws Exception {
        Method method = SolicitudService.class.getDeclaredMethod("mapToResponseDTO", SolicitudEntity.class);
        method.setAccessible(true);

        // Caso Cambio de turno / Oferta
        solicitud1.setTipo("Cambio de turno");
        solicitud1.setTurnoDeSolicitanteId(100L);
        when(turnoRepository.findById(100L)).thenReturn(Optional.of(turno1));

        SolicitudResponseDTO res1 = (SolicitudResponseDTO) method.invoke(solicitudService, solicitud1);
        assertNotNull(res1.getTurnoPropio());

        // Caso Botar turno
        solicitud1.setTipo("Botar turno");
        SolicitudResponseDTO res2 = (SolicitudResponseDTO) method.invoke(solicitudService, solicitud1);
        assertNotNull(res2.getTurno());

        // Caso Cobertura (Turno directo)
        solicitud1.setTipo("Cobertura");
        solicitud1.setTurno(turno1);
        SolicitudResponseDTO res3 = (SolicitudResponseDTO) method.invoke(solicitudService, solicitud1);
        assertNotNull(res3.getTurno());
    }

    @Test
    @DisplayName("Debe cubrir excepciones en obtención de médico y turno (Causa de Reflection)")
    void obtenerHelpersExceptionsTest() {
        when(personalRepository.findById(anyLong())).thenReturn(Optional.empty());
        when(turnoRepository.findById(anyLong())).thenReturn(Optional.empty());

        // Corregido: La excepción real viene dentro de InvocationTargetException.getTargetException()
        InvocationTargetException exMedico = assertThrows(InvocationTargetException.class, () -> {
            Method m = SolicitudService.class.getDeclaredMethod("obtenerMedicoSolicitanteActual", Long.class);
            m.setAccessible(true);
            m.invoke(solicitudService, 999L);
        });
        assertTrue(exMedico.getTargetException() instanceof RuntimeException);

        InvocationTargetException exTurno = assertThrows(InvocationTargetException.class, () -> {
            Method m = SolicitudService.class.getDeclaredMethod("obtenerTurno", Long.class);
            m.setAccessible(true);
            m.invoke(solicitudService, 999L);
        });
        assertTrue(exTurno.getTargetException() instanceof RuntimeException);
    }

    // --- TESTS DE LISTADOS Y FILTROS ---

    @Test
    @DisplayName("Debe obtener solicitudes por médico con filtro 'todas' y filtros de estado")
    void obtenerSolicitudesPorMedicoYFiltroTest() {
        // Mock para filtro "todas"
        when(solicitudRepository.findAllByMedicoSolicitante_IdPersonalOrMedicoReceptor_IdPersonalOrderByFechaCreacionDesc(1L, 1L))
                .thenReturn(Arrays.asList(solicitud1));

        // Mock para filtro por estado específico (ej: "pendiente")
        // El código transforma "pendiente" -> "Pendiente"
        when(solicitudRepository.findAllByMedicoIdAndEstado(1L, "Pendiente"))
                .thenReturn(Arrays.asList(solicitud1));

        // Act & Assert
        List<SolicitudResponseDTO> resTodas = solicitudService.obtenerSolicitudesPorMedicoYFiltro(1L, "todas");
        assertFalse(resTodas.isEmpty());

        List<SolicitudResponseDTO> resPendiente = solicitudService.obtenerSolicitudesPorMedicoYFiltro(1L, "pendiente");
        assertFalse(resPendiente.isEmpty());
    }

    @Test
    @DisplayName("Debe obtener solicitudes globales y por estado global")
    void obtenerSolicitudesGlobalesTest() {
        when(solicitudRepository.findAllByOrderByFechaCreacionDesc()).thenReturn(Arrays.asList(solicitud1));
        when(solicitudRepository.findAllByEstadoOrderByFechaCreacionDesc("Aprobada")).thenReturn(Arrays.asList(solicitud1));

        assertFalse(solicitudService.obtenerTodasLasSolicitudesGlobal().isEmpty());
        assertFalse(solicitudService.obtenerSolicitudesPorEstadoGlobal("aprobada").isEmpty());
    }

    // --- TESTS DE CREACIÓN DE SOLICITUDES ---

    @Test
    @DisplayName("Debe crear solicitud de cobertura exitosamente usando el tipo por defecto del DTO")
    void crearSolicitudCoberturaTest() {
        SolicitudTurnoDTO dto = new SolicitudTurnoDTO();
        dto.setTurnoSolicitadoId(100L);
        dto.setMotivo("Falta personal");
        // No llamamos a setTipo() porque es final en el DTO

        when(personalRepository.findById(1L)).thenReturn(Optional.of(medico1));
        when(turnoRepository.findById(100L)).thenReturn(Optional.of(turno1));
        when(solicitudRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        SolicitudEntity result = solicitudService.crearSolicitudCobertura(dto, 1L);

        assertNotNull(result);
        assertEquals("Pendiente", result.getEstado());
        // Verificamos que tomó el valor 'final' del DTO
        assertEquals("Solicitud de cobertura", result.getTipo());
        verify(solicitudRepository).save(any());
    }

    @Test
    @DisplayName("Debe crear solicitud de permiso")
    void crearSolicitudPermisoTest() {
        SolicitudPermisoDTO dto = new SolicitudPermisoDTO();
        dto.setTipoPermiso("Licencia médica");
        dto.setDescripcion("Reposo");
        dto.setFechaInicioPermiso(LocalDateTime.now());

        when(personalRepository.findById(1L)).thenReturn(Optional.of(medico1));
        when(solicitudRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        SolicitudEntity result = solicitudService.crearSolicitudPermiso(dto, 1L);

        assertEquals("Permiso", result.getTipo());
        assertNotNull(result.getFechaCreacion());
    }

    @Test
    @DisplayName("Debe crear solicitud de intercambio")
    void crearSolicitudIntercambioTest() {
        SolicitudIntercambioDTO dto = new SolicitudIntercambioDTO();
        dto.setMedicoReceptorId(2L);
        dto.setTurnoDeseadoId(100L);
        dto.setTurnoPropioId(200L);

        PersonalEntity receptor = new PersonalEntity();
        receptor.setIdPersonal(2L);

        when(personalRepository.findById(1L)).thenReturn(Optional.of(medico1));
        when(personalRepository.findById(2L)).thenReturn(Optional.of(receptor));
        when(turnoRepository.findById(100L)).thenReturn(Optional.of(turno1));
        when(solicitudRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        SolicitudEntity result = solicitudService.crearSolicitudIntercambio(dto, 1L);

        assertEquals(2L, result.getMedicoReceptor().getIdPersonal());
    }

    // --- TEST CRÍTICO: OFERTA GLOBAL ---

    @Test
    @DisplayName("Debe crear solicitud de oferta para todos los doctores (Global corregido)")
    void crearSolicitudOfertaGlobalTest() {
        SolicitudOfertaDTO dto = new SolicitudOfertaDTO();
        dto.setTurnoOfrecidoId(100L);
        dto.setCondiciones("Pago extra");
        dto.setMedicoReceptorId(null);

        // IMPORTANTE: Seteamos el Rol para evitar el NullPointerException en el filtro
        PersonalEntity medicoOtro = new PersonalEntity();
        medicoOtro.setIdPersonal(3L);
        medicoOtro.setRol("MEDICO"); // <-- Esto evita el error

        // También seteamos el rol al solicitante por seguridad
        medico1.setRol("MEDICO");

        when(personalRepository.findById(1L)).thenReturn(Optional.of(medico1));
        when(personalRepository.findAll()).thenReturn(Arrays.asList(medico1, medicoOtro));
        when(solicitudRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        SolicitudEntity result = solicitudService.crearSolicitudOferta(dto, 1L);

        assertNotNull(result);
        verify(solicitudRepository, atLeastOnce()).save(any());
    }

    @Test
    @DisplayName("Debe lanzar excepción si no hay médicos para oferta global")
    void crearSolicitudOfertaGlobalEmptyTest() {
        SolicitudOfertaDTO dto = new SolicitudOfertaDTO();
        when(personalRepository.findById(1L)).thenReturn(Optional.of(medico1));
        // Solo está el solicitante en la lista
        when(personalRepository.findAll()).thenReturn(Arrays.asList(medico1));

        assertThrows(RuntimeException.class, () -> solicitudService.crearSolicitudOferta(dto, 1L));
    }

    @Test
    @DisplayName("Debe eliminar solicitud exitosamente y registrar el evento")
    void eliminarSolicitudPorIdSuccessTest() {
        // 1. Configurar solicitud con fechas de permiso para cubrir los operadores ternarios de registrarEvento
        solicitud1.setFechaInicioPermiso(LocalDateTime.of(2025, 12, 21, 8, 0));
        solicitud1.setFechaTerminoPermiso(LocalDateTime.of(2025, 12, 22, 20, 0));

        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));

        // 2. Mockear el contexto de seguridad para el actor (el usuario que elimina)
        SecurityContext securityContext = mock(SecurityContext.class);
        Authentication auth = mock(Authentication.class);
        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(auth);
        when(auth.getPrincipal()).thenReturn(1L);
        when(personalRepository.findById(1L)).thenReturn(Optional.of(medico1));

        // Act
        solicitudService.eliminarSolicitudPorId(500L);

        // Assert
        verify(solicitudRepository, times(1)).delete(solicitud1);
        // Verificamos que se llamó a la bitácora con el tipo de evento correcto
        verify(eventLogService, atLeastOnce()).save(argThat(event ->
                event.getTipoEvento().equals("SOLICITUD_ELIMINADA") &&
                        event.getFechaInicioAfectada() != null
        ));
    }

    @Test
    @DisplayName("Debe lanzar excepción si la solicitud a eliminar no existe")
    void eliminarSolicitudNotFoundTest() {
        when(solicitudRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class, () ->
                solicitudService.eliminarSolicitudPorId(999L)
        );

        assertTrue(exception.getMessage().contains("no encontrada"));
        verify(solicitudRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Debe cubrir catch de error en resolución de usuario desde contexto")
    void eliminarSolicitudContextErrorTest() {
        // 1. Configurar la solicitud
        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));

        // 2. Mockear el SecurityContext para que lance una excepción al intentar obtener la autenticación
        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenThrow(new RuntimeException("Contexto corrupto"));

        // Seteamos el contexto mockeado (esto sí lo permite Spring)
        SecurityContextHolder.setContext(securityContext);

        // 3. Ejecutar: No debe fallar porque obtenerUsuarioDesdeContexto tiene un try-catch que captura el error
        assertDoesNotThrow(() -> solicitudService.eliminarSolicitudPorId(500L));

        // Verificamos que al menos se intentó borrar la solicitud (la acción principal sigue)
        verify(solicitudRepository).delete(solicitud1);
    }

    // --- 5. GESTIÓN DE ESTADOS Y LÓGICA DE NEGOCIO ---

    @Test
    @DisplayName("Debe aprobar Solicitud de Cobertura y rechazar conflictos")
    void actualizarEstadoCoberturaConConflictosTest() {
        // 1. Setup: Solicitud de cobertura que será aprobada
        solicitud1.setTipo("Solicitud de cobertura");
        solicitud1.setEstado("Pendiente");
        solicitud1.setTurno(turno1);

        // Solicitud en conflicto (competidora)
        SolicitudEntity conflicto = new SolicitudEntity();
        conflicto.setId(600L);
        conflicto.setEstado("Pendiente");
        conflicto.setTurno(turno1);

        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));
        when(solicitudRepository.findAllByTurno_IdAndEstadoAndIdNot(100L, "Pendiente", 500L))
                .thenReturn(Arrays.asList(conflicto));
        when(turnoRepository.findById(100L)).thenReturn(Optional.of(turno1));
        when(personalRepository.findById(anyLong())).thenReturn(Optional.of(medico1));
        when(solicitudRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        // Mock Security Context para el aprobador
        SecurityContext context = mock(SecurityContext.class);
        Authentication auth = mock(Authentication.class);
        SecurityContextHolder.setContext(context);
        when(context.getAuthentication()).thenReturn(auth);
        when(auth.getPrincipal()).thenReturn(1L);

        // Act
        SolicitudEntity result = solicitudService.actualizarEstadoSolicitud(500L, "aprobada");

        // Assert
        assertEquals("Aprobada", result.getEstado());
        assertEquals("Rechazado", conflicto.getEstado()); // Verificamos rechazo automático
        assertEquals(1L, turno1.getIdMedico()); // Verificamos asignación del turno
        verify(solicitudRepository).saveAll(anyList()); // Verificamos guardado masivo de conflictos
    }

    @Test
    @DisplayName("Debe procesar Cambio de Turno (SWAP) exitosamente")
    void actualizarEstadoCambioTurnoSwapTest() {
        // Setup Swap
        PersonalEntity receptor = new PersonalEntity();
        receptor.setIdPersonal(2L);

        TurnoEntity turnoPropio = new TurnoEntity();
        turnoPropio.setId(200L);
        turnoPropio.setIdMedico(1L); // Era del solicitante

        solicitud1.setTipo("Cambio de turno");
        solicitud1.setMedicoReceptor(receptor);
        solicitud1.setTurnoDeSolicitanteId(200L); // Turno que entrega
        solicitud1.setTurno(turno1); // Turno que recibe (ID 100)
        turno1.setIdMedico(2L); // El turno 100 era del receptor

        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));
        when(turnoRepository.findById(200L)).thenReturn(Optional.of(turnoPropio));
        when(turnoRepository.findById(100L)).thenReturn(Optional.of(turno1));

        // Act
        solicitudService.actualizarEstadoSolicitud(500L, "aprobado");

        // Assert: Verificar intercambio de IDs de médicos
        assertEquals(2L, turnoPropio.getIdMedico());
        assertEquals(1L, turno1.getIdMedico());
    }

    @Test
    @DisplayName("Debe procesar Botar Turno liberando la propiedad")
    void actualizarEstadoBotarTurnoTest() {
        solicitud1.setTipo("Botar turno");
        solicitud1.setTurnoDeSolicitanteId(100L);
        turno1.setIdMedico(1L); // El médico 1 es el dueño

        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));
        when(turnoRepository.findById(100L)).thenReturn(Optional.of(turno1));

        solicitudService.actualizarEstadoSolicitud(500L, "aprobada");

        assertNull(turno1.getIdMedico()); // Turno liberado
        assertEquals("Disponible", turno1.getEstado());
    }

    @Test
    @DisplayName("Debe procesar Oferta de Turno asignando al receptor")
    void actualizarEstadoOfertaTurnoTest() {
        PersonalEntity receptor = new PersonalEntity();
        receptor.setIdPersonal(3L);
        receptor.setNombre("Dr."); receptor.setApellidoPaterno("Receptor");

        solicitud1.setTipo("Oferta de turno");
        solicitud1.setMedicoReceptor(receptor);
        solicitud1.setTurnoDeSolicitanteId(100L);

        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));
        when(turnoRepository.findById(100L)).thenReturn(Optional.of(turno1));

        solicitudService.actualizarEstadoSolicitud(500L, "aprobada");

        assertEquals(3L, turno1.getIdMedico());
        assertEquals("Asignado", turno1.getEstado());
    }

    @Test
    @DisplayName("Debe cubrir la rama de Rechazo de solicitud (Corregido)")
    void actualizarEstadoRechazoTest() {
        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));

        // IMPORTANTE: Mockear el save para evitar NullPointerException
        when(solicitudRepository.save(any(SolicitudEntity.class))).thenReturn(solicitud1);

        SolicitudEntity result = solicitudService.actualizarEstadoSolicitud(500L, "rechazada");

        assertNotNull(result);
        assertEquals("Rechazada", result.getEstado());
        verify(turnoRepository, never()).save(any());
    }

    @Test
    @DisplayName("Debe capturar excepciones generales en el proceso de actualización")
    void actualizarEstadoGeneralExceptionTest() {
        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));
        // Forzamos error al normalizar el estado (substring de string vacío o nulo)

        assertThrows(Exception.class, () -> {
            solicitudService.actualizarEstadoSolicitud(500L, "");
        });
    }

    @Test
    @DisplayName("Debe aceptar intercambio médico y mantener estado Pendiente")
    void actualizarRespuestaIntercambioAceptarTest() {
        solicitud1.setTipo("Cambio de turno");
        solicitud1.setEstado("Pendiente");

        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));
        when(solicitudRepository.save(any(SolicitudEntity.class))).thenReturn(solicitud1);

        SolicitudEntity result = solicitudService.actualizarRespuestaIntercambioMedico(500L, true);

        assertTrue(result.getAceptadoMedico());
        assertEquals("Pendiente", result.getEstado());
        verify(solicitudRepository).save(solicitud1);
    }

    @Test
    @DisplayName("Debe rechazar intercambio médico y cambiar estado a Rechazado")
    void actualizarRespuestaIntercambioRechazarTest() {
        solicitud1.setTipo("Cambio de turno");
        solicitud1.setEstado("Pendiente");

        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));
        when(solicitudRepository.save(any(SolicitudEntity.class))).thenReturn(solicitud1);

        SolicitudEntity result = solicitudService.actualizarRespuestaIntercambioMedico(500L, false);

        assertNull(result.getAceptadoMedico());
        assertEquals("Rechazado", result.getEstado());
    }

    @Test
    @DisplayName("Debe lanzar error al responder intercambio con tipo o estado inválido")
    void actualizarRespuestaIntercambioValidacionesTest() {
        // Caso tipo incorrecto
        solicitud1.setTipo("Permiso");
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud1));
        assertThrows(RuntimeException.class, () -> solicitudService.actualizarRespuestaIntercambioMedico(1L, true));

        // Caso estado ya procesado
        solicitud1.setTipo("Cambio de turno");
        solicitud1.setEstado("Aprobado");
        assertThrows(RuntimeException.class, () -> solicitudService.actualizarRespuestaIntercambioMedico(1L, true));
    }

    @Test
    @DisplayName("Debe validar que el usuario sea el médico receptor en actualizarAceptacionMedico")
    void actualizarAceptacionMedicoAutorizacionTest() {
        PersonalEntity receptorOriginal = new PersonalEntity();
        receptorOriginal.setIdPersonal(2L);
        solicitud1.setMedicoReceptor(receptorOriginal);
        solicitud1.setTipo("Cambio de turno");

        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));

        // Intentamos responder con ID de médico 3 (No autorizado)
        assertThrows(RuntimeException.class, () ->
                solicitudService.actualizarAceptacionMedico(500L, true, 3L)
        );
    }

    @Test
    @DisplayName("Debe aceptar oferta de turno exitosamente")
    void actualizarRespuestaOfertaAceptarTest() {
        solicitud1.setTipo("Oferta de turno");
        solicitud1.setEstado("Pendiente");

        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));
        when(solicitudRepository.save(any(SolicitudEntity.class))).thenReturn(solicitud1);

        SolicitudEntity result = solicitudService.actualizarRespuestaOfertaMedico(500L, true);

        assertEquals(true, result.getAceptadoMedico());
        assertEquals("Pendiente", result.getEstado());
    }

    @Test
    @DisplayName("Debe rechazar oferta de turno y cerrar solicitud")
    void actualizarRespuestaOfertaRechazarTest() {
        solicitud1.setTipo("Oferta de turno");
        solicitud1.setEstado("Pendiente");

        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));
        when(solicitudRepository.save(any(SolicitudEntity.class))).thenReturn(solicitud1);

        SolicitudEntity result = solicitudService.actualizarRespuestaOfertaMedico(500L, false);

        assertEquals(false, result.getAceptadoMedico());
        assertEquals("Rechazado", result.getEstado());
    }

    @Test
    @DisplayName("Debe manejar error si la oferta no existe o no es tipo oferta")
    void actualizarRespuestaOfertaErroresTest() {
        // No encontrada
        when(solicitudRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> solicitudService.actualizarRespuestaOfertaMedico(99L, true));

        // Tipo incorrecto
        solicitud1.setTipo("Cambio de turno");
        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));
        assertThrows(RuntimeException.class, () -> solicitudService.actualizarRespuestaOfertaMedico(500L, true));
    }

    // --- TESTS DE CREACIÓN: BOTAR TURNO ---

    @Test
    @DisplayName("Debe crear solicitud de Botar Turno con tipo de autorización específico")
    void crearSolicitudBotarTurnoSuccessTest() {
        SolicitudBotarTurnoDTO dto = new SolicitudBotarTurnoDTO();
        dto.setMotivo("Asunto familiar");
        dto.setTipoAutorizacion("Licencia médica");
        dto.setTurnoId(100L);
        dto.setFechaInicio(LocalDateTime.now());
        dto.setFechaFin(LocalDateTime.now().plusDays(1));

        when(personalRepository.findById(1L)).thenReturn(Optional.of(medico1));
        when(solicitudRepository.save(any(SolicitudEntity.class))).thenAnswer(i -> i.getArguments()[0]);

        SolicitudEntity result = solicitudService.crearSolicitudBotarTurno(dto, 1L);

        assertNotNull(result);
        assertEquals("Botar turno", result.getTipo());
        assertEquals("Licencia médica", result.getTipoAutorizacion());
        assertEquals(100L, result.getTurnoDeSolicitanteId());
        verify(solicitudRepository).save(any());
    }

    @Test
    @DisplayName("Debe usar tipo de autorización por defecto si el DTO no lo incluye")
    void crearSolicitudBotarTurnoDefaultAuthTest() {
        SolicitudBotarTurnoDTO dto = new SolicitudBotarTurnoDTO();
        dto.setTipoAutorizacion(null); // Activará la rama else

        when(personalRepository.findById(1L)).thenReturn(Optional.of(medico1));
        when(solicitudRepository.save(any(SolicitudEntity.class))).thenAnswer(i -> i.getArguments()[0]);

        SolicitudEntity result = solicitudService.crearSolicitudBotarTurno(dto, 1L);

        assertEquals("Devolución de Turno", result.getTipoAutorizacion());
    }

    // --- TESTS DE PARSING (extractTurnoInfoLines) ---

    @Test
    @DisplayName("Debe extraer líneas de turnos correctamente según el formato esperado")
    void extractTurnoInfoLinesTest() throws Exception {
        // Obtenemos el método privado
        Method method = SolicitudService.class.getDeclaredMethod("extractTurnoInfoLines", String.class);
        method.setAccessible(true);

        // Caso 1: Motivo con formato correcto
        String motivoValido = "Quiero faltar.\nTurnos Afectados:\n• 21/12/2025 | Piso 3 | 08:00\n* 22/12/2025 | Piso 1 | 20:00";
        List<String> result = (List<String>) method.invoke(solicitudService, motivoValido);

        assertEquals(2, result.size());
        assertTrue(result.get(0).contains("21/12/2025"));

        // Caso 2: Motivo sin el separador "Turnos Afectados:"
        String motivoInvalido = "Solo texto sin separador";
        List<String> result2 = (List<String>) method.invoke(solicitudService, motivoInvalido);
        assertTrue(result2.isEmpty());

        // Caso 3: Motivo nulo
        List<String> result3 = (List<String>) method.invoke(solicitudService, (String) null);
        assertTrue(result3.isEmpty());

        // Caso 4: Líneas que no cumplen los filtros (no empiezan con •/* o no tienen |)
        String motivoMalFormateado = "Turnos Afectados:\nLinea sin viñeta\n• Linea sin pipe";
        List<String> result4 = (List<String>) method.invoke(solicitudService, motivoMalFormateado);
        assertTrue(result4.isEmpty());
    }
    @Test
    @DisplayName("Debe lanzar excepción si la oferta de turno ya no está Pendiente")
    void actualizarRespuestaOfertaEstadoNoPendienteTest() {
        // 1. Configuramos la solicitud con un estado diferente a Pendiente
        solicitud1.setTipo("Oferta de turno");
        solicitud1.setEstado("Aprobada"); // Ya procesada

        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));

        // 2. Verificamos que lance la RuntimeException con el mensaje esperado
        RuntimeException exception = assertThrows(RuntimeException.class, () ->
                solicitudService.actualizarRespuestaOfertaMedico(500L, true)
        );

        assertTrue(exception.getMessage().contains("La solicitud ya fue procesada"));
        // Verificamos que nunca llegó a intentar guardar cambios
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    @DisplayName("Debe lanzar excepción si el tipo de solicitud no es Cambio de turno en actualizarAceptacionMedico")
    void actualizarAceptacionMedicoTipoInvalidoTest() {
        // Configuramos una solicitud que NO es "Cambio de turno"
        solicitud1.setTipo("Permiso");

        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));

        RuntimeException exception = assertThrows(RuntimeException.class, () ->
                solicitudService.actualizarAceptacionMedico(500L, true, 1L)
        );

        assertTrue(exception.getMessage().contains("Solo se puede responder a solicitudes de Cambio de turno"));
    }

    @Test
    @DisplayName("Debe procesar la aceptación del médico receptor correctamente")
    void actualizarAceptacionMedicoAceptaTest() {
        // Setup solicitud válida
        solicitud1.setTipo("Cambio de turno");
        solicitud1.setEstado("Pendiente");
        solicitud1.setMedicoReceptor(medico1); // ID 1L

        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));
        when(personalRepository.findById(1L)).thenReturn(Optional.of(medico1));
        when(solicitudRepository.save(any(SolicitudEntity.class))).thenReturn(solicitud1);

        // Act: acepta = true
        SolicitudEntity result = solicitudService.actualizarAceptacionMedico(500L, true, 1L);

        // Assert
        assertTrue(result.getAceptadoMedico());
        verify(solicitudRepository).save(solicitud1);
        verify(eventLogService).save(argThat(event -> event.getTipoEvento().equals("INTERCAMBIO_ACEPTADO")));
    }

    @Test
    @DisplayName("Debe procesar el rechazo del médico receptor y cambiar estado a Rechazado")
    void actualizarAceptacionMedicoRechazaTest() {
        // Setup solicitud válida
        solicitud1.setTipo("Cambio de turno");
        solicitud1.setEstado("Pendiente");
        solicitud1.setMedicoReceptor(medico1); // ID 1L

        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));
        when(personalRepository.findById(1L)).thenReturn(Optional.of(medico1));
        when(solicitudRepository.save(any(SolicitudEntity.class))).thenReturn(solicitud1);

        // Act: acepta = false (entra en el bloque else)
        SolicitudEntity result = solicitudService.actualizarAceptacionMedico(500L, false, 1L);

        // Assert
        assertNull(result.getAceptadoMedico());
        assertEquals("Rechazado", result.getEstado());
        verify(eventLogService).save(argThat(event -> event.getTipoEvento().equals("INTERCAMBIO_RECHAZADO")));
    }

    @Test
    @DisplayName("Debe lanzar excepción si la solicitud no existe")
    void actualizarEstadoSolicitudNotFoundTest() {
        when(solicitudRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class, () ->
                solicitudService.actualizarEstadoSolicitud(999L, "aprobada")
        );

        assertTrue(exception.getMessage().contains("no encontrada"));
    }

    @Test
    @DisplayName("Debe cubrir asignación de turno por relación principal en Botar Turno")
    void actualizarEstadoBotarTurnoRelacionPrincipalTest() {
        // Configuramos para que entre en el else if (solicitud.getTurno() != null)
        solicitud1.setTipo("Botar turno");
        solicitud1.setTurnoDeSolicitanteId(null); // Nulo para forzar el else if
        solicitud1.setTurno(turno1); // Relación principal (ID 100)
        turno1.setIdMedico(1L);

        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));
        when(turnoRepository.findById(100L)).thenReturn(Optional.of(turno1));
        when(solicitudRepository.save(any())).thenReturn(solicitud1);

        solicitudService.actualizarEstadoSolicitud(500L, "aprobada");

        assertNull(turno1.getIdMedico());
    }

    @Test
    @DisplayName("Debe cubrir mensajes de fallo en Botar Turno (Turno no encontrado o no pertenece)")
    void actualizarEstadoBotarTurnoFallosTest() {
        solicitud1.setTipo("Botar turno");
        solicitud1.setTurnoDeSolicitanteId(999L);

        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));
        // Caso: Turno no encontrado en BD
        when(turnoRepository.findById(999L)).thenReturn(Optional.empty());

        // Ejecutamos (esto imprimirá los System.err.println de FALLO en consola)
        assertDoesNotThrow(() -> solicitudService.actualizarEstadoSolicitud(500L, "aprobada"));

        // Caso: Turno pertenece a otro médico
        TurnoEntity turnoAjeno = new TurnoEntity();
        turnoAjeno.setId(999L);
        turnoAjeno.setIdMedico(88L); // Diferente al médico solicitante (1L)
        when(turnoRepository.findById(999L)).thenReturn(Optional.of(turnoAjeno));

        assertDoesNotThrow(() -> solicitudService.actualizarEstadoSolicitud(500L, "aprobada"));
    }

    @Test
    @DisplayName("Debe cubrir lógica de Solicitud de Turno y sus excepciones")
    void actualizarEstadoSolicitudDeTurnoTest() {
        solicitud1.setTipo("Solicitud de turno");
        solicitud1.setTurno(turno1);

        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));
        when(turnoRepository.findById(100L)).thenReturn(Optional.of(turno1));
        when(solicitudRepository.save(any())).thenReturn(solicitud1);

        // Act
        solicitudService.actualizarEstadoSolicitud(500L, "aprobada");

        // Assert
        assertEquals(1L, turno1.getIdMedico());
        assertEquals("Asignado", turno1.getEstado());

        // Forzar catch en Solicitud de turno haciendo que el findById explote
        when(turnoRepository.findById(100L)).thenThrow(new RuntimeException("Error DB"));
        assertDoesNotThrow(() -> solicitudService.actualizarEstadoSolicitud(500L, "aprobada"));
    }

    @Test
    @DisplayName("Debe cubrir diferentes tipos de Principal en SecurityContext (Integer y String)")
    void actualizarEstadoSeguridadTiposTest() {
        solicitud1.setTipo("Solicitud de cobertura");
        solicitud1.setTurno(turno1);

        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));
        when(turnoRepository.findById(100L)).thenReturn(Optional.of(turno1));
        when(solicitudRepository.save(any())).thenReturn(solicitud1);

        // Mock Security Context
        SecurityContext context = mock(SecurityContext.class);
        Authentication auth = mock(Authentication.class);
        SecurityContextHolder.setContext(context);
        when(context.getAuthentication()).thenReturn(auth);

        // Caso: Principal es Integer
        when(auth.getPrincipal()).thenReturn(1);
        when(personalRepository.findById(1L)).thenReturn(Optional.of(medico1));
        solicitudService.actualizarEstadoSolicitud(500L, "aprobada");

        // Caso: Principal es String parseable
        when(auth.getPrincipal()).thenReturn("1");
        solicitudService.actualizarEstadoSolicitud(500L, "aprobada");

        // Caso: Principal es String NO parseable (NumberFormatException catch)
        when(auth.getPrincipal()).thenReturn("no-soy-numero");
        assertDoesNotThrow(() -> solicitudService.actualizarEstadoSolicitud(500L, "aprobada"));
    }

    @Test
    @DisplayName("Debe cubrir todos los bloques catch del método")
    void actualizarEstadoTodosLosCatchTest() {
        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));

        // Forzar catch en "Oferta de turno"
        solicitud1.setTipo("Oferta de turno");
        solicitud1.setTurnoDeSolicitanteId(100L);
        solicitud1.setMedicoReceptor(new PersonalEntity());
        when(turnoRepository.findById(100L)).thenThrow(new RuntimeException("Error Oferta"));
        assertDoesNotThrow(() -> solicitudService.actualizarEstadoSolicitud(500L, "aprobada"));

        // Forzar catch en "Cambio de turno"
        solicitud1.setTipo("Cambio de turno");
        when(turnoRepository.findById(anyLong())).thenThrow(new RuntimeException("Error Swap"));
        assertDoesNotThrow(() -> solicitudService.actualizarEstadoSolicitud(500L, "aprobada"));

        // Forzar catch final (Asignación tras aprobación)
        solicitud1.setTipo("Solicitud de cobertura");
        when(turnoRepository.findById(any())).thenThrow(new RuntimeException("Error Final"));
        assertDoesNotThrow(() -> solicitudService.actualizarEstadoSolicitud(500L, "aprobada"));
    }

    @Test
    @DisplayName("Debe cubrir fallos de ID de turno y errores de contexto de seguridad interno")
    void actualizarEstadoFallosEstructuralesTest() {
        // Setup para Botar Turno sin ID (Cubre el último 'else' de Botar Turno)
        solicitud1.setTipo("Botar turno");
        solicitud1.setTurnoDeSolicitanteId(null);
        solicitud1.setTurno(null); // Ambos nulos para disparar el System.err

        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));
        when(solicitudRepository.save(any())).thenReturn(solicitud1);

        assertDoesNotThrow(() -> solicitudService.actualizarEstadoSolicitud(500L, "aprobada"));

        // Setup para forzar catch (Exception ex2) en la resolución de aprobador
        solicitud1.setTipo("Solicitud de cobertura");
        solicitud1.setTurno(turno1);
        when(turnoRepository.findById(any())).thenReturn(Optional.of(turno1));

        // Mockeamos el contexto para que explote al llamar a getPrincipal()
        SecurityContext context = mock(SecurityContext.class);
        Authentication auth = mock(Authentication.class);
        SecurityContextHolder.setContext(context);
        when(context.getAuthentication()).thenReturn(auth);
        when(auth.getPrincipal()).thenThrow(new RuntimeException("Fallo de seguridad forzado"));

        assertDoesNotThrow(() -> solicitudService.actualizarEstadoSolicitud(500L, "aprobada"));
    }

    @Test
    @DisplayName("Debe liberar los turnos vinculados cuando se aprueba un permiso de tipo Feriado legal")
    void actualizarEstadoLiberacionPermisoCompletaTest() {
        // 1. Crear el turno que queremos liberar
        TurnoEntity turno = new TurnoEntity();
        turno.setId(100L);
        turno.setIdMedico(1L); // El '1' que veíamos en el error anterior
        turno.setEstado("Asignado");

        // 2. Configurar la solicitud
        SolicitudEntity solicitud = new SolicitudEntity();
        solicitud.setId(50L);
        solicitud.setEstado("Pendiente");
        solicitud.setTipo("Permiso");
        // "Feriado legal" está en tu lista TIPOS_PERMISO_LIBERACION
        solicitud.setTipoAutorizacion("Feriado legal");

        // IMPORTANTE: Tu lógica usa getTurnosAfectados()
        List<TurnoEntity> turnosAfectados = new ArrayList<>();
        turnosAfectados.add(turno);
        solicitud.setTurnosAfectados(turnosAfectados);

        // 3. Mocks de Repositorios
        when(solicitudRepository.findById(50L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.save(any(SolicitudEntity.class))).thenAnswer(i -> i.getArgument(0));
        // No necesitamos mockear saveAll si no verificamos el retorno, pero es buena práctica:
        when(turnoRepository.saveAll(anyList())).thenAnswer(i -> i.getArgument(0));

        // 4. IMPORTANTE: Simular el contexto de seguridad si el método falla por el aprobador
        // Si tu método obtenerUsuarioDesdeContexto() lanza error, podrías necesitar mockearlo
        // o usar un spy en el service. Suponiendo que devuelve null o un objeto vacío:

        // 5. Llamada al método correcto
        solicitudService.actualizarEstadoSolicitud(50L, "Aprobado");

        // 6. Asertos
        assertNull(turno.getIdMedico(), "El idMedico debe ser null después de liberar");
        assertEquals("Sin asignar", turno.getEstado(), "El estado debe ser 'Sin asignar'");

        // Verificar que se llamó al guardado de turnos
        verify(turnoRepository, times(1)).saveAll(anyList());
    }

    @Test
    @DisplayName("Debe asignar el aprobador al turno en Ofertas y Cambios")
    void actualizarEstadoAsignadorMetadatosTest() {
        // Setup Oferta
        solicitud1.setTipo("Oferta de turno");
        solicitud1.setTurnoDeSolicitanteId(100L);
        PersonalEntity receptor = new PersonalEntity();
        receptor.setIdPersonal(2L);
        solicitud1.setMedicoReceptor(receptor);

        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));
        when(turnoRepository.findById(100L)).thenReturn(Optional.of(turno1));
        when(solicitudRepository.save(any())).thenReturn(solicitud1);

        // Mock Security para que aprobador != null
        SecurityContext context = mock(SecurityContext.class);
        Authentication auth = mock(Authentication.class);
        SecurityContextHolder.setContext(context);
        when(context.getAuthentication()).thenReturn(auth);
        when(auth.getPrincipal()).thenReturn(1L);
        when(personalRepository.findById(1L)).thenReturn(Optional.of(medico1));

        solicitudService.actualizarEstadoSolicitud(500L, "aprobada");

        assertEquals(medico1, turno1.getAsignador());
    }

    @Test
    @DisplayName("Debe asignar el aprobador (Jefatura) al turno cuando la seguridad está activa")
    void actualizarEstadoConAprobadorTest() {
        // 1. Setup de la Solicitud (Tipo: Solicitud de turno para activar una de las ramas)
        solicitud1.setTipo("Solicitud de turno");
        solicitud1.setTurno(turno1);
        solicitud1.setMedicoSolicitante(medico1);

        // 2. Mocks de Repositorio
        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));
        when(turnoRepository.findById(100L)).thenReturn(Optional.of(turno1));
        when(solicitudRepository.save(any(SolicitudEntity.class))).thenReturn(solicitud1);

        // 3. Mock de Seguridad (Crucial para que aprobador != null)
        SecurityContext context = mock(SecurityContext.class);
        Authentication auth = mock(Authentication.class);
        SecurityContextHolder.setContext(context);

        Long idJefatura = 99L;
        PersonalEntity jefatura = new PersonalEntity();
        jefatura.setIdPersonal(idJefatura);
        jefatura.setNombre("Jefe de Servicio");

        when(context.getAuthentication()).thenReturn(auth);
        when(auth.getPrincipal()).thenReturn(idJefatura);
        when(personalRepository.findById(idJefatura)).thenReturn(Optional.of(jefatura));

        // 4. Act
        solicitudService.actualizarEstadoSolicitud(500L, "aprobada");

        // 5. Assert: Verificar que el asignador del turno sea la jefatura
        assertNotNull(turno1.getAsignador(), "El bloque if (aprobador != null) no se ejecutó");
        assertEquals(idJefatura, turno1.getAsignador().getIdPersonal());
        assertEquals("Asignado", turno1.getEstado());
    }

    @Test
    @DisplayName("Debe cubrir el catch de error al liberar turno en Botar Turno")
    void actualizarEstadoBotarTurnoCatchTest() {
        // 1. Setup: Solicitud de Botar Turno vinculada al Turno 100
        solicitud1.setTipo("Botar turno");
        solicitud1.setTurnoDeSolicitanteId(100L);
        solicitud1.setMedicoSolicitante(medico1);

        // El turno debe existir y pertenecer al médico para llegar al save
        turno1.setIdMedico(1L);

        when(solicitudRepository.findById(500L)).thenReturn(Optional.of(solicitud1));
        when(turnoRepository.findById(100L)).thenReturn(Optional.of(turno1));

        // 2. FORZAR EXCEPCIÓN: Hacemos que el save del turno falle
        // Esto disparará el catch (Exception ex) de la lógica de Botar Turno
        when(turnoRepository.save(any(TurnoEntity.class))).thenThrow(new RuntimeException("Error persistencia turno"));

        // Mock del save de solicitud para que el flujo principal continúe
        when(solicitudRepository.save(any())).thenReturn(solicitud1);

        // 3. Ejecutar
        assertDoesNotThrow(() -> solicitudService.actualizarEstadoSolicitud(500L, "aprobada"));

        // Verificamos que se imprimió el error (esto se verá en la consola del test)
        verify(turnoRepository).save(turno1);
    }

    @Test
    @DisplayName("Debe crear solicitud de oferta para un médico receptor específico")
    void crearSolicitudOfertaReceptorEspecificoTest() {
        // 1. Setup DTO con un ID de receptor
        SolicitudOfertaDTO dto = new SolicitudOfertaDTO();
        dto.setMedicoReceptorId(2L);
        dto.setTurnoOfrecidoId(100L);
        // SE ELIMINA: dto.setTipo("..."); ya que el campo es final y no tiene setter
        dto.setCondiciones("Te doy mi turno de mañana");

        PersonalEntity receptor = new PersonalEntity();
        receptor.setIdPersonal(2L);
        receptor.setNombre("Dr. Receptor");
        receptor.setApellidoPaterno("Perez"); // Agregado para evitar posibles NPE en logs

        when(personalRepository.findById(1L)).thenReturn(Optional.of(medico1));
        when(personalRepository.findById(2L)).thenReturn(Optional.of(receptor));

        // Hacemos que el save retorne la misma entidad que recibe
        when(solicitudRepository.save(any(SolicitudEntity.class))).thenAnswer(i -> i.getArguments()[0]);

        // 2. Act
        SolicitudEntity result = solicitudService.crearSolicitudOferta(dto, 1L);

        // 3. Assert
        assertNotNull(result);
        assertEquals(2L, result.getMedicoReceptor().getIdPersonal());
        assertEquals("Oferta de turno", result.getTipo()); // Verificamos que tomó el valor del DTO
        assertEquals("Pendiente", result.getEstado());
        verify(solicitudRepository, times(1)).save(any());
    }

    @Test
    @DisplayName("Debe lanzar excepción si el médico receptor específico no existe")
    void crearSolicitudOfertaReceptorNoEncontradoTest() {
        SolicitudOfertaDTO dto = new SolicitudOfertaDTO();
        dto.setMedicoReceptorId(999L);

        when(personalRepository.findById(1L)).thenReturn(Optional.of(medico1));
        when(personalRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () ->
                        solicitudService.crearSolicitudOferta(dto, 1L),
                "Médico receptor no encontrado"
        );
    }

    @Test
    @DisplayName("Debe lanzar excepción si no hay médicos disponibles para oferta masiva")
    void crearSolicitudOfertaSinMedicosDisponiblesTest() {
        // 1. Setup DTO sin receptor (activar oferta global)
        SolicitudOfertaDTO dto = new SolicitudOfertaDTO();
        dto.setMedicoReceptorId(null);
        dto.setCondiciones("Condiciones de prueba");

        // 2. Setup Médico Solicitante con ROL para evitar fallos en el filtro
        PersonalEntity solicitante = new PersonalEntity();
        solicitante.setIdPersonal(1L);
        solicitante.setRol("MEDICO");
        solicitante.setNombre("Dr. Solicitante");

        when(personalRepository.findById(1L)).thenReturn(Optional.of(solicitante));

        // Simulamos que en la DB solo existe el solicitante
        // Al ejecutar .filter(p -> !p.getIdPersonal().equals(1L)), la lista quedará vacía
        when(personalRepository.findAll()).thenReturn(List.of(solicitante));

        // 3. Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class, () ->
                solicitudService.crearSolicitudOferta(dto, 1L)
        );

        // Verificamos el mensaje exacto que definiste en tu código
        String mensajeEsperado = "No existen médicos disponibles para enviar la oferta (o solo queda el solicitante).";
        assertEquals(mensajeEsperado, exception.getMessage(), "El mensaje de error no coincide con el definido en el servicio");
    }

    @Test
    @DisplayName("Debe obtener y mapear solicitudes por ID de servicio")
    void obtenerSolicitudesPorServicioTest() {
        // 1. Setup: Creamos una entidad de solicitud vinculada al servicio
        SolicitudEntity entidad = new SolicitudEntity();
        entidad.setId(800L);
        entidad.setTipo("Cobertura");
        entidad.setEstado("Pendiente");
        entidad.setMedicoSolicitante(medico1); // medico1 ya está configurado en el @BeforeEach

        // 2. Mock: Simulamos que el repositorio encuentra la lista
        when(solicitudRepository.findAllByMedicoSolicitanteServicioId(10L))
                .thenReturn(Arrays.asList(entidad));

        // 3. Act: Llamamos al método del servicio
        List<SolicitudResponseDTO> resultado = solicitudService.obtenerSolicitudesPorServicio(10L);

        // 4. Assert: Verificamos que no sea nulo y que el mapeo ocurrió
        assertNotNull(resultado);
        assertEquals(1, resultado.size());
        assertEquals(800L, resultado.get(0).getId());
        assertEquals("Cobertura", resultado.get(0).getTipo());

        // Verificamos que se haya llamado al repositorio con el ID correcto
        verify(solicitudRepository, times(1)).findAllByMedicoSolicitanteServicioId(10L);
    }

    @Test
    @DisplayName("Debe cubrir el mapeo del médico receptor y del piso desde la relación directa")
    void mapToResponseDTOFullCoverageTest() throws Exception {
        PersonalEntity receptor = new PersonalEntity();
        receptor.setIdPersonal(2L);
        receptor.setNombre("Dr. Receptor");

        PisoEntity piso = new PisoEntity();
        piso.setId(10L);
        piso.setNombre("Piso 10");

        TurnoEntity turno = new TurnoEntity();
        turno.setId(100L);
        turno.setPiso(piso);

        solicitud1.setMedicoReceptor(receptor);
        solicitud1.setTipo("Cobertura");
        solicitud1.setTurno(turno);

        Method mapMethod = SolicitudService.class.getDeclaredMethod("mapToResponseDTO", SolicitudEntity.class);
        mapMethod.setAccessible(true);

        SolicitudResponseDTO result = (SolicitudResponseDTO) mapMethod.invoke(solicitudService, solicitud1);

        assertNotNull(result.getMedicoReceptor());
        assertEquals(2L, result.getMedicoReceptor().getId());
        assertEquals(10L, result.getTurno().getIdPiso());
        assertEquals("Piso 10", result.getTurno().getNombrePiso());
    }

    @Test
    @DisplayName("Debe vincular turnos afectados por ID al crear una solicitud de permiso")
    void crearSolicitudPermisoVinculaTurnosTest() {
        // 1. Setup DTO con IDs de turnos
        SolicitudPermisoDTO dto = new SolicitudPermisoDTO();
        dto.setTipoPermiso("Feriado legal");
        dto.setTurnosAfectadosIds(List.of(10L, 20L));
        dto.setFechaInicioPermiso(LocalDateTime.now());
        dto.setFechaTerminoPermiso(LocalDateTime.now().plusDays(1));

        // 2. Setup Turnos simulados
        TurnoEntity t1 = new TurnoEntity(); t1.setId(10L);
        TurnoEntity t2 = new TurnoEntity(); t2.setId(20L);
        List<TurnoEntity> turnosSimulados = List.of(t1, t2);

        // 3. Mocks
        when(personalRepository.findById(1L)).thenReturn(Optional.of(new PersonalEntity()));
        // CRUCIAL: Simulamos que el repo encuentra los turnos por ID
        when(turnoRepository.findAllById(dto.getTurnosAfectadosIds())).thenReturn(turnosSimulados);
        when(solicitudRepository.save(any(SolicitudEntity.class))).thenAnswer(i -> i.getArgument(0));

        // 4. Act
        SolicitudEntity resultado = solicitudService.crearSolicitudPermiso(dto, 1L);

        // 5. Assert
        assertNotNull(resultado.getTurnosAfectados());
        assertEquals(2, resultado.getTurnosAfectados().size());
        verify(turnoRepository).findAllById(anyList());
    }

    @Test
    @DisplayName("Debe capturar la excepción y no fallar si ocurre un error al liberar turnos")
    void actualizarEstadoSolicitudCatchExceptionLiberarTest() {
        // 1. Setup solicitud y turno para que entre al bloque de liberación
        TurnoEntity turno = new TurnoEntity();
        turno.setId(100L);

        SolicitudEntity solicitud = new SolicitudEntity();
        solicitud.setId(1L);
        solicitud.setTipo("Permiso");
        solicitud.setTipoAutorizacion("Feriado legal");
        solicitud.setTurnosAfectados(List.of(turno));

        // 2. Mocks
        when(solicitudRepository.findById(1L)).thenReturn(Optional.of(solicitud));

        // FORZAMOS LA EXCEPCIÓN: Al intentar guardar los turnos liberados, lanzamos error
        doThrow(new RuntimeException("Error simulado de DB")).when(turnoRepository).saveAll(anyList());

        // Mock para el save final de la solicitud para que el método termine
        when(solicitudRepository.save(any(SolicitudEntity.class))).thenAnswer(i -> i.getArgument(0));

        // 3. Act & Assert
        // Verificamos que aunque saveAll falló, el método NO lanza la excepción gracias al try-catch
        assertDoesNotThrow(() -> {
            solicitudService.actualizarEstadoSolicitud(1L, "Aprobado");
        });

        // Verificamos que el flujo intentó guardar la solicitud de todos modos al final
        verify(solicitudRepository).save(solicitud);
    }
}
