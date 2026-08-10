package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.FuncionarioSummaryDTO;
import com.pingeso.HUAP.Security.AuthenticatedUser;
import com.pingeso.HUAP.Security.JwtTokenProvider;
import com.pingeso.HUAP.Security.LoginAttemptService;
import com.pingeso.HUAP.Security.SeguridadServicio;
import com.pingeso.HUAP.Service.FuncionarioService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Pruebas de {@link FuncionarioController#update}: el punto donde antes JEFATURA podía editar
 * (nombre, estado, rol, relación de servicio) a un funcionario de OTRO servicio con solo
 * cambiar el id en la URL. Estilo Mockito puro (el controller usa inyección por campo, igual
 * que {@code TurnoService}, ver {@code TurnoServiceTest}).
 *
 * <p>{@link SeguridadServicio} es un mock independiente del {@code SecurityContext} real en
 * este estilo de prueba (no hay filtro HTTP que los sincronice) — {@link #autenticar} configura
 * ambos de forma consistente, y {@link #stubExigirMismoServicio} replica la semántica real de
 * {@code SeguridadServicio.exigirMismoServicio} (que en producción SÍ tiene lógica propia).
 */
@ExtendWith(MockitoExtension.class)
class FuncionarioControllerTest {

    @Mock private FuncionarioService funcionarioService;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private LoginAttemptService loginAttemptService;
    @Mock private SeguridadServicio seguridadServicio;

    @InjectMocks private FuncionarioController controller;

    private static final long SERVICIO_A = 100L;
    private static final long SERVICIO_B = 200L;

    @AfterEach
    void limpiarSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    /** Autentica al actor de la prueba, sincronizando el SecurityContext real y el mock de SeguridadServicio. */
    private void autenticar(Long id, String rol, String rolSistema, Long servicioId) {
        AuthenticatedUser principal = new AuthenticatedUser(id, null, rol, rolSistema, servicioId);
        List<GrantedAuthority> authorities = new ArrayList<>();
        if (rol != null) authorities.add(new SimpleGrantedAuthority("ROLE_" + rol));
        if (rolSistema != null) authorities.add(new SimpleGrantedAuthority("ROLE_" + rolSistema));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, authorities));

        boolean esAdmin = "ADMINISTRADOR".equals(rolSistema);
        lenient().when(seguridadServicio.idServicioActual()).thenReturn(servicioId);
        lenient().when(seguridadServicio.esAdministrador()).thenReturn(esAdmin);
        stubExigirMismoServicio(servicioId, esAdmin);
    }

    /** Replica la semántica real de {@code SeguridadServicio.exigirMismoServicio} sobre el mock. */
    private void stubExigirMismoServicio(Long propioServicioId, boolean esAdmin) {
        lenient().doAnswer(inv -> {
            Long solicitado = inv.getArgument(0);
            if (!esAdmin && (solicitado == null || !solicitado.equals(propioServicioId))) {
                throw new AccessDeniedException("No tienes acceso a datos de otro servicio");
            }
            return null;
        }).when(seguridadServicio).exigirMismoServicio(any());
    }

    // ============================ JEFATURA/SUBROGANTE: alcance por servicio ============================

    @Test
    void jefaturaA_editaFuncionarioDeSuPropioServicio_permitido() {
        autenticar(9L, "JEFATURA", "USUARIO", SERVICIO_A);
        when(funcionarioService.perteneceAServicio(50L, SERVICIO_A)).thenReturn(true);
        when(funcionarioService.updateUser(eq(50L), anyMap())).thenReturn(new FuncionarioSummaryDTO());

        ResponseEntity<?> resp = controller.update(50L, Map.of("estado", "activo"));

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        verify(funcionarioService).updateUser(eq(50L), anyMap());
    }

    @Test
    void jefaturaA_editaFuncionarioExclusivoDeB_lanza403() {
        autenticar(9L, "JEFATURA", "USUARIO", SERVICIO_A);
        when(funcionarioService.perteneceAServicio(50L, SERVICIO_A)).thenReturn(false);

        ResponseEntity<?> resp = controller.update(50L, Map.of("nombre", "Nuevo Nombre"));

        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
        verify(funcionarioService, never()).updateUser(any(), any());
    }

    @Test
    void jefaturaA_intentaDesactivarFuncionarioDeB_lanza403() {
        autenticar(9L, "JEFATURA", "USUARIO", SERVICIO_A);
        when(funcionarioService.perteneceAServicio(50L, SERVICIO_A)).thenReturn(false);

        ResponseEntity<?> resp = controller.update(50L, Map.of("estado", "inactivo"));

        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
        verify(funcionarioService, never()).updateUser(any(), any());
    }

    @Test
    void jefaturaA_intentaCambiarNombreDeFuncionarioDeB_lanza403() {
        autenticar(9L, "JEFATURA", "USUARIO", SERVICIO_A);
        when(funcionarioService.perteneceAServicio(50L, SERVICIO_A)).thenReturn(false);

        ResponseEntity<?> resp = controller.update(50L, Map.of("nombre", "Otro"));

        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
        verify(funcionarioService, never()).updateUser(any(), any());
    }

    @Test
    void jefaturaA_intentaAsignarRelacionEnServicioB_lanza403() {
        // El funcionario objetivo SÍ pertenece a A (pasa el chequeo de pertenencia), pero
        // intenta agregarle una relación en el servicio B — debe rechazarse igual. A
        // diferencia de los otros guards del controller (que devuelven ResponseEntity 403),
        // este pasa por SeguridadServicio.exigirMismoServicio, que LANZA AccessDeniedException
        // — en producción la captura GlobalExceptionHandler y responde 403; aquí, al llamar
        // al controller directamente (sin el dispatcher de Spring), se propaga como excepción.
        autenticar(9L, "JEFATURA", "USUARIO", SERVICIO_A);
        when(funcionarioService.perteneceAServicio(50L, SERVICIO_A)).thenReturn(true);

        assertThrows(AccessDeniedException.class,
                () -> controller.update(50L, Map.of("servicioId", SERVICIO_B, "rol", 1)));
        verify(funcionarioService, never()).updateUser(any(), any());
    }

    @Test
    void subrogante_editaFuncionarioDeSuPropioServicio_permitido() {
        autenticar(9L, "SUBROGANTE", "USUARIO", SERVICIO_A);
        when(funcionarioService.perteneceAServicio(50L, SERVICIO_A)).thenReturn(true);
        when(funcionarioService.updateUser(eq(50L), anyMap())).thenReturn(new FuncionarioSummaryDTO());

        ResponseEntity<?> resp = controller.update(50L, Map.of("rol", 2));

        assertEquals(HttpStatus.OK, resp.getStatusCode());
    }

    @Test
    void subrogante_editaFuncionarioDeOtroServicio_lanza403() {
        autenticar(9L, "SUBROGANTE", "USUARIO", SERVICIO_A);
        when(funcionarioService.perteneceAServicio(50L, SERVICIO_A)).thenReturn(false);

        ResponseEntity<?> resp = controller.update(50L, Map.of("rol", 2));

        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
    }

    // ============================ ADMINISTRADOR ============================

    @Test
    void administrador_editaFuncionarioDeCualquierServicio_permitido() {
        autenticar(1L, null, "ADMINISTRADOR", null);
        when(funcionarioService.updateUser(eq(50L), anyMap())).thenReturn(new FuncionarioSummaryDTO());

        ResponseEntity<?> resp = controller.update(50L, Map.of("estado", "inactivo", "servicioId", SERVICIO_B, "rol", 1));

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        // El ADMINISTRADOR no debe pasar por el chequeo de pertenencia (alcance global legítimo).
        verify(funcionarioService, never()).perteneceAServicio(any(), any());
    }

    // ============================ MEDICO (autoedición) ============================

    @Test
    void medico_modificaCamposPropiosPermitidos_permitido() {
        autenticar(50L, "MEDICO", "USUARIO", SERVICIO_A);
        when(funcionarioService.updateUser(eq(50L), anyMap())).thenReturn(new FuncionarioSummaryDTO());

        ResponseEntity<?> resp = controller.update(50L, Map.of("nombre", "Mi Nombre Actualizado"));

        assertEquals(HttpStatus.OK, resp.getStatusCode());
    }

    @Test
    void medico_intentaCambiarRut_lanza403() {
        autenticar(50L, "MEDICO", "USUARIO", SERVICIO_A);

        ResponseEntity<?> resp = controller.update(50L, Map.of("rut", "11111111-1"));

        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
        verify(funcionarioService, never()).updateUser(any(), any());
    }

    @Test
    void medico_intentaCambiarRol_lanza403() {
        autenticar(50L, "MEDICO", "USUARIO", SERVICIO_A);

        ResponseEntity<?> resp = controller.update(50L, Map.of("rol", 1));

        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
        verify(funcionarioService, never()).updateUser(any(), any());
    }

    @Test
    void medico_intentaCambiarServicio_lanza403() {
        autenticar(50L, "MEDICO", "USUARIO", SERVICIO_A);

        ResponseEntity<?> resp = controller.update(50L, Map.of("servicioId", SERVICIO_A, "rol", 1));

        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
        verify(funcionarioService, never()).updateUser(any(), any());
    }

    @Test
    void medico_intentaCambiarEstado_lanza403() {
        autenticar(50L, "MEDICO", "USUARIO", SERVICIO_A);

        ResponseEntity<?> resp = controller.update(50L, Map.of("estado", "inactivo"));

        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
        verify(funcionarioService, never()).updateUser(any(), any());
    }

    @Test
    void medico_intentaEditarAOtroFuncionario_lanza403() {
        autenticar(50L, "MEDICO", "USUARIO", SERVICIO_A);

        ResponseEntity<?> resp = controller.update(999L, Map.of("nombre", "Otro"));

        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
        verify(funcionarioService, never()).updateUser(any(), any());
    }

    // ============================ Bean Validation mínima (item 7) ============================

    @Test
    void idCeroONegativo_lanza400_antesDeTocarSeguridad() {
        ResponseEntity<?> resp = controller.update(0L, Map.of("nombre", "X"));

        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        verify(funcionarioService, never()).updateUser(any(), any());
    }

    @Test
    void idNegativo_lanza400() {
        ResponseEntity<?> resp = controller.update(-5L, Map.of("nombre", "X"));

        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        verify(funcionarioService, never()).updateUser(any(), any());
    }

    @Test
    void payloadVacio_lanza400() {
        ResponseEntity<?> resp = controller.update(50L, Map.of());

        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        verify(funcionarioService, never()).updateUser(any(), any());
    }

    @Test
    void payloadNulo_lanza400() {
        ResponseEntity<?> resp = controller.update(50L, null);

        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        verify(funcionarioService, never()).updateUser(any(), any());
    }

    @Test
    void servicioIdConTipoInvalido_lanza400_noExcepcionSinControlar() {
        autenticar(9L, "JEFATURA", "USUARIO", SERVICIO_A);
        when(funcionarioService.perteneceAServicio(50L, SERVICIO_A)).thenReturn(true);

        ResponseEntity<?> resp = controller.update(50L, Map.of("servicioId", "no-es-un-numero", "rol", 1));

        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        verify(funcionarioService, never()).updateUser(any(), any());
    }

    @Test
    void servicioIdCeroONegativo_lanza400() {
        autenticar(9L, "JEFATURA", "USUARIO", SERVICIO_A);
        when(funcionarioService.perteneceAServicio(50L, SERVICIO_A)).thenReturn(true);

        ResponseEntity<?> resp = controller.update(50L, Map.of("servicioId", 0L, "rol", 1));

        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        verify(funcionarioService, never()).updateUser(any(), any());
    }
}
