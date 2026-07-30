package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.*;
import jakarta.persistence.EntityExistsException;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.ServiciosFuncionarioEntity;
import com.pingeso.HUAP.Security.JwtTokenProvider;
import com.pingeso.HUAP.Security.LoginAttemptService;
import com.pingeso.HUAP.Service.FuncionarioService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


@RestController
@RequestMapping("/api/v2/funcionarios")
@EnableMethodSecurity
@Tag(name = "Funcionarios y autenticación",
        description = "Login (JWT en dos pasos: pre-autenticación y selección de servicio), "
                + "registro y gestión de funcionarios.")
public class FuncionarioController {

        private static final Logger logger = LoggerFactory.getLogger(FuncionarioController.class);
    
    @Autowired
    private FuncionarioService funcionarioService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private LoginAttemptService loginAttemptService;

    // ====================================================================
    // AUTENTICACIÓN Y SESIÓN
    // ====================================================================

    /**
     * Autenticación inicial del usuario mediante RUT y contraseña.
     * Si las credenciales son válidas, devuelve un token de pre-autorización y los
     * servicios disponibles para completar el segundo paso del login.
     */
    @Operation(summary = "Autenticación (paso 1)",
            description = "Valida RUT y contraseña. Si el usuario tiene varios servicios, devuelve un "
                    + "token de pre-autorización y la lista de servicios para elegir en el paso 2. "
                    + "Incluye bloqueo por intentos fallidos.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Credenciales válidas; retorna token de pre-autorización y servicios disponibles"),
            @ApiResponse(responseCode = "400", description = "Credenciales incompletas"),
            @ApiResponse(responseCode = "401", description = "Credenciales inválidas"),
            @ApiResponse(responseCode = "403", description = "Usuario sin servicios asignados"),
            @ApiResponse(responseCode = "429", description = "Cuenta bloqueada por demasiados intentos fallidos")
    })
    @SecurityRequirements // endpoint público: no requiere token
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
        // 2. Servicios a los que el funcionario puede acceder.
        //    Un ADMINISTRADOR ve todos los servicios vigentes aunque no sea miembro (rol efectivo JEFATURA).
        List<ServicioDisponibleDTO> opciones = funcionarioService.getServiciosDisponibles(usuario);

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

    // ====================================================================
    // CONSULTAS Y GESTIÓN DE FUNCIONARIOS
    // ====================================================================

    /**
     * Verifica si existe un funcionario registrado en el sistema de turnos.
     * Devuelve 200 OK si existe, 404 NOT FOUND si no, o 401 si ocurre un error controlado.
     *
     * @param rut RUT del funcionario a consultar.
     * @return ResponseEntity sin cuerpo con el estado de la verificación.
     */
    @Operation(summary = "Verificar si un funcionario está registrado",
            description = "Devuelve el ID del funcionario si existe (200), 404 si no, o 401 ante un error controlado.")
    @GetMapping("/status/{rut}")
    public ResponseEntity<Long> checkFuncionario(@PathVariable String rut){
        try {
            Long funcionarioId = funcionarioService.isPresent(rut);
            if (funcionarioId == -1L) {
                return ResponseEntity.notFound().build(); // 404 Not Found
            }
            return ResponseEntity.ok(funcionarioId); // 200 OK

        } catch (RuntimeException e) {
            // Tip de Senior: Al menos registra el error en un log antes de mutearlo con el HTTP Status
            logger.error("Error al verificar funcionario con RUT: {}", rut, e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }


    /**
     * Obtiene el resumen de funcionarios, opcionalmente filtrado por servicio.
     */
    @Operation(summary = "Resumen de funcionarios",
            description = "Lista los funcionarios (opcionalmente filtrados por servicio) en formato resumido.")
        @GetMapping("/summary")
    public ResponseEntity<List<FuncionarioSummaryDTO>> getAllSummary(
            @RequestParam(required = false) Long servicioId) {
        return ResponseEntity.ok(funcionarioService.getAllUserSummaryByServicio(servicioId));
    }



    /**
     * Obtiene el resumen de un funcionario específico por su identificador.
     */
    @Operation(summary = "Resumen de un funcionario por ID")
    @GetMapping("/{id}/summary")
    public ResponseEntity<FuncionarioSummaryDTO> getSummary(@PathVariable Long id) {
        FuncionarioSummaryDTO dto = funcionarioService.getUserSummary(id);
        if (dto == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(dto);
    }

    /**
     * Devuelve métricas de disponibilidad de funcionarios para un servicio.
     */
    @Operation(summary = "Disponibilidad de funcionarios de un servicio")
    @GetMapping("/disponibilidad/{servicioId}")
    public ResponseEntity<Map<String, Object>> getDisponibilidad(@PathVariable Long servicioId) {
        return ResponseEntity.ok(funcionarioService.getAvailabilityByServicio(servicioId));
    }

    /**
     * Actualiza los datos de un funcionario, respetando reglas de permisos para modificar
     * su propio perfil o delegar cambios de rol/estado a usuarios con privilegios.
     */
    @Operation(summary = "Actualizar un funcionario",
            description = "Un usuario solo puede modificar su propio registro; solo JEFATURA/ADMINISTRADOR "
                    + "pueden cambiar el rol o el estado de otro funcionario.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Funcionario actualizado"),
            @ApiResponse(responseCode = "401", description = "No autenticado"),
            @ApiResponse(responseCode = "403", description = "Sin permiso para modificar a otro funcionario o su rol/estado"),
            @ApiResponse(responseCode = "404", description = "Funcionario no encontrado")
    })
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
                .anyMatch(a -> ("ROLE_JEFATURA".equals(a.getAuthority()) || "ROLE_ADMINISTRADOR".equals(a.getAuthority())));

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

    /**
     * Completa la autenticación seleccionando el servicio con el que el usuario desea trabajar,
     * devolviendo el JWT final con su rol de servicio y rol de sistema.
     */
    @Operation(summary = "Autenticación (paso 2): seleccionar servicio",
            description = "Recibe el token de pre-autorización y el servicio elegido, y devuelve el JWT "
                    + "definitivo (con rol de sistema y rol de servicio) junto con el perfil.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sesión iniciada; retorna JWT y perfil"),
            @ApiResponse(responseCode = "401", description = "Token de pre-autorización inválido o expirado")
    })
    @SecurityRequirements // endpoint público: usa el token de pre-autorización en el cuerpo
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

        // Resolver el acceso al servicio elegido (un ADMINISTRADOR puede entrar aunque no sea miembro).
        Long idServicioElegido = request.getServicioId();

        FuncionarioService.AccesoServicio acceso;
        try {
            acceso = funcionarioService.resolverAccesoServicio(usuario, idServicioElegido);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        }

        String rolFinal = acceso.rolServicio();

        String rolSistema = (usuario.getRolSistema() != null)
                ? usuario.getRolSistema().getNombreRol()
                : "USUARIO";

        String finalToken = jwtTokenProvider.generateToken(
                usuario.getIdFuncionario(),
                usuario.getRut(),
                rolFinal,
                rolSistema,
                acceso.servicio().getIdServicio()
        );

        FuncionarioSummaryDTO perfil = funcionarioService.getUserSummary(usuario.getIdFuncionario());

        return ResponseEntity.ok(new SesionDTO(
                finalToken,
                acceso.servicio().getIdServicio(),
                rolFinal,
                perfil
        ));
    }

    /**
     * Cambia el servicio activo de la sesión actual y emite un nuevo JWT con los
     * permisos correspondientes al nuevo contexto.
     */
    @Operation(summary = "Cambiar de servicio en la sesión activa",
            description = "Genera un nuevo JWT para otro servicio al que el funcionario autenticado tenga acceso.")
    @PostMapping("/switch-service")
    public ResponseEntity<?> switchService(@RequestBody SelectServiceRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long idFuncionario = (Long) auth.getPrincipal();

        FuncionarioEntity usuario = funcionarioService.findById(idFuncionario);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Usuario no encontrado"));
        }

        FuncionarioService.AccesoServicio acceso;
        try {
            acceso = funcionarioService.resolverAccesoServicio(usuario, request.getServicioId());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", e.getMessage()));
        }

        String rolFinal = acceso.rolServicio();

        String rolSistema = (usuario.getRolSistema() != null)
                ? usuario.getRolSistema().getNombreRol()
                : "USUARIO";

        String nuevoToken = jwtTokenProvider.generateToken(
                usuario.getIdFuncionario(),
                usuario.getRut(),
                rolFinal,
                rolSistema,
                acceso.servicio().getIdServicio());

        FuncionarioSummaryDTO perfil = funcionarioService.getUserSummary(usuario.getIdFuncionario());

        return ResponseEntity.ok(new SesionDTO(
                nuevoToken,
                acceso.servicio().getIdServicio(),
                rolFinal,
                perfil));
    }

    // ====================================================================
    // REGISTRO DE PERSONAL
    // ====================================================================

    /**
     * Registra a un integrante del personal existente en la vista hospitalaria como
     * funcionario del sistema de turnos.
     */
    @Operation(summary = "Registrar personal como funcionario",
            description = "Registra en el sistema de turnos a una persona existente en el personal (viewPersonal). "
                    + "Requiere rol JEFATURA o ADMINISTRADOR.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Funcionario registrado; retorna el nuevo ID"),
            @ApiResponse(responseCode = "400", description = "RUT inválido o datos faltantes"),
            @ApiResponse(responseCode = "409", description = "El funcionario ya estaba registrado"),
            @ApiResponse(responseCode = "500", description = "Error interno")
    })
    @PostMapping("/register/{rut}")
    @PreAuthorize("hasAnyRole('ROLE_JEFATURA','ROLE_ADMINISTRADOR')") // Spring se encarga del 403/401 automáticamente si no tiene el rol
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
