package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.AlterarTurnoRequest;
import com.pingeso.HUAP.Service.GestionTurnoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v2/gestion-turnos")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class GestionTurnoController {

    private final GestionTurnoService gestionTurnoService;

    @PostMapping("/alterar")
    public ResponseEntity<?> alterarTurno(@RequestBody AlterarTurnoRequest request) {
        try {
            Map<String, Object> resultado = gestionTurnoService.alterarTurno(request);
            return ResponseEntity.ok(resultado);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
