package com.pingeso.HUAP.Config;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Qué rutas escribe solo el ADMINISTRADOR y cuáles también la gestión del servicio, según las
 * listas de {@link SecurityConfig}. El filtro niega las escrituras de GLOBAL_ADMIN_PATHS a todo
 * rol que no sea ADMINISTRADOR.
 */
class SecurityConfigRutasTest {

    private final List<String> global = List.of(SecurityConfig.GLOBAL_ADMIN_PATHS);
    private final List<String> servicio = List.of(SecurityConfig.SERVICE_ADMIN_PATHS);

    @Test
    void c10_lasReglasDeHorarioLasEscribeSoloElAdministrador() {
        assertTrue(global.contains("/api/v2/reglas-servicio/**"));
        assertFalse(servicio.contains("/api/v2/reglas-servicio/**"), "la gestión ya no escribe reglas");
    }

    @Test
    void c01_tiposDeTurnoRotativasYPlanificacionesLasEscribeSoloElAdministrador() {
        assertTrue(global.containsAll(List.of(
                "/api/v2/tipos-turno/**", "/api/v2/rotativas/**", "/api/v2/planificaciones/**")));
        assertTrue(servicio.stream().noneMatch(r -> r.contains("tipos-turno") || r.contains("rotativas")
                || r.contains("planificaciones")));
    }

    @Test
    void laGestionSigueEscribiendoPuestosYTurnosDeSuServicio() {
        assertTrue(servicio.containsAll(List.of("/api/v2/puestos/**", "/api/v2/turnos/**")));
    }
}
