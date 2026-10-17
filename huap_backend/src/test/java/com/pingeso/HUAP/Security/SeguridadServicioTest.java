package com.pingeso.HUAP.Security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Pruebas del mecanismo central de autorización por servicio (item 9, puntos 10-12 de la
 * batería mínima de seguridad): {@link SeguridadServicio} es el único punto donde se
 * verifica que el recurso solicitado pertenezca al servicio de la sesión activa.
 */
class SeguridadServicioTest {

    private final SeguridadServicio seguridadServicio = new SeguridadServicio();

    @AfterEach
    void limpiarSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private void autenticarComo(Long id, String rol, String rolSistema, Long servicioId) {
        AuthenticatedUser principal = new AuthenticatedUser(id, "11111111-1", rol, rolSistema, servicioId);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null));
    }

    // ============================ Punto 10: SecurityContext ausente ============================

    @Test
    void sinSecurityContext_actual_lanzaAccessDenied() {
        // Sin autenticar: SecurityContextHolder queda con Authentication == null.
        assertThatThrownBy(seguridadServicio::actual)
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void sinSecurityContext_exigirMismoServicio_lanzaAccessDenied_noNPE() {
        assertThatThrownBy(() -> seguridadServicio.exigirMismoServicio(1L))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void principalDeTipoIncorrecto_esTratadoComoNoAutenticado() {
        // Un Authentication válido pero cuyo principal no es AuthenticatedUser (p. ej. un
        // filtro mal configurado) debe rechazarse igual que "no autenticado", no lanzar
        // ClassCastException.
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("no-es-un-AuthenticatedUser", null));

        assertThatThrownBy(seguridadServicio::actual)
                .isInstanceOf(AccessDeniedException.class);
    }

    // ============================ Punto 11: servicioId ausente en el recurso ============================

    @Test
    void noAdministrador_recursoSinServicio_exigirMismoServicio_lanzaAccessDenied() {
        autenticarComo(1L, "JEFATURA", "USUARIO", 100L);

        assertThatThrownBy(() -> seguridadServicio.exigirMismoServicio(null))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ============================ Punto 12: servicioId distinto al recurso ============================

    @Test
    void noAdministrador_servicioDelRecursoDistintoAlDeLaSesion_lanzaAccessDenied() {
        autenticarComo(1L, "JEFATURA", "USUARIO", 100L);

        assertThatThrownBy(() -> seguridadServicio.exigirMismoServicio(200L))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void noAdministrador_servicioDelRecursoIgualAlDeLaSesion_permitido() {
        autenticarComo(1L, "JEFATURA", "USUARIO", 100L);

        // No debe lanzar: si lo hiciera, JUnit falla el test por la excepción no capturada.
        seguridadServicio.exigirMismoServicio(100L);
    }

    @Test
    void administrador_recursoSinServicio_exento_permitido() {
        // El ADMINISTRADOR global no participa del alcance por servicio (item 4): puede
        // operar sobre recursos de cualquier servicio, incluso sin servicioId de sesión.
        autenticarComo(1L, null, "ADMINISTRADOR", null);

        seguridadServicio.exigirMismoServicio(999L);
        seguridadServicio.exigirMismoServicio(null);
    }

    @Test
    void administrador_servicioDeSesion_esNulo_idServicioActual_retornaNull() {
        autenticarComo(1L, null, "ADMINISTRADOR", null);

        assertThat(seguridadServicio.idServicioActual()).isNull();
        assertThat(seguridadServicio.esAdministrador()).isTrue();
    }

    // ============================ C-17: rol de gestión del servicio ============================

    @Test
    void esGestionDelServicio_jefaturaYSubrogante_si_medicoNo() {
        autenticarComo(1L, "JEFATURA", "USUARIO", 100L);
        assertThat(seguridadServicio.esGestionDelServicio()).isTrue();

        autenticarComo(1L, "SUBROGANTE", "USUARIO", 100L);
        assertThat(seguridadServicio.esGestionDelServicio()).isTrue();

        autenticarComo(1L, "MEDICO", "USUARIO", 100L);
        assertThat(seguridadServicio.esGestionDelServicio()).isFalse();
    }

    @Test
    void esGestionDelServicio_administradorSinRolDeServicio_no() {
        // El ADMINISTRADOR se reconoce con esAdministrador(); su rol de servicio puede ser nulo.
        autenticarComo(1L, null, "ADMINISTRADOR", null);
        assertThat(seguridadServicio.esGestionDelServicio()).isFalse();
    }

    // ============================ C-18: cómo se reconoce al administrador ============================

    @Test
    void elAdministradorSeReconoceSoloPorElRolDeSistemaADMINISTRADOR() {
        // El backend emite «ADMINISTRADOR» o «USUARIO» (Rol_Sistema); «ADMIN» no es un rol del sistema.
        autenticarComo(1L, "JEFATURA", "ADMINISTRADOR", 4L);
        assertThat(seguridadServicio.esAdministrador()).isTrue();

        autenticarComo(1L, "JEFATURA", "ADMIN", 4L);
        assertThat(seguridadServicio.esAdministrador()).isFalse();
        assertThatThrownBy(() -> seguridadServicio.exigirMismoServicio(2L)).isInstanceOf(AccessDeniedException.class);

        autenticarComo(1L, "JEFATURA", "USUARIO", 4L);
        assertThat(seguridadServicio.esAdministrador()).isFalse();
    }
}
