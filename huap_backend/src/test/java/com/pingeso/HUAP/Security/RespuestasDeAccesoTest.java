package com.pingeso.HUAP.Security;

import com.pingeso.HUAP.Config.GlobalExceptionHandler;
import com.pingeso.HUAP.Controller.TurnoController;
import com.pingeso.HUAP.DTO.AlterarTurnoRequest;
import com.pingeso.HUAP.Service.GestionTurnoService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * C-20 (BUG-001): con sesión válida y sin permiso la API responde 403 con un mensaje en español,
 * sin sacar al usuario; sin sesión o con un token inválido, 401.
 */
class RespuestasDeAccesoTest {

    @Test
    void sesionValidaSinElRol_elFiltroResponde403ConCuerpoJson() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v2/servicios");
        MockHttpServletResponse response = new MockHttpServletResponse();

        new JwtAccessDeniedHandler().handle(request, response, new AccessDeniedException("Access Denied"));

        assertEquals(403, response.getStatus());
        assertTrue(response.getContentType().startsWith("application/json"));
        assertEquals("{\"error\": \"No tienes permiso para realizar esta acción\"}", response.getContentAsString());
    }

    @Test
    void sinSesionOTokenInvalido_sigueSiendo401() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v2/turnos/servicio/4");
        MockHttpServletResponse response = new MockHttpServletResponse();

        new JwtAuthenticationEntryPoint().commence(request, response, new BadCredentialsException("token vencido"));

        assertEquals(401, response.getStatus());
        assertEquals("{\"error\": \"No autorizado\"}", response.getContentAsString());
    }

    @Test
    void negacionDePreAuthorize_respondeEnEspanol_ylasPropiasConservanSuMensaje() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();

        ResponseEntity<Map<String, String>> generica = handler.handleAccessDenied(new AccessDeniedException("Access Denied"));
        assertEquals(HttpStatus.FORBIDDEN, generica.getStatusCode());
        assertEquals("No tienes permiso para realizar esta acción", generica.getBody().get("error"));

        ResponseEntity<Map<String, String>> propia = handler.handleAccessDenied(
                new AccessDeniedException("No tienes acceso a datos de otro servicio"));
        assertEquals("No tienes acceso a datos de otro servicio", propia.getBody().get("error"));
    }

    @Test
    void responseStatusException_saleConSuCodigoYElMismoCuerpo() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();

        ResponseEntity<Map<String, String>> conflicto = handler.handleResponseStatus(
                new ResponseStatusException(HttpStatus.CONFLICT, "Esta solicitud ya fue resuelta: no se puede responder"));
        assertEquals(HttpStatus.CONFLICT, conflicto.getStatusCode());
        assertEquals("Esta solicitud ya fue resuelta: no se puede responder", conflicto.getBody().get("error"));

        assertEquals(HttpStatus.NOT_FOUND,
                handler.handleResponseStatus(new ResponseStatusException(HttpStatus.NOT_FOUND, "La notificación no existe")).getStatusCode());
    }

    @Test
    void alterarTurno_laNegacionPorServicioSale403_yLasReglasDeNegocioSiguenEn400() throws Exception {
        GestionTurnoService gestion = mock(GestionTurnoService.class);
        TurnoController controller = new TurnoController();
        ReflectionTestUtils.setField(controller, "gestionTurnoService", gestion);
        AlterarTurnoRequest request = new AlterarTurnoRequest();

        when(gestion.alterarTurno(any())).thenThrow(new AccessDeniedException("No tienes acceso a datos de otro servicio"));
        assertThrows(AccessDeniedException.class, () -> controller.alterarTurno(request));

        reset(gestion);
        when(gestion.alterarTurno(any())).thenThrow(new RuntimeException("El turno ya tiene un funcionario asignado. Use REASIGNAR."));
        assertEquals(HttpStatus.BAD_REQUEST, controller.alterarTurno(request).getStatusCode());

        // §5.1 y C-04: el cruce de horario y R13 son 409 y llegan al GlobalExceptionHandler con su código.
        reset(gestion);
        when(gestion.alterarTurno(any())).thenThrow(new ResponseStatusException(HttpStatus.CONFLICT,
                "No es posible asignar el turno a Persona de prueba porque ya tiene otro turno asignado que se "
                + "superpone (Día, lun 8 jun, 08:00 a lun 8 jun, 20:00)."));
        ResponseStatusException conflicto = assertThrows(ResponseStatusException.class, () -> controller.alterarTurno(request));
        assertEquals(HttpStatus.CONFLICT, conflicto.getStatusCode());
    }
}
