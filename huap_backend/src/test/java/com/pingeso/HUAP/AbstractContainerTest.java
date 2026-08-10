package com.pingeso.HUAP;

import com.pingeso.HUAP.Security.AuthenticatedUser;
import org.junit.jupiter.api.AfterEach;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.mysql.MySQLContainer;

import java.util.ArrayList;
import java.util.List;

/**
 * Base para los tests que necesitan una BD real. Levanta UN único MySQL (Testcontainers) para toda
 * la suite (patrón <i>singleton container</i>): se arranca a mano en el bloque {@code static} una sola
 * vez y Ryuk lo cierra al salir la JVM. Al compartir el mismo contenedor (misma URL), las subclases
 * comparten además el contexto de Spring (cacheado), evitando re-levantar contenedor y contexto por
 * cada clase de test. Requiere Docker corriendo.
 *
 * <p>Las subclases que llaman directamente a métodos de {@code Service} protegidos por
 * {@link com.pingeso.HUAP.Security.SeguridadServicio} (que exige un {@code AuthenticatedUser} en el
 * {@code SecurityContext}, ver {@code JwtAuthenticationFilter}) deben autenticar el actor de prueba
 * con {@link #autenticarComo} antes de la llamada — sin pasar por HTTP no hay filtro que lo haga.
 */
@SpringBootTest
public abstract class AbstractContainerTest {

    static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.0");

    static {
        MYSQL.start();
    }

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.datasource.driver-class-name", MYSQL::getDriverClassName);
    }

    /**
     * Coloca en el {@code SecurityContext} el mismo tipo de principal ({@code AuthenticatedUser})
     * que construye {@code JwtAuthenticationFilter} a partir de un JWT real, para que
     * {@code SeguridadServicio} (y cualquier código que llame a {@code SecurityContextHolder}) vea
     * exactamente lo mismo que vería en una petición HTTP autenticada.
     *
     * @param id         id del funcionario autenticado.
     * @param rol        rol de servicio de la sesión (JEFATURA/SUBROGANTE/MEDICO), o {@code null}.
     * @param rolSistema rol de sistema (ADMINISTRADOR/USUARIO), o {@code null}.
     * @param servicioId servicio activo de la sesión, o {@code null}.
     */
    protected void autenticarComo(Long id, String rol, String rolSistema, Long servicioId) {
        AuthenticatedUser principal = new AuthenticatedUser(id, null, rol, rolSistema, servicioId);
        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        if (rol != null) authorities.add(new SimpleGrantedAuthority("ROLE_" + rol));
        if (rolSistema != null) authorities.add(new SimpleGrantedAuthority("ROLE_" + rolSistema));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, authorities));
    }

    /** Conveniencia: autentica como ADMINISTRADOR global (sin restricción de servicio). */
    protected void autenticarComoAdministrador(Long id) {
        autenticarComo(id, null, "ADMINISTRADOR", null);
    }

    /**
     * Limpia el {@code SecurityContext} después de cada test para que la identidad autenticada de
     * un test no contamine el siguiente (los tests de esta suite no hacen rollback entre sí,
     * y JUnit reutiliza el mismo hilo salvo que se ejecuten en paralelo).
     */
    @AfterEach
    void limpiarSecurityContext() {
        SecurityContextHolder.clearContext();
    }
}
