package com.pingeso.HUAP.Controller;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;

import com.pingeso.HUAP.DTO.AlterarTurnoRequest;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.RotativaRepository;
import com.pingeso.HUAP.Repository.TipoTurnoRepository;
import com.pingeso.HUAP.Repository.PuestoRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Service.GestionTurnoService;
import com.pingeso.HUAP.Service.TurnoService;

@RestController
@RequestMapping("/api/v2/turnos")
public class TurnoController {

    @Autowired
    private TurnoService turnoService;

    @Autowired
    private ServicioRepository servicioRepository;

    @Autowired
    private PuestoRepository puestoRepository;

    @Autowired
    private FuncionarioRepository funcionarioRepository;

    @Autowired
    private RotativaRepository rotativaRepository;

    @Autowired
    private TipoTurnoRepository tipoTurnoRepository;

    @Autowired
    private GestionTurnoService gestionTurnoService;


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

    @PostMapping("/alterar")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'JEFATURA', 'SUBROGANTE')")
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
            turnoService.eliminarTurno(id);
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

    @GetMapping("/servicio/{servicioId}/sin-asignar/periodo")
    public ResponseEntity<List<Map<String, Object>>> getUnassignedTurnosByServicioAndPeriodo(
            @PathVariable Long servicioId,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) {
        LocalDate inicio = fechaInicio != null ? LocalDate.parse(fechaInicio) : LocalDate.now().withDayOfMonth(1);
        LocalDate fin = fechaFin != null ? LocalDate.parse(fechaFin)
                : LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());
        return ResponseEntity.ok(turnoService.getUnassignedTurnosByServicioAndPeriodo(servicioId, inicio, fin));
    }

    @Operation(summary = "Estadísticas de cobertura de turnos de un servicio",
            description = "Total de turnos, asignados, vacantes y porcentaje de cobertura en un rango "
                    + "de fechas (por defecto, el mes en curso). Pensado para el gráfico de "
                    + "\"Turnos Asignados vs Vacantes\" del dashboard.")
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

    @GetMapping("/servicio/{servicioId}/todos-detalle")
    public ResponseEntity<List<Map<String, Object>>> getTurnosDetalleByServicio(
            @PathVariable Long servicioId,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) {
        LocalDate inicio = fechaInicio != null ? LocalDate.parse(fechaInicio) : LocalDate.now().withDayOfMonth(1);
        LocalDate fin = fechaFin != null ? LocalDate.parse(fechaFin)
                : LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());
        return ResponseEntity.ok(turnoService.getTurnosDetalleServicio(servicioId, inicio, fin));
    }

    @GetMapping("/servicio/{servicioId}/funcionarios-detalle")
    public ResponseEntity<List<Map<String, Object>>> getFuncionariosConTurnosByServicio(
            @PathVariable Long servicioId,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) {
        LocalDate inicio = fechaInicio != null ? LocalDate.parse(fechaInicio) : LocalDate.now().withDayOfMonth(1);
        LocalDate fin = fechaFin != null ? LocalDate.parse(fechaFin)
                : LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());
        return ResponseEntity.ok(turnoService.getFuncionariosConTurnosServicio(servicioId, inicio, fin));
    }

    @Operation(summary = "Estadísticas de funcionarios con turno en un servicio",
            description = "Cantidad de funcionarios del servicio que tienen al menos un turno en el "
                    + "rango de fechas (por defecto, el mes en curso) vs. el total de funcionarios "
                    + "asignados al servicio.")
    @GetMapping("/servicio/{servicioId}/funcionarios-stats")
    public ResponseEntity<Map<String, Object>> getFuncionariosStatsByServicio(
            @PathVariable Long servicioId,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) {
        LocalDate inicio = fechaInicio != null ? LocalDate.parse(fechaInicio) : LocalDate.now().withDayOfMonth(1);
        LocalDate fin = fechaFin != null ? LocalDate.parse(fechaFin)
                : LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());
        return ResponseEntity.ok(turnoService.getFuncionariosStatsServicio(servicioId, inicio, fin));
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

    @GetMapping("/puesto/{puestoId}")
    public ResponseEntity<List<Map<String, Object>>> getTurnosByPuesto(@PathVariable Long puestoId) {
        return ResponseEntity.ok(turnoService.getTurnosByPuesto(puestoId));
    }

    // ====================================================================
    // ASIGNACIÓN Y PLANIFICACIÓN
    // ====================================================================

    @GetMapping("/asignacion")
    public ResponseEntity<?> getTurnosParaAsignacion(
            @RequestParam Long puestoId,
            @RequestParam String fechaInicio,
            @RequestParam String fechaFin) {
        try {
            LocalDate inicio = LocalDate.parse(fechaInicio);
            LocalDate fin = LocalDate.parse(fechaFin);
            return ResponseEntity.ok(turnoService.getTurnosParaAsignacion(puestoId, inicio, fin));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ====================================================================
    // ALTERAR TURNO (DESASIGNAR / REASIGNAR / ASIGNAR / CAMBIAR_HORAS)
    // ====================================================================

    private TurnoEntity buildTurnoFromPayload(Map<String, Object> payload) {
        TurnoEntity turno = new TurnoEntity();

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

        if (payload.get("idPuesto") != null) {
            Long idPuesto = Long.parseLong(payload.get("idPuesto").toString());
            puestoRepository.findById(idPuesto).ifPresent(p -> {
                if (p.isEliminado()) throw new RuntimeException("El puesto seleccionado fue eliminado y no puede usarse.");
                turno.setPuesto(p);
            });
        }

        if (payload.get("idFuncionario") != null) {
            Long idFuncionario = Long.parseLong(payload.get("idFuncionario").toString());
            funcionarioRepository.findById(idFuncionario).ifPresent(turno::setFuncionario);
        }

        if (payload.get("idRotativa") != null) {
            Long idRotativa = Long.parseLong(payload.get("idRotativa").toString());
            rotativaRepository.findById(idRotativa).ifPresent(turno::setRotativa);
        }

        if (payload.get("idTipoTurno") != null) {
            Long idTipoTurno = Long.parseLong(payload.get("idTipoTurno").toString());
            tipoTurnoRepository.findById(idTipoTurno).ifPresent(tt -> {
                if (tt.isEliminado()) throw new RuntimeException("El tipo de turno seleccionado fue eliminado y no puede usarse.");
                turno.setTipoTurno(tt);
            });
        }

        return turno;
    }
}
