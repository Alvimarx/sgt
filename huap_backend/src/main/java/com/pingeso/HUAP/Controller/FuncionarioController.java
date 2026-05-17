package com.pingeso.HUAP.Controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.pingeso.HUAP.DTO.FuncionarioSummaryDTO;
import com.pingeso.HUAP.DTO.LoginRequest;
import com.pingeso.HUAP.DTO.LoginResponse;
import com.pingeso.HUAP.DTO.LoginResponseV2;
import com.pingeso.HUAP.DTO.SelectServiceRequest;
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

    // 1. Validar identidad en la base de datos (V2)
        FuncionarioEntity usuario = funcionarioService.authenticateWithPassword(
                loginRequest.getRut(), loginRequest.getPassword());

        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "RUT o contraseña incorrectos"));
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

        return ResponseEntity.ok(new LoginResponseV2(preAuthToken, true, opciones));
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
        
        // 1. Extraer ID usando el getter .getPreAuthToken()
        String preToken = request.getPreAuthToken();
        Long idFuncionario = jwtTokenProvider.getUserIdFromPreAuthToken(preToken);
        
        // 2. Buscar al funcionario
        FuncionarioEntity usuario = funcionarioService.findById(idFuncionario);
        
        // 3. Buscar la relación usando el getter .getServicioId()
        Long idServicioElegido = request.getServicioId();
        
        ServiciosFuncionarioEntity relacion = usuario.getServiciosFuncionario().stream()
                .filter(sf -> sf.getServicio().getIdServicio().equals(idServicioElegido))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Acceso denegado al servicio indicado"));

        String rolFinal = (relacion.getRolServicio() != null) 
                ? relacion.getRolServicio().getNombreRol() 
                : "MEDICO";

        // 4. Generar el JWT Definitivo
        String finalToken = jwtTokenProvider.generateToken(
                usuario.getIdFuncionario(),
                usuario.getRut(),
                rolFinal,
                relacion.getServicio().getIdServicio()
        );

        // 5. Devolver la respuesta (usando constructor normal)
        return ResponseEntity.ok(new LoginResponse(
                finalToken,
                usuario.getIdFuncionario(),
                relacion.getServicio().getIdServicio(),
                rolFinal,
                usuario.getNombre(),
                usuario.getApelPat(),
                usuario.getApelMat()
        ));
    }
}
