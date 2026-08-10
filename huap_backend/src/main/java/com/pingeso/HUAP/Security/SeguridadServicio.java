package com.pingeso.HUAP.Security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Punto único de verificación de alcance por servicio.
 *
 * <p>La autorización de {@code SecurityConfig}/{@code @PreAuthorize} solo valida ROL
 * (¿puede este usuario hacer este tipo de operación?). Nunca validaba, hasta esta
 * corrección, si el RECURSO sobre el que opera pertenece al servicio de la sesión del
 * usuario — eso permitía a una JEFATURA/SUBROGANTE/MEDICO de un servicio leer o mutar
 * datos de un servicio ajeno con solo cambiar un id/parámetro. Todo endpoint que reciba
 * un {@code servicioId} (o un recurso del que se pueda derivar uno) desde el cliente debe
 * llamar a {@link #exigirMismoServicio(Long)} antes de usarlo.
 */
@Component
public class SeguridadServicio {

    public AuthenticatedUser actual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthenticatedUser au)) {
            throw new AccessDeniedException("No autenticado");
        }
        return au;
    }

    /**
     * Verifica que {@code servicioIdRecurso} coincida con el servicio de la sesión activa
     * del usuario autenticado. El ADMINISTRADOR (rol de sistema global) queda exento, ya
     * que por diseño del negocio puede operar sobre cualquier servicio.
     *
     * @throws AccessDeniedException si el usuario no es ADMINISTRADOR y el servicio del
     *                                recurso no coincide con el de su sesión (o si el
     *                                recurso no tiene servicio asociado).
     */
    public void exigirMismoServicio(Long servicioIdRecurso) {
        AuthenticatedUser u = actual();
        if (u.esAdministrador()) return;
        if (servicioIdRecurso == null || !servicioIdRecurso.equals(u.servicioId())) {
            throw new AccessDeniedException("No tienes acceso a datos de otro servicio");
        }
    }

    public Long idServicioActual() {
        return actual().servicioId();
    }

    public Long idUsuarioActual() {
        return actual().id();
    }

    public boolean esAdministrador() {
        return actual().esAdministrador();
    }
}
