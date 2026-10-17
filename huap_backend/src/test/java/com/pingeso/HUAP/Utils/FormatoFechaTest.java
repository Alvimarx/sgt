package com.pingeso.HUAP.Utils;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * P-01: los mensajes al usuario muestran las fechas legibles («lun 20 oct, 20:00»), no en ISO
 * («2026-10-20T20:00»), con los mismos nombres cortos que el frontend.
 */
class FormatoFechaTest {

    @Test
    void diaYHora_sinIso() {
        assertEquals("lun 19 oct", FormatoFecha.dia(LocalDate.of(2026, 10, 19)));
        assertEquals("mar 20 oct, 20:00", FormatoFecha.diaHora(LocalDateTime.of(2026, 10, 20, 20, 0)));
        assertEquals("08:05", FormatoFecha.hora(LocalTime.of(8, 5, 30)));
        assertEquals("lun 19 oct, 20:00 a mar 20 oct, 08:00",
                FormatoFecha.intervalo(LocalDateTime.of(2026, 10, 19, 20, 0), LocalDateTime.of(2026, 10, 20, 8, 0)));
    }

    @Test
    void conAnio_paraLasVigencias() {
        assertEquals("jue 31 dic 2026", FormatoFecha.diaConAnio(LocalDate.of(2026, 12, 31)));
        assertEquals("vie 1 ene 2027", FormatoFecha.diaConAnio(LocalDate.of(2027, 1, 1)));
    }

    @Test
    void todosLosDiasYMeses_conTilde_ySinPunto() {
        LocalDate lunes = LocalDate.of(2026, 10, 19);
        String[] esperados = {"lun", "mar", "mié", "jue", "vie", "sáb", "dom"};
        for (int i = 0; i < 7; i++) {
            assertTrue(FormatoFecha.dia(lunes.plusDays(i)).startsWith(esperados[i] + " "));
        }
        assertEquals("dom 13 sep", FormatoFecha.dia(LocalDate.of(2026, 9, 13)));
    }

    @Test
    void nulos_quedanVacios() {
        assertEquals("", FormatoFecha.dia(null));
        assertEquals("", FormatoFecha.diaConAnio(null));
        assertEquals("", FormatoFecha.hora(null));
        assertEquals("", FormatoFecha.diaHora(null));
    }
}
