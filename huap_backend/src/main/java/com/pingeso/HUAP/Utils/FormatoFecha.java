package com.pingeso.HUAP.Utils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Fechas y horas legibles para los mensajes que lee el usuario: errores de negocio,
 * notificaciones y observaciones de la bitácora (P-01). Concatenar un {@code LocalDateTime}
 * mostraba la fecha en ISO, como «2026-10-20T20:00»; aquí sale «mar 20 oct, 20:00».
 *
 * <p>Los nombres van fijos, sin depender del {@code Locale} ni de la versión de los datos CLDR
 * del JDK, y son los mismos del frontend ({@code turnoPresentacion.fechaLegible}).
 */
public final class FormatoFecha {

    private static final String[] DIAS = {"lun", "mar", "mié", "jue", "vie", "sáb", "dom"};
    private static final String[] MESES = {"ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"};

    private FormatoFecha() {
    }

    /** «lun 19 oct». */
    public static String dia(LocalDate fecha) {
        if (fecha == null) return "";
        return DIAS[fecha.getDayOfWeek().getValue() - 1] + " " + fecha.getDayOfMonth() + " "
                + MESES[fecha.getMonthValue() - 1];
    }

    /** «lun 19 oct 2026», para fechas que pueden caer en otro año (vigencias de planificación). */
    public static String diaConAnio(LocalDate fecha) {
        if (fecha == null) return "";
        return dia(fecha) + " " + fecha.getYear();
    }

    /** «20:00». */
    public static String hora(LocalTime hora) {
        if (hora == null) return "";
        return String.format("%02d:%02d", hora.getHour(), hora.getMinute());
    }

    /** «lun 19 oct, 20:00». */
    public static String diaHora(LocalDateTime fechaHora) {
        if (fechaHora == null) return "";
        return dia(fechaHora.toLocalDate()) + ", " + hora(fechaHora.toLocalTime());
    }

    /** «lun 19 oct, 20:00 a mar 20 oct, 08:00»: el intervalo de un turno. */
    public static String intervalo(LocalDateTime inicio, LocalDateTime fin) {
        return diaHora(inicio) + " a " + diaHora(fin);
    }
}
