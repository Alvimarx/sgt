package com.pingeso.HUAP.Security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Responde 403 cuando hay una sesión válida pero su rol no alcanza para la ruta (C-20, BUG-001).
 *
 * <p>Sin este handler, Spring Security usaba el de defecto, que llama a {@code sendError(403)}:
 * el reenvío a {@code /error} ocurre cuando el contexto de seguridad ya se limpió (el filtro JWT
 * no corre en ese reenvío), así que llegaba como anónimo y terminaba en
 * {@link JwtAuthenticationEntryPoint} con 401. El frontend cierra la sesión ante un 401. Aquí el
 * 403 se escribe directamente, con el mismo cuerpo {@code {"error": ...}} que el resto de la API.
 * Sin sesión o con un token inválido sigue respondiendo 401 el entry point.
 */
@Component
public class JwtAccessDeniedHandler implements AccessDeniedHandler {

    private static final Logger logger = LoggerFactory.getLogger(JwtAccessDeniedHandler.class);

    static final String MENSAJE = "No tienes permiso para realizar esta acción";

    @Override
    public void handle(HttpServletRequest request,
                       HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {
        // El detalle queda en el servidor; al cliente va un mensaje fijo.
        logger.warn("Acceso denegado a {} {}: {}", request.getMethod(), request.getRequestURI(),
                accessDeniedException.getMessage());

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"error\": \"" + MENSAJE + "\"}");
    }
}
