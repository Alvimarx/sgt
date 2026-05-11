package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.AlterarTurnoRequest;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.PisoRepository;
import com.pingeso.HUAP.Repository.PlantillaRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Service.AlterarTurnoService;
import com.pingeso.HUAP.Service.TurnoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/turnos")
@CrossOrigin(origins = "*")
public class TurnoController {

    @Autowired
    private TurnoService turnoService;

    @Autowired
    private ServicioRepository servicioRepository;

    @Autowired
    private PisoRepository pisoRepository;

    @Autowired
    private FuncionarioRepository funcionarioRepository;

    @Autowired
    private PlantillaRepository plantillaRepository;

    @Autowired
    private AlterarTurnoService alterarTurnoService;

    // ====================================================================
    // CRUD BASE
    // ====================================================================

    @GetMapping
    public ResponseEntity<List<TurnoEntity>> getAllTurnos() {
        return ResponseEntity.ok(turnoService.getAllTurnos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getTurnoById(@PathVariable Long id) {
        return turnoService.getTurnoById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createTurno(@RequestBody Map<String, Object> payload) {
        try {
            TurnoEntity turno = buildTurnoFromPayload(payload);
            TurnoEntity saved = turnoService.saveTurno(turno);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTurno(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            TurnoEntity turnoUpdate = buildTurnoFromPayload(payload);
            TurnoEntity updated = turnoService.updateTurno(id, turnoUpdate);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTurno(@PathVariable Long id) {
        try {
            turnoService.deleteTurno(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    // ====================================================================
    // CONSULTAS POR SERVICIO
    // ====================================================================

    @GetMapping("/servicio/{servicioId}")
    public ResponseEntity<List<Map<String, Object>>> getTurnosByServicio(@PathVariable Long servicioId) {
        return ResponseEntity.ok(turnoService.getTurnosByServicioConDetalles(servicioId));
    }

    @GetMapping("/servicio/{servicioId}/calendario/{year}/{month}")
    public ResponseEntity<?> getTurnosCalendario(
            @PathVariable Long servicioId,
            @PathVariable int year,
            @PathVariable int month) {
        if (month < 1 || month > 12) return ResponseEntity.badRequest().build();
        LocalDate inicio = LocalDate.of(year, month, 1);
        LocalDate fin = inicio.withDayOfMonth(inicio.lengthOfMonth());
        return ResponseEntity.ok(turnoService.getTurnosCalendario(servicioId, inicio, fin));
    }

    @GetMapping("/servicio/{servicioId}/dia/{fecha}")
    public ResponseEntity<?> getTurnosByServicioAndDia(
            @PathVariable Long servicioId,
            @PathVariable String fecha) {
        try {
            LocalDate fechaDia = LocalDate.parse(fecha);
            return ResponseEntity.ok(turnoService.getTurnosCalendario(servicioId, fechaDia, fechaDia));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/servicio/{servicioId}/dia/{fecha}/sin-asignar")
    public ResponseEntity<?> getTurnosSinAsignarByDia(
            @PathVariable Long servicioId,
            @PathVariable String fecha) {
        try {
            LocalDate fechaDia = LocalDate.parse(fecha);
            return ResponseEntity.ok(turnoService.getTurnosSinAsignarByDia(servicioId, fechaDia));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/servicio/{servicioId}/sin-asignar")
    public ResponseEntity<List<Map<String, Object>>> getUnassignedTurnosByServicio(@PathVariable Long servicioId) {
        return ResponseEntity.ok(turnoService.getUnassignedTurnosByServicio(servicioId));
    }

    @GetMapping("/servicio/{servicioId}/stats")
    public ResponseEntity<Map<String, Object>> getTurnosStatsByServicio(
            @PathVariable Long servicioId,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) {
        LocalDate inicio = fechaInicio != null ? LocalDate.parse(fechaInicio) : LocalDate.now().withDayOfMonth(1);
        LocalDate fin = fechaFin != null ? LocalDate.parse(fechaFin)
                : LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());
        return ResponseEntity.ok(turnoService.getTurnosStatsByServicio(servicioId, inicio, fin));
    }

    @GetMapping("/servicio/{servicioId}/cobertura")
    public ResponseEntity<Map<String, Object>> getCoberturaByServicio(
            @PathVariable Long servicioId,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) {
        LocalDate inicio = fechaInicio != null ? LocalDate.parse(fechaInicio) : LocalDate.now().withDayOfMonth(1);
        LocalDate fin = fechaFin != null ? LocalDate.parse(fechaFin)
                : LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());
        return ResponseEntity.ok(turnoService.getCoberturaRealByServicio(servicioId, inicio, fin));
    }

    // ====================================================================
    // CONSULTAS POR FUNCIONARIO
    // ====================================================================

    @GetMapping("/funcionario/{idFuncionario}")
    public ResponseEntity<List<Map<String, Object>>> getTurnosByFuncionario(
            @PathVariable Long idFuncionario,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        if (year != null && month != null) {
            return ResponseEntity.ok(turnoService.getTurnosByMedicoAndMonthAndYear(idFuncionario, month, year));
        }
        return ResponseEntity.ok(turnoService.getTurnosByMedico(idFuncionario));
    }

    @GetMapping("/funcionario/{idFuncionario}/futuros")
    public ResponseEntity<List<Map<String, Object>>> getTurnosFuturos(@PathVariable Long idFuncionario) {
        return ResponseEntity.ok(turnoService.getTurnosFuturosFuncionario(idFuncionario));
    }

    // ====================================================================
    // CONSULTAS POR PISO
    // ====================================================================

    @GetMapping("/piso/{pisoId}")
    public ResponseEntity<List<Map<String, Object>>> getTurnosByPiso(@PathVariable Long pisoId) {
        return ResponseEntity.ok(turnoService.getTurnosByPiso(pisoId));
    }

    // ====================================================================
    // ASIGNACIÓN Y PLANIFICACIÓN
    // ====================================================================

    @GetMapping("/asignacion")
    public ResponseEntity<?> getTurnosParaAsignacion(
            @RequestParam Long pisoId,
            @RequestParam String fechaInicio,
            @RequestParam String fechaFin) {
        try {
            LocalDate inicio = LocalDate.parse(fechaInicio);
            LocalDate fin = LocalDate.parse(fechaFin);
            return ResponseEntity.ok(turnoService.getTurnosParaAsignacion(pisoId, inicio, fin));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/asignacion-masiva")
    public ResponseEntity<?> asignarMasivo(@RequestBody Map<String, Object> payload) {
        try {
            Long idFuncionario = Long.parseLong(payload.get("idFuncionario").toString());
            Long idPlantilla = Long.parseLong(payload.get("idPlantilla").toString());
            Long idServicio = Long.parseLong(payload.get("idServicio").toString());
            LocalDate inicio = LocalDate.parse(payload.get("fechaInicio").toString());
            LocalDate fin = LocalDate.parse(payload.get("fechaFin").toString());

            int asignados = turnoService.asignarMasivoPorPlantilla(idFuncionario, idPlantilla, idServicio, inicio, fin);
            return ResponseEntity.ok(Map.of("message", "Turnos asignados correctamente", "cantidad", asignados));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ====================================================================
    // DETECCIÓN DE CONFLICTOS
    // ====================================================================

    @PostMapping("/check-conflicts")
    public ResponseEntity<?> checkConflicts(@RequestBody Map<String, Object> payload) {
        try {
            LocalDate fechaInicio = LocalDate.parse(payload.get("fechaInicio").toString());
            LocalDate fechaFin = LocalDate.parse(payload.get("fechaFin").toString());
            Long funcionarioId = payload.get("funcionarioId") != null
                    ? Long.parseLong(payload.get("funcionarioId").toString()) : null;
            Long plantillaId = payload.get("plantillaId") != null
                    ? Long.parseLong(payload.get("plantillaId").toString()) : null;
            Long servicioId = payload.get("servicioId") != null
                    ? Long.parseLong(payload.get("servicioId").toString()) : null;

            List<TurnoEntity> conflicting = turnoService.checkConflicts(fechaInicio, fechaFin,
                    funcionarioId, plantillaId, servicioId);

            List<String> conflictingDates = conflicting.stream()
                    .map(t -> t.getDiaInicioTurno().toString())
                    .distinct()
                    .sorted()
                    .toList();

            return ResponseEntity.ok(Map.of(
                    "hasConflicts", !conflicting.isEmpty(),
                    "count", conflicting.size(),
                    "conflictingDates", conflictingDates));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ====================================================================
    // ALTERAR TURNO (DESASIGNAR / REASIGNAR / ASIGNAR / CAMBIAR_HORAS)
    // ====================================================================

    @PostMapping("/alterar")
    public ResponseEntity<?> alterarTurno(@RequestBody AlterarTurnoRequest request) {
        try {
            Map<String, Object> result = alterarTurnoService.alterarTurno(request);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/delete-range")
    public ResponseEntity<?> deleteRange(@RequestBody Map<String, Object> payload) {
        try {
            LocalDate inicio = LocalDate.parse(payload.get("fechaInicio").toString());
            LocalDate fin = LocalDate.parse(payload.get("fechaFin").toString());
            Long pisoId = Long.parseLong(payload.get("pisoId").toString());
            turnoService.deleteTurnosByRange(inicio, fin, pisoId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private TurnoEntity buildTurnoFromPayload(Map<String, Object> payload) {
        TurnoEntity turno = new TurnoEntity();

        if (payload.get("nombre") != null)
            turno.setNombre(payload.get("nombre").toString());

        if (payload.get("diaInicioTurno") != null)
            turno.setDiaInicioTurno(LocalDate.parse(payload.get("diaInicioTurno").toString()));
        if (payload.get("diaFinalTurno") != null)
            turno.setDiaFinalTurno(LocalDate.parse(payload.get("diaFinalTurno").toString()));
        if (payload.get("horaInicio") != null)
            turno.setHoraInicio(LocalTime.parse(payload.get("horaInicio").toString()));
        if (payload.get("horaFin") != null)
            turno.setHoraFin(LocalTime.parse(payload.get("horaFin").toString()));

        if (payload.get("idServicio") != null) {
            Long idServicio = Long.parseLong(payload.get("idServicio").toString());
            servicioRepository.findById(idServicio).ifPresent(turno::setServicio);
        }

        if (payload.get("idPiso") != null) {
            Long idPiso = Long.parseLong(payload.get("idPiso").toString());
            pisoRepository.findById(idPiso).ifPresent(turno::setPiso);
        }

        if (payload.get("idFuncionario") != null) {
            Long idFuncionario = Long.parseLong(payload.get("idFuncionario").toString());
            funcionarioRepository.findById(idFuncionario).ifPresent(turno::setFuncionario);
        }

        if (payload.get("idPlantilla") != null) {
            Long idPlantilla = Long.parseLong(payload.get("idPlantilla").toString());
            plantillaRepository.findById(idPlantilla).ifPresent(turno::setPlantilla);
        }

        return turno;
    }
}
