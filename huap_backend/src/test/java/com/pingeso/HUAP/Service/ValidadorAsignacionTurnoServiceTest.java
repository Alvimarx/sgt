package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.TurnoEntity;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pruebas de {@link ValidadorAsignacionTurnoService}: solapamiento general y la regla de descanso
 * post-nocturno (R13): noche seguida de día prohibido, día seguido de noche (24 corridas) y noches
 * en días consecutivos permitidos. Todo por fecha/hora real, nunca por nombre del tipo.
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

    // ============================ Prohibido: noche seguida de día ("24 invertido") ============================

    @Test
    void nocturno_seguidoDeDiurnoEsaManana_rechazado() {
        // Nocturno 20:00 -> 08:00; diurno 08:00 -> 20:00 del día en que la noche termina.
        TurnoEntity nocturnoExistente = turnoDe12h(1L, LUNES, LocalTime.of(20, 0));
        LocalDateTime nuevoInicio = LUNES.plusDays(1).atTime(8, 0);
        LocalDateTime nuevoFin = nuevoInicio.plusHours(12);

        var ex = assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> validador.validarAsignacion("Juan Pérez", nuevoInicio, nuevoFin, 2L, List.of(nocturnoExistente)));
        assertTrue(ex.getMessage().contains("noche"));
    }

    @Test
    void candidatoNocturno_queDesembocaEnDiurnoYaAsignado_rechazado() {
        // Diurno existente el martes 08:00 -> 20:00; se intenta tomar la noche lunes 20:00 -> martes 08:00.
        // Es el mismo "24 invertido" visto desde el otro lado: también se rechaza.
        TurnoEntity diurnoExistente = turnoDe12h(1L, LUNES.plusDays(1), LocalTime.of(8, 0));
        LocalDateTime nuevoInicio = LUNES.atTime(20, 0);
        LocalDateTime nuevoFin = nuevoInicio.plusHours(12);

        var ex = assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> validador.validarAsignacion("Juan Pérez", nuevoInicio, nuevoFin, 2L, List.of(diurnoExistente)));
        assertTrue(ex.getMessage().contains("noche"));
    }

    @Test
    void horariosRealesDelServicio_noche13h_diurno11hDeEsaManana_rechazado() {
        // El caso que la regla antigua de "12 horas exactas" dejaba pasar (el bug grave):
        // noche real 20:00 -> 09:00 (13h) y día real 09:00 -> 20:00 (11h) de esa misma mañana.
        TurnoEntity nocturnoExistente = turno(1L, LUNES, LocalTime.of(20, 0), LUNES.plusDays(1), LocalTime.of(9, 0));
        LocalDateTime nuevoInicio = LUNES.plusDays(1).atTime(9, 0);
        LocalDateTime nuevoFin = LUNES.plusDays(1).atTime(20, 0);

        assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> validador.validarAsignacion("Juan", nuevoInicio, nuevoFin, 2L, List.of(nocturnoExistente)));
    }

    @Test
    void descansoCortoTrasLaNoche_diurnoDelMismoDia_rechazadoIgual() {
        // Salir de la noche a las 08:00 y entrar a un diurno a las 10:00 del mismo día sigue
        // siendo noche seguida de día: dos horas de descanso no lo convierten en legal.
        TurnoEntity nocturnoExistente = turnoDe12h(1L, LUNES, LocalTime.of(20, 0));
        LocalDateTime nuevoInicio = LUNES.plusDays(1).atTime(10, 0);
        LocalDateTime nuevoFin = nuevoInicio.plusHours(12);

        assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> validador.validarAsignacion("Juan", nuevoInicio, nuevoFin, 2L, List.of(nocturnoExistente)));
    }

    // ============================ Permitido: día seguido de noche (24 corridas) y noches seguidas ============================

    @Test
    void diurno_seguidoDeSuNocturnoEsaMismaTarde_24CorridasPermitido() {
        // Día 08:00 -> 20:00 y la noche que parte a las 20:00 de ese mismo día: legal.
        TurnoEntity diurnoExistente = turnoDe12h(1L, LUNES, LocalTime.of(8, 0));
        LocalDateTime nuevoInicio = LUNES.atTime(20, 0);
        LocalDateTime nuevoFin = nuevoInicio.plusHours(12);

        assertDoesNotThrow(() -> validador.validarAsignacion("Juan", nuevoInicio, nuevoFin, 2L, List.of(diurnoExistente)));
    }

    @Test
    void horariosRealesDelServicio_dia11h_masSuNoche13h_permitido() {
        // Con los horarios reales (día 09:00-20:00, noche 20:00-09:00) el 24 corrido también es legal.
        TurnoEntity diurnoExistente = turno(1L, LUNES, LocalTime.of(9, 0), LUNES, LocalTime.of(20, 0));
        LocalDateTime nuevoInicio = LUNES.atTime(20, 0);
        LocalDateTime nuevoFin = LUNES.plusDays(1).atTime(9, 0);

        assertDoesNotThrow(() -> validador.validarAsignacion("Juan", nuevoInicio, nuevoFin, 2L, List.of(diurnoExistente)));
    }

    @Test
    void nochesEnDiasConsecutivos_permitido() {
        // Noche lunes -> martes y noche martes -> miércoles: descansó el día de por medio.
        TurnoEntity nocheAnterior = turnoDe12h(1L, LUNES, LocalTime.of(20, 0));
        LocalDateTime nuevoInicio = LUNES.plusDays(1).atTime(20, 0);
        LocalDateTime nuevoFin = nuevoInicio.plusHours(12);

        assertDoesNotThrow(() -> validador.validarAsignacion("Juan", nuevoInicio, nuevoFin, 2L, List.of(nocheAnterior)));
    }

    @Test
    void diurnoTrasElDiaSiguienteCompleto_permitido() {
        // Nocturno lunes -> martes 08:00; diurno el MIÉRCOLES: día completo de descanso, legal.
        TurnoEntity nocturnoExistente = turnoDe12h(1L, LUNES, LocalTime.of(20, 0));
        LocalDateTime nuevoInicio = LUNES.plusDays(2).atTime(8, 0);
        LocalDateTime nuevoFin = nuevoInicio.plusHours(12);

        assertDoesNotThrow(() -> validador.validarAsignacion("Juan", nuevoInicio, nuevoFin, 2L, List.of(nocturnoExistente)));
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
