package com.pingeso.HUAP.Security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Filtro JWT que intercepta todas las peticiones HTTP para validar el token
 * Este filtro actúa como middleware para la autenticación JWT
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);


            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                // No se puede utilizar el token pre-auth para acceder a recursos protegidos por el token final
                if ("PRE_AUTH".equals(tokenProvider.getTipoFromToken(jwt))) {
                    filterChain.doFilter(request, response);
                    return;
                }

                Long userId = tokenProvider.getUserIdFromToken(jwt);
                String rut = tokenProvider.getRutFromToken(jwt);
                String rol = tokenProvider.getRolFromToken(jwt);
                String rolSistema = tokenProvider.getRolSistemaFromToken(jwt);
                Long servicioId = tokenProvider.getServicioIdFromToken(jwt);

                // Autoridades: rol de servicio (JEFATURA/SUBROGANTE/MEDICO) +
                // rol de sistema (ADMINISTRADOR/USUARIO), ambos como ROLE_<valor>.
                List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                if (rol != null) authorities.add(new SimpleGrantedAuthority("ROLE_" + rol));
                if (rolSistema != null) authorities.add(new SimpleGrantedAuthority("ROLE_" + rolSistema));

                // Principal enriquecido: antes solo se propagaba el userId, así que ningún
                // controller/service podía validar el servicioId del recurso solicitado
                // contra el servicioId real de la sesión (ver SeguridadServicio).
                AuthenticatedUser principal = new AuthenticatedUser(userId, rut, rol, rolSistema, servicioId);

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(principal,
                        null, authorities);

                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // Establecer el contexto de seguridad
                SecurityContextHolder.getContext().setAuthentication(authentication);

                logger.debug("Set Authentication for user: {} with role: {}", userId, rol);
            }
        } catch (Exception ex) {
            logger.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Extrae el token JWT del header Authorization
     */
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");

        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }

        return null;
    }
}
