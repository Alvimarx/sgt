package com.pingeso.HUAP.Config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Configuración de OpenAPI (Swagger) para el Sistema de Gestión de Turnos (HUAP).
 *
 * <p>Expone la documentación interactiva de la API REST en:
 * <ul>
 *   <li><code>/swagger-ui.html</code> — interfaz interactiva.</li>
 *   <li><code>/v3/api-docs</code> — especificación OpenAPI en formato JSON.</li>
 * </ul>
 *
 * <p>Declara un esquema de seguridad <b>Bearer JWT</b> para que, desde la propia
 * interfaz de Swagger, se pueda autenticar con el token obtenido en
 * <code>POST /api/v2/funcionarios/login</code> y probar los endpoints protegidos.
 */
@Configuration
public class OpenApiConfig {

    /** Nombre del esquema de seguridad reutilizado por los endpoints protegidos. */
    private static final String SECURITY_SCHEME_NAME = "bearerAuth";

    @Bean
    public OpenAPI huapOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("SGT-HUAP — API de Gestión de Turnos")
                        .version("v2")
                        .description("""
                                API REST del Sistema de Gestión de Turnos del Hospital de Urgencia \
                                Asistencia Pública (HUAP). Gestiona funcionarios, servicios, puestos, \
                                turnos, planificaciones, rotativas, solicitudes, ofertas, notificaciones, \
                                bitácora y estadísticas.

                                La autenticación es mediante JWT (Bearer token). Obtén el token en \
                                `POST /api/v2/funcionarios/login` y pulsa **Authorize** para probar los \
                                endpoints protegidos.""")
                        .contact(new Contact().name("Equipo SGT-HUAP"))
                        .license(new License().name("Uso interno HUAP")))
                .servers(List.of(
                        new Server().url("/").description("Servidor actual")))
                // Requerimiento de seguridad global: los endpoints usan Bearer JWT
                // salvo los marcados como públicos (login, health, info, etc.).
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME, new SecurityScheme()
                                .name(SECURITY_SCHEME_NAME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Introduce el token JWT obtenido en el login (sin el prefijo 'Bearer ').")));
    }
}
