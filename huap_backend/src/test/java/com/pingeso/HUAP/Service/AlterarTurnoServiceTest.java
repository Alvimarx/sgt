package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.AlterarTurnoRequest;
import com.pingeso.HUAP.Entity.*;
import com.pingeso.HUAP.Repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AlterarTurnoServiceTest {

    @Mock
    private TurnoRepository turnoRepository;
    @Mock
    private PersonalRepository personalRepository;
    @Mock
    private EventLogService eventLogService;
    @Mock
    private NotificacionService notificacionService;

    @InjectMocks
    private AlterarTurnoService alterarTurnoService;

    private TurnoEntity turnoEjemplo;
    private PersonalEntity adminEjemplo;
    private PersonalEntity medicoAnterior;

    @BeforeEach
    void setUp() {
        adminEjemplo = new PersonalEntity();
        adminEjemplo.setIdPersonal(1L);
        adminEjemplo.setNombre("Admin");

        medicoAnterior = new PersonalEntity();
        medicoAnterior.setIdPersonal(2L);
        medicoAnterior.setNombre("Dr. Antiguo");

        turnoEjemplo = new TurnoEntity();
        turnoEjemplo.setId(10L);
        turnoEjemplo.setIdMedico(medicoAnterior.getIdPersonal());
        turnoEjemplo.setEstado("ASIGNADO");
        turnoEjemplo.setHoraInicio(LocalTime.of(8, 0));
        turnoEjemplo.setHoraFin(LocalTime.of(20, 0));
    }

    @Test
    @DisplayName("Debe desasignar un turno exitosamente")
    void desasignarTurnoSuccessTest() {
        AlterarTurnoRequest request = new AlterarTurnoRequest();
        request.setIdTurno(10L);
        request.setIdAdministrador(1L);
        request.setAccion("DESASIGNAR");
        request.setMotivo("Limpieza de personal");

        when(turnoRepository.findById(10L)).thenReturn(Optional.of(turnoEjemplo));
        when(personalRepository.findById(1L)).thenReturn(Optional.of(adminEjemplo));
        when(personalRepository.findById(2L)).thenReturn(Optional.of(medicoAnterior));
        when(turnoRepository.save(any(TurnoEntity.class))).thenReturn(turnoEjemplo);

        Map<String, Object> result = alterarTurnoService.alterarTurno(request);

        assertTrue((Boolean) result.get("success"));
        assertEquals("desasignado", result.get("accion"));
        assertNull(turnoEjemplo.getIdMedico());
        assertEquals("DISPONIBLE", turnoEjemplo.getEstado());
        verify(eventLogService).save(any(EventLogEntity.class));
    }

    @Test
    @DisplayName("Debe reasignar un turno a un nuevo médico")
    void reasignarTurnoSuccessTest() {
        PersonalEntity nuevoMedico = new PersonalEntity();
        nuevoMedico.setIdPersonal(3L);
        nuevoMedico.setNombre("Dr. Nuevo");

        AlterarTurnoRequest request = new AlterarTurnoRequest();
        request.setIdTurno(10L);
        request.setIdAdministrador(1L);
        request.setIdNuevoMedico(3L);
        request.setAccion("REASIGNAR");

        when(turnoRepository.findById(10L)).thenReturn(Optional.of(turnoEjemplo));
        when(personalRepository.findById(1L)).thenReturn(Optional.of(adminEjemplo));
        when(personalRepository.findById(2L)).thenReturn(Optional.of(medicoAnterior));
        when(personalRepository.findById(3L)).thenReturn(Optional.of(nuevoMedico));
        when(turnoRepository.save(any(TurnoEntity.class))).thenReturn(turnoEjemplo);

        Map<String, Object> result = alterarTurnoService.alterarTurno(request);

        assertEquals("reasignado", result.get("accion"));
        assertEquals(3L, turnoEjemplo.getIdMedico());
        verify(eventLogService).save(any(EventLogEntity.class));
    }

    @Test
    @DisplayName("Debe cambiar el horario de un turno")
    void cambiarHorasSuccessTest() {
        LocalTime nuevaInicio = LocalTime.of(9, 0);
        LocalTime nuevaFin = LocalTime.of(21, 0);

        AlterarTurnoRequest request = new AlterarTurnoRequest();
        request.setIdTurno(10L);
        request.setIdAdministrador(1L);
        request.setAccion("CAMBIAR_HORAS");
        request.setNuevaHoraInicio(nuevaInicio);
        request.setNuevaHoraFin(nuevaFin);

        when(turnoRepository.findById(10L)).thenReturn(Optional.of(turnoEjemplo));
        when(personalRepository.findById(1L)).thenReturn(Optional.of(adminEjemplo));
        when(turnoRepository.save(any(TurnoEntity.class))).thenReturn(turnoEjemplo);

        Map<String, Object> result = alterarTurnoService.alterarTurno(request);

        assertEquals("horario_modificado", result.get("accion"));
        assertEquals(nuevaInicio, turnoEjemplo.getHoraInicio());
        verify(turnoRepository).save(turnoEjemplo);
    }

    @Test
    @DisplayName("Debe lanzar excepción si el turno no existe")
    void turnoNoEncontradoTest() {
        AlterarTurnoRequest request = new AlterarTurnoRequest();
        request.setIdTurno(99L);

        when(turnoRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> alterarTurnoService.alterarTurno(request));
    }

    @Test
    @DisplayName("Debe lanzar excepción si la acción no es válida")
    void accionNoValidaTest() {
        AlterarTurnoRequest request = new AlterarTurnoRequest();
        request.setIdTurno(10L);
        request.setIdAdministrador(1L);
        request.setAccion("ACCION_FANTASMA");

        when(turnoRepository.findById(10L)).thenReturn(Optional.of(turnoEjemplo));
        when(personalRepository.findById(1L)).thenReturn(Optional.of(adminEjemplo));

        assertThrows(RuntimeException.class, () -> alterarTurnoService.alterarTurno(request));
    }

    @Test
    @DisplayName("Debe fallar REASIGNAR si falta el ID del nuevo médico")
    void reasignarSinIdMedicoTest() {
        AlterarTurnoRequest request = new AlterarTurnoRequest();
        request.setIdTurno(10L);
        request.setIdAdministrador(1L);
        request.setAccion("REASIGNAR");
        request.setIdNuevoMedico(null);

        when(turnoRepository.findById(10L)).thenReturn(Optional.of(turnoEjemplo));
        when(personalRepository.findById(1L)).thenReturn(Optional.of(adminEjemplo));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> alterarTurnoService.alterarTurno(request));
        assertTrue(ex.getMessage().contains("Debe especificar el ID del nuevo médico"));
    }

    @Test
    @DisplayName("Debe fallar CAMBIAR_HORAS si faltan las nuevas horas")
    void cambiarHorasFaltantesTest() {
        // 1. Setup del request con acción de cambio pero horas en null
        AlterarTurnoRequest request = new AlterarTurnoRequest();
        request.setIdTurno(10L);
        request.setIdAdministrador(1L);
        request.setAccion("CAMBIAR_HORAS");
        request.setNuevaHoraInicio(null); // Gatillo de la excepción
        request.setNuevaHoraFin(null);

        // 2. Mocks necesarios para llegar al bloque del switch
        when(turnoRepository.findById(10L)).thenReturn(Optional.of(turnoEjemplo));
        when(personalRepository.findById(1L)).thenReturn(Optional.of(adminEjemplo));

        // 3. Act & Assert
        RuntimeException ex = assertThrows(RuntimeException.class, () -> alterarTurnoService.alterarTurno(request));

        assertEquals("Debe especificar nueva hora de inicio y fin", ex.getMessage());

        // Verificamos que no se guardó el turno ni se registró evento
        verify(turnoRepository, never()).save(any());
        verify(eventLogService, never()).save(any());
    }

    // ================== TESTS PARA ACCIÓN ASIGNAR ==================

    @Test
    @DisplayName("Debe asignar un turno sin asignar a un médico exitosamente")
    void asignarTurnoSuccessTest() {
        // Crear turno SIN asignar (idMedico = null)
        TurnoEntity turnoSinAsignar = new TurnoEntity();
        turnoSinAsignar.setId(20L);
        turnoSinAsignar.setIdMedico(null); // SIN ASIGNAR
        turnoSinAsignar.setEstado("DISPONIBLE");
        turnoSinAsignar.setHoraInicio(LocalTime.of(8, 0));
        turnoSinAsignar.setHoraFin(LocalTime.of(20, 0));

        PersonalEntity nuevoMedico = new PersonalEntity();
        nuevoMedico.setIdPersonal(5L);
        nuevoMedico.setNombre("Dr. Asignado");
        nuevoMedico.setApellidoPaterno("Nuevo");

        AlterarTurnoRequest request = new AlterarTurnoRequest();
        request.setIdTurno(20L);
        request.setIdAdministrador(1L);
        request.setIdNuevoMedico(5L);
        request.setAccion("ASIGNAR");
        request.setMotivo("Asignación manual desde calendario");

        when(turnoRepository.findById(20L)).thenReturn(Optional.of(turnoSinAsignar));
        when(personalRepository.findById(1L)).thenReturn(Optional.of(adminEjemplo));
        when(personalRepository.findById(5L)).thenReturn(Optional.of(nuevoMedico));
        when(turnoRepository.save(any(TurnoEntity.class))).thenReturn(turnoSinAsignar);

        Map<String, Object> result = alterarTurnoService.alterarTurno(request);

        // Verificaciones
        assertTrue((Boolean) result.get("success"));
        assertEquals("asignado", result.get("accion"));
        assertEquals("Dr. Asignado", result.get("medicoAsignado"));
        assertEquals(5L, result.get("medicoId"));

        // Verificar que el turno fue actualizado
        assertEquals(5L, turnoSinAsignar.getIdMedico());
        assertEquals("ASIGNADO", turnoSinAsignar.getEstado());

        // Verificar que se registró en bitácora
        verify(eventLogService).save(any(EventLogEntity.class));
        verify(turnoRepository).save(turnoSinAsignar);
    }

    @Test
    @DisplayName("Debe fallar ASIGNAR si no se especifica el ID del médico")
    void asignarSinIdMedicoTest() {
        // Turno sin asignar
        TurnoEntity turnoSinAsignar = new TurnoEntity();
        turnoSinAsignar.setId(20L);
        turnoSinAsignar.setIdMedico(null);
        turnoSinAsignar.setEstado("DISPONIBLE");

        AlterarTurnoRequest request = new AlterarTurnoRequest();
        request.setIdTurno(20L);
        request.setIdAdministrador(1L);
        request.setAccion("ASIGNAR");
        request.setIdNuevoMedico(null); // Sin especificar

        when(turnoRepository.findById(20L)).thenReturn(Optional.of(turnoSinAsignar));
        when(personalRepository.findById(1L)).thenReturn(Optional.of(adminEjemplo));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> alterarTurnoService.alterarTurno(request));

        assertTrue(ex.getMessage().contains("Debe especificar el ID del médico a asignar"));
        verify(turnoRepository, never()).save(any());
        verify(eventLogService, never()).save(any());
    }

    @Test
    @DisplayName("Debe fallar ASIGNAR si el turno ya tiene un médico asignado")
    void asignarTurnoYaAsignadoTest() {
        // turnoEjemplo ya tiene idMedico = 2L (medicoAnterior)
        AlterarTurnoRequest request = new AlterarTurnoRequest();
        request.setIdTurno(10L);
        request.setIdAdministrador(1L);
        request.setIdNuevoMedico(5L);
        request.setAccion("ASIGNAR");
        request.setMotivo("Intento de asignar turno ya asignado");

        when(turnoRepository.findById(10L)).thenReturn(Optional.of(turnoEjemplo));
        when(personalRepository.findById(1L)).thenReturn(Optional.of(adminEjemplo));
        when(personalRepository.findById(2L)).thenReturn(Optional.of(medicoAnterior));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> alterarTurnoService.alterarTurno(request));

        assertTrue(ex.getMessage().contains("ya tiene un médico asignado"));
        assertTrue(ex.getMessage().contains("REASIGNAR"));
        verify(turnoRepository, never()).save(any());
        verify(eventLogService, never()).save(any());
    }

    @Test
    @DisplayName("alterarTurno: CAMBIAR_HORAS - Debe notificar al médico cuando se modifica el horario")
    void alterarTurnoCambiarHorasConMedicoTest() {
        // 1. Preparar el Request
        AlterarTurnoRequest request = new AlterarTurnoRequest();
        request.setIdTurno(10L);
        request.setIdAdministrador(1L);
        request.setAccion("CAMBIAR_HORAS");
        request.setNuevaHoraInicio(LocalTime.of(14, 0));
        request.setNuevaHoraFin(LocalTime.of(20, 0));
        request.setMotivo("Ajuste de demanda");

        // 2. Mock del Turno (con médico asignado e ID)
        TurnoEntity turno = new TurnoEntity();
        turno.setId(10L);
        turno.setIdMedico(5L); // El turno ya tiene médico
        turno.setDiaInicioTurno(LocalDate.of(2025, 12, 1));
        turno.setHoraInicio(LocalTime.of(8, 0));
        turno.setHoraFin(LocalTime.of(12, 0));

        // 3. Mock del Administrador
        PersonalEntity admin = new PersonalEntity();
        admin.setIdPersonal(1L);
        admin.setNombre("Admin");

        // 4. Mock del Médico Actual (para que medicoActual != null)
        PersonalEntity medicoActual = new PersonalEntity();
        medicoActual.setIdPersonal(5L);
        medicoActual.setNombre("Dr. House");

        // Configurar comportamiento de los repositorios
        when(turnoRepository.findById(10L)).thenReturn(Optional.of(turno));
        when(personalRepository.findById(1L)).thenReturn(Optional.of(admin)); // Busca al admin
        when(personalRepository.findById(5L)).thenReturn(Optional.of(medicoActual)); // Busca al médico del turno
        when(turnoRepository.save(any(TurnoEntity.class))).thenAnswer(i -> i.getArgument(0));

        // 5. Ejecutar el método
        Map<String, Object> resultado = alterarTurnoService.alterarTurno(request);

        // 6. Verificaciones (Assertions)
        assertTrue((Boolean) resultado.get("success"));
        assertEquals("horario_modificado", resultado.get("accion"));

        // Verificar que se llamó a crearNotificacion con los parámetros del bloque que te falta
        verify(notificacionService, times(1)).crearNotificacion(
                eq("CAMBIO_HORARIO"),
                contains("El horario de su turno del 2025-12-01 ha sido modificado"),
                contains("Horario modificado para Dr. House"),
                eq("INFORMATIVO"),
                eq(admin),
                eq(medicoActual)
        );

        // Verificar que el horario cambió en la entidad
        assertEquals(LocalTime.of(14, 0), turno.getHoraInicio());
        assertEquals(LocalTime.of(20, 0), turno.getHoraFin());
    }
}