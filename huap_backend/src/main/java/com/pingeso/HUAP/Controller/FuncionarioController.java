package com.pingeso.HUAP.Controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import com.pingeso.HUAP.DTO.FuncionarioSummaryDTO;
import com.pingeso.HUAP.DTO.LoginRequest;
import com.pingeso.HUAP.DTO.LoginResponse;
import com.pingeso.HUAP.DTO.SelectServiceRequest;
import com.pingeso.HUAP.DTO.SesionDTO;
import com.pingeso.HUAP.DTO.ServicioDisponibleDTO;
import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.ServiciosFuncionarioEntity;
import com.pingeso.HUAP.Security.JwtTokenProvider;
import com.pingeso.HUAP.Service.FuncionarioService;

import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("api/v2/funcionario")
@CrossOrigin
public class FuncionarioController {
    
    @Autowired
    private FuncionarioService funcionarioService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        // Validaciones básicas
        if (loginRequest.getRut() == null || loginRequest.getPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Credenciales incompletas"));
        }

        FuncionarioEntity usuario;
        try {
            usuario = funcionarioService.authenticateWithPassword(
                    loginRequest.getRut(), loginRequest.getPassword());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", e.getMessage()));
        }

        // 2. Mapear los servicios a los que tiene acceso el funcionario
        List<ServicioDisponibleDTO> opciones = usuario.getServiciosFuncionario().stream()
                .filter(sf -> sf.getServicio() != null)
                .map(sf -> new ServicioDisponibleDTO(
                        sf.getServicio().getIdServicio(),
                        sf.getServicio().getNombre(),
                        sf.getRolServicio() != null ? sf.getRolServicio().getNombreRol() : "MEDICO"
                ))
                .toList();

        if (opciones.isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "El usuario no tiene servicios asignados"));
        }

        // 3. Generar un Token de Pre-Autorización (Corto, ej. 5 min)
        // Este token solo contiene el ID del usuario, nada más.
        String preAuthToken = jwtTokenProvider.generatePreAuthToken(usuario.getIdFuncionario());

        return ResponseEntity.ok(new LoginResponse(preAuthToken, true, opciones));
    }

    

    // --- Gestión de funcionarios ---

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
    public ResponseEntity<FuncionarioSummaryDTO> update(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {
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
                        && sf.getServicio().getIdServicio().equals(idServicioElegido))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Acceso denegado al servicio indicado"));

        String rolFinal = (relacion.getRolServicio() != null) 
                ? relacion.getRolServicio().getNombreRol() 
                : "MEDICO";

        String finalToken = jwtTokenProvider.generateToken(
                usuario.getIdFuncionario(),
                usuario.getRut(),
                rolFinal,
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

        String nuevoToken = jwtTokenProvider.generateToken(
                usuario.getIdFuncionario(),
                usuario.getRut(),
                rolFinal,
                relacion.getServicio().getIdServicio());

        FuncionarioSummaryDTO perfil = funcionarioService.getUserSummary(usuario.getIdFuncionario());

        return ResponseEntity.ok(new SesionDTO(
                nuevoToken,
                relacion.getServicio().getIdServicio(),
                rolFinal,
                perfil));
    }
}
