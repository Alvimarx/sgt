package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.TipoTurnoEntity;
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

    // ============================ C-04: solo R13, para la asignación manual ============================

    @Test
    void soloR13_noMiraElSolape_yRechazaLaNocheSeguidaDeDia() {
        TurnoEntity noche = turnoDe12h(1L, LUNES, LocalTime.of(20, 0));

        // Se cruza con la noche, pero el cruce lo revisa la asignación manual con su propio mensaje.
        assertDoesNotThrow(() -> validador.validarDescansoPostNocturno(
                "Juan", LUNES.atTime(22, 0), LUNES.plusDays(1).atTime(6, 0), 2L, List.of(noche)));

        LocalDateTime dia = LUNES.plusDays(1).atTime(8, 0);
        var ex = assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> validador.validarDescansoPostNocturno("Juan", dia, dia.plusHours(12), 2L, List.of(noche)));
        assertTrue(ex.getMessage().startsWith("No es posible asignar el turno a Juan porque sale de su turno de noche"));
        // El mismo turno, si viene en la lista, no se compara consigo mismo.
        assertDoesNotThrow(() -> validador.validarDescansoPostNocturno("Juan", dia, dia.plusHours(12), 1L, List.of(noche)));
    }

    // ============================ P-01: el turno que choca, con fecha legible ============================

    @Test
    void mensajes_citanElTurnoQueChocaConFechaLegible_noEnIso() {
        // LUNES es el lunes 8 de junio de 2026: la noche va del lun 8 a las 20:00 al mar 9 a las 08:00.
        TurnoEntity noche = turnoDe12h(1L, LUNES, LocalTime.of(20, 0));
        LocalDateTime diaInicio = LUNES.plusDays(1).atTime(8, 0);

        var r13 = assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> validador.validarAsignacion("Juan Pérez", diaInicio, diaInicio.plusHours(12), 2L, List.of(noche)));
        assertEquals("No es posible asignar el turno a Juan Pérez porque sale de su turno de noche "
                + "(lun 8 jun, 20:00 a mar 9 jun, 08:00) la mañana de ese mismo día. Se permite un día seguido "
                + "de su noche (24 horas corridas), pero no una noche seguida de día.", r13.getMessage());

        var solape = assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> validador.validarAsignacion("Juan Pérez", LUNES.atTime(22, 0), LUNES.plusDays(1).atTime(6, 0), 2L, List.of(noche)));
        assertTrue(solape.getMessage().endsWith("(lun 8 jun, 20:00 a mar 9 jun, 08:00)."), solape.getMessage());
        assertFalse(solape.getMessage().contains("T20:00"));
    }

    // ============================ RG-27 (A1-07): el cruce nombra el turno que choca ============================

    private static final long URGENCIAS = 4L;
    private static final long MEDICINA = 1L;

    private static TurnoEntity conTipo(TurnoEntity turno, String nombreTipo) {
        TipoTurnoEntity tipo = new TipoTurnoEntity();
        tipo.setNombre(nombreTipo);
        turno.setTipoTurno(tipo);
        return turno;
    }

    private static TurnoEntity deServicio(TurnoEntity turno, long idServicio, String nombre) {
        turno.setServicio(ServicioEntity.builder().idServicio(idServicio).nombre(nombre).build());
        return turno;
    }

    /** Un Día de Urgencias del lunes 8 de junio, de 08:00 a 20:00. */
    private static TurnoEntity diaDelLunes() {
        return deServicio(conTipo(turno(1L, LUNES, LocalTime.of(8, 0), LUNES, LocalTime.of(20, 0)), "Día"),
                URGENCIAS, "Urgencias");
    }

    private ValidadorAsignacionTurnoService.ConflictoAsignacionException cruce(TurnoEntity existente, Long idServicioCandidato) {
        return assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> validador.validarAsignacion("Persona de prueba", LUNES.atTime(8, 0), LUNES.atTime(20, 0), 2L,
                        List.of(existente), idServicioCandidato));
    }

    @Test
    void cruce_citaElTipoLaFechaYLasHorasDelTurnoQueChoca() {
        // El mismo servicio: no se repite el servicio, solo el tipo (Día) y la fecha y horas legibles de R13.
        var ex = cruce(diaDelLunes(), URGENCIAS);

        assertEquals("No es posible asignar el turno a Persona de prueba porque ya tiene otro turno asignado que "
                + "se superpone (Día, lun 8 jun, 08:00 a lun 8 jun, 20:00).", ex.getMessage());
    }

    @Test
    void cruce_conUnTurnoDeOtroServicio_nombraElServicio() {
        TurnoEntity noche = deServicio(conTipo(turno(1L, LUNES.minusDays(1), LocalTime.of(20, 0), LUNES, LocalTime.of(9, 0)),
                "Noche"), MEDICINA, "Medicina Interna");

        var ex = cruce(noche, URGENCIAS);

        assertTrue(ex.getMessage().endsWith("se superpone (Noche de Medicina Interna, dom 7 jun, 20:00 a lun 8 jun, 09:00)."),
                ex.getMessage());
    }

    @Test
    void cruce_sinTipoYDeOtroServicio_diceTurnoDeEseServicio() {
        TurnoEntity sinTipo = deServicio(turno(1L, LUNES, LocalTime.of(8, 0), LUNES, LocalTime.of(20, 0)), MEDICINA, "Medicina Interna");

        var ex = cruce(sinTipo, URGENCIAS);

        assertTrue(ex.getMessage().endsWith("se superpone (turno de Medicina Interna, lun 8 jun, 08:00 a lun 8 jun, 20:00)."),
                ex.getMessage());
    }

    @Test
    void cruce_sinConocerElServicioDelCandidato_noNombraServicio() {
        // La firma de siempre, sin servicio del candidato: el tipo y la fecha salen; el servicio, no.
        TurnoEntity deOtroServicio = deServicio(conTipo(turno(1L, LUNES, LocalTime.of(8, 0), LUNES, LocalTime.of(20, 0)),
                "Día"), MEDICINA, "Medicina Interna");

        var ex = assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> validador.validarAsignacion("Persona de prueba", LUNES.atTime(8, 0), LUNES.atTime(20, 0), 2L,
                        List.of(deOtroServicio)));

        assertTrue(ex.getMessage().endsWith("se superpone (Día, lun 8 jun, 08:00 a lun 8 jun, 20:00)."), ex.getMessage());
    }

    @Test
    void cruce_elTipoOElServicioNoSePuedenLeer_elAvisoSaleIgualConLaFecha() {
        // Los dos se cargan perezosamente: si fallan, el aviso no debe fallar con ellos y dejar sin 409 el rechazo.
        TipoTurnoEntity ilegible = new TipoTurnoEntity() {
            @Override public String getNombre() { throw new IllegalStateException("sin sesión"); }
        };
        TurnoEntity existente = turno(1L, LUNES, LocalTime.of(8, 0), LUNES, LocalTime.of(20, 0));
        existente.setTipoTurno(ilegible);
        existente.setServicio(new ServicioEntity() {
            @Override public String getNombre() { throw new IllegalStateException("sin sesión"); }
            @Override public Long getIdServicio() { return MEDICINA; }
        });

        var ex = cruce(existente, URGENCIAS);

        assertTrue(ex.getMessage().endsWith("se superpone (lun 8 jun, 08:00 a lun 8 jun, 20:00)."), ex.getMessage());
    }

    @Test
    void validarSolape_avisaElCruceCitandoElTurno_ynoMiraElDescansoPostNocturno() {
        // R13 no es lo suyo: una noche seguida de día pasa; el cruce, no.
        TurnoEntity noche = turnoDe12h(1L, LUNES.minusDays(1), LocalTime.of(20, 0)); // termina lun 08:00
        assertDoesNotThrow(() -> validador.validarSolape("Persona de prueba", LUNES.atTime(8, 0), LUNES.atTime(20, 0),
                2L, List.of(noche), URGENCIAS));

        var ex = assertThrows(ValidadorAsignacionTurnoService.ConflictoAsignacionException.class,
                () -> validador.validarSolape("Persona de prueba", LUNES.atTime(8, 0), LUNES.atTime(20, 0), 2L,
                        List.of(diaDelLunes()), URGENCIAS));
        assertTrue(ex.getMessage().endsWith("(Día, lun 8 jun, 08:00 a lun 8 jun, 20:00)."), ex.getMessage());
        // El propio candidato, si viene en la lista, no se compara consigo mismo.
        assertDoesNotThrow(() -> validador.validarSolape("Persona de prueba", LUNES.atTime(8, 0), LUNES.atTime(20, 0),
                1L, List.of(diaDelLunes()), URGENCIAS));
    }

    @Test
    void citarTurno_sinFechaOHoraCompletas_esNull() {
        assertNull(ValidadorAsignacionTurnoService.citarTurno(TurnoEntity.builder().idTurno(1L).build(), URGENCIAS));
        assertNull(ValidadorAsignacionTurnoService.citarTurno(null, URGENCIAS));
    }
}
