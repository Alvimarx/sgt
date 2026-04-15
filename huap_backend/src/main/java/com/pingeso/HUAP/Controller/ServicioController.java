package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.Service.ServicioService;
import com.pingeso.HUAP.Entity.ServicioEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/servicios")
@CrossOrigin("*")
public class ServicioController {

    @Autowired
    private ServicioService servicioService;

    // Obtener todos los servicios
    @GetMapping("")
    public ResponseEntity<?> listServicios() {
        return ResponseEntity.ok().body(servicioService.getAllServiciosSummary());
    }

    // Obtener un servicio por ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getServicioById(@PathVariable Integer id) {
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
            Map<String, Object> summary = servicioService.getServicioSummary(nuevoServicio.getIdServicio());
            return ResponseEntity.status(HttpStatus.CREATED).body(summary);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new java.util.HashMap<String, Object>() {{
                put("error", e.getMessage());
            }});
        }
    }

    // Actualizar servicio existente
    @PutMapping("/{id}")
    public ResponseEntity<?> updateServicio(@PathVariable Integer id, @RequestBody Map<String, Object> payload) {
        try {
            Map<String, Object> updated = servicioService.updateServicio(id, payload);
            if (updated == null) return ResponseEntity.notFound().build();
            return ResponseEntity.ok().body(updated);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new java.util.HashMap<String, Object>() {{
                put("error", e.getMessage());
            }});
        }
    }

    // Eliminar servicio
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteServicio(@PathVariable Integer id) {
        boolean deleted = servicioService.deleteServicio(id);
        if (!deleted) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok().body(new java.util.HashMap<String, Object>() {{
            put("message", "Servicio eliminado exitosamente");
        }});
    }

    // Obtener usuarios por servicio
    @GetMapping("/{id}/usuarios")
    public ResponseEntity<?> getUsuariosByServicio(@PathVariable Integer id) {
        List<Map<String, Object>> usuarios = servicioService.getUsuariosByServicio(id);
        return ResponseEntity.ok().body(usuarios);
    }

    // Obtener servicios activos
    @GetMapping("/activos")
    public ResponseEntity<?> getServiciosActivos() {
        List<ServicioEntity> servicios = servicioService.getServiciosActivos();
        return ResponseEntity.ok().body(servicios);
    }
    // Limpiar datos del servicio (borrado en cascada masivo, preservando servicio y usuarios)
    @DeleteMapping("/{id}/limpiar")
    public ResponseEntity<?> limpiarServicio(@PathVariable Integer id) {
        try {
            servicioService.limpiarServicio(id);
            return ResponseEntity.ok().body(new java.util.HashMap<String, Object>() {{
                put("message", "Servicio limpiado exitosamente (datos eliminados)");
            }});
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new java.util.HashMap<String, Object>() {{
                put("error", "Error al limpiar el servicio: " + e.getMessage());
            }});
        }
    }
}
