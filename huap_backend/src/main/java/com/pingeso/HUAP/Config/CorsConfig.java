package com.pingeso.HUAP.Config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Orígenes permitidos por CORS, externalizados vía {@code app.cors.allowed-origins}
 * (env {@code CORS_ALLOWED_ORIGINS}, lista separada por comas).
 *
 * <p>SEC-002: la configuración previa permitía cualquier host en toda la red
 * privada {@code 192.168.*.*} (cualquier puerto) con {@code allowCredentials(true)},
 * una superficie de confianza cross-origin mucho más amplia de lo necesario.
 * El valor por defecto (sin configurar) solo cubre desarrollo local.
 */
@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origins:http://localhost,http://localhost:5173,http://localhost:4173}")
    private String allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
        configuration.setAllowedOrigins(origins);

        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type"));
        configuration.setExposedHeaders(Arrays.asList("Authorization", "X-Upstream-Server"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}
