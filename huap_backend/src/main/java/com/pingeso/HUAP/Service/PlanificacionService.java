package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.PlanificacionAsignacionDTO;
import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.PuestoEntity;
import com.pingeso.HUAP.Entity.PlanificacionAsignacionEntity;
import com.pingeso.HUAP.Entity.PlanificacionEntity;
import com.pingeso.HUAP.Entity.PlantillaDiaEntity;
import com.pingeso.HUAP.Entity.PlantillaEntity;
import com.pingeso.HUAP.Entity.PlantillaTurnoEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.PuestoRepository;
import com.pingeso.HUAP.Repository.PlanificacionRepository;
import com.pingeso.HUAP.Repository.PlantillaDiaRepository;
import com.pingeso.HUAP.Repository.PlantillaRepository;
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
    private final PlantillaRepository plantillaRepository;
    private final FuncionarioRepository funcionarioRepository;
    private final PuestoRepository puestoRepository;
    private final PlantillaDiaRepository plantillaDiaRepository;
    private final TurnoRepository turnoRepository;

    public PlanificacionService(
            PlanificacionRepository planificacionRepository,
            ServicioRepository servicioRepository,
            PlantillaRepository plantillaRepository,
            FuncionarioRepository funcionarioRepository,
            PuestoRepository puestoRepository,
            PlantillaDiaRepository plantillaDiaRepository,
            TurnoRepository turnoRepository
    ) {
        this.planificacionRepository = planificacionRepository;
        this.servicioRepository = servicioRepository;
        this.plantillaRepository = plantillaRepository;
        this.funcionarioRepository = funcionarioRepository;
        this.puestoRepository = puestoRepository;
        this.plantillaDiaRepository = plantillaDiaRepository;
        this.turnoRepository = turnoRepository;
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
    public Map<String, Object> generarTurnos(Long idPlanificacion, LocalDate fechaInicio) {
        validarLunes(fechaInicio);
        PlanificacionEntity plan = obtenerPlanificacion(idPlanificacion);
        ServicioEntity servicio = plan.getServicio();

        int generados = 0, vacantesPorConflicto = 0;
        // Turnos ya creados en este lote, por funcionario (para el chequeo intra-lote).
        Map<Long, List<TurnoEntity>> creadosPorFuncionario = new HashMap<>();

        for (PlanificacionAsignacionEntity asignacion : plan.getAsignaciones()) {
           //  filtrado por si pasan alguna entidad eliminada
            if (asignacion.getPlantilla() == null || asignacion.getPlantilla().isEliminado()) continue;
            if (asignacion.getPuesto() != null && asignacion.getPuesto().isEliminado()) continue;

            List<PlantillaDiaEntity> secuencia = plantillaDiaRepository
                    .findByPlantilla_IdPlantillaOrderByDiaIndexAsc(asignacion.getPlantilla().getIdPlantilla());

            for (PlantillaDiaEntity dia : secuencia) {
                PlantillaTurnoEntity tipo = dia.getPlantillaTurno();
                if (tipo == null || tipo.isEliminado()) continue; // día libre o tipo eliminado

                LocalDate fechaDia = fechaInicio.plusDays(dia.getDiaIndex());
                LocalTime hi = tipo.getHoraInicio();
                LocalTime hf = tipo.getHoraTermino();
                LocalDate diaFinal = !hf.isAfter(hi) ? fechaDia.plusDays(1) : fechaDia;

                // Si el funcionario asignado fue eliminado, el turno se genera VACANTE.
                FuncionarioEntity func = asignacion.getFuncionario();
                if (func != null && func.isEliminado()) func = null;

                // El turno se crea siempre. Si el funcionario choca en horario, se deja
                // VACANTE (funcionario null) para que otra persona pueda tomarlo.
                boolean enConflicto = func != null && hayChoqueHorario(func.getIdFuncionario(), fechaDia, diaFinal, hi, hf,
                        creadosPorFuncionario.getOrDefault(func.getIdFuncionario(), List.of()));
                FuncionarioEntity funcAsignado = enConflicto ? null : func;
                if (enConflicto) vacantesPorConflicto++;

                TurnoEntity turno = TurnoEntity.builder()
                        .tipoTurno(tipo)
                        .diaInicioTurno(fechaDia)
                        .diaFinalTurno(diaFinal)
                        .horaInicio(hi)
                        .horaFin(hf)
                        .funcionario(funcAsignado)
                        .servicio(servicio)
                        .puesto(asignacion.getPuesto())
                        .plantilla(asignacion.getPlantilla())
                        .build();

                turnoRepository.save(turno);
                turnoRepository.flush(); // visible para el filtro grueso por BD del próximo chequeo
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

        List<Map<String, Object>> conflictos = new ArrayList<>();

        for (PlanificacionAsignacionEntity asignacion : plan.getAsignaciones()) {
            //  filtrado por si pasan alguna entidad eliminada
            if (asignacion.getPlantilla() == null || asignacion.getPlantilla().isEliminado()) continue;
            if (asignacion.getPuesto() != null && asignacion.getPuesto().isEliminado()) continue;

            FuncionarioEntity func = asignacion.getFuncionario();
            if (func == null || func.isEliminado()) continue; // sin funcionario (o eliminado) no hay choque posible

            List<PlantillaDiaEntity> secuencia = plantillaDiaRepository
                    .findByPlantilla_IdPlantillaOrderByDiaIndexAsc(asignacion.getPlantilla().getIdPlantilla());

            for (PlantillaDiaEntity dia : secuencia) {
                PlantillaTurnoEntity tipo = dia.getPlantillaTurno();
                if (tipo == null || tipo.isEliminado()) continue;

                LocalDate fechaDia = fechaInicio.plusDays(dia.getDiaIndex());
                LocalTime hi = tipo.getHoraInicio();
                LocalTime hf = tipo.getHoraTermino();
                LocalDate diaFinal = !hf.isAfter(hi) ? fechaDia.plusDays(1) : fechaDia;

                TurnoEntity existente = primerTurnoQueSolapa(func.getIdFuncionario(), fechaDia, diaFinal, hi, hf);
                if (existente != null) {
                    Map<String, Object> c = new HashMap<>();
                    c.put("idFuncionario", func.getIdFuncionario());
                    c.put("nombreFuncionario", func.getNombre());
                    c.put("fecha", fechaDia.toString());
                    c.put("horaInicio", hi.toString());
                    c.put("horaFin", hf.toString());
                    c.put("nombreRotativa", asignacion.getPlantilla().getNombre());
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

    /** ¿El candidato choca en horario con un turno existente del funcionario (BD) o del lote? */
    private boolean hayChoqueHorario(Long idFuncionario, LocalDate ini, LocalDate fin, LocalTime hi, LocalTime hf,
                                     List<TurnoEntity> delLote) {
        if (primerTurnoQueSolapa(idFuncionario, ini, fin, hi, hf) != null) return true;
        LocalDateTime cIni = ini.atTime(hi), cFin = fin.atTime(hf);
        for (TurnoEntity t : delLote) {
            if (solapan(cIni, cFin, t.getDiaInicioTurno().atTime(t.getHoraInicio()),
                    t.getDiaFinalTurno().atTime(t.getHoraFin()))) {
                return true;
            }
        }
        return false;
    }

    /** Filtro grueso por fechas (cross-servicio) + afinado por horas; primer turno que solapa o null. */
    private TurnoEntity primerTurnoQueSolapa(Long idFuncionario, LocalDate ini, LocalDate fin, LocalTime hi, LocalTime hf) {
        LocalDateTime cIni = ini.atTime(hi), cFin = fin.atTime(hf);
        for (TurnoEntity t : turnoRepository.findConflictosByFuncionario(idFuncionario, ini, fin)) {
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
        if (dto.getIdPlantilla() == null) {
            throw new RuntimeException("Cada asignación debe indicar una rotativa (idPlantilla)");
        }

        PlantillaEntity plantilla = plantillaRepository.findById(dto.getIdPlantilla())
                .orElseThrow(() -> new RuntimeException("Rotativa no encontrada: ID " + dto.getIdPlantilla()));
        if (plantilla.isEliminado()) {
            throw new RuntimeException("La rotativa seleccionada fue eliminada y no puede usarse.");
        }
        if (!plantilla.getServicio().getIdServicio().equals(idServicio)) {
            throw new RuntimeException("La rotativa '" + plantilla.getNombre() + "' no pertenece a este servicio.");
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

        return new PlanificacionAsignacionEntity(plan, plantilla, funcionario, puesto);
    }
}
