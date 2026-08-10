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
import com.pingeso.HUAP.Security.AuthenticatedUser;
import com.pingeso.HUAP.Security.JwtTokenProvider;
import com.pingeso.HUAP.Security.LoginAttemptService;
import com.pingeso.HUAP.Security.SeguridadServicio;
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

    @Autowired
    private SeguridadServicio seguridadServicio;

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
            description = "Lista los funcionarios del servicio de la sesión activa en formato resumido. "
                    + "Solo ADMINISTRADOR puede omitir el filtro (o pedir otro servicio) para ver el listado global.")
    @GetMapping("/summary")
    public ResponseEntity<List<FuncionarioSummaryDTO>> getAllSummary(
            @RequestParam(required = false) Long servicioId) {
        // SEC: sin esto, cualquier autenticado podía leer la nómina de CUALQUIER servicio
        // (o de todo el hospital, omitiendo el parámetro) cambiando/quitando servicioId.
        Long alcance = servicioId;
        if (!seguridadServicio.esAdministrador()) {
            alcance = (servicioId != null) ? servicioId : seguridadServicio.idServicioActual();
            seguridadServicio.exigirMismoServicio(alcance);
        }
        return ResponseEntity.ok(funcionarioService.getAllUserSummaryByServicio(alcance));
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
        seguridadServicio.exigirMismoServicio(servicioId);
        return ResponseEntity.ok(funcionarioService.getAvailabilityByServicio(servicioId));
    }

    /**
     * Actualiza los datos de un funcionario, respetando reglas de permisos para modificar
     * su propio perfil o delegar cambios de rol/estado a usuarios con privilegios.
     *
     * <p>SEC (alcance entre servicios): JEFATURA/SUBROGANTE solo pueden editar funcionarios
     * que pertenezcan a SU servicio autenticado — la pertenencia se verifica contra las
     * relaciones {@code Servicios_Funcionario} reales en BD (nunca contra el {@code servicioId}
     * que venga en la URL/body). Antes, cualquier JEFATURA podía editar (nombre, estado, etc.)
     * a un funcionario de OTRO servicio con solo cambiar el id en la URL.
     *
     * <p>Nota de diseño (campos globales — documentado, no resuelto por esquema): {@code nombre},
     * {@code apellidoPaterno}, {@code apellidoMaterno} y {@code estado} son atributos del
     * funcionario como persona, no de una relación específica con un servicio. Si el
     * funcionario pertenece a más de un servicio, una JEFATURA de CUALQUIERA de esos
     * servicios (verificada como perteneciente) puede modificar estos campos, y el cambio se
     * refleja en todos los servicios donde participa. Cerrar esto por completo requeriría un
     * cambio de modelo de datos (campos por-servicio) fuera del alcance autorizado en esta
     * etapa; se documenta como limitación conocida en REVISION_POST_CORRECCIONES_SGT.md. El
     * campo {@code servicioId}+{@code rol} (la relación de servicio en sí) SÍ queda
     * estrictamente limitado a la relación del servicio autenticado (ver más abajo).
     */
    @Operation(summary = "Actualizar un funcionario",
            description = "Un usuario solo puede modificar su propio registro. JEFATURA/SUBROGANTE pueden "
                    + "además modificar (incl. rol/estado) funcionarios de SU MISMO servicio; ADMINISTRADOR, "
                    + "de cualquier servicio.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Funcionario actualizado"),
            @ApiResponse(responseCode = "401", description = "No autenticado"),
            @ApiResponse(responseCode = "403", description = "Sin permiso para modificar a este funcionario, su rol/estado, o de otro servicio"),
            @ApiResponse(responseCode = "404", description = "Funcionario no encontrado")
    })
    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> payload) {

        // SEC (item 7, Bean Validation mínima): id inválido o body ausente/vacío antes de
        // tocar seguridad/negocio — evita NPE/estado inconsistente más abajo.
        if (id == null || id <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "id de funcionario inválido"));
        }
        if (payload == null || payload.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No se recibieron campos para actualizar"));
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthenticatedUser current)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long currentUserId = current.id();
        boolean isAdmin = current.esAdministrador();
        // SEC (item 5): SUBROGANTE se equipara a JEFATURA para esta operación — igual que ya
        // ocurre en SecurityConfig.SERVICE_ADMIN_PATHS para puestos/turnos/reglas-servicio.
        // Antes SUBROGANTE quedaba excluido aquí (solo podía editar su propio registro), una
        // inconsistencia respecto al resto de la administración por servicio.
        boolean isGestionServicio = isAdmin || "JEFATURA".equals(current.rol()) || "SUBROGANTE".equals(current.rol());

        // Ownership: quien no gestiona un servicio solo puede modificar su propio registro.
        if (!isGestionServicio && !currentUserId.equals(id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "No tienes permiso para modificar a otro funcionario"));
        }
        // SEC: JEFATURA/SUBROGANTE editando a OTRO funcionario (no a sí mismos) deben
        // verificar que ese funcionario pertenezca a su propio servicio — en BD, no por lo
        // que diga el cliente. ADMINISTRADOR queda exento (alcance global legítimo).
        if (isGestionServicio && !isAdmin && !currentUserId.equals(id)) {
            Long servicioSesion = seguridadServicio.idServicioActual();
            if (!funcionarioService.perteneceAServicio(id, servicioSesion)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "No tienes permiso para modificar a un funcionario de otro servicio"));
            }
        }
        // Escalada de privilegios: solo JEFATURA/SUBROGANTE puede cambiar el rol o el estado.
        if (!isGestionServicio && (payload.containsKey("rol") || payload.containsKey("estado"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "No tienes permiso para cambiar el rol o el estado"));
        }
        // SEC (C-01, Critical): el rut es el identificador que vincula al funcionario con
        // su identidad real en el hospital (viewPersonal) — nadie puede reasignarlo salvo
        // ADMINISTRADOR, para no habilitar suplantación de identidad entre funcionarios.
        if (!isAdmin && payload.containsKey("rut")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "No tienes permiso para cambiar el RUT"));
        }
        // SEC (C-01, Critical): antes, una JEFATURA de CUALQUIER servicio podía asignar a
        // cualquier funcionario (incluida su propia cuenta) como JEFATURA de un servicio
        // ajeno, cambiando solo "servicioId" en el body — escalada de privilegios entre
        // servicios. Ahora el servicio destino debe coincidir con el de la sesión activa
        // de quien hace el cambio, salvo que sea ADMINISTRADOR. Como el service solo toca la
        // relación cuyo servicioId coincide con este valor, esto también impide crear o
        // modificar relaciones de OTROS servicios (Servicios_Funcionario de un tercero).
        if (!isAdmin && payload.containsKey("servicioId")) {
            Long servicioDestino;
            try {
                servicioDestino = Long.valueOf(payload.get("servicioId").toString());
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "servicioId inválido"));
            }
            if (servicioDestino <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "servicioId inválido"));
            }
            seguridadServicio.exigirMismoServicio(servicioDestino);
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
        Long idFuncionario = seguridadServicio.idUsuarioActual();

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
    // SEC (L-01): hasAnyRole ya antepone "ROLE_" — con el prefijo duplicado esta regla
    // nunca se cumplía (nadie podía registrar personal, fail-closed mudo).
    @PreAuthorize("hasAnyRole('JEFATURA','ADMINISTRADOR')")
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
