package com.pingeso.HUAP.Security;

/**
 * Identidad autenticada propagada como principal en el {@code SecurityContext}.
 *
 * <p>Se construye a partir de los claims del JWT final ({@link JwtTokenProvider}) en
 * {@link JwtAuthenticationFilter}. Reemplaza al {@code Long} (solo el id) que se usaba
 * antes como principal: sin este objeto, el {@code servicioId} de la sesión nunca llegaba
 * al {@code SecurityContext} y ningún controller/service podía validar que un recurso
 * solicitado (otro servicio, otro funcionario) perteneciera al contexto del usuario.
 */
public record AuthenticatedUser(Long id, String rut, String rol, String rolSistema, Long servicioId) {

    public boolean esAdministrador() {
        return "ADMINISTRADOR".equals(rolSistema);
    }
}
