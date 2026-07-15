package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.PlanificacionAsignacionDTO;
import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.PuestoEntity;
import com.pingeso.HUAP.Entity.PlanificacionAsignacionEntity;
import com.pingeso.HUAP.Entity.PlanificacionEntity;
import com.pingeso.HUAP.Entity.RotativaDiaEntity;
import com.pingeso.HUAP.Entity.RotativaEntity;
import com.pingeso.HUAP.Entity.TipoTurnoEntity;
import com.pingeso.HUAP.Entity.FeriadoEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FeriadoRepository;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.PuestoRepository;
import com.pingeso.HUAP.Repository.PlanificacionRepository;
import com.pingeso.HUAP.Repository.RotativaDiaRepository;
import com.pingeso.HUAP.Repository.RotativaRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * CRUD del contenedor de planificación (molde reutilizable de rotativas + funcionarios)
 * y generación de turnos a partir de él, expandiendo la secuencia real de cada rotativa
 * desde un lunes de inicio.
 */
@Service
@Transactional
public class PlanificacionService {

    private final PlanificacionRepository planificacionRepository;
    private final ServicioRepository servicioRepository;
    private final RotativaRepository rotativaRepository;
    private final FuncionarioRepository funcionarioRepository;
    private final PuestoRepository puestoRepository;
    private final RotativaDiaRepository rotativaDiaRepository;
    private final TurnoRepository turnoRepository;
    private final BitacoraService bitacoraService;
    private final ReglaServicioService reglaServicioService;
    private final FeriadoRepository feriadoRepository;

    public PlanificacionService(
            PlanificacionRepository planificacionRepository,
            ServicioRepository servicioRepository,
            RotativaRepository rotativaRepository,
            FuncionarioRepository funcionarioRepository,
            PuestoRepository puestoRepository,
            RotativaDiaRepository rotativaDiaRepository,
            TurnoRepository turnoRepository,
            BitacoraService bitacoraService,
            ReglaServicioService reglaServicioService,
            FeriadoRepository feriadoRepository
    ) {
        this.planificacionRepository = planificacionRepository;
        this.servicioRepository = servicioRepository;
        this.rotativaRepository = rotativaRepository;
        this.funcionarioRepository = funcionarioRepository;
        this.puestoRepository = puestoRepository;
        this.rotativaDiaRepository = rotativaDiaRepository;
        this.turnoRepository = turnoRepository;
        this.bitacoraService = bitacoraService;
        this.reglaServicioService = reglaServicioService;
        this.feriadoRepository = feriadoRepository;
    }

    // =========================================================
    // CRUD
    // =========================================================

    public PlanificacionEntity crearPlanificacion(Long idServicio, String nombre, List<PlanificacionAsignacionDTO> asignaciones) {
        ServicioEntity servicio = servicioRepository.findById(idServicio)
                .orElseThrow(() -> new RuntimeException("Servicio no encontrado con ID: " + idServicio));

        if (nombre == null || nombre.trim().isEmpty()) {
            throw new RuntimeException("El nombre de la planificación no puede estar vacío");
        }

        if (planificacionRepository.existsByServicio_IdServicioAndNombre(idServicio, nombre)) {
            throw new RuntimeException("Ya existe una planificación con el nombre '" + nombre + "' en este servicio");
        }

        PlanificacionEntity plan = new PlanificacionEntity(servicio, nombre.trim());

        if (asignaciones != null) {
            for (PlanificacionAsignacionDTO dto : asignaciones) {
                plan.getAsignaciones().add(construirAsignacion(plan, dto, idServicio));
            }
        }

        return planificacionRepository.save(plan);
    }

    public PlanificacionEntity obtenerPlanificacion(Long idPlanificacion) {
        return planificacionRepository.findById(idPlanificacion)
                .orElseThrow(() -> new RuntimeException("Planificación no encontrada"));
    }

    public List<PlanificacionEntity> obtenerPlanificacionesPorServicio(Long idServicio) {
        return planificacionRepository.findByServicio_IdServicio(idServicio);
    }

    public PlanificacionEntity actualizarPlanificacion(Long idPlanificacion, String nombre, List<PlanificacionAsignacionDTO> asignaciones) {
        PlanificacionEntity plan = obtenerPlanificacion(idPlanificacion);
        Long idServicio = plan.getServicio().getIdServicio();

        if (nombre != null && !nombre.trim().isEmpty()) {
            if (planificacionRepository.existsByServicio_IdServicioAndNombreAndIdPlanificacionNot(idServicio, nombre, idPlanificacion)) {
                throw new RuntimeException("Ya existe una planificación con el nombre '" + nombre + "' en este servicio");
            }
            plan.setNombre(nombre.trim());
        }

        // Reemplaza por completo el conjunto de asignaciones.
        if (asignaciones != null) {
            plan.getAsignaciones().clear();
            planificacionRepository.flush();
            for (PlanificacionAsignacionDTO dto : asignaciones) {
                plan.getAsignaciones().add(construirAsignacion(plan, dto, idServicio));
            }
        }

        return planificacionRepository.save(plan);
    }

    // Hard-delete: las asignaciones se borran en cascada. Los turnos generados no
    // referencian la planificación, así que no hay conflicto de FK.
    public void eliminarPlanificacion(Long idPlanificacion) {
        planificacionRepository.delete(obtenerPlanificacion(idPlanificacion));
    }

    // =========================================================
    // GENERACIÓN DE TURNOS
    // =========================================================

    /**
     * Expande la secuencia real de cada rotativa del molde desde el lunes indicado y
     * crea TODOS los TurnoEntity correspondientes. Si el funcionario asignado choca en
     * horario con turnos existentes (cualquier servicio) o del propio lote, el turno se
     * crea igual pero VACANTE (funcionario null) para que otra persona pueda tomarlo.
     * Devuelve {generados, vacantesPorConflicto}.
     */
    public Map<String, Object> generarTurnos(Long idPlanificacion, LocalDate fechaInicio, Long actorId, List<Long> idsReglas) {
        validarLunes(fechaInicio);
        PlanificacionEntity plan = obtenerPlanificacion(idPlanificacion);
        ServicioEntity servicio = plan.getServicio();

        // Reglas de ajuste seleccionadas para esta generación (vacío = no se ajusta nada).
        var reglasSel = reglaServicioService.cargarReglasSeleccionadas(servicio.getIdServicio(), idsReglas);

        // Actor que ejecuta la generación (para registrar en bitácora cada turno creado).
        FuncionarioEntity actor = (actorId != null)
                ? funcionarioRepository.findById(actorId).orElse(null) : null;

        // Asignaciones vigentes (sin rotativa/puesto eliminado), filtradas una sola vez.
        List<PlanificacionAsignacionEntity> asignacionesVigentes = plan.getAsignaciones().stream()
                .filter(a -> a.getRotativa() != null && !a.getRotativa().isEliminado())
                .filter(a -> a.getPuesto() == null || !a.getPuesto().isEliminado())
                .toList();

        // Secuencia de días por rotativa DISTINTA (varios puestos comparten la misma rotativa;
        // antes se volvía a consultar por cada asignación aunque la rotativa ya se hubiera leído).
        Map<Long, List<RotativaDiaEntity>> secuenciaPorRotativa = new HashMap<>();
        int maxDiaIndex = 0;
        for (PlanificacionAsignacionEntity asignacion : asignacionesVigentes) {
            Long idRotativa = asignacion.getRotativa().getIdRotativa();
            List<RotativaDiaEntity> secuencia = secuenciaPorRotativa.computeIfAbsent(idRotativa,
                    id -> rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(id));
            for (RotativaDiaEntity dia : secuencia) {
                if (dia.getDiaIndex() > maxDiaIndex) maxDiaIndex = dia.getDiaIndex();
            }
        }
        // +1 día extra de margen por si el último turno cruza medianoche.
        LocalDate fechaFinGeneracion = fechaInicio.plusDays(maxDiaIndex + 1L);

        // Feriados de todo el rango de la generación, precargados una sola vez (si no hay
        // reglas seleccionadas no hace falta: aplicarReglas no los usa en ese caso).
        Set<LocalDate> feriados = reglasSel.isEmpty()
                ? Set.of()
                : feriadoRepository.findByFechaBetweenOrderByFechaAsc(fechaInicio, fechaFinGeneracion).stream()
                        .map(FeriadoEntity::getFecha)
                        .collect(Collectors.toSet());

        // Conflictos ya existentes en BD para los funcionarios involucrados, precargados en una
        // sola consulta en bloque (antes era una consulta por turno).
        Set<Long> idsFuncionarios = asignacionesVigentes.stream()
                .map(PlanificacionAsignacionEntity::getFuncionario)
                .filter(f -> f != null && !f.isEliminado())
                .map(FuncionarioEntity::getIdFuncionario)
                .collect(Collectors.toSet());
        Map<Long, List<TurnoEntity>> conflictosExistentes = idsFuncionarios.isEmpty()
                ? Map.of()
                : turnoRepository.findConflictosByFuncionarios(new ArrayList<>(idsFuncionarios), fechaInicio, fechaFinGeneracion)
                        .stream()
                        .collect(Collectors.groupingBy(t -> t.getFuncionario().getIdFuncionario()));

        int generados = 0, vacantesPorConflicto = 0;
        // Turnos ya creados en este lote, por funcionario (para el chequeo intra-lote).
        Map<Long, List<TurnoEntity>> creadosPorFuncionario = new HashMap<>();

        for (PlanificacionAsignacionEntity asignacion : asignacionesVigentes) {
            List<RotativaDiaEntity> secuencia = secuenciaPorRotativa.get(asignacion.getRotativa().getIdRotativa());

            for (RotativaDiaEntity dia : secuencia) {
                TipoTurnoEntity tipo = dia.getTipoTurno();
                if (tipo == null || tipo.isEliminado()) continue; // día libre o tipo eliminado

                LocalDate fechaDia = fechaInicio.plusDays(dia.getDiaIndex());

                // Turno base con las horas del tipo. El motor de reglas ajusta finde/feriado.
                TurnoEntity turno = TurnoEntity.builder()
                        .tipoTurno(tipo)
                        .diaInicioTurno(fechaDia)
                        .diaFinalTurno(!tipo.getHoraTermino().isAfter(tipo.getHoraInicio()) ? fechaDia.plusDays(1) : fechaDia)
                        .horaInicio(tipo.getHoraInicio())
                        .horaFin(tipo.getHoraTermino())
                        .servicio(servicio)
                        .puesto(asignacion.getPuesto())
                        .rotativa(asignacion.getRotativa())
                        .build();

                reglaServicioService.aplicarReglas(turno, reglasSel, feriados); // ajusta horaInicio/horaFin según reglas seleccionadas

                // Horas ya ajustadas; recalcular el día final con ellas.
                LocalTime hi = turno.getHoraInicio();
                LocalTime hf = turno.getHoraFin();
                LocalDate diaFinal = !hf.isAfter(hi) ? fechaDia.plusDays(1) : fechaDia;
                turno.setDiaFinalTurno(diaFinal);

                // Si el funcionario asignado fue eliminado, el turno se genera VACANTE.
                FuncionarioEntity func = asignacion.getFuncionario();
                if (func != null && func.isEliminado()) func = null;

                // El turno se crea siempre. Si el funcionario choca en horario, se deja
                // VACANTE (funcionario null) para que otra persona pueda tomarlo.
                boolean enConflicto = func != null && hayChoqueHorario(fechaDia, diaFinal, hi, hf,
                        conflictosExistentes.getOrDefault(func.getIdFuncionario(), List.of()),
                        creadosPorFuncionario.getOrDefault(func.getIdFuncionario(), List.of()));
                FuncionarioEntity funcAsignado = enConflicto ? null : func;
                if (enConflicto) vacantesPorConflicto++;
                turno.setFuncionario(funcAsignado);

                turnoRepository.save(turno);

                // Registro en bitácora del turno recién creado.
                bitacoraService.registrarTurnoGenerado(turno, actor, plan.getNombre());

                if (funcAsignado != null) {
                    creadosPorFuncionario.computeIfAbsent(funcAsignado.getIdFuncionario(), k -> new ArrayList<>()).add(turno);
                }
                generados++;
            }
        }

        Map<String, Object> res = new HashMap<>();
        res.put("generados", generados);
        res.put("vacantesPorConflicto", vacantesPorConflicto);
        return res;
    }

    /**
     * Pre-chequeo (no persiste): devuelve los turnos del molde que chocarían en horario
     * con turnos ya existentes del funcionario en cualquier servicio.
     */
    public List<Map<String, Object>> detectarConflictos(Long idPlanificacion, LocalDate fechaInicio) {
        validarLunes(fechaInicio);
        PlanificacionEntity plan = obtenerPlanificacion(idPlanificacion);

        // Asignaciones vigentes con funcionario asignado (sin funcionario no hay choque posible).
        List<PlanificacionAsignacionEntity> asignacionesConFuncionario = plan.getAsignaciones().stream()
                .filter(a -> a.getRotativa() != null && !a.getRotativa().isEliminado())
                .filter(a -> a.getPuesto() == null || !a.getPuesto().isEliminado())
                .filter(a -> a.getFuncionario() != null && !a.getFuncionario().isEliminado())
                .toList();

        // Secuencia de días por rotativa DISTINTA + rango de fechas total del pre-chequeo.
        Map<Long, List<RotativaDiaEntity>> secuenciaPorRotativa = new HashMap<>();
        int maxDiaIndex = 0;
        for (PlanificacionAsignacionEntity asignacion : asignacionesConFuncionario) {
            Long idRotativa = asignacion.getRotativa().getIdRotativa();
            List<RotativaDiaEntity> secuencia = secuenciaPorRotativa.computeIfAbsent(idRotativa,
                    id -> rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(id));
            for (RotativaDiaEntity dia : secuencia) {
                if (dia.getDiaIndex() > maxDiaIndex) maxDiaIndex = dia.getDiaIndex();
            }
        }
        LocalDate fechaFinChequeo = fechaInicio.plusDays(maxDiaIndex + 1L);

        // Conflictos existentes de los funcionarios involucrados, precargados en una sola consulta.
        Set<Long> idsFuncionarios = asignacionesConFuncionario.stream()
                .map(a -> a.getFuncionario().getIdFuncionario())
                .collect(Collectors.toSet());
        Map<Long, List<TurnoEntity>> conflictosExistentes = idsFuncionarios.isEmpty()
                ? Map.of()
                : turnoRepository.findConflictosByFuncionarios(new ArrayList<>(idsFuncionarios), fechaInicio, fechaFinChequeo)
                        .stream()
                        .collect(Collectors.groupingBy(t -> t.getFuncionario().getIdFuncionario()));

        List<Map<String, Object>> conflictos = new ArrayList<>();

        for (PlanificacionAsignacionEntity asignacion : asignacionesConFuncionario) {
            FuncionarioEntity func = asignacion.getFuncionario();
            List<RotativaDiaEntity> secuencia = secuenciaPorRotativa.get(asignacion.getRotativa().getIdRotativa());

            for (RotativaDiaEntity dia : secuencia) {
                TipoTurnoEntity tipo = dia.getTipoTurno();
                if (tipo == null || tipo.isEliminado()) continue;

                LocalDate fechaDia = fechaInicio.plusDays(dia.getDiaIndex());
                LocalTime hi = tipo.getHoraInicio();
                LocalTime hf = tipo.getHoraTermino();
                LocalDate diaFinal = !hf.isAfter(hi) ? fechaDia.plusDays(1) : fechaDia;

                TurnoEntity existente = primerTurnoQueSolapa(
                        conflictosExistentes.getOrDefault(func.getIdFuncionario(), List.of()), fechaDia, diaFinal, hi, hf);
                if (existente != null) {
                    Map<String, Object> c = new HashMap<>();
                    c.put("idFuncionario", func.getIdFuncionario());
                    c.put("nombreFuncionario", func.getNombre());
                    c.put("fecha", fechaDia.toString());
                    c.put("horaInicio", hi.toString());
                    c.put("horaFin", hf.toString());
                    c.put("nombreRotativa", asignacion.getRotativa().getNombre());
                    c.put("servicioEnConflicto",
                            existente.getServicio() != null ? existente.getServicio().getNombre() : null);
                    conflictos.add(c);
                }
            }
        }

        return conflictos;
    }

    // =========================================================
    // AUXILIAR
    // =========================================================

    private void validarLunes(LocalDate fechaInicio) {
        if (fechaInicio == null) {
            throw new RuntimeException("Debe indicar la fecha de inicio.");
        }
        if (fechaInicio.getDayOfWeek() != DayOfWeek.MONDAY) {
            throw new RuntimeException("La fecha de inicio debe ser un lunes.");
        }
    }

    /**
     * ¿El candidato choca en horario con un turno existente del funcionario (precargado antes
     * del loop de generación) o con uno ya creado en este mismo lote?
     */
    private boolean hayChoqueHorario(LocalDate ini, LocalDate fin, LocalTime hi, LocalTime hf,
                                     List<TurnoEntity> existentes, List<TurnoEntity> delLote) {
        LocalDateTime cIni = ini.atTime(hi), cFin = fin.atTime(hf);
        for (TurnoEntity t : existentes) {
            if (solapan(cIni, cFin, t.getDiaInicioTurno().atTime(t.getHoraInicio()),
                    t.getDiaFinalTurno().atTime(t.getHoraFin()))) {
                return true;
            }
        }
        for (TurnoEntity t : delLote) {
            if (solapan(cIni, cFin, t.getDiaInicioTurno().atTime(t.getHoraInicio()),
                    t.getDiaFinalTurno().atTime(t.getHoraFin()))) {
                return true;
            }
        }
        return false;
    }

    /** Primer turno de la lista de candidatos (ya precargada) que solapa con el intervalo dado, o null. */
    private TurnoEntity primerTurnoQueSolapa(List<TurnoEntity> candidatos, LocalDate ini, LocalDate fin, LocalTime hi, LocalTime hf) {
        LocalDateTime cIni = ini.atTime(hi), cFin = fin.atTime(hf);
        for (TurnoEntity t : candidatos) {
            LocalDateTime tIni = t.getDiaInicioTurno().atTime(t.getHoraInicio());
            LocalDateTime tFin = t.getDiaFinalTurno().atTime(t.getHoraFin());
            if (solapan(cIni, cFin, tIni, tFin)) return t;
        }
        return null;
    }

    /** Solape de dos intervalos [ini,fin) (tocarse en el borde no cuenta). */
    private boolean solapan(LocalDateTime aIni, LocalDateTime aFin, LocalDateTime bIni, LocalDateTime bFin) {
        return aIni.isBefore(bFin) && bIni.isBefore(aFin);
    }

    private PlanificacionAsignacionEntity construirAsignacion(PlanificacionEntity plan, PlanificacionAsignacionDTO dto, Long idServicio) {
        if (dto.getIdRotativa() == null) {
            throw new RuntimeException("Cada asignación debe indicar una rotativa (idRotativa)");
        }

        RotativaEntity rotativa = rotativaRepository.findById(dto.getIdRotativa())
                .orElseThrow(() -> new RuntimeException("Rotativa no encontrada: ID " + dto.getIdRotativa()));
        if (rotativa.isEliminado()) {
            throw new RuntimeException("La rotativa seleccionada fue eliminada y no puede usarse.");
        }
        if (!rotativa.getServicio().getIdServicio().equals(idServicio)) {
            throw new RuntimeException("La rotativa '" + rotativa.getNombre() + "' no pertenece a este servicio.");
        }

        FuncionarioEntity funcionario = null;
        if (dto.getIdFuncionario() != null) {
            funcionario = funcionarioRepository.findById(dto.getIdFuncionario())
                    .orElseThrow(() -> new RuntimeException("Funcionario no encontrado: ID " + dto.getIdFuncionario()));
            if (funcionario.isEliminado()) {
                throw new RuntimeException("El funcionario seleccionado fue eliminado y no puede asignarse.");
            }
        }

        PuestoEntity puesto = null;
        if (dto.getIdPuesto() != null) {
            puesto = puestoRepository.findById(dto.getIdPuesto())
                    .orElseThrow(() -> new RuntimeException("Puesto no encontrado: ID " + dto.getIdPuesto()));
            if (puesto.isEliminado()) {
                throw new RuntimeException("El puesto seleccionado fue eliminado y no puede usarse.");
            }
            if (!puesto.getServicio().getIdServicio().equals(idServicio)) {
                throw new RuntimeException("El puesto '" + puesto.getNombre() + "' no pertenece a este servicio.");
            }
        }

        return new PlanificacionAsignacionEntity(plan, rotativa, funcionario, puesto);
    }
}
