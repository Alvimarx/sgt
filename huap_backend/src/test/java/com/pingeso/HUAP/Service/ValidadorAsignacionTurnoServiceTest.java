package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.TurnoEntity;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pruebas de {@link ValidadorAsignacionTurnoService}: solapamiento general y la regla de secuencia
 * incompatible de dos turnos de 12 horas consecutivos sin descanso (corrección funcional "turnos de
 * 12 horas"). Todas las condiciones se determinan por fecha/hora/duración real, nunca por nombre.
 */
class ValidadorAsignacionTurnoServiceTest {

    private final ValidadorAsignacionTurnoService validador = new ValidadorAsignacionTurnoService();
    private static final LocalDate LUNES = LocalDate.of(2026, 6, 8);

    private static TurnoEntity turnoDe12h(long id, LocalDate diaInicio, LocalTime horaInicio) {
        LocalDateTime inicio = diaInicio.atTime(horaInicio);
        LocalDateTime fin = inicio.plusHours(12);
        return TurnoEntity.builder()
                .idTurno(id)
                .diaInicioTurno(diaInicio).horaInicio(horaInicio)
                .diaFinalTurno(fin.toLocalDate()).horaFin(fin.toLocalTime())
                .build();
    }

    private static TurnoEntity turno(long id, LocalDate diaInicio, LocalTime horaInicio, LocalDate diaFin, LocalTime horaFin) {
        return TurnoEntity.builder()
                .idTurno(id).diaInicioTurno(diaInicio).horaInicio(horaInicio).diaFinalTurno(diaFin).horaFin(horaFin).build();
    }

    // ============================ Caso A: turno de 12h existente ANTERIOR (típicamente "nocturno") ============================

    @Test
    void turnoNocturno12h_seguidoInmediatoDeTurnoDiurno12h_rechazado() {
        // Nocturno 20:00 -> 08:00 (12h), diurno inmediato 08:00 -> 20:00 (12h) el mismo día.
        TurnoEntity nocturnoExistente = turnoDe12h(1L, LUNES, LocalTime.of(20, 0));
        LocalDateTime nuevoInicio = LUNES.plusDays(1).atTime(8, 0);
        LocalDateTime nuevoFin = nuevoInicio.plusHours(12);

        var ex = assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> validador.validarAsignacion("Juan Pérez", nuevoInicio, nuevoFin, 2L, List.of(nocturnoExistente)));
        assertTrue(ex.getMessage().contains("inmediatamente anterior"));
    }

    // ============================ Caso B: turno de 12h existente POSTERIOR (típicamente "diurno") ============================

    @Test
    void turnoDiurno12hPosterior_alSolicitarTurnoNocturno12hInmediatoAnterior_rechazado() {
        // Diurno existente 08:00 -> 20:00 (12h); se intenta asignar un nocturno 20:00(día anterior) -> 08:00 (12h).
        TurnoEntity diurnoExistente = turnoDe12h(1L, LUNES.plusDays(1), LocalTime.of(8, 0));
        LocalDateTime nuevoInicio = LUNES.atTime(20, 0);
        LocalDateTime nuevoFin = nuevoInicio.plusHours(12); // termina exactamente cuando empieza el diurno

        var ex = assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> validador.validarAsignacion("Juan Pérez", nuevoInicio, nuevoFin, 2L, List.of(diurnoExistente)));
        assertTrue(ex.getMessage().contains("inmediatamente posterior"));
    }

    @Test
    void reglaEsSimetrica_noDependeDeCualEsDiurnoONocturno() {
        // Dos turnos de 12h adyacentes, sin importar el nombre/orientación: siempre se rechaza.
        TurnoEntity existente = turnoDe12h(1L, LUNES, LocalTime.of(6, 0)); // 06:00 -> 18:00
        LocalDateTime nuevoInicio = LUNES.atTime(18, 0); // empieza justo cuando el existente termina
        LocalDateTime nuevoFin = nuevoInicio.plusHours(12);

        assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> validador.validarAsignacion("Juan", nuevoInicio, nuevoFin, 2L, List.of(existente)));
    }

    // ============================ Casos permitidos ============================

    @Test
    void turnosDe12hSeparadosPorDescanso_permitido() {
        // Nocturno 20:00->08:00, luego diurno que empieza dos horas después (10:00), no exactamente adyacente.
        TurnoEntity nocturnoExistente = turnoDe12h(1L, LUNES, LocalTime.of(20, 0));
        LocalDateTime nuevoInicio = LUNES.plusDays(1).atTime(10, 0);
        LocalDateTime nuevoFin = nuevoInicio.plusHours(12);

        assertDoesNotThrow(() -> validador.validarAsignacion("Juan", nuevoInicio, nuevoFin, 2L, List.of(nocturnoExistente)));
    }

    @Test
    void turnosQueNoDuran12Horas_noActivanLaRegla() {
        // Turno existente de 8 horas adyacente a uno nuevo de 12 horas: la regla de 12h no aplica
        // porque el existente no dura 12 horas (aunque sean adyacentes).
        TurnoEntity existente8h = turno(1L, LUNES, LocalTime.of(0, 0), LUNES, LocalTime.of(8, 0));
        LocalDateTime nuevoInicio = LUNES.atTime(8, 0);
        LocalDateTime nuevoFin = nuevoInicio.plusHours(12);

        assertDoesNotThrow(() -> validador.validarAsignacion("Juan", nuevoInicio, nuevoFin, 2L, List.of(existente8h)));
    }

    @Test
    void turnoCandidatoExcluidoDeSuPropiaComparacion_noSeRechazaContraSiMismo() {
        TurnoEntity mismo = turnoDe12h(2L, LUNES, LocalTime.of(8, 0));
        LocalDateTime inicio = LUNES.atTime(8, 0);
        LocalDateTime fin = inicio.plusHours(12);

        assertDoesNotThrow(() -> validador.validarAsignacion("Juan", inicio, fin, 2L, List.of(mismo)));
    }

    // ============================ Solapamiento general (no específico de 12h) ============================

    @Test
    void solapamientoGeneral_turnosDeCualquierDuracionQueSeCruzan_rechazado() {
        TurnoEntity existente = turno(1L, LUNES, LocalTime.of(9, 0), LUNES, LocalTime.of(17, 0));
        LocalDateTime nuevoInicio = LUNES.atTime(10, 0);
        LocalDateTime nuevoFin = LUNES.atTime(11, 0);

        var ex = assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> validador.validarAsignacion("Juan", nuevoInicio, nuevoFin, 2L, List.of(existente)));
        assertTrue(ex.getMessage().contains("superpone"));
    }

    @Test
    void tocarseEnElBorde_sinSer12Horas_noEsConflicto() {
        TurnoEntity existente = turno(1L, LUNES, LocalTime.of(8, 0), LUNES, LocalTime.of(14, 0)); // 6h
        LocalDateTime nuevoInicio = LUNES.atTime(14, 0);
        LocalDateTime nuevoFin = LUNES.atTime(20, 0); // otras 6h, se tocan en el borde

        assertDoesNotThrow(() -> validador.validarAsignacion("Juan", nuevoInicio, nuevoFin, 2L, List.of(existente)));
    }

    // ============================ excluyendo() ============================

    @Test
    void excluyendo_quitaSoloLosIdsIndicados() {
        TurnoEntity a = turno(1L, LUNES, LocalTime.of(0, 0), LUNES, LocalTime.of(1, 0));
        TurnoEntity b = turno(2L, LUNES, LocalTime.of(0, 0), LUNES, LocalTime.of(1, 0));
        TurnoEntity c = turno(3L, LUNES, LocalTime.of(0, 0), LUNES, LocalTime.of(1, 0));

        List<TurnoEntity> resultado = validador.excluyendo(List.of(a, b, c), 2L, null);

        assertEquals(List.of(a, c), resultado);
    }
}
