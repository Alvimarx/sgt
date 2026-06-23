package com.pingeso.HUAP.Config;

import com.pingeso.HUAP.Security.JwtAuthenticationEntryPoint;
import com.pingeso.HUAP.Security.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.MessageDigestPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.http.HttpMethod;

import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationEntryPoint unauthorizedHandler;

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    // Administración GLOBAL del sistema: solo ADMINISTRADOR (super-admin).
    private static final String[] GLOBAL_ADMIN_PATHS = {
            "/api/v2/servicios/**",
            "/api/v2/tipos-turno/**",
            "/api/v2/plantillas/**",
            "/api/v2/planificaciones/**"
    };

    // Administración a nivel de SERVICIO: JEFATURA/SUBROGANTE (y ADMINISTRADOR como super-admin).
    private static final String[] SERVICE_ADMIN_PATHS = {
            "/api/v2/puestos/**",
            "/api/v2/gestion-turnos/**",
            "/api/v2/turnos/**",
            "/api/v2/reglas-servicio/**",
            "/api/v2/Personal/**"
    };

    /**
     * Codificador de contraseñas con migración:
     *  - Las contraseñas NUEVAS se almacenan con BCrypt (prefijo {bcrypt}).
     *  - Las heredadas (SHA-512 sin prefijo) se siguen validando para no romper el login;
     *    conviene forzar un cambio de contraseña o re-hashear en el próximo login válido.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        Map<String, PasswordEncoder> encoders = new HashMap<>();
        encoders.put("bcrypt", new BCryptPasswordEncoder(12));

        DelegatingPasswordEncoder delegating = new DelegatingPasswordEncoder("bcrypt", encoders);
        // Hashes antiguos sin prefijo {id}: validados con el SHA-512 heredado.
        delegating.setDefaultPasswordEncoderForMatches(new MessageDigestPasswordEncoder("SHA-512"));
        return delegating;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable()) // API stateless con Bearer token en header (no cookies)
                .cors(cors -> {
                })
                .exceptionHandling(exception -> exception.authenticationEntryPoint(unauthorizedHandler))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers
                        .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000))
                        .frameOptions(frame -> frame.deny())
                        .referrerPolicy(referrer -> referrer.policy(ReferrerPolicy.NO_REFERRER))
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "default-src 'self'; frame-ancestors 'none'; object-src 'none'"))
                )
                .authorizeHttpRequests(auth -> auth
                        // --- Públicos (sin token) ---
                        .requestMatchers("/api/v2/health", "/api/v2/info").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v2/funcionarios/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v2/funcionarios/login/select-service").permitAll()
                        // Listado de servicios necesario para la pantalla de selección de servicio.
                        .requestMatchers(HttpMethod.GET, "/api/v2/servicios").permitAll()

                        // --- Administración GLOBAL: solo ADMINISTRADOR (super-admin) ---
                        .requestMatchers(HttpMethod.POST, GLOBAL_ADMIN_PATHS).hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.PUT, GLOBAL_ADMIN_PATHS).hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.DELETE, GLOBAL_ADMIN_PATHS).hasRole("ADMINISTRADOR")

                        // --- Administración por SERVICIO: JEFATURA / SUBROGANTE / ADMINISTRADOR ---
                        .requestMatchers(HttpMethod.POST, SERVICE_ADMIN_PATHS).hasAnyRole("ADMINISTRADOR", "JEFATURA", "SUBROGANTE")
                        .requestMatchers(HttpMethod.PUT, SERVICE_ADMIN_PATHS).hasAnyRole("ADMINISTRADOR", "JEFATURA", "SUBROGANTE")
                        .requestMatchers(HttpMethod.DELETE, SERVICE_ADMIN_PATHS).hasAnyRole("ADMINISTRADOR", "JEFATURA", "SUBROGANTE")

                        // --- Solicitudes: cualquier rol autenticado ---
                        .requestMatchers(HttpMethod.PUT, "/api/v2/solicitudes/*/estado")
                        .hasAnyRole("JEFATURA", "SUBROGANTE", "MEDICO")
                        .requestMatchers(HttpMethod.PUT, "/api/v2/solicitudes/*/intercambio")
                        .hasAnyRole("JEFATURA", "SUBROGANTE", "MEDICO")

                        // --- Todo lo demás requiere autenticación ---
                        .anyRequest().authenticated());

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
