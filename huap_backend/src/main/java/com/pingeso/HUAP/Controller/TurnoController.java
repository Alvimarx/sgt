package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.DTO.AlterarTurnoRequest;
import com.pingeso.HUAP.Repository.PersonalRepository;
import com.pingeso.HUAP.Repository.VinculoTurnoRotativaRepository;
import com.pingeso.HUAP.Service.TurnoService;
import com.pingeso.HUAP.Service.AlterarTurnoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/turnos")
@CrossOrigin(origins = "*")
public class TurnoController {

    @Autowired
    private TurnoService turnoService;

    @Autowired
    private VinculoTurnoRotativaRepository vinculoRepository;

    @Autowired
    private PersonalRepository personalRepository;

    @Autowired
    private AlterarTurnoService alterarTurnoService;

    @GetMapping("/")
    public ResponseEntity<List<TurnoEntity>> getAllTurnos() {
        List<TurnoEntity> turnos = turnoService.getAllTurnos();
        return ResponseEntity.ok(turnos);
    }

    @GetMapping("/servicio/{servicioId}/entities")
    public ResponseEntity<List<TurnoEntity>> getTurnosByServicioEntities(@PathVariable Long servicioId) {
        List<TurnoEntity> turnos = turnoService.getTurnosByServicio(servicioId);
        return ResponseEntity.ok(turnos);
    }

    @GetMapping("/servicio/{servicioId}/calendario/{year}/{month}")
    public ResponseEntity<List<Map<String, Object>>> getTurnosByServicioAndMonth(
            @PathVariable Long servicioId,
            @PathVariable int year,
            @PathVariable int month) {

        if (month < 1 || month > 12) {
            return ResponseEntity.badRequest().build();
        }

        java.time.LocalDate fechaInicio = java.time.LocalDate.of(year, month, 1);
        java.time.LocalDate fechaFin = fechaInicio.withDayOfMonth(fechaInicio.lengthOfMonth());

        // Llamamos al servicio inteligente que resuelve nombres
        List<Map<String, Object>> turnos = turnoService.getTurnosCalendario(servicioId, fechaInicio, fechaFin);

        return ResponseEntity.ok(turnos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TurnoEntity> getTurnoById(@PathVariable Long id) {
        TurnoEntity turno = turnoService.getTurnoById(id);
        if (turno != null) {
            return ResponseEntity.ok(turno);
        }
        return ResponseEntity.notFound().build();
    }

    // 1. Crear (POST) - Modificado con lógica Sidecar
    @PostMapping
    public ResponseEntity<?> createTurno(@RequestBody Map<String, Object> payload) {
        try {
            // A. Construcción Manual del Turno (Mapeo seguro)
            TurnoEntity turno = new TurnoEntity();

            if (payload.get("nombre") != null)
                turno.setNombre((String) payload.get("nombre"));
            if (payload.get("tipoTurno") != null)
                turno.setTipoTurno((String) payload.get("tipoTurno"));
            if (payload.get("idPiso") != null)
                turno.setIdPiso(payload.get("idPiso").toString());
            if (payload.get("estado") != null)
                turno.setEstado(payload.get("estado").toString());
            if (payload.get("tipoDeTurnoCantidad") != null)
                turno.setTipoDeTurnoCantidad(payload.get("tipoDeTurnoCantidad").toString());

            // Fechas y Horas
            if (payload.get("horaInicio") != null)
                turno.setHoraInicio(LocalTime.parse(payload.get("horaInicio").toString()));
            if (payload.get("horaFin") != null)
                turno.setHoraFin(LocalTime.parse(payload.get("horaFin").toString()));
            if (payload.get("diaInicioTurno") != null)
                turno.setDiaInicioTurno(LocalDate.parse(payload.get("diaInicioTurno").toString()));
            if (payload.get("diaFinalTurno") != null)
                turno.setDiaFinalTurno(LocalDate.parse(payload.get("diaFinalTurno").toString()));

            // Médico asignado
            if (payload.get("idMedico") != null)
                turno.setIdMedico(Long.parseLong(payload.get("idMedico").toString()));

            // Resolver Creador (idCreador -> PersonalEntity)
            if (payload.get("idCreador") != null) {
                Long idCreador = Long.parseLong(payload.get("idCreador").toString());
                personalRepository.findById(idCreador).ifPresent(turno::setCreador);
            }

            // B. Guardar Turno Original (Usando el servicio existente)
            TurnoEntity nuevoTurno = turnoService.saveTurno(turno);

            // C. Lógica Sidecar: Guardar Vínculo con Rotativa
            if (payload.containsKey("idTipoTurnoRef") && payload.get("idTipoTurnoRef") != null) {
                Long idRotativa = Long.parseLong(payload.get("idTipoTurnoRef").toString());
                // Usamos el Repo del Vínculo directamente
                com.pingeso.HUAP.Entity.VinculoTurnoRotativaEntity vinculo = new com.pingeso.HUAP.Entity.VinculoTurnoRotativaEntity(
                        nuevoTurno.getId(), idRotativa);
                vinculoRepository.save(vinculo);
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(nuevoTurno);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error al crear turno: " + e.getMessage());
        }
    }

    // (NUEVO) Endpoint optimizado para la vista de Asignación
    @GetMapping("/asignacion")
    public ResponseEntity<?> getTurnosParaAsignacion(
            @RequestParam String idPiso,
            @RequestParam String fechaInicio,
            @RequestParam String fechaFin) {
        try {
            LocalDate inicio = LocalDate.parse(fechaInicio);
            LocalDate fin = LocalDate.parse(fechaFin);

            List<Map<String, Object>> result = turnoService.getTurnosParaAsignacion(idPiso, inicio, fin);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error al obtener turnos: " + e.getMessage());
        }
    }

    // Endpoint para asignación masiva por Tipo de Turno (Rotativa)
    @PutMapping("/asignacion-masiva")
    public ResponseEntity<?> asignarMasivo(@RequestBody Map<String, Object> payload) {
        try {
            Long idMedico = payload.get("idMedico") != null ? Long.parseLong(payload.get("idMedico").toString()) : null;
            Long idTipoTurnoRef = Long.parseLong(payload.get("idTipoTurnoRef").toString());
            String fechaInicio = (String) payload.get("fechaInicio");
            String fechaFin = (String) payload.get("fechaFin");
            Long idPiso = Long.parseLong(payload.get("idPiso").toString());

            int actualizados = turnoService.asignarMasivoPorRotativa(idMedico, idTipoTurnoRef, idPiso, fechaInicio,
                    fechaFin);

            return ResponseEntity.ok(new HashMap<String, Object>() {
                {
                    put("message", "Turnos actualizados correctamente");
                    put("cantidad", actualizados);
                }
            });
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error en asignación masiva: " + e.getMessage());
        }
    }

    // 4. Actualizar (PUT) - Modificado con lógica Sidecar
    @PutMapping("/{id}")
    public ResponseEntity<?> updateTurno(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            // A. Construcción Manual para el Update
            TurnoEntity turnoUpdate = new TurnoEntity();

            // Mapeamos solo lo que viene en el payload
            if (payload.get("nombre") != null)
                turnoUpdate.setNombre((String) payload.get("nombre"));
            if (payload.get("tipoTurno") != null)
                turnoUpdate.setTipoTurno((String) payload.get("tipoTurno"));
            if (payload.get("idPiso") != null)
                turnoUpdate.setIdPiso((String) payload.get("idPiso"));
            if (payload.get("estado") != null)
                turnoUpdate.setEstado((String) payload.get("estado"));
            if (payload.get("idMedico") != null)
                turnoUpdate.setIdMedico(Long.parseLong(payload.get("idMedico").toString()));

            if (payload.get("horaInicio") != null)
                turnoUpdate.setHoraInicio(LocalTime.parse(payload.get("horaInicio").toString()));
            if (payload.get("horaFin") != null)
                turnoUpdate.setHoraFin(LocalTime.parse(payload.get("horaFin").toString()));
            if (payload.get("diaInicioTurno") != null)
                turnoUpdate.setDiaInicioTurno(LocalDate.parse(payload.get("diaInicioTurno").toString()));
            if (payload.get("diaFinalTurno") != null)
                turnoUpdate.setDiaFinalTurno(LocalDate.parse(payload.get("diaFinalTurno").toString()));

            // B. Actualizar Turno Original
            TurnoEntity turnoActualizado = turnoService.updateTurno(id, turnoUpdate);

            if (turnoActualizado == null) {
                return ResponseEntity.notFound().build();
            }

            // C. Lógica Sidecar: Actualizar o Crear Vínculo si viene el dato
            if (payload.containsKey("idTipoTurnoRef") && payload.get("idTipoTurnoRef") != null) {
                Long idRotativa = Long.parseLong(payload.get("idTipoTurnoRef").toString());

                // Buscamos si ya existe un vínculo para este turno
                com.pingeso.HUAP.Entity.VinculoTurnoRotativaEntity vinculoExistente = vinculoRepository
                        .findByIdTurno(id);

                if (vinculoExistente != null) {
                    vinculoExistente.setIdTipoTurno(idRotativa);
                    vinculoRepository.save(vinculoExistente);
                } else {
                    com.pingeso.HUAP.Entity.VinculoTurnoRotativaEntity nuevoVinculo = new com.pingeso.HUAP.Entity.VinculoTurnoRotativaEntity(
                            id, idRotativa);
                    vinculoRepository.save(nuevoVinculo);
                }
            }

            return ResponseEntity.ok(turnoActualizado);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error al actualizar turno: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTurno(@PathVariable Long id) {
        boolean eliminado = turnoService.deleteTurno(id);
        if (eliminado) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/medico/{idMedico}")
    public ResponseEntity<List<TurnoEntity>> getTurnosByMedico(
            @PathVariable Long idMedico,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        List<TurnoEntity> turnos;
        if (year != null && month != null) {
            turnos = turnoService.getTurnosByMedicoAndMonthAndYear(idMedico, year, month);
        } else {
            turnos = turnoService.getTurnosByMedico(idMedico);
        }
        return ResponseEntity.ok(turnos);
    }

    @GetMapping("/get-turnos-by-user/{id}")
    public ResponseEntity<List<TurnoEntity>> getTurnosByUser(@PathVariable Long id) {
        List<TurnoEntity> turnos = turnoService.getTurnosByMedico(id);
        return ResponseEntity.ok(turnos);
    }

    @GetMapping("/piso/{idPiso}")
    public ResponseEntity<List<TurnoEntity>> getTurnosByPiso(@PathVariable String idPiso) {
        List<TurnoEntity> turnos = turnoService.getTurnosByPiso(idPiso);
        return ResponseEntity.ok(turnos);
    }

    @GetMapping("/estado/{estado}")
    public ResponseEntity<List<TurnoEntity>> getTurnosByEstado(@PathVariable String estado) {
        List<TurnoEntity> turnos = turnoService.getTurnosByEstado(estado);
        return ResponseEntity.ok(turnos);
    }

    @GetMapping("/tipo/{tipoTurno}")
    public ResponseEntity<List<TurnoEntity>> getTurnosByTipo(@PathVariable String tipoTurno) {
        List<TurnoEntity> turnos = turnoService.getTurnosByTipo(tipoTurno);
        return ResponseEntity.ok(turnos);
    }

    @GetMapping("/cantidad/{tipoDeTurnoCantidad}")
    public ResponseEntity<List<TurnoEntity>> getTurnosByTipoDeTurnoCantidad(@PathVariable String tipoDeTurnoCantidad) {
        List<TurnoEntity> turnos = turnoService.getTurnosByTipoDeTurnoCantidad(tipoDeTurnoCantidad);
        return ResponseEntity.ok(turnos);
    }

    // Nuevos endpoints para servicio

    @GetMapping("/servicio/{servicioId}")
    public ResponseEntity<List<java.util.Map<String, Object>>> getTurnosByServicio(@PathVariable Long servicioId) {
        List<java.util.Map<String, Object>> turnos = turnoService.getTurnosByServicioWithPisoNombre(servicioId);
        return ResponseEntity.ok(turnos);
    }

    @GetMapping("/servicio/{servicioId}/dia/{fecha}")
    public ResponseEntity<List<java.util.Map<String, Object>>> getTurnosByServicioAndDia(@PathVariable Long servicioId,
            @PathVariable String fecha) {
        try {
            LocalDate fechaDia = LocalDate.parse(fecha);
            List<java.util.Map<String, Object>> turnos = turnoService
                    .getTurnosByServicioAndDiaWithPisoNombre(servicioId, fechaDia);
            return ResponseEntity.ok(turnos);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/servicio/{servicioId}/dia/{fecha}/sin-asignar")
    public ResponseEntity<List<java.util.Map<String, Object>>> getTurnosSinAsignarByDia(
            @PathVariable Long servicioId,
            @PathVariable String fecha) {
        try {
            LocalDate fechaDia = LocalDate.parse(fecha);
            List<java.util.Map<String, Object>> turnos = turnoService.getTurnosSinAsignarByDia(servicioId, fechaDia);
            return ResponseEntity.ok(turnos);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/servicio/{servicioId}/sin-asignar")
    public ResponseEntity<List<TurnoEntity>> getUnassignedTurnosByServicio(@PathVariable Long servicioId) {
        List<TurnoEntity> turnos = turnoService.getUnassignedTurnosByServicio(servicioId);
        return ResponseEntity.ok(turnos);
    }

    @GetMapping("/servicio/{servicioId}/stats")
    public ResponseEntity<Map<String, Object>> getTurnosStatsByServicio(@PathVariable Long servicioId) {
        Map<String, Object> stats = turnoService.getTurnosStatsByServicio(servicioId);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/servicio/{servicioId}/cobertura")
    public ResponseEntity<Map<String, Object>> getCoberturaByServicio(
            @PathVariable Long servicioId,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) {

        LocalDate inicio = fechaInicio != null ? LocalDate.parse(fechaInicio) : null;
        LocalDate fin = fechaFin != null ? LocalDate.parse(fechaFin) : null;

        Map<String, Object> cobertura = turnoService.getCoberturaByServicio(servicioId, inicio, fin);
        return ResponseEntity.ok(cobertura);
    }

    @GetMapping("/servicio/{servicioId}/stats/piso/mes-anterior")
    public ResponseEntity<Map<String, Object>> getCoveragePerPisoLastMonth(@PathVariable Long servicioId) {
        Map<String, Object> result = turnoService.getCoveragePerPisoLastMonth(servicioId);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/servicio/{servicioId}/stats/piso/mes-actual")
    public ResponseEntity<Map<String, Object>> getCoveragePerPisoCurrentMonth(@PathVariable Long servicioId) {
        Map<String, Object> result = turnoService.getCoveragePerPisoCurrentMonth(servicioId);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/servicio/{servicioId}/stats/piso/mes")
    public ResponseEntity<Map<String, Object>> getCoveragePerPisoByMonth(
            @PathVariable Long servicioId,
            @RequestParam int year,
            @RequestParam int month) {
        Map<String, Object> result = turnoService.getCoveragePerPisoByMonth(servicioId, year, month);
        return ResponseEntity.ok(result);
    }

    // === ENDPOINTS PARA ALTERAR HORARIO ===

    /**
     * Obtiene todos los turnos futuros de un médico (desde hoy en adelante)
     */
    @GetMapping("/medico/{idMedico}/futuros")
    public ResponseEntity<List<Map<String, Object>>> getTurnosFuturos(@PathVariable Long idMedico) {
        List<Map<String, Object>> turnos = turnoService.getTurnosFuturos(idMedico);
        return ResponseEntity.ok(turnos);
    }

    /**
     * Altera un turno (desasignar, reasignar o cambiar horas) con registro en
     * bitácora
     */
    @PostMapping("/alterar")
    public ResponseEntity<?> alterarTurno(@RequestBody AlterarTurnoRequest request) {
        try {
            Map<String, Object> result = alterarTurnoService.alterarTurno(request);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    // === DETECCIÓN Y MANEJO DE CONFLICTOS EN GENERACIÓN MASIVA ===

    @PostMapping("/check-conflicts")
    public ResponseEntity<?> checkConflicts(@RequestBody Map<String, Object> payload) {
        try {
            LocalDate fechaInicio = LocalDate.parse(payload.get("fechaInicio").toString());
            LocalDate fechaFin = LocalDate.parse(payload.get("fechaFin").toString());
            List<String> pisosIds = (List<String>) payload.get("pisosIds");

            List<TurnoEntity> conflicting = turnoService.checkConflicts(fechaInicio, fechaFin, pisosIds);
            
            Map<String, Object> response = new HashMap<>();
            response.put("hasConflicts", !conflicting.isEmpty());
            response.put("count", conflicting.size());
            
            // Devolvemos las fechas únicas con conflicto para mostrarlas en el frontend si es necesario
            List<String> conflictingDates = conflicting.stream()
                .map(t -> t.getDiaInicioTurno().toString())
                .distinct()
                .sorted()
                .toList();
            response.put("conflictingDates", conflictingDates);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error checking conflicts: " + e.getMessage());
        }
    }

    @PostMapping("/delete-range")
    public ResponseEntity<?> deleteRange(@RequestBody Map<String, Object> payload) {
        try {
            LocalDate fechaInicio = LocalDate.parse(payload.get("fechaInicio").toString());
            LocalDate fechaFin = LocalDate.parse(payload.get("fechaFin").toString());
            List<String> pisosIds = (List<String>) payload.get("pisosIds");

            turnoService.deleteTurnosByRange(fechaInicio, fechaFin, pisosIds);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error deleting range: " + e.getMessage());
        }
    }
}