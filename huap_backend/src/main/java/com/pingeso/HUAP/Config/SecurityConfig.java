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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.crypto.password.MessageDigestPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.http.HttpMethod;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationEntryPoint unauthorizedHandler;

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    // 2. ACTUALIZACIÓN DEL BEAN: Cambiar BCrypt por SHA-512
    @Bean
    public PasswordEncoder passwordEncoder() {
        // Esto hará que Spring compare las claves usando SHA-512
        return new MessageDigestPasswordEncoder("SHA-512");
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {
                })
                .exceptionHandling(exception -> exception.authenticationEntryPoint(unauthorizedHandler))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v2/health").permitAll()
                        .requestMatchers("/api/v2/info").permitAll()

                        .requestMatchers(HttpMethod.POST, "/api/v2/funcionarios/login").permitAll()
                        .requestMatchers(HttpMethod.PUT, "/api/v2/funcionarios/{id}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v2/funcionarios").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v2/funcionarios/login/select-service").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v2/funcionarios/{id}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v2/servicios").permitAll()
                        .requestMatchers(HttpMethod.DELETE, "/api/v2/servicios/{id}").permitAll()
                        .requestMatchers(HttpMethod.PUT, "/api/v2/funcionarios/{id}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v2/funcionarios").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v2/funcionarios/summary").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v2/funcionarios/login/select-service").permitAll()
                        .requestMatchers(HttpMethod.PUT, "/api/v2/solicitudes/*/estado")
                        .hasAnyRole("JEFATURA", "SUBROGANTE", "MEDICO")
                        .requestMatchers(HttpMethod.PUT, "/api/v2/solicitudes/*/intercambio")
                        .hasAnyRole("JEFATURA", "SUBROGANTE", "MEDICO")

                        .anyRequest().authenticated());

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}