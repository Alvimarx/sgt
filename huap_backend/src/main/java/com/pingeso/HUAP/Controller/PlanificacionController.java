package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.PlanificacionAsignacionDTO;
import com.pingeso.HUAP.DTO.PlanificacionDTO;
import com.pingeso.HUAP.Entity.PlanificacionAsignacionEntity;
import com.pingeso.HUAP.Entity.PlanificacionEntity;
import com.pingeso.HUAP.Service.PlanificacionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v2/planificaciones")
public class PlanificacionController {

    private final PlanificacionService planificacionService;

    public PlanificacionController(PlanificacionService planificacionService) {
        this.planificacionService = planificacionService;
    }

    @PostMapping
    public ResponseEntity<PlanificacionDTO> crear(@RequestBody PlanificacionDTO dto) {
        PlanificacionEntity entidad = planificacionService.crearPlanificacion(
                dto.getIdServicio(),
                dto.getNombre(),
                dto.getAsignaciones()
        );
        return ResponseEntity.ok(convertToDTO(entidad));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PlanificacionDTO> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(convertToDTO(planificacionService.obtenerPlanificacion(id)));
    }

    @GetMapping("/servicio/{idServicio}")
    public ResponseEntity<List<PlanificacionDTO>> obtenerPorServicio(@PathVariable Long idServicio) {
        List<PlanificacionDTO> respuesta = planificacionService.obtenerPlanificacionesPorServicio(idServicio).stream()
                .map(this::convertToDTO)
                .toList();
        return ResponseEntity.ok(respuesta);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PlanificacionDTO> actualizar(@PathVariable Long id, @RequestBody PlanificacionDTO dto) {
        PlanificacionEntity entidad = planificacionService.actualizarPlanificacion(
                id,
                dto.getNombre(),
                dto.getAsignaciones()
        );
        return ResponseEntity.ok(convertToDTO(entidad));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        planificacionService.eliminarPlanificacion(id);
        return ResponseEntity.noContent().build();
    }

    // Genera los turnos del molde desde un lunes.
    // Body: { "fechaInicio": "YYYY-MM-DD", "idsReglas": [..] (opcional) }
    @PostMapping("/{id}/generar")
    public ResponseEntity<?> generar(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            LocalDate fechaInicio = LocalDate.parse(payload.get("fechaInicio").toString());
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            Long actorId = (auth != null && auth.getPrincipal() instanceof Long)
                    ? (Long) auth.getPrincipal() : null;
            List<Long> idsReglas = parseIdsReglas(payload.get("idsReglas"));
            return ResponseEntity.ok(planificacionService.generarTurnos(id, fechaInicio, actorId, idsReglas));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Convierte el campo idsReglas del body (lista JSON) a List<Long>; ausente/null → vacía. */
    private List<Long> parseIdsReglas(Object raw) {
        List<Long> ids = new java.util.ArrayList<>();
        if (raw instanceof List<?> lista) {
            for (Object o : lista) {
                if (o != null) ids.add(Long.valueOf(o.toString()));
            }
        }
        return ids;
    }

    // Pre-chequeo de choques de horario (no crea turnos). Body: { "fechaInicio": "YYYY-MM-DD" }
    @PostMapping("/{id}/conflictos")
    public ResponseEntity<?> conflictos(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            LocalDate fechaInicio = LocalDate.parse(payload.get("fechaInicio").toString());
            return ResponseEntity.ok(planificacionService.detectarConflictos(id, fechaInicio));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================================
    // MAPEO Entity -> DTO
    // =========================================================================

    private PlanificacionDTO convertToDTO(PlanificacionEntity entidad) {
        if (entidad == null) return null;

        PlanificacionDTO dto = new PlanificacionDTO();
        dto.setIdPlanificacion(entidad.getIdPlanificacion());
        dto.setNombre(entidad.getNombre());

        if (entidad.getServicio() != null) {
            dto.setIdServicio(entidad.getServicio().getIdServicio());
            dto.setNombreServicio(entidad.getServicio().getNombre());
        }

        if (entidad.getAsignaciones() != null) {
            dto.setAsignaciones(entidad.getAsignaciones().stream().map(this::convertAsignacionToDTO).toList());
        }

        return dto;
    }

    private PlanificacionAsignacionDTO convertAsignacionToDTO(PlanificacionAsignacionEntity entidad) {
        if (entidad == null) return null;

        PlanificacionAsignacionDTO dto = new PlanificacionAsignacionDTO();
        dto.setIdAsignacion(entidad.getIdAsignacion());

        if (entidad.getPlantilla() != null && !entidad.getPlantilla().isEliminado()) {
            dto.setIdPlantilla(entidad.getPlantilla().getIdPlantilla());
            dto.setNombrePlantilla(entidad.getPlantilla().getNombre());
        }
        if (entidad.getFuncionario() != null && !entidad.getFuncionario().isEliminado()) {
            dto.setIdFuncionario(entidad.getFuncionario().getIdFuncionario());
            dto.setNombreFuncionario(entidad.getFuncionario().getNombre());
        }
        if (entidad.getPuesto() != null && !entidad.getPuesto().isEliminado()) {
            dto.setIdPuesto(entidad.getPuesto().getIdPuesto());
            dto.setNombrePuesto(entidad.getPuesto().getNombre());
        }

        return dto;
    }
}
