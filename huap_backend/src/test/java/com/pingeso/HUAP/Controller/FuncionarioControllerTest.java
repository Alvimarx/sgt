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
        lenient().when(seguridadServicio.actual()).thenReturn(principal);
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
    void subrogante_noDesignaJerarquiaEnSuPropioServicio_403() {
        // C-03 (HU-JER-02): antes «item 5» se lo permitía; ahora el subrogante no cambia roles.
        autenticar(9L, "SUBROGANTE", "USUARIO", SERVICIO_A);

        ResponseEntity<?> resp = controller.update(50L, Map.of("servicioId", SERVICIO_A, "rol", 2));

        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
        assertEquals(Map.of("error", "El subrogante no puede designar jerarquía ni sumar funcionarios al servicio"), resp.getBody());
        verify(funcionarioService, never()).updateUser(any(), any());
    }

    @Test
    void subrogante_noCambiaElEstadoNiElNombreDeAlguienDeSuServicio_403() {
        // C-03 (17 oct): antes podía; ahora el subrogante no edita a otras personas.
        autenticar(9L, "SUBROGANTE", "USUARIO", SERVICIO_A);
        when(funcionarioService.perteneceAServicio(50L, SERVICIO_A)).thenReturn(true);

        for (Map<String, Object> payload : List.<Map<String, Object>>of(
                Map.of("estado", "inactivo"), Map.of("nombre", "Otro"), Map.of("apellidoPaterno", "Otro"))) {
            ResponseEntity<?> resp = controller.update(50L, payload);
            assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode(), payload.toString());
            assertEquals(Map.of("error", "El subrogante no puede cambiar los datos ni el estado de otro funcionario"), resp.getBody());
        }
        verify(funcionarioService, never()).updateUser(any(), any());
    }

    @Test
    void subrogante_editaSusPropiosDatos_sigueSiendoPosible() {
        autenticar(9L, "SUBROGANTE", "USUARIO", SERVICIO_A);
        when(funcionarioService.updateUser(eq(9L), anyMap())).thenReturn(new FuncionarioSummaryDTO());

        assertEquals(HttpStatus.OK, controller.update(9L, Map.of("nombre", "Nuevo")).getStatusCode());
    }

    @Test
    void subrogante_editaFuncionarioDeOtroServicio_lanza403() {
        autenticar(9L, "SUBROGANTE", "USUARIO", SERVICIO_A);
        when(funcionarioService.perteneceAServicio(50L, SERVICIO_A)).thenReturn(false);

        // Sin rol ni servicioId (esos los niega antes C-03), llega al control de pertenencia.
        ResponseEntity<?> resp = controller.update(50L, Map.of("nombre", "Otro"));

        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
        assertEquals(Map.of("error", "No tienes permiso para modificar a un funcionario de otro servicio"), resp.getBody());
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

    // ============================ C-03: el subrogante no designa jerarquía ni suma personal ============================

    @Test
    void subrogante_noSumaFuncionariosNiCambiaSuPropioRol_403() {
        autenticar(9L, "SUBROGANTE", "USUARIO", SERVICIO_A);

        assertEquals(HttpStatus.FORBIDDEN, controller.update(60L, Map.of("servicioId", SERVICIO_A, "rol", 3)).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, controller.update(9L, Map.of("servicioId", SERVICIO_A, "rol", 1)).getStatusCode());
        verify(funcionarioService, never()).updateUser(any(), any());
    }

    // ============================ C-07: la jefatura solo designa subrogantes ============================

    @Test
    void jefatura_designaUnSubroganteDeSuServicio_permitido() {
        autenticar(9L, "JEFATURA", "USUARIO", SERVICIO_A);
        when(funcionarioService.perteneceAServicio(50L, SERVICIO_A)).thenReturn(true);
        when(funcionarioService.nombreRolServicio(2)).thenReturn("SUBROGANTE");
        when(funcionarioService.updateUser(eq(50L), anyMap())).thenReturn(new FuncionarioSummaryDTO());

        assertEquals(HttpStatus.OK, controller.update(50L, Map.of("servicioId", SERVICIO_A, "rol", 2)).getStatusCode());
    }

    @Test
    void jefatura_noDesignaOtraJefatura_403() {
        autenticar(9L, "JEFATURA", "USUARIO", SERVICIO_A);
        when(funcionarioService.perteneceAServicio(50L, SERVICIO_A)).thenReturn(true);
        when(funcionarioService.nombreRolServicio(1)).thenReturn("JEFATURA");

        ResponseEntity<?> resp = controller.update(50L, Map.of("servicioId", SERVICIO_A, "rol", 1));

        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
        assertEquals(Map.of("error", "Solo un administrador puede designar una jefatura"), resp.getBody());
        verify(funcionarioService, never()).updateUser(any(), any());
    }

    @Test
    void administrador_designaUnaJefatura_permitido() {
        autenticar(1L, "JEFATURA", "ADMINISTRADOR", SERVICIO_A);
        when(funcionarioService.updateUser(eq(50L), anyMap())).thenReturn(new FuncionarioSummaryDTO());

        assertEquals(HttpStatus.OK, controller.update(50L, Map.of("servicioId", SERVICIO_B, "rol", 1)).getStatusCode());
        verify(funcionarioService, never()).nombreRolServicio(any());
    }

    @Test
    void jefatura_noCambiaElRolDeOtraJefatura_niElPropio_403() {
        autenticar(9L, "JEFATURA", "USUARIO", SERVICIO_A);
        when(funcionarioService.perteneceAServicio(50L, SERVICIO_A)).thenReturn(true);
        when(funcionarioService.nombreRolServicio(2)).thenReturn("SUBROGANTE");
        when(funcionarioService.rolEnServicio(50L, SERVICIO_A)).thenReturn("JEFATURA");
        when(funcionarioService.rolEnServicio(9L, SERVICIO_A)).thenReturn("JEFATURA");

        for (long persona : new long[]{50L, 9L}) {
            ResponseEntity<?> resp = controller.update(persona, Map.of("servicioId", SERVICIO_A, "rol", 2));
            assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode(), "persona " + persona);
            assertEquals(Map.of("error", "Solo un administrador puede cambiar una jefatura"), resp.getBody());
        }
        verify(funcionarioService, never()).updateUser(any(), any());
    }

    @Test
    void jefatura_pideMedicoParaOtraJefatura_llegaAl409DeC19SinCambiarSuRol() {
        // Sumar como Médico a quien ya pertenece no cambia el rol (C-19): no es un cambio de jefatura.
        autenticar(9L, "JEFATURA", "USUARIO", SERVICIO_A);
        when(funcionarioService.perteneceAServicio(50L, SERVICIO_A)).thenReturn(true);
        when(funcionarioService.nombreRolServicio(3)).thenReturn("MEDICO");
        when(funcionarioService.updateUser(eq(50L), anyMap())).thenThrow(new org.springframework.web.server.ResponseStatusException(
                HttpStatus.CONFLICT, "La persona ya pertenece a este servicio; no se cambió su rol"));

        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> controller.update(50L, Map.of("servicioId", SERVICIO_A, "rol", 3)));
        verify(funcionarioService, never()).rolEnServicio(any(), any());
    }

    @Test
    void administrador_cambiaUnaJefatura_permitido() {
        autenticar(1L, "JEFATURA", "ADMINISTRADOR", SERVICIO_A);
        when(funcionarioService.updateUser(eq(50L), anyMap())).thenReturn(new FuncionarioSummaryDTO());

        assertEquals(HttpStatus.OK, controller.update(50L, Map.of("servicioId", SERVICIO_A, "rol", 2)).getStatusCode());
        verify(funcionarioService, never()).rolEnServicio(any(), any());
    }

    // ============================ Quitar la subrogancia (17 oct) ============================

    @Test
    void quitarSubrogancia_declaraJefaturaOAdministrador() throws NoSuchMethodException {
        org.springframework.security.access.prepost.PreAuthorize regla = FuncionarioController.class
                .getMethod("quitarSubrogancia", Long.class, Long.class)
                .getAnnotation(org.springframework.security.access.prepost.PreAuthorize.class);
        assertNotNull(regla, "PUT /funcionarios/{id}/quitar-subrogancia debe declarar @PreAuthorize");
        assertEquals("hasAnyRole('JEFATURA','ADMINISTRADOR')", regla.value());
    }

    @Test
    void quitarSubrogancia_laJefaturaEnSuServicio_200() {
        autenticar(305L, "JEFATURA", "USUARIO", SERVICIO_A);
        FuncionarioSummaryDTO actualizado = new FuncionarioSummaryDTO();
        when(funcionarioService.quitarSubrogancia(50L, SERVICIO_A, 305L)).thenReturn(actualizado);

        ResponseEntity<FuncionarioSummaryDTO> resp = controller.quitarSubrogancia(50L, SERVICIO_A);

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertSame(actualizado, resp.getBody());
    }

    @Test
    void quitarSubrogancia_laJefaturaEnOtroServicio_403SinTocarNada() {
        autenticar(305L, "JEFATURA", "USUARIO", SERVICIO_A);

        assertThrows(AccessDeniedException.class, () -> controller.quitarSubrogancia(50L, SERVICIO_B));
        verify(funcionarioService, never()).quitarSubrogancia(any(), any(), any());
    }

    @Test
    void quitarSubrogancia_subroganteOMedico_403() {
        for (String rol : new String[]{"SUBROGANTE", "MEDICO"}) {
            autenticar(9L, rol, "USUARIO", SERVICIO_A);
            AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                    () -> controller.quitarSubrogancia(50L, SERVICIO_A), rol);
            assertEquals("Solo la jefatura del servicio o un administrador puede quitar una subrogancia", ex.getMessage());
        }
        verify(funcionarioService, never()).quitarSubrogancia(any(), any(), any());
    }

    @Test
    void quitarSubrogancia_elAdministradorEnCualquierServicio_200() {
        autenticar(1L, "MEDICO", "ADMINISTRADOR", SERVICIO_A);
        when(funcionarioService.quitarSubrogancia(50L, SERVICIO_B, 1L)).thenReturn(new FuncionarioSummaryDTO());

        assertEquals(HttpStatus.OK, controller.quitarSubrogancia(50L, SERVICIO_B).getStatusCode());
    }

    @Test
    void quitarSubrogancia_sinServicio_400() {
        autenticar(305L, "JEFATURA", "USUARIO", SERVICIO_A);

        org.springframework.web.server.ResponseStatusException ex = assertThrows(
                org.springframework.web.server.ResponseStatusException.class, () -> controller.quitarSubrogancia(50L, null));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    // ============================ C-23 y C-19: la jefatura suma a su servicio como Médico ============================

    @Test
    void jefatura_sumaASuServicioComoMedicoAQuienNoEstaEnEl_permitido() {
        autenticar(305L, "JEFATURA", "USUARIO", SERVICIO_A);
        when(funcionarioService.perteneceAServicio(60L, SERVICIO_A)).thenReturn(false);
        when(funcionarioService.nombreRolServicio(3)).thenReturn("MEDICO");
        when(funcionarioService.updateUser(eq(60L), anyMap())).thenReturn(new FuncionarioSummaryDTO());

        ResponseEntity<?> resp = controller.update(60L, Map.of("servicioId", SERVICIO_A, "rol", 3));

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        verify(funcionarioService).updateUser(60L, Map.of("servicioId", SERVICIO_A, "rol", 3));
    }

    @Test
    void jefatura_aQuienNoEsDeSuServicio_soloLoSumaComoMedicoASuServicio_loDemas403() {
        autenticar(305L, "JEFATURA", "USUARIO", SERVICIO_A);
        when(funcionarioService.perteneceAServicio(60L, SERVICIO_A)).thenReturn(false);
        lenient().when(funcionarioService.nombreRolServicio(2)).thenReturn("SUBROGANTE");
        lenient().when(funcionarioService.nombreRolServicio(3)).thenReturn("MEDICO");

        // otro rol
        assertEquals(HttpStatus.FORBIDDEN, controller.update(60L, Map.of("servicioId", SERVICIO_A, "rol", 2)).getStatusCode());
        // otro servicio
        assertEquals(HttpStatus.FORBIDDEN, controller.update(60L, Map.of("servicioId", SERVICIO_B, "rol", 3)).getStatusCode());
        // campos de más
        assertEquals(HttpStatus.FORBIDDEN,
                controller.update(60L, Map.of("servicioId", SERVICIO_A, "rol", 3, "estado", "activo")).getStatusCode());
        verify(funcionarioService, never()).updateUser(any(), any());
    }

    @Test
    void sumarAQuienYaPertenece_el409DelServiceLlegaSinCambiarNada() {
        autenticar(305L, "JEFATURA", "USUARIO", SERVICIO_A);
        when(funcionarioService.perteneceAServicio(50L, SERVICIO_A)).thenReturn(true);
        when(funcionarioService.nombreRolServicio(3)).thenReturn("MEDICO");
        when(funcionarioService.updateUser(eq(50L), anyMap())).thenThrow(new org.springframework.web.server.ResponseStatusException(
                HttpStatus.CONFLICT, "La persona ya pertenece a este servicio; no se cambió su rol"));

        org.springframework.web.server.ResponseStatusException ex = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> controller.update(50L, Map.of("servicioId", SERVICIO_A, "rol", 3)));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    // ============================ C-17: lecturas de funcionarios ============================

    @Test
    void summaryPorId_propio_ydeAlguienDelServicio_200() {
        autenticar(50L, "MEDICO", "USUARIO", SERVICIO_A);
        lenient().when(seguridadServicio.idUsuarioActual()).thenReturn(50L);
        when(funcionarioService.getUserSummary(50L)).thenReturn(new FuncionarioSummaryDTO());
        when(funcionarioService.getUserSummary(51L)).thenReturn(new FuncionarioSummaryDTO());
        when(funcionarioService.perteneceAServicio(51L, SERVICIO_A)).thenReturn(true);

        assertEquals(HttpStatus.OK, controller.getSummary(50L).getStatusCode());
        assertEquals(HttpStatus.OK, controller.getSummary(51L).getStatusCode());
    }

    @Test
    void summaryPorId_personaDeOtroServicio_403() {
        autenticar(101L, "SUBROGANTE", "USUARIO", SERVICIO_B);
        lenient().when(seguridadServicio.idUsuarioActual()).thenReturn(101L);
        when(funcionarioService.getUserSummary(369L)).thenReturn(new FuncionarioSummaryDTO());
        when(funcionarioService.perteneceAServicio(369L, SERVICIO_B)).thenReturn(false);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () -> controller.getSummary(369L));
        assertEquals("No tienes acceso a datos de otro servicio", ex.getMessage());
    }

    @Test
    void summaryPorId_administrador_cualquiera_200() {
        autenticar(1L, null, "ADMINISTRADOR", null);
        lenient().when(seguridadServicio.idUsuarioActual()).thenReturn(1L);
        when(funcionarioService.getUserSummary(369L)).thenReturn(new FuncionarioSummaryDTO());

        assertEquals(HttpStatus.OK, controller.getSummary(369L).getStatusCode());
        verify(funcionarioService, never()).perteneceAServicio(any(), any());
    }

    @Test
    void statusPorRut_exigeJefaturaOAdministrador() throws NoSuchMethodException {
        org.springframework.security.access.prepost.PreAuthorize regla = FuncionarioController.class
                .getMethod("checkFuncionario", String.class)
                .getAnnotation(org.springframework.security.access.prepost.PreAuthorize.class);
        assertNotNull(regla, "GET /funcionarios/status/{rut} debe declarar @PreAuthorize");
        assertEquals("hasAnyRole('JEFATURA','ADMINISTRADOR')", regla.value());
    }

    @Test
    void padronDelHospital_exigeJefaturaOAdministrador() throws NoSuchMethodException {
        org.springframework.security.access.prepost.PreAuthorize regla = ViewPersonalController.class
                .getMethod("getAllPersonal")
                .getAnnotation(org.springframework.security.access.prepost.PreAuthorize.class);
        assertNotNull(regla, "GET /Personal/summary debe declarar @PreAuthorize");
        assertEquals("hasAnyRole('JEFATURA','ADMINISTRADOR')", regla.value());
    }
}
