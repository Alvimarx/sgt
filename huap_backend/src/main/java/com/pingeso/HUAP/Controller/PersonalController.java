package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.LoginRequest;
import com.pingeso.HUAP.DTO.LoginResponse;
import com.pingeso.HUAP.Security.JwtTokenProvider;
import com.pingeso.HUAP.Service.PersonalService;
import com.pingeso.HUAP.Entity.PersonalEntity;
import com.pingeso.HUAP.Repository.PersonalRepository; // <--- IMPORTAR REPO
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/usuarios")
@CrossOrigin("*")
public class PersonalController {

    @Autowired
    private PersonalService personalService;

    @Autowired
    private PersonalRepository personalRepository;

    @Autowired
    private com.pingeso.HUAP.Service.SolicitudService solicitudService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    /**
     * Endpoint de login con JWT
     * Acepta rut y password en el body
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        // Validar que se envíen ambos campos
        if (loginRequest.getRut() == null || loginRequest.getPassword() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new java.util.HashMap<String, Object>() {
                        {
                            put("error", "RUT y contraseña son requeridos");
                        }
                    });
        }

        // Autenticar usuario con password
        PersonalEntity usuario = personalService.authenticateWithPassword(
                loginRequest.getRut(),
                loginRequest.getPassword());

        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new java.util.HashMap<String, Object>() {
                        {
                            put("error", "Credenciales inválidas");
                        }
                    });
        }

        // Generar token JWT
        Long servicioId = (usuario.getIdServicio() != null)
                ? usuario.getIdServicio().longValue()
                : null;

        // Determinar rol basándose en el campo jefatura: 1 = JEFATURA, 0 = MEDICO
        String rolDeterminado = (usuario.getJefatura() != null && usuario.getJefatura() == 1)
                ? "JEFATURA"
                : "MEDICO";

        String token = jwtTokenProvider.generateToken(
                usuario.getIdPersonal(),
                usuario.getRut(),
                rolDeterminado,
                servicioId);

        // Crear respuesta con toda la información necesaria
        LoginResponse response = new LoginResponse(
                token,
                usuario.getIdPersonal(),
                servicioId,
                rolDeterminado,
                usuario.getNombre(),
                usuario.getApellidoPaterno(),
                usuario.getApellidoMaterno());

        return ResponseEntity.ok(response);
    }

    /**
     * Endpoint legacy de login (solo RUT) - Mantener para compatibilidad temporal
     * 
     * @deprecated Usar el nuevo endpoint POST /login con body
     */
    @Deprecated
    @PostMapping("/login-legacy")
    public ResponseEntity<?> loginLegacy(@RequestParam String rut) {
        // Normalize incoming RUT: remove dots, hyphens and uppercase the DV so it
        // matches DB format
        String cleanRut = (rut == null) ? null : rut.replaceAll("[^0-9Kk]", "").toUpperCase();
        Long[] ids = personalService.authenticate(cleanRut);

        if (ids != null) {
            // devolver un objeto con userId y servicioId
            return ResponseEntity.ok().body(new java.util.HashMap<String, Object>() {
                {
                    put("userId", ids[0]);
                    put("servicioId", ids[1]);
                }
            });
        } else {
            return ResponseEntity.status(401).body("Credenciales inválidas");
        }
    }

    @GetMapping("")
    public ResponseEntity<?> listUsers(@RequestParam(required = false) Long servicioId) {
        return ResponseEntity.ok().body(personalService.getAllUsersSummary(servicioId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        java.util.Map<String, Object> user = personalService.getUserSummary(id);
        if (user == null)
            return ResponseEntity.notFound().build();
        return ResponseEntity.ok().body(user);
    }

    // Crear nuevo usuario
    // (CREACIÓN DE USUARIOS DESHABILITADA)
    // El endpoint POST para crear usuarios fue eliminado por decisión de producto.
    // Mantener esta ruta activa podría permitir creación de médicos; para evitar
    // romper integraciones, devolvemos 405 Method Not Allowed si se intenta usar.
    @PostMapping("")
    public ResponseEntity<?> createUserDisabled() {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(new java.util.HashMap<String, Object>() {
            {
                put("error", "Creación de usuarios deshabilitada");
            }
        });
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody java.util.Map<String, Object> payload) {
        java.util.Map<String, Object> updated = personalService.updateUser(id, payload);
        if (updated == null)
            return ResponseEntity.notFound().build();
        return ResponseEntity.ok().body(updated);
    }

    // --- NUEVO ENDPOINT: LISTAR PERSONAL POR SERVICIO ---
    @GetMapping("/por-servicio/{idServicio}")
    public ResponseEntity<List<PersonalEntity>> getPersonalByServicio(@PathVariable Integer idServicio) {
        List<PersonalEntity> personal = personalRepository.findByIdServicio(idServicio);
        return ResponseEntity.ok(personal);
    }

    // Nuevo endpoint: devuelve todas las solicitudes cuyos medicoSolicitante
    // pertenece al servicio indicado
    @GetMapping("/servicio/{servicioId}/solicitudes")
    public ResponseEntity<?> getSolicitudesByServicio(@PathVariable Long servicioId) {
        // Devolver DTOs para evitar exponer entidades JPA (p.ej. claves, relaciones
        // perezosas)
        java.util.List<com.pingeso.HUAP.DTO.SolicitudResponseDTO> lista = solicitudService
                .obtenerSolicitudesPorServicio(servicioId);
        return ResponseEntity.ok().body(lista);
    }

    // Nuevo endpoint: devuelve conteos de solicitudes agrupadas por fecha para el
    // calendario
    @GetMapping("/servicio/{servicioId}/solicitudes/fechas")
    public ResponseEntity<?> getSolicitudCountsByServicio(@PathVariable Long servicioId) {
        java.util.List<com.pingeso.HUAP.DTO.ResumenMesDTO> lista = personalService
                .getSolicitudCountsByServicioGroupedByDate(servicioId);
        return ResponseEntity.ok().body(lista);
    }

    // Devuelve conteos de disponibilidad (activos/inactivos/total/porcentaje) para
    // un servicio
    @GetMapping("/servicio/{servicioId}/disponibilidad")
    public ResponseEntity<?> getDisponibilidadByServicio(@PathVariable Long servicioId) {
        java.util.Map<String, Object> result = personalService.getAvailabilityByServicio(servicioId);
        return ResponseEntity.ok().body(result);
    }

    // Obtener estadísticas de horas de usuarios por servicio
    @GetMapping("/servicio/{servicioId}/stats/horas")
    public ResponseEntity<?> getHorasStatsByServicio(@PathVariable Long servicioId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        java.util.Map<String, Object> stats = personalService.getHorasStatsByServicio(servicioId, page, size);
        return ResponseEntity.ok().body(stats);
    }

    /**
     * Endpoint para obtener todos los servicios y roles vinculados a un RUT.
     * Útil cuando un mismo profesional cumple distintos roles en diferentes servicios.
     */
    @GetMapping("/rut/{rut}/servicios")
    public ResponseEntity<?> getServiciosByRut(@PathVariable String rut) {
        List<java.util.Map<String, Object>> servicios = personalService.getServiciosYRolesPorRut(rut);

        if (servicios.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new java.util.HashMap<String, String>() {{
                        put("error", "No se encontraron registros para el RUT: " + rut);
                    }});
        }

        return ResponseEntity.ok(servicios);
    }
}