package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.GenerarPlanificacionRequest;
import com.pingeso.HUAP.DTO.PlanificacionAsignacionDTO;
import com.pingeso.HUAP.DTO.PlanificacionDTO;
import com.pingeso.HUAP.DTO.PlanificacionEjecucionDTO;
import com.pingeso.HUAP.Entity.PlanificacionAsignacionEntity;
import com.pingeso.HUAP.Entity.PlanificacionEjecucionEntity;
import com.pingeso.HUAP.Entity.PlanificacionEntity;
import com.pingeso.HUAP.Repository.PlanificacionEjecucionRepository;
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
    private final PlanificacionEjecucionRepository ejecucionRepository;

    public PlanificacionController(PlanificacionService planificacionService,
                                    PlanificacionEjecucionRepository ejecucionRepository) {
        this.planificacionService = planificacionService;
        this.ejecucionRepository = ejecucionRepository;
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

    // Genera los turnos del molde para un rango efectivo (de longitud arbitraria), anclado a un
    // lunes. Body: { fechaInicioRotativa, fechaInicioEfectiva, fechaFinEfectiva, idsReglas? }
    @PostMapping("/{id}/generar")
    public ResponseEntity<?> generar(@PathVariable Long id, @RequestBody GenerarPlanificacionRequest body) {
        try {
            Long actorId = actorIdActual();
            List<Long> idsReglas = body.getIdsReglas() != null ? body.getIdsReglas() : List.of();
            return ResponseEntity.ok(planificacionService.generarTurnos(
                    id, body.getFechaInicioRotativa(), body.getFechaInicioEfectiva(), body.getFechaFinEfectiva(),
                    actorId, idsReglas));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Pre-chequeo de choques de horario (no crea turnos); mismo cuerpo que /generar, para que la
    // vista previa nunca pueda diferir de la generación final.
    @PostMapping("/{id}/conflictos")
    public ResponseEntity<?> conflictos(@PathVariable Long id, @RequestBody GenerarPlanificacionRequest body) {
        try {
            return ResponseEntity.ok(planificacionService.detectarConflictos(
                    id, body.getFechaInicioRotativa(), body.getFechaInicioEfectiva(), body.getFechaFinEfectiva()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Extiende la vigencia activa más reciente del servicio de esta planificación.
    // Body: { fechaFinEfectiva, idsReglas? }
    @PostMapping("/{id}/extender")
    public ResponseEntity<?> extender(@PathVariable Long id, @RequestBody GenerarPlanificacionRequest body) {
        try {
            List<Long> idsReglas = body.getIdsReglas() != null ? body.getIdsReglas() : List.of();
            return ResponseEntity.ok(planificacionService.extenderPlanificacion(
                    id, body.getFechaFinEfectiva(), actorIdActual(), idsReglas));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Edita la planificación desde una fecha determinada: trunca/anula la vigencia actual y genera
    // una nueva desde esa fecha, preservando el ancla de rotativa y el historial previo.
    // Body: { fechaInicioEfectiva (= fechaDesde), fechaFinEfectiva, asignaciones?, idsReglas? }
    @PostMapping("/{id}/editar-desde")
    public ResponseEntity<?> editarDesde(@PathVariable Long id, @RequestBody EditarDesdeRequest body) {
        try {
            return ResponseEntity.ok(planificacionService.editarPlanificacionDesde(
                    id, body.getFechaDesde(), body.getFechaFinEfectiva(), body.getAsignaciones(),
                    actorIdActual(), body.getIdsReglas() != null ? body.getIdsReglas() : List.of()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Lista las ejecuciones (vigencias/versiones) de esta planificación, más recientes primero.
    @GetMapping("/{id}/ejecuciones")
    public ResponseEntity<List<PlanificacionEjecucionDTO>> ejecuciones(@PathVariable Long id) {
        List<PlanificacionEjecucionDTO> respuesta = ejecucionRepository.findByPlanificacion_IdPlanificacion(id).stream()
                .sorted((a, b) -> b.getFechaInicioEfectiva().compareTo(a.getFechaInicioEfectiva()))
                .map(this::convertEjecucionToDTO)
                .toList();
        return ResponseEntity.ok(respuesta);
    }

    // Todas las vigencias del SERVICIO (de cualquier molde), para poder seleccionar y actuar sobre
    // cualquier planificación vigente sin depender de tener cargado el molde que la generó.
    @GetMapping("/servicio/{idServicio}/ejecuciones")
    public ResponseEntity<List<PlanificacionEjecucionDTO>> ejecucionesPorServicio(@PathVariable Long idServicio) {
        List<PlanificacionEjecucionDTO> respuesta = planificacionService.obtenerEjecucionesPorServicio(idServicio).stream()
                .map(this::convertEjecucionToDTO)
                .toList();
        return ResponseEntity.ok(respuesta);
    }

    // Elimina los turnos de una vigencia desde una fecha en adelante (acorta su fin efectivo al día
    // anterior). Rechaza fechas retroactivas. Body: { fechaDesde }
    @PutMapping("/ejecuciones/{idEjecucion}/acortar")
    public ResponseEntity<?> acortar(@PathVariable Long idEjecucion, @RequestBody Map<String, Object> payload) {
        try {
            LocalDate fechaDesde = LocalDate.parse(payload.get("fechaDesde").toString());
            return ResponseEntity.ok(planificacionService.acortarPlanificacion(idEjecucion, fechaDesde, actorIdActual()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Anula por completo una ejecución (deshacer generación), identificada de forma inequívoca —
    // nunca afecta turnos de otra ejecución, planificación o turnos manuales/legado.
    @DeleteMapping("/ejecuciones/{idEjecucion}")
    public ResponseEntity<?> anularEjecucion(@PathVariable Long idEjecucion) {
        try {
            int eliminados = planificacionService.anularEjecucion(idEjecucion, actorIdActual());
            return ResponseEntity.ok(Map.of("eliminados", eliminados));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Deshace una generación LEGADA (turnos sin ejecución asociada, identificados por rotativa
    // compartida). Se conserva por compatibilidad histórica; para generaciones nuevas usar
    // DELETE /ejecuciones/{idEjecucion}. Params: fechaInicio, fechaFin (YYYY-MM-DD).
    @DeleteMapping("/{id}/turnos")
    public ResponseEntity<?> eliminarTurnosGenerados(
            @PathVariable Long id,
            @RequestParam String fechaInicio,
            @RequestParam String fechaFin) {
        try {
            LocalDate inicio = LocalDate.parse(fechaInicio);
            LocalDate fin = LocalDate.parse(fechaFin);
            int eliminados = planificacionService.eliminarTurnosGenerados(id, inicio, fin);
            return ResponseEntity.ok(Map.of("eliminados", eliminados));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private Long actorIdActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.getPrincipal() instanceof com.pingeso.HUAP.Security.AuthenticatedUser au)
                ? au.id() : null;
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

        if (entidad.getRotativa() != null && !entidad.getRotativa().isEliminado()) {
            dto.setIdRotativa(entidad.getRotativa().getIdRotativa());
            dto.setNombreRotativa(entidad.getRotativa().getNombre());
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

    private PlanificacionEjecucionDTO convertEjecucionToDTO(PlanificacionEjecucionEntity e) {
        return new PlanificacionEjecucionDTO(
                e.getIdEjecucion(),
                e.getPlanificacion().getIdPlanificacion(),
                e.getPlanificacion().getNombre(),
                e.getFechaInicioRotativa(),
                e.getFechaInicioEfectiva(),
                e.getFechaFinEfectiva(),
                e.getFechaGeneracion(),
                e.getEstado().name(),
                e.getActor() != null ? (e.getActor().getNombre() + " " + e.getActor().getApelPat()) : null
        );
    }

    /** Cuerpo de la petición de "editar desde fecha" (ver {@link PlanificacionService#editarPlanificacionDesde}). */
    public static class EditarDesdeRequest {
        private LocalDate fechaDesde;
        private LocalDate fechaFinEfectiva;
        private List<PlanificacionAsignacionDTO> asignaciones;
        private List<Long> idsReglas;

        public LocalDate getFechaDesde() { return fechaDesde; }
        public void setFechaDesde(LocalDate fechaDesde) { this.fechaDesde = fechaDesde; }
        public LocalDate getFechaFinEfectiva() { return fechaFinEfectiva; }
        public void setFechaFinEfectiva(LocalDate fechaFinEfectiva) { this.fechaFinEfectiva = fechaFinEfectiva; }
        public List<PlanificacionAsignacionDTO> getAsignaciones() { return asignaciones; }
        public void setAsignaciones(List<PlanificacionAsignacionDTO> asignaciones) { this.asignaciones = asignaciones; }
        public List<Long> getIdsReglas() { return idsReglas; }
        public void setIdsReglas(List<Long> idsReglas) { this.idsReglas = idsReglas; }
    }
}
