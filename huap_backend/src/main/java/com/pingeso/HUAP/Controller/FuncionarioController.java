package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.*;
import jakarta.persistence.EntityExistsException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.repository.query.Param;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.ServiciosFuncionarioEntity;
import com.pingeso.HUAP.Security.JwtTokenProvider;
import com.pingeso.HUAP.Security.LoginAttemptService;
import com.pingeso.HUAP.Service.FuncionarioService;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


@RestController
@RequestMapping("/api/v2/funcionarios")
public class FuncionarioController {

        private static final Logger logger = LoggerFactory.getLogger(FuncionarioController.class);
    
    @Autowired
    private FuncionarioService funcionarioService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private LoginAttemptService loginAttemptService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
                logger.info("[LOGIN] Request recibido. rut={}, passwordPresente={}",
                                loginRequest.getRut(), loginRequest.getPassword() != null && !loginRequest.getPassword().isBlank());

        // Validaciones básicas
        if (loginRequest.getRut() == null || loginRequest.getPassword() == null) {
                        logger.warn("[LOGIN] Credenciales incompletas: rut o password null.");
            return ResponseEntity.badRequest().body(Map.of("error", "Credenciales incompletas"));
        }

        final String rut = loginRequest.getRut();

        // Bloqueo por fuerza bruta: demasiados intentos fallidos para este RUT.
        if (loginAttemptService.isBlocked(rut)) {
            long segundos = loginAttemptService.getSecondsToUnlock(rut);
                        logger.warn("[LOGIN] RUT bloqueado por intentos fallidos. rut={}, segundosRestantes={}", rut, segundos);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Cuenta bloqueada por demasiados intentos fallidos. "
                            + "Intenta nuevamente en " + segundos + " segundos."));
        }

        FuncionarioEntity usuario;
        try {
                        logger.info("[LOGIN] Autenticando RUT {}", rut);
            usuario = funcionarioService.authenticateWithPassword(
                    rut, loginRequest.getPassword());
        } catch (RuntimeException e) {
                        logger.warn("[LOGIN] Fallo de autenticación para rut={}: {}", rut, e.getMessage());
            loginAttemptService.loginFailed(rut);

            // Si este fallo gatilló el bloqueo, avisamos del bloqueo y el tiempo de espera.
            if (loginAttemptService.isBlocked(rut)) {
                long segundos = loginAttemptService.getSecondsToUnlock(rut);
                                logger.warn("[LOGIN] RUT bloqueado después del fallo. rut={}, segundosRestantes={}", rut, segundos);
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(Map.of("error", "Has superado el número de intentos permitidos. "
                                + "Acceso bloqueado por " + segundos + " segundos."));
            }

            // Mensaje genérico (no revela si el RUT existe). Avisa los intentos restantes
            // cuando quedan pocos, para dar retroalimentación al usuario.
            int restantes = loginAttemptService.getRemainingAttempts(rut);
            String msg = "Credenciales inválidas.";
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", msg));
        }
        loginAttemptService.loginSucceeded(rut);
        if (usuario == null){
            logger.warn("[LOGIN] Usuario autenticado sin registro local en sistema. rut={}", rut);
            return ResponseEntity.ok(new LoginResponse(
                    null,
                    false,
                    List.of(),
                    false,
                    "Tu cuenta aún no ha sido registrada en el sistema"
            ));
        }
                logger.info("[LOGIN] Autenticación exitosa para rut={}, idFuncionario={}", rut, usuario.getIdFuncionario());
        // 2. Mapear los servicios a los que tiene acceso el funcionario
        List<ServicioDisponibleDTO> opciones = usuario.getServiciosFuncionario().stream()
                .filter(sf -> sf.getServicio() != null && !sf.getServicio().isEliminado())
                .map(sf -> new ServicioDisponibleDTO(
                        sf.getServicio().getIdServicio(),
                        sf.getServicio().getNombre(),
                        sf.getRolServicio() != null ? sf.getRolServicio().getNombreRol() : "MEDICO"
                ))
                .toList();

        if (opciones.isEmpty()) {
                        logger.warn("[LOGIN] Usuario autenticado sin servicios asignados. rut={}, idFuncionario={}", rut, usuario.getIdFuncionario());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "El usuario no tiene servicios asignados"));
        }

        // 3. Generar un Token de Pre-Autorización (Corto, ej. 5 min)
        // Este token solo contiene el ID del usuario, nada más.
        String preAuthToken = jwtTokenProvider.generatePreAuthToken(usuario.getIdFuncionario());

        return ResponseEntity.ok(new LoginResponse(
                preAuthToken,
                true,
                opciones,
                true,
                null
        ));
    }

    // --- Gestión de funcionarios ---
    /**
     * Controlador para verificar si existe un funcionario registrado en el sistema de turnos.
     * Devuelve 200 OK si existe, 404 NOT FOUND si no, o 401 si ocurre un error controlado.
     *
     * @param rut RUT del funcionario a consultar.
     * @return ResponseEntity sin cuerpo con el estado de la verificación.
     */
    @GetMapping("/status/{rut}")
    public ResponseEntity<Void> checkFuncionario(@PathVariable String rut){
        try {
            if (funcionarioService.isPresent(rut)) {
                return ResponseEntity.ok().build(); // 200 OK
            }
            return ResponseEntity.notFound().build(); // 404 Not Found
        } catch (RuntimeException e) {
            // Tip de Senior: Al menos registra el error en un log antes de mutearlo con el HTTP Status
            logger.error("Error al verificar funcionario con RUT: {}", rut, e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }


        @GetMapping("/summary")
    public ResponseEntity<List<FuncionarioSummaryDTO>> getAllSummary(
            @RequestParam(required = false) Long servicioId) {
        return ResponseEntity.ok(funcionarioService.getAllUserSummaryByServicio(servicioId));
    }



    @GetMapping("/{id}/summary")
    public ResponseEntity<FuncionarioSummaryDTO> getSummary(@PathVariable Long id) {
        FuncionarioSummaryDTO dto = funcionarioService.getUserSummary(id);
        if (dto == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/disponibilidad/{servicioId}")
    public ResponseEntity<Map<String, Object>> getDisponibilidad(@PathVariable Long servicioId) {
        return ResponseEntity.ok(funcionarioService.getAvailabilityByServicio(servicioId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long currentUserId = (Long) auth.getPrincipal();
        boolean isJefatura = auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_JEFATURA".equals(a.getAuthority()));

        // Ownership: quien no es JEFATURA solo puede modificar su propio registro.
        if (!isJefatura && !currentUserId.equals(id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "No tienes permiso para modificar a otro funcionario"));
        }
        // Escalada de privilegios: solo JEFATURA puede cambiar el rol.
        if (!isJefatura && (payload.containsKey("rol") || payload.containsKey("estado"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "No tienes permiso para cambiar el rol o el estado"));
        }

        FuncionarioSummaryDTO updated = funcionarioService.updateUser(id, payload);
        if (updated == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/login/select-service")
    public ResponseEntity<?> selectService(@RequestBody SelectServiceRequest request) {
        
        String preToken = request.getPreAuthToken();
        Long idFuncionario;
        try {
            idFuncionario = jwtTokenProvider.getUserIdFromPreAuthToken(preToken);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token de pre-autorización inválido o expirado"));
        }
        
        FuncionarioEntity usuario = funcionarioService.findById(idFuncionario);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Usuario no encontrado"));
        }

        // Buscar la relación con el servicio elegido
        Long idServicioElegido = request.getServicioId();
        
        ServiciosFuncionarioEntity relacion = usuario.getServiciosFuncionario().stream()
                .filter(sf -> sf.getServicio() != null
                        && !sf.getServicio().isEliminado()
                        && sf.getServicio().getIdServicio().equals(idServicioElegido))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Acceso denegado al servicio indicado"));

        String rolFinal = (relacion.getRolServicio() != null)
                ? relacion.getRolServicio().getNombreRol()
                : "MEDICO";

        String rolSistema = (usuario.getRolSistema() != null)
                ? usuario.getRolSistema().getNombreRol()
                : "USUARIO";

        String finalToken = jwtTokenProvider.generateToken(
                usuario.getIdFuncionario(),
                usuario.getRut(),
                rolFinal,
                rolSistema,
                relacion.getServicio().getIdServicio()
        );

        FuncionarioSummaryDTO perfil = funcionarioService.getUserSummary(usuario.getIdFuncionario());

        return ResponseEntity.ok(new SesionDTO(
                finalToken,
                relacion.getServicio().getIdServicio(),
                rolFinal,
                perfil
        ));
    }

    @PostMapping("/switch-service")
    public ResponseEntity<?> switchService(@RequestBody SelectServiceRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long idFuncionario = (Long) auth.getPrincipal();

        FuncionarioEntity usuario = funcionarioService.findById(idFuncionario);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Usuario no encontrado"));
        }

        ServiciosFuncionarioEntity relacion = usuario.getServiciosFuncionario().stream()
                .filter(sf -> sf.getServicio() != null
                        && !sf.getServicio().isEliminado()
                        && sf.getServicio().getIdServicio().equals(request.getServicioId()))
                .findFirst()
                .orElse(null);

        if (relacion == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "No tienes acceso al servicio indicado"));
        }

        String rolFinal = (relacion.getRolServicio() != null)
                ? relacion.getRolServicio().getNombreRol()
                : "MEDICO";

        String rolSistema = (usuario.getRolSistema() != null)
                ? usuario.getRolSistema().getNombreRol()
                : "USUARIO";

        String nuevoToken = jwtTokenProvider.generateToken(
                usuario.getIdFuncionario(),
                usuario.getRut(),
                rolFinal,
                rolSistema,
                relacion.getServicio().getIdServicio());

        FuncionarioSummaryDTO perfil = funcionarioService.getUserSummary(usuario.getIdFuncionario());

        return ResponseEntity.ok(new SesionDTO(
                nuevoToken,
                relacion.getServicio().getIdServicio(),
                rolFinal,
                perfil));
    }

    /**
     * Controlador para registrar personal como funcionario en el sistema de turnos
     *
     * @Param rut Rut del funcionario a consultar
     * @Return
     */
    @PostMapping("/register/{rut}")
    @PreAuthorize("hasRole('ROLE_JEFATURA')") // 👈 Spring se encarga del 403/401 automáticamente si no tiene el rol
    public ResponseEntity<Long> registerPersonal(@PathVariable String rut) {
        try {
            Long newId = funcionarioService.registerPersonal(rut);

            // Retornamos 201 Created pasando el ID en el cuerpo
            return ResponseEntity.status(HttpStatus.CREATED).body(newId);

        } catch (IllegalArgumentException e) {
            // Si el servicio dice que el RUT es inválido o faltan datos
            return ResponseEntity.badRequest().build(); // 400 Bad Request

        } catch (EntityExistsException e) {
            // Si el usuario ya estaba registrado en el sistema
            return ResponseEntity.status(HttpStatus.CONFLICT).build(); // 409 Conflict

        } catch (Exception e) {
            // Cualquier otra cosa (ej: base de datos caída) es un error del servidor, no de credenciales
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build(); // 500
        }
    }

}
