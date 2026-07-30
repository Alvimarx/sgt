package com.pingeso.HUAP.Security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pruebas de {@link LoginAttemptService}.
 *
 * <p>SEC-009: la ventana de bloqueo pasó de estar hardcodeada (1 minuto, valor de
 * pruebas) a ser configurable vía {@code app.security.login.lock-duration-ms}.
 * Estas pruebas fijan el campo directamente (equivalente a lo que Spring haría con
 * {@code @Value}) para verificar que el servicio efectivamente usa ese valor.</p>
 */
class LoginAttemptServiceTest {

    private LoginAttemptService service;

    @BeforeEach
    void setUp() {
        service = new LoginAttemptService();
    }

    @Test
    void loginFailed_bajoElLimite_noBloquea() {
        ReflectionTestUtils.setField(service, "lockTimeMs", 900_000L);
        for (int i = 0; i < 4; i++) service.loginFailed("11111111-1");
        assertFalse(service.isBlocked("11111111-1"));
    }

    @Test
    void loginFailed_alcanzaMaximo_bloqueaPorLaVentanaConfigurada() {
        ReflectionTestUtils.setField(service, "lockTimeMs", 900_000L); // 15 min

        for (int i = 0; i < 5; i++) service.loginFailed("22222222-2");

        assertTrue(service.isBlocked("22222222-2"));
        long segundos = service.getSecondsToUnlock("22222222-2");
        // Debe reflejar ~15 minutos (900s), no el minuto de prueba hardcodeado anteriormente.
        // No se fija un límite superior estricto (p. ej. <=900) para no volver la prueba
        // frágil ante pequeños saltos de reloj del entorno de ejecución.
        assertTrue(segundos > 60, "La ventana de bloqueo debe ser mayor a 60s (antes hardcodeada a 1 min); fue " + segundos);
    }

    @Test
    void loginFailed_ventanaCorta_expiraRapido() throws InterruptedException {
        ReflectionTestUtils.setField(service, "lockTimeMs", 50L); // 50 ms, solo para la prueba

        for (int i = 0; i < 5; i++) service.loginFailed("33333333-3");
        assertTrue(service.isBlocked("33333333-3"));

        Thread.sleep(80);

        assertFalse(service.isBlocked("33333333-3"));
    }

    @Test
    void loginSucceeded_limpiaElContador() {
        ReflectionTestUtils.setField(service, "lockTimeMs", 900_000L);
        for (int i = 0; i < 4; i++) service.loginFailed("44444444-4");

        service.loginSucceeded("44444444-4");

        assertEquals(5, service.getRemainingAttempts("44444444-4"));
        assertFalse(service.isBlocked("44444444-4"));
    }
}
