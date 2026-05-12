package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.Service.ServicioService;
import com.pingeso.HUAP.Entity.ServicioEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/servicios")
@CrossOrigin("*")
public class ServicioController {

    private final ServicioService servicioService;

    @Autowired
    public ServicioController(ServicioService servicioService) {
        this.servicioService = servicioService;
    }

    // Obtener todos los servicios
    @GetMapping("")
    public ResponseEntity<?> listServicios() {
        return ResponseEntity.ok().body(servicioService.getAllServiciosSummary());
    }

    // Obtener un servicio por ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getServicioById(@PathVariable Long id) { // Actualizado a Long
        Map<String, Object> servicio = servicioService.getServicioSummary(id);
        if (servicio == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().body(servicio);
    }

    // Buscar servicio por nombre
    @GetMapping("/nombre/{nombre}")
    public ResponseEntity<?> getServicioByNombre(@PathVariable String nombre) {
        ServicioEntity servicio = servicioService.getServicioByNombre(nombre);
        if (servicio == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().body(servicio);
    }

    // Crear nuevo servicio
    @PostMapping("")
    public ResponseEntity<?> createServicio(@RequestBody Map<String, Object> payload) {
        try {
            ServicioEntity nuevoServicio = servicioService.createServicio(payload);
            // Actualizado a getId()
            Map<String, Object> summary = servicioService.getServicioSummary(nuevoServicio.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(summary);
        } catch (Exception e) {
            // Uso de Map.of() para evitar memory leaks de las dobles llaves {{ }}
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    // Actualizar servicio existente
    @PutMapping("/{id}")
    public ResponseEntity<?> updateServicio(@PathVariable Long id, @RequestBody Map<String, Object> payload) { // Actualizado a Long
        try {
            Map<String, Object> updated = servicioService.updateServicio(id, payload);
            if (updated == null) return ResponseEntity.notFound().build();
            return ResponseEntity.ok().body(updated);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    // Eliminar servicio
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteServicio(@PathVariable Long id) { // Actualizado a Long
        boolean deleted = servicioService.deleteServicio(id);
        if (!deleted) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok().body(Map.of("message", "Servicio eliminado exitosamente"));
    }
}