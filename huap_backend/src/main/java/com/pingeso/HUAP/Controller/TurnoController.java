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
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import com.pingeso.HUAP.DTO.AlterarTurnoRequest;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.RotativaRepository;
import com.pingeso.HUAP.Repository.TipoTurnoRepository;
import com.pingeso.HUAP.Repository.PuestoRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Service.GestionTurnoService;
import com.pingeso.HUAP.Service.TurnoService;

/**
 * Controlador REST de turnos.
 *
 * <p>Expone el CRUD de {@link TurnoEntity} y numerosas consultas para las vistas de agenda,
 * calendario y estadísticas: por servicio (calendario, día, sin asignar, cobertura, stats),
 * por funcionario y por puesto, además de la alteración de turnos (asignar, reasignar,
 * liberar o cambiar horas) vía {@link GestionTurnoService}. Ruta base: {@code /api/v2/turnos}.
 */
@RestController
@RequestMapping("/api/v2/turnos")
@Tag(name = "Turnos",
        description = "CRUD de turnos, consultas por servicio/funcionario/puesto, "
                + "estadísticas de cobertura y alteración (asignar/reasignar/liberar).")
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

    /** Lista todos los turnos. */
    @Operation(summary = "Listar todos los turnos")
    @GetMapping
    public ResponseEntity<List<TurnoEntity>> getAllTurnos() {
        return ResponseEntity.ok(turnoService.getAllTurnos());
    }

    /**
     * Obtiene un turno por su id.
     * @param id identificador del turno.
     * @return el turno, o 404 si no existe.
     */
    @Operation(summary = "Obtener un turno por id")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Turno encontrado"),
            @ApiResponse(responseCode = "404", description = "Turno no encontrado")
    })
    @GetMapping("/{id}")
    public ResponseEntity<?> getTurnoById(@PathVariable Long id) {
        return turnoService.getTurnoById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Crea un turno a partir de un payload flexible (fechas, horas, servicio, puesto,
     * funcionario, rotativa y tipo de turno por sus ids).
     * @param payload campos del turno; ver {@link #buildTurnoFromPayload(Map)}.
     * @return el turno creado (201) o 400 si el payload es inválido.
     */
    @Operation(summary = "Crear un turno",
            description = "Crea un turno validando conflictos de horario y reglas del servicio.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Turno creado"),
            @ApiResponse(responseCode = "400", description = "Payload inválido o conflicto")
    })
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

    /**
     * Altera un turno existente: asignar, reasignar, liberar o cambiar horas.
     * Requiere rol ADMINISTRADOR, JEFATURA o SUBROGANTE.
     * @param request operación y datos de la alteración.
     * @return el resultado de la operación.
     */
    @Operation(summary = "Alterar un turno (asignar/reasignar/liberar/cambiar horas)",
            description = "Punto único para mutar un turno asignado, validando reglas y conflictos. "
                    + "Requiere rol ADMINISTRADOR, JEFATURA o SUBROGANTE.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Turno alterado"),
            @ApiResponse(responseCode = "400", description = "Operación inválida o conflicto"),
            @ApiResponse(responseCode = "403", description = "Sin permisos"),
            @ApiResponse(responseCode = "500", description = "Error interno")
    })
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

    /**
     * Actualiza un turno existente con los campos del payload.
     * @param id identificador del turno.
     * @param payload campos a actualizar; ver {@link #buildTurnoFromPayload(Map)}.
     * @return el turno actualizado, o 400 si es inválido.
     */
    @Operation(summary = "Actualizar un turno")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Turno actualizado"),
            @ApiResponse(responseCode = "400", description = "Payload inválido o conflicto")
    })
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

    /**
     * Elimina (lógicamente) un turno.
     * @param id identificador del turno.
     * @return 204 si se eliminó, 404 si no existe.
     */
    @Operation(summary = "Eliminar un turno")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Turno eliminado"),
            @ApiResponse(responseCode = "404", description = "Turno no encontrado")
    })
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

    /** Lista los turnos de un servicio con sus detalles (para la agenda). */
    @Operation(summary = "Turnos de un servicio (con detalles)")
    @GetMapping("/servicio/{servicioId}")
    public ResponseEntity<List<Map<String, Object>>> getTurnosByServicio(@PathVariable Long servicioId) {
        return ResponseEntity.ok(turnoService.getTurnosByServicioConDetalles(servicioId));
    }

    /**
     * Turnos de un servicio para un mes concreto (vista calendario).
     * @param servicioId servicio.
     * @param year año.
     * @param month mes (1-12).
     * @return los turnos del mes, o 400 si el mes es inválido.
     */
    @Operation(summary = "Turnos de un servicio por mes (calendario)")
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

    /**
     * Turnos de un servicio en un día concreto.
     * @param servicioId servicio.
     * @param fecha fecha en formato ISO (yyyy-MM-dd).
     */
    @Operation(summary = "Turnos de un servicio en un día")
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

    /** Turnos sin asignar de un servicio en un día concreto. */
    @Operation(summary = "Turnos sin asignar de un servicio en un día")
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

    /** Todos los turnos vacantes (sin funcionario) de un servicio. */
    @Operation(summary = "Turnos sin asignar de un servicio")
    @GetMapping("/servicio/{servicioId}/sin-asignar")
    public ResponseEntity<List<Map<String, Object>>> getUnassignedTurnosByServicio(@PathVariable Long servicioId) {
        return ResponseEntity.ok(turnoService.getUnassignedTurnosByServicio(servicioId));
    }

    /** Turnos vacantes de un servicio en un rango (por defecto, el mes en curso). */
    @Operation(summary = "Turnos sin asignar de un servicio por período")
    @GetMapping("/servicio/{servicioId}/sin-asignar/periodo")
    public ResponseEntity<List<Map<String, Object>>> getUnassignedTurnosByServicioAndPeriodo(
            @PathVariable Long servicioId,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) {
        Rango r = resolverRango(fechaInicio, fechaFin);
        return ResponseEntity.ok(turnoService.getUnassignedTurnosByServicioAndPeriodo(servicioId, r.inicio(), r.fin()));
    }

    /**
     * Estadísticas de cobertura de turnos de un servicio (para el gráfico
     * "Turnos Asignados vs Vacantes" del dashboard).
     */
    @Operation(summary = "Estadísticas de cobertura de turnos de un servicio",
            description = "Total de turnos, asignados, vacantes y porcentaje de cobertura en un rango "
                    + "de fechas (por defecto, el mes en curso). Pensado para el gráfico de "
                    + "\"Turnos Asignados vs Vacantes\" del dashboard.")
    @GetMapping("/servicio/{servicioId}/stats")
    public ResponseEntity<Map<String, Object>> getTurnosStatsByServicio(
            @PathVariable Long servicioId,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) {
        Rango r = resolverRango(fechaInicio, fechaFin);
        return ResponseEntity.ok(turnoService.getTurnosStatsByServicio(servicioId, r.inicio(), r.fin()));
    }

    /** Detalle de todos los turnos de un servicio en un rango (por defecto, el mes en curso). */
    @Operation(summary = "Detalle de turnos de un servicio por período")
    @GetMapping("/servicio/{servicioId}/todos-detalle")
    public ResponseEntity<List<Map<String, Object>>> getTurnosDetalleByServicio(
            @PathVariable Long servicioId,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) {
        Rango r = resolverRango(fechaInicio, fechaFin);
        return ResponseEntity.ok(turnoService.getTurnosDetalleServicio(servicioId, r.inicio(), r.fin()));
    }

    /** Funcionarios de un servicio con el detalle de sus turnos en un rango. */
    @Operation(summary = "Funcionarios con turnos de un servicio por período")
    @GetMapping("/servicio/{servicioId}/funcionarios-detalle")
    public ResponseEntity<List<Map<String, Object>>> getFuncionariosConTurnosByServicio(
            @PathVariable Long servicioId,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) {
        Rango r = resolverRango(fechaInicio, fechaFin);
        return ResponseEntity.ok(turnoService.getFuncionariosConTurnosServicio(servicioId, r.inicio(), r.fin()));
    }

    /**
     * Estadísticas de funcionarios con turno en un servicio (cuántos tienen al menos un turno
     * en el rango vs. el total de funcionarios asignados al servicio).
     */
    @Operation(summary = "Estadísticas de funcionarios con turno en un servicio",
            description = "Cantidad de funcionarios del servicio que tienen al menos un turno en el "
                    + "rango de fechas (por defecto, el mes en curso) vs. el total de funcionarios "
                    + "asignados al servicio.")
    @GetMapping("/servicio/{servicioId}/funcionarios-stats")
    public ResponseEntity<Map<String, Object>> getFuncionariosStatsByServicio(
            @PathVariable Long servicioId,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) {
        Rango r = resolverRango(fechaInicio, fechaFin);
        return ResponseEntity.ok(turnoService.getFuncionariosStatsServicio(servicioId, r.inicio(), r.fin()));
    }

    /** Cobertura real de un servicio en un rango (por defecto, el mes en curso). */
    @Operation(summary = "Cobertura real de un servicio por período")
    @GetMapping("/servicio/{servicioId}/cobertura")
    public ResponseEntity<Map<String, Object>> getCoberturaByServicio(
            @PathVariable Long servicioId,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) {
        Rango r = resolverRango(fechaInicio, fechaFin);
        return ResponseEntity.ok(turnoService.getCoberturaRealByServicio(servicioId, r.inicio(), r.fin()));
    }

    // ====================================================================
    // CONSULTAS POR FUNCIONARIO
    // ====================================================================

    /**
     * Turnos de un funcionario. Si se indican {@code year} y {@code month}, filtra por ese mes;
     * si no, devuelve todos sus turnos.
     */
    @Operation(summary = "Turnos de un funcionario (opcionalmente por mes/año)")
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

    /** Próximos turnos (futuros) de un funcionario. */
    @Operation(summary = "Turnos futuros de un funcionario")
    @GetMapping("/funcionario/{idFuncionario}/futuros")
    public ResponseEntity<List<Map<String, Object>>> getTurnosFuturos(@PathVariable Long idFuncionario) {
        return ResponseEntity.ok(turnoService.getTurnosFuturosFuncionario(idFuncionario));
    }

    // ====================================================================
    // CONSULTAS POR PUESTO
    // ====================================================================

    /** Turnos asociados a un puesto. */
    @Operation(summary = "Turnos de un puesto")
    @GetMapping("/puesto/{puestoId}")
    public ResponseEntity<List<Map<String, Object>>> getTurnosByPuesto(@PathVariable Long puestoId) {
        return ResponseEntity.ok(turnoService.getTurnosByPuesto(puestoId));
    }

    // ====================================================================
    // ASIGNACIÓN Y PLANIFICACIÓN
    // ====================================================================

    /**
     * Turnos de un puesto en un rango, para la vista de asignación.
     * @param puestoId puesto.
     * @param fechaInicio fecha inicio (ISO, obligatoria).
     * @param fechaFin fecha fin (ISO, obligatoria).
     */
    @Operation(summary = "Turnos para asignación (por puesto y rango)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Listado para asignación"),
            @ApiResponse(responseCode = "400", description = "Fechas inválidas")
    })
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
    // HELPERS
    // ====================================================================

    /** Rango de fechas resuelto (inicio y fin). */
    private record Rango(LocalDate inicio, LocalDate fin) {}

    /**
     * Resuelve un rango de fechas a partir de parámetros opcionales.
     * Si faltan, usa por defecto el <b>mes en curso</b> (día 1 al último día del mes).
     * @param fechaInicio fecha inicio ISO o {@code null}.
     * @param fechaFin fecha fin ISO o {@code null}.
     */
    private Rango resolverRango(String fechaInicio, String fechaFin) {
        LocalDate inicio = fechaInicio != null ? LocalDate.parse(fechaInicio)
                : LocalDate.now().withDayOfMonth(1);
        LocalDate fin = fechaFin != null ? LocalDate.parse(fechaFin)
                : LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());
        return new Rango(inicio, fin);
    }

    /**
     * Construye un {@link TurnoEntity} desde un mapa flexible de campos. Acepta fechas/horas ISO
     * y los ids de servicio, puesto, funcionario, rotativa y tipo de turno (resolviéndolos contra
     * sus repositorios). Rechaza puestos o tipos de turno marcados como eliminados.
     * @param payload campos del turno.
     * @return el turno construido (sin persistir).
     */
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
