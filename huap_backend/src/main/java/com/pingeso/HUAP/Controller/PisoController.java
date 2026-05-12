package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.Service.PisoService;
import com.pingeso.HUAP.Entity.PisoEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/pisos")
@CrossOrigin("*")
public class PisoController {

    @Autowired
    private PisoService pisoService;

    // ====================================================================
    // 1. LECTURA (GET) - Todo devuelve Maps seguros
    // ====================================================================

    // Obtener todos los pisos (o filtrar por servicioId)
    @GetMapping("")
    public ResponseEntity<List<Map<String, Object>>> listPisos(@RequestParam(required = false) Long servicioId) {
        return ResponseEntity.ok().body(pisoService.getAllPisosSummary(servicioId));
    }

    // Obtener un piso por ID
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getPisoById(@PathVariable Long id) {
        Map<String, Object> piso = pisoService.getPisoSummary(id);
        if (piso == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().body(piso);
    }

    // Buscar piso por nombre
    @GetMapping("/nombre/{nombre}")
    public ResponseEntity<Map<String, Object>> getPisoByNombre(@PathVariable String nombre) {
        PisoEntity piso = pisoService.getPisoByNombre(nombre);
        if (piso == null) return ResponseEntity.notFound().build();
        
        // Reutilizamos el getPisoSummary para convertir la entidad a Map y evitar errores Lazy
        return ResponseEntity.ok().body(pisoService.getPisoSummary(piso.getId()));
    }

    // Obtener pisos por servicio (Ruta específica que usa el frontend)
    @GetMapping("/servicio/{servicioId}")
    public ResponseEntity<List<Map<String, Object>>> getPisosByServicio(@PathVariable Long servicioId) {
        // Aprovechamos que getAllPisosSummary ya hace exactamente esto de forma segura
        return ResponseEntity.ok().body(pisoService.getAllPisosSummary(servicioId));
    }

    // ====================================================================
    // 2. ESCRITURA Y MODIFICACIÓN (POST/PUT)
    // ====================================================================

    // Crear nuevo piso
    @PostMapping("")
    public ResponseEntity<?> createPiso(@RequestBody Map<String, Object> payload) {
        try {
            PisoEntity nuevoPiso = pisoService.createPiso(payload);
            Map<String, Object> summary = pisoService.getPisoSummary(nuevoPiso.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(summary);
        } catch (Exception e) {
            // Usamos Map.of para crear respuestas JSON limpias en 1 sola línea
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    // Actualizar piso existente
    @PutMapping("/{id}")
    public ResponseEntity<?> updatePiso(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            // Toda la lógica compleja se movió al Service. El Controller solo delega.
            Map<String, Object> updated = pisoService.updatePiso(id, payload);
            
            if (updated == null) return ResponseEntity.notFound().build();
            return ResponseEntity.ok().body(updated);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    // ====================================================================
    // 3. ELIMINACIÓN (DELETE)
    // ====================================================================

    // Eliminar piso
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePiso(@PathVariable Long id) {
        try {
            boolean deleted = pisoService.deletePiso(id);
            if (!deleted) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok().body(Map.of("message", "Piso eliminado exitosamente"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }
}