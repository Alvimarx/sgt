package com.pingeso.HUAP.Config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        /* 
        // Permitir solicitudes desde el frontend y load balancer
        configuration.setAllowedOrigins(Arrays.asList(
                "http://localhost",        // Load balancer local (puerto 80)
                "http://localhost:80",     // Load balancer explícito
                "http://localhost:5173",   // Vite dev server
                "http://localhost:3000",   // Create React App
                "http://localhost:4173",   // Vite preview
                "http://200.30.242.110",   // IP pública sin puerto (load balancer)
                "http://200.30.242.110:80", // IP pública puerto 80
                "http://200.30.242.110:5173", // IP pública server demo (legacy)
                "http://192.168.1.150",    // IP local del servidor
                "http://192.168.1.150:80"  // IP local puerto 80
        ));
        */
        configuration.setAllowedOriginPatterns(Arrays.asList(
                "http://localhost",
                "http://localhost:*",
                "http://200.30.242.110",
                "http://200.30.242.110:*",
                "http://192.168.*.*",
                "http://192.168.*.*:*"
        ));
        
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setExposedHeaders(Arrays.asList("Authorization", "X-Upstream-Server"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        
        return source;
    }
}
