package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.PlanificacionAsignacionDTO;
import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.PuestoEntity;
import com.pingeso.HUAP.Entity.PlanificacionAsignacionEntity;
import com.pingeso.HUAP.Entity.PlanificacionEjecucionEntity;
import com.pingeso.HUAP.Entity.PlanificacionEjecucionEntity.EstadoEjecucion;
import com.pingeso.HUAP.Entity.PlanificacionEntity;
import com.pingeso.HUAP.Entity.RotativaDiaEntity;
import com.pingeso.HUAP.Entity.RotativaEntity;
import com.pingeso.HUAP.Entity.TipoTurnoEntity;
import com.pingeso.HUAP.Entity.FeriadoEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.SolicitudEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FeriadoRepository;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.PlanificacionEjecucionRepository;
import com.pingeso.HUAP.Repository.PuestoRepository;
import com.pingeso.HUAP.Repository.PlanificacionRepository;
import com.pingeso.HUAP.Repository.RotativaDiaRepository;
import com.pingeso.HUAP.Repository.RotativaRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Repository.SolicitudRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Servicio de planificación de turnos.
 *
 * <p>Gestiona el ciclo de vida de las {@code Planificacion} de un servicio (el "molde": qué
 * rotativas y funcionarios se designan) y, a partir de él, la <b>generación de turnos reales</b>
 * mediante una {@link PlanificacionEjecucionEntity} — cada "puesta en vigencia" del molde.
 *
 * <p>Separa dos conceptos (corrección funcional "Planificación y Solicitudes"):
 * <ul>
 *   <li><b>Ancla de rotativa</b> ({@code fechaInicioRotativa}): un lunes que fija la fase del
 *   ciclo cíclico de cada rotativa del molde.</li>
 *   <li><b>Vigencia efectiva</b> ({@code fechaInicioEfectiva}..{@code fechaFinEfectiva}): el rango
 *   real de fechas con turnos persistidos, de longitud arbitraria (no limitado a un ciclo ni a un
 *   mes).</li>
 * </ul>
 * Para un mismo servicio no pueden coexistir dos ejecuciones {@code ACTIVA} con vigencias
 * efectivas superpuestas ({@link #validarSinSuperposicion}), protegido con bloqueo pesimista sobre
 * el servicio ({@link ServicioRepository#lockServicio}) para resistir generaciones concurrentes.
 */
@Service
@Transactional
public class PlanificacionService {

    private final PlanificacionRepository planificacionRepository;
    private final PlanificacionEjecucionRepository ejecucionRepository;
    private final ServicioRepository servicioRepository;
    private final RotativaRepository rotativaRepository;
    private final FuncionarioRepository funcionarioRepository;
    private final PuestoRepository puestoRepository;
    private final RotativaDiaRepository rotativaDiaRepository;
    private final TurnoRepository turnoRepository;
    private final SolicitudRepository solicitudRepository;
    private final BitacoraService bitacoraService;
    private final ReglaServicioService reglaServicioService;
    private final FeriadoRepository feriadoRepository;

    public PlanificacionService(
            PlanificacionRepository planificacionRepository,
            PlanificacionEjecucionRepository ejecucionRepository,
            ServicioRepository servicioRepository,
            RotativaRepository rotativaRepository,
            FuncionarioRepository funcionarioRepository,
            PuestoRepository puestoRepository,
            RotativaDiaRepository rotativaDiaRepository,
            TurnoRepository turnoRepository,
            SolicitudRepository solicitudRepository,
            BitacoraService bitacoraService,
            ReglaServicioService reglaServicioService,
            FeriadoRepository feriadoRepository
    ) {
        this.planificacionRepository = planificacionRepository;
        this.ejecucionRepository = ejecucionRepository;
        this.servicioRepository = servicioRepository;
        this.rotativaRepository = rotativaRepository;
        this.funcionarioRepository = funcionarioRepository;
        this.puestoRepository = puestoRepository;
        this.rotativaDiaRepository = rotativaDiaRepository;
        this.turnoRepository = turnoRepository;
        this.solicitudRepository = solicitudRepository;
        this.bitacoraService = bitacoraService;
        this.reglaServicioService = reglaServicioService;
        this.feriadoRepository = feriadoRepository;
    }

    // =========================================================
    // CRUD del molde
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

        // Reemplaza por completo el conjunto de asignaciones del MOLDE. Esto es seguro para el
        // historial: los turnos ya generados no referencian la asignación, copian sus propios datos
        // (funcionario/puesto/rotativa/tipo) al momento de generarse — ver PlanificacionEjecucionEntity.
        if (asignaciones != null) {
            plan.getAsignaciones().clear();
            planificacionRepository.flush();
            for (PlanificacionAsignacionDTO dto : asignaciones) {
                plan.getAsignaciones().add(construirAsignacion(plan, dto, idServicio));
            }
        }

        return planificacionRepository.save(plan);
    }

    // Hard-delete del molde: las asignaciones se borran en cascada. Los turnos generados no
    // referencian la planificación (solo su ejecución, que tampoco se borra en cascada desde aquí
    // por diseño: se conserva como historial aunque el molde se elimine). Se rechaza si el molde
    // tiene ejecuciones ACTIVAS, para no dejar turnos vigentes sin un molde que los respalde.
    public void eliminarPlanificacion(Long idPlanificacion) {
        PlanificacionEntity plan = obtenerPlanificacion(idPlanificacion);
        boolean tieneEjecucionActiva = ejecucionRepository.findByPlanificacion_IdPlanificacion(idPlanificacion).stream()
                .anyMatch(PlanificacionEjecucionEntity::isActiva);
        if (tieneEjecucionActiva) {
            throw new RuntimeException(
                    "No se puede eliminar: esta planificación tiene una vigencia activa. Anúlala primero.");
        }
        planificacionRepository.delete(plan);
    }

    /**
     * Deshace una generación LEGADA (turnos generados antes de introducirse
     * {@link PlanificacionEjecucionEntity}, identificados solo por rotativa compartida). Se
     * conserva por compatibilidad histórica; para generaciones nuevas usar
     * {@link #anularEjecucion(Long)}, que identifica los turnos de forma inequívoca por ejecución.
     *
     * @return cantidad de turnos eliminados.
     */
    public int eliminarTurnosGenerados(Long idPlanificacion, LocalDate fechaInicio, LocalDate fechaFin) {
        PlanificacionEntity plan = obtenerPlanificacion(idPlanificacion);

        if (fechaInicio == null || fechaFin == null) {
            throw new RuntimeException("Debe indicar fecha de inicio y fecha de fin.");
        }
        if (fechaFin.isBefore(fechaInicio)) {
            throw new RuntimeException("La fecha de fin no puede ser anterior a la fecha de inicio.");
        }

        List<Long> idsRotativas = plan.getAsignaciones().stream()
                .map(a -> a.getRotativa().getIdRotativa())
                .distinct()
                .toList();
        if (idsRotativas.isEmpty()) {
            return 0;
        }

        return turnoRepository.softDeleteByRotativasAndRango(idsRotativas, fechaInicio, fechaFin);
    }

    // =========================================================
    // GENERACIÓN DE TURNOS (nuevo modelo: ancla + vigencia efectiva)
    // =========================================================

    /**
     * Genera los turnos de un molde para el rango efectivo indicado (de longitud arbitraria, no
     * limitada a un ciclo de rotativa ni a un mes), anclando la fase de cada rotativa a
     * {@code fechaInicioRotativa}. Crea y persiste la {@link PlanificacionEjecucionEntity} que da a
     * cada turno un origen inequívoco. Rechaza si la nueva vigencia se superpone con otra ejecución
     * ACTIVA del mismo servicio.
     *
     * @return {generados, vacantesPorConflicto, idEjecucion}.
     */
    public Map<String, Object> generarTurnos(Long idPlanificacion, LocalDate fechaInicioRotativa,
            LocalDate fechaInicioEfectiva, LocalDate fechaFinEfectiva, Long actorId, List<Long> idsReglas) {
        PlanificacionEntity plan = obtenerPlanificacion(idPlanificacion);
        ServicioEntity servicio = plan.getServicio();

        validarRangoEfectivo(fechaInicioRotativa, fechaInicioEfectiva, fechaFinEfectiva);

        // Bloqueo pesimista del servicio: serializa, entre peticiones concurrentes, la validación de
        // no-superposición + la creación de la ejecución para este servicio.
        servicioRepository.lockServicio(servicio.getIdServicio());
        validarSinSuperposicion(servicio.getIdServicio(), fechaInicioEfectiva, fechaFinEfectiva, null);

        FuncionarioEntity actor = (actorId != null) ? funcionarioRepository.findById(actorId).orElse(null) : null;

        PlanificacionEjecucionEntity ejecucion = PlanificacionEjecucionEntity.builder()
                .planificacion(plan)
                .servicio(servicio)
                .fechaInicioRotativa(fechaInicioRotativa)
                .fechaInicioEfectiva(fechaInicioEfectiva)
                .fechaFinEfectiva(fechaFinEfectiva)
                .fechaGeneracion(LocalDateTime.now())
                .actor(actor)
                .estado(EstadoEjecucion.ACTIVA)
                .idsReglasAplicadas(idsReglas == null || idsReglas.isEmpty() ? null
                        : idsReglas.stream().map(String::valueOf).collect(Collectors.joining(",")))
                .build();
        ejecucion = ejecucionRepository.save(ejecucion);

        Map<String, Object> resultado = expandirYPersistir(plan, ejecucion, fechaInicioRotativa,
                fechaInicioEfectiva, fechaFinEfectiva, idsReglas, actor);
        resultado.put("idEjecucion", ejecucion.getIdEjecucion());

        bitacoraService.registrarEventoPlanificacion("GENERACION_PLANIFICACION", actor,
                "Ejecución " + ejecucion.getIdEjecucion() + " de '" + plan.getNombre() + "': "
                + fechaInicioEfectiva + " a " + fechaFinEfectiva);

        return resultado;
    }

    /**
     * Pre-chequeo (no persiste): devuelve los turnos que el molde generaría en el rango dado y que
     * chocarían en horario con turnos ya existentes del funcionario en cualquier servicio. Usa
     * exactamente el mismo cálculo de expansión que {@link #generarTurnos}, para que la vista previa
     * nunca pueda diferir de la generación final.
     */
    public List<Map<String, Object>> detectarConflictos(Long idPlanificacion, LocalDate fechaInicioRotativa,
            LocalDate fechaInicioEfectiva, LocalDate fechaFinEfectiva) {
        PlanificacionEntity plan = obtenerPlanificacion(idPlanificacion);
        validarRangoEfectivo(fechaInicioRotativa, fechaInicioEfectiva, fechaFinEfectiva);

        List<PlanificacionAsignacionEntity> asignacionesConFuncionario = asignacionesVigentes(plan).stream()
                .filter(a -> a.getFuncionario() != null && !a.getFuncionario().isEliminado())
                .toList();

        Map<Long, List<RotativaDiaEntity>> secuenciaPorRotativa = cargarSecuencias(asignacionesConFuncionario);

        Set<Long> idsFuncionarios = asignacionesConFuncionario.stream()
                .map(a -> a.getFuncionario().getIdFuncionario())
                .collect(Collectors.toSet());
        Map<Long, List<TurnoEntity>> conflictosExistentes = idsFuncionarios.isEmpty()
                ? Map.of()
                : turnoRepository.findConflictosByFuncionarios(
                        new ArrayList<>(idsFuncionarios), fechaInicioEfectiva, fechaFinEfectiva.plusDays(1))
                        .stream()
                        .collect(Collectors.groupingBy(t -> t.getFuncionario().getIdFuncionario()));

        List<Map<String, Object>> conflictos = new ArrayList<>();

        for (PlanificacionAsignacionEntity asignacion : asignacionesConFuncionario) {
            FuncionarioEntity func = asignacion.getFuncionario();
            RotativaEntity rotativa = asignacion.getRotativa();
            Map<Integer, List<RotativaDiaEntity>> porIndice = agruparPorIndice(secuenciaPorRotativa.get(rotativa.getIdRotativa()));
            int cicloDias = cicloDias(rotativa);

            for (LocalDate dia = fechaInicioEfectiva; !dia.isAfter(fechaFinEfectiva); dia = dia.plusDays(1)) {
                int idx = indiceDelDia(fechaInicioRotativa, dia, cicloDias);
                for (RotativaDiaEntity rd : porIndice.getOrDefault(idx, List.of())) {
                    TipoTurnoEntity tipo = rd.getTipoTurno();
                    if (tipo == null || tipo.isEliminado()) continue;

                    LocalTime hi = tipo.getHoraInicio();
                    LocalTime hf = tipo.getHoraTermino();
                    LocalDate diaFinal = !hf.isAfter(hi) ? dia.plusDays(1) : dia;

                    TurnoEntity existente = primerTurnoQueSolapa(
                            conflictosExistentes.getOrDefault(func.getIdFuncionario(), List.of()), dia, diaFinal, hi, hf);
                    if (existente != null) {
                        Map<String, Object> c = new HashMap<>();
                        c.put("idFuncionario", func.getIdFuncionario());
                        c.put("nombreFuncionario", func.getNombre());
                        c.put("fecha", dia.toString());
                        c.put("horaInicio", hi.toString());
                        c.put("horaFin", hf.toString());
                        c.put("nombreRotativa", rotativa.getNombre());
                        c.put("servicioEnConflicto", existente.getServicio() != null ? existente.getServicio().getNombre() : null);
                        conflictos.add(c);
                    }
                }
            }
        }

        return conflictos;
    }

    /**
     * Extiende la vigencia de la ejecución ACTIVA más reciente del servicio de esta planificación:
     * genera una nueva ejecución contigua (mismo ancla, mismas asignaciones vigentes del molde)
     * desde el día siguiente al fin actual hasta {@code nuevaFechaFinEfectiva}. No reemplaza nada;
     * solo agrega — la ejecución original permanece intacta (14.1).
     */
    public Map<String, Object> extenderPlanificacion(Long idPlanificacion, LocalDate nuevaFechaFinEfectiva,
            Long actorId, List<Long> idsReglas) {
        PlanificacionEntity plan = obtenerPlanificacion(idPlanificacion);
        PlanificacionEjecucionEntity vigente = ejecucionActivaMasReciente(plan.getServicio().getIdServicio())
                .orElseThrow(() -> new RuntimeException("Este servicio no tiene una ejecución activa que extender."));

        LocalDate nuevaInicioEfectiva = vigente.getFechaFinEfectiva().plusDays(1);
        if (nuevaFechaFinEfectiva.isBefore(nuevaInicioEfectiva)) {
            throw new RuntimeException("La nueva fecha de término debe ser posterior al fin de la vigencia actual ("
                    + vigente.getFechaFinEfectiva() + ").");
        }

        return generarTurnos(idPlanificacion, vigente.getFechaInicioRotativa(), nuevaInicioEfectiva,
                nuevaFechaFinEfectiva, actorId, idsReglas);
    }

    /**
     * Elimina (soft-delete) los turnos de una ejecución ACTIVA desde una fecha determinada en
     * adelante, acortando su {@code fechaFinEfectiva} al día anterior. Rechaza si la fecha de inicio
     * de la eliminación es anterior a hoy (no se permite eliminar turnos ya transcurridos, 14.2) o
     * no posterior al inicio efectivo de la ejecución (para eliminar la vigencia completa, use
     * {@link #anularEjecucion}).
     *
     * @param fechaDesde primer día que se elimina (inclusive); todo lo anterior a esta fecha se
     *                   conserva intacto.
     * @return {turnosDesactivados, solicitudesPendientesAfectadas} — la UI debe mostrar esta última
     *         cifra como advertencia antes de confirmar (14.3); el soft-delete no destruye la
     *         trazabilidad (la solicitud sigue apuntando por FK al turno, ya soft-eliminado).
     */
    public Map<String, Object> acortarPlanificacion(Long idEjecucion, LocalDate fechaDesde, Long actorId) {
        PlanificacionEjecucionEntity ejecucion = ejecucionRepository.findById(idEjecucion)
                .orElseThrow(() -> new RuntimeException("Ejecución no encontrada: " + idEjecucion));
        if (!ejecucion.isActiva()) {
            throw new RuntimeException("Esta ejecución ya no está activa.");
        }
        if (fechaDesde == null) {
            throw new RuntimeException("Debe indicar la fecha desde la cual eliminar.");
        }
        if (fechaDesde.isBefore(LocalDate.now())) {
            throw new RuntimeException("No se puede eliminar con efecto retroactivo (la fecha debe ser hoy o posterior).");
        }
        if (!fechaDesde.isAfter(ejecucion.getFechaInicioEfectiva())) {
            throw new RuntimeException("La fecha desde la cual eliminar debe ser posterior al inicio efectivo de la vigencia ("
                    + ejecucion.getFechaInicioEfectiva() + "). Para eliminar toda la vigencia, use anularEjecucion.");
        }
        if (fechaDesde.isAfter(ejecucion.getFechaFinEfectiva())) {
            throw new RuntimeException("La fecha desde la cual eliminar es posterior al fin actual de la vigencia ("
                    + ejecucion.getFechaFinEfectiva() + "); no hay turnos que eliminar.");
        }

        LocalDate nuevaFechaFinEfectiva = fechaDesde.minusDays(1);

        List<Long> idsTurnosAfectados = turnoRepository.findByEjecucion_IdEjecucion(idEjecucion).stream()
                .filter(t -> !t.getDiaInicioTurno().isBefore(fechaDesde))
                .map(TurnoEntity::getIdTurno)
                .toList();
        long solicitudesPendientesAfectadas = idsTurnosAfectados.isEmpty() ? 0
                : solicitudRepository.countByTurno_IdTurnoInAndEstado(idsTurnosAfectados, SolicitudEntity.EstadoSolicitud.PENDIENTE);

        int desactivados = turnoRepository.softDeleteByEjecucionDesde(idEjecucion, fechaDesde);

        ejecucion.setFechaFinEfectiva(nuevaFechaFinEfectiva);
        ejecucionRepository.save(ejecucion);

        FuncionarioEntity actor = (actorId != null) ? funcionarioRepository.findById(actorId).orElse(null) : null;
        bitacoraService.registrarEventoPlanificacion("ACORTAR_PLANIFICACION", actor,
                "Ejecución " + idEjecucion + " acortada a " + nuevaFechaFinEfectiva
                + " (" + desactivados + " turnos futuros desactivados)");

        Map<String, Object> resultado = new HashMap<>();
        resultado.put("turnosDesactivados", desactivados);
        resultado.put("solicitudesPendientesAfectadas", solicitudesPendientesAfectadas);
        return resultado;
    }

    /**
     * Anula por completo una ejecución (deshacer generación con origen inequívoco): marca la
     * ejecución {@code ANULADA} y hace soft-delete de TODOS sus turnos vigentes, sin afectar
     * ninguna otra ejecución, turno manual o turno legado (13.4).
     *
     * @return cantidad de turnos eliminados.
     */
    public int anularEjecucion(Long idEjecucion, Long actorId) {
        PlanificacionEjecucionEntity ejecucion = ejecucionRepository.findById(idEjecucion)
                .orElseThrow(() -> new RuntimeException("Ejecución no encontrada: " + idEjecucion));
        if (!ejecucion.isActiva()) {
            throw new RuntimeException("Esta ejecución ya no está activa.");
        }

        int eliminados = turnoRepository.softDeleteByEjecucionDesde(idEjecucion, ejecucion.getFechaInicioEfectiva());
        ejecucion.setEstado(EstadoEjecucion.ANULADA);
        ejecucionRepository.save(ejecucion);

        FuncionarioEntity actor = (actorId != null) ? funcionarioRepository.findById(actorId).orElse(null) : null;
        bitacoraService.registrarEventoPlanificacion("ANULAR_EJECUCION_PLANIFICACION", actor,
                "Ejecución " + idEjecucion + " anulada (" + eliminados + " turnos eliminados)");

        return eliminados;
    }

    /**
     * Todas las ejecuciones (cualquier estado, de cualquier molde) del servicio, más recientes
     * primero. Permite a Administrador ver y actuar (acortar/anular/editar desde fecha) sobre
     * cualquier planificación vigente del servicio sin depender de tener cargado el molde
     * específico que la generó.
     */
    public List<PlanificacionEjecucionEntity> obtenerEjecucionesPorServicio(Long idServicio) {
        return ejecucionRepository.findByServicio_IdServicioOrderByFechaInicioEfectivaDesc(idServicio);
    }

    /**
     * Edita la planificación "desde una fecha" (12.4): trunca o anula la ejecución ACTIVA del
     * servicio que cubre {@code fechaDesde} (nunca toca turnos anteriores a esa fecha), actualiza las
     * asignaciones del molde, y genera una nueva ejecución desde {@code fechaDesde} hasta
     * {@code nuevaFechaFinEfectiva} preservando el mismo ancla de rotativa — representando así el
     * cambio como versiones consecutivas sin superposición (12.5), sin alterar el historial previo.
     */
    public Map<String, Object> editarPlanificacionDesde(Long idPlanificacion, LocalDate fechaDesde,
            LocalDate nuevaFechaFinEfectiva, List<PlanificacionAsignacionDTO> nuevasAsignaciones,
            Long actorId, List<Long> idsReglas) {
        PlanificacionEntity plan = obtenerPlanificacion(idPlanificacion);
        Long idServicio = plan.getServicio().getIdServicio();

        if (fechaDesde == null) throw new RuntimeException("Debe indicar la fecha desde la cual editar.");
        if (fechaDesde.isBefore(LocalDate.now())) {
            throw new RuntimeException("No se puede editar la planificación con efecto retroactivo (antes de hoy).");
        }

        servicioRepository.lockServicio(idServicio);

        PlanificacionEjecucionEntity ejecucionActual = ejecucionRepository
                .findVigenteEnFecha(idServicio, fechaDesde, EstadoEjecucion.ACTIVA)
                .or(() -> ejecucionRepository.findDesde(idServicio, fechaDesde, EstadoEjecucion.ACTIVA)
                        .stream().findFirst())
                .orElse(null);

        LocalDate ancla;
        if (ejecucionActual != null) {
            ancla = ejecucionActual.getFechaInicioRotativa();
            if (fechaDesde.isAfter(ejecucionActual.getFechaInicioEfectiva())) {
                // Trunca: la ejecución sigue vigente hasta el día anterior a fechaDesde.
                turnoRepository.softDeleteByEjecucionDesde(ejecucionActual.getIdEjecucion(), fechaDesde);
                ejecucionActual.setFechaFinEfectiva(fechaDesde.minusDays(1));
                ejecucionRepository.save(ejecucionActual);
            } else {
                // fechaDesde es igual o anterior a su inicio: se anula por completo.
                turnoRepository.softDeleteByEjecucionDesde(ejecucionActual.getIdEjecucion(), ejecucionActual.getFechaInicioEfectiva());
                ejecucionActual.setEstado(EstadoEjecucion.ANULADA);
                ejecucionRepository.save(ejecucionActual);
            }
        } else {
            // Sin ejecución previa que cubra o siga a fechaDesde: usa fechaDesde como propio ancla
            // si ya es lunes; si no, se exige indicarla explícitamente vía generarTurnos.
            if (fechaDesde.getDayOfWeek() != DayOfWeek.MONDAY) {
                throw new RuntimeException(
                        "No existe una vigencia previa que continuar: indique un ancla de rotativa (lunes) usando generarTurnos.");
            }
            ancla = fechaDesde;
        }

        if (nuevasAsignaciones != null) {
            actualizarPlanificacion(idPlanificacion, null, nuevasAsignaciones);
        }

        Map<String, Object> resultado = generarTurnos(idPlanificacion, ancla, fechaDesde, nuevaFechaFinEfectiva, actorId, idsReglas);

        FuncionarioEntity actor = (actorId != null) ? funcionarioRepository.findById(actorId).orElse(null) : null;
        bitacoraService.registrarEventoPlanificacion("EDICION_PLANIFICACION_DESDE_FECHA", actor,
                "Planificación '" + plan.getNombre() + "' editada desde " + fechaDesde);

        return resultado;
    }

    // =========================================================
    // AUXILIAR — expansión de secuencia (compartida por generar y detectar)
    // =========================================================

    private Map<String, Object> expandirYPersistir(PlanificacionEntity plan, PlanificacionEjecucionEntity ejecucion,
            LocalDate fechaInicioRotativa, LocalDate fechaInicioEfectiva, LocalDate fechaFinEfectiva,
            List<Long> idsReglas, FuncionarioEntity actor) {
        ServicioEntity servicio = plan.getServicio();
        var reglasSel = reglaServicioService.cargarReglasSeleccionadas(servicio.getIdServicio(), idsReglas);

        List<PlanificacionAsignacionEntity> asignacionesVigentes = asignacionesVigentes(plan);
        Map<Long, List<RotativaDiaEntity>> secuenciaPorRotativa = cargarSecuencias(asignacionesVigentes);

        Set<LocalDate> feriados = reglasSel.isEmpty()
                ? Set.of()
                : feriadoRepository.findByFechaBetweenOrderByFechaAsc(fechaInicioEfectiva, fechaFinEfectiva.plusDays(1)).stream()
                        .map(FeriadoEntity::getFecha)
                        .collect(Collectors.toSet());

        Set<Long> idsFuncionarios = asignacionesVigentes.stream()
                .map(PlanificacionAsignacionEntity::getFuncionario)
                .filter(f -> f != null && !f.isEliminado())
                .map(FuncionarioEntity::getIdFuncionario)
                .collect(Collectors.toSet());
        // Lock pesimista de los funcionarios involucrados en orden de id (determinista => sin
        // deadlock entre generaciones concurrentes), ANTES de cargar sus conflictos existentes.
        idsFuncionarios.stream().sorted().forEach(funcionarioRepository::lockFuncionario);
        Map<Long, List<TurnoEntity>> conflictosExistentes = idsFuncionarios.isEmpty()
                ? Map.of()
                : turnoRepository.findConflictosByFuncionarios(
                        new ArrayList<>(idsFuncionarios), fechaInicioEfectiva, fechaFinEfectiva.plusDays(1))
                        .stream()
                        .collect(Collectors.groupingBy(t -> t.getFuncionario().getIdFuncionario()));

        int generados = 0, vacantesPorConflicto = 0;
        Map<Long, List<TurnoEntity>> creadosPorFuncionario = new HashMap<>();

        for (PlanificacionAsignacionEntity asignacion : asignacionesVigentes) {
            RotativaEntity rotativa = asignacion.getRotativa();
            Map<Integer, List<RotativaDiaEntity>> porIndice = agruparPorIndice(secuenciaPorRotativa.get(rotativa.getIdRotativa()));
            int ciclo = cicloDias(rotativa);

            for (LocalDate dia = fechaInicioEfectiva; !dia.isAfter(fechaFinEfectiva); dia = dia.plusDays(1)) {
                int idx = indiceDelDia(fechaInicioRotativa, dia, ciclo);

                for (RotativaDiaEntity rd : porIndice.getOrDefault(idx, List.of())) {
                    TipoTurnoEntity tipo = rd.getTipoTurno();
                    if (tipo == null || tipo.isEliminado()) continue; // día libre o tipo eliminado

                    TurnoEntity turno = TurnoEntity.builder()
                            .tipoTurno(tipo)
                            .diaInicioTurno(dia)
                            .diaFinalTurno(!tipo.getHoraTermino().isAfter(tipo.getHoraInicio()) ? dia.plusDays(1) : dia)
                            .horaInicio(tipo.getHoraInicio())
                            .horaFin(tipo.getHoraTermino())
                            .servicio(servicio)
                            .puesto(asignacion.getPuesto())
                            .rotativa(rotativa)
                            .ejecucion(ejecucion)
                            .build();

                    reglaServicioService.aplicarReglas(turno, reglasSel, feriados);

                    LocalTime hi = turno.getHoraInicio();
                    LocalTime hf = turno.getHoraFin();
                    LocalDate diaFinal = !hf.isAfter(hi) ? dia.plusDays(1) : dia;
                    turno.setDiaFinalTurno(diaFinal);

                    FuncionarioEntity func = asignacion.getFuncionario();
                    if (func != null && func.isEliminado()) func = null;

                    boolean enConflicto = func != null && hayChoqueHorario(dia, diaFinal, hi, hf,
                            conflictosExistentes.getOrDefault(func.getIdFuncionario(), List.of()),
                            creadosPorFuncionario.getOrDefault(func.getIdFuncionario(), List.of()));
                    FuncionarioEntity funcAsignado = enConflicto ? null : func;
                    if (enConflicto) vacantesPorConflicto++;
                    turno.setFuncionario(funcAsignado);

                    turnoRepository.save(turno);
                    bitacoraService.registrarTurnoGenerado(turno, actor, plan.getNombre());

                    if (funcAsignado != null) {
                        creadosPorFuncionario.computeIfAbsent(funcAsignado.getIdFuncionario(), k -> new ArrayList<>()).add(turno);
                    }
                    generados++;
                }
            }
        }

        Map<String, Object> res = new HashMap<>();
        res.put("generados", generados);
        res.put("vacantesPorConflicto", vacantesPorConflicto);
        return res;
    }

    private List<PlanificacionAsignacionEntity> asignacionesVigentes(PlanificacionEntity plan) {
        return plan.getAsignaciones().stream()
                .filter(a -> a.getRotativa() != null && !a.getRotativa().isEliminado())
                .filter(a -> a.getPuesto() == null || !a.getPuesto().isEliminado())
                .toList();
    }

    private Map<Long, List<RotativaDiaEntity>> cargarSecuencias(List<PlanificacionAsignacionEntity> asignaciones) {
        Map<Long, List<RotativaDiaEntity>> secuenciaPorRotativa = new HashMap<>();
        for (PlanificacionAsignacionEntity asignacion : asignaciones) {
            Long idRotativa = asignacion.getRotativa().getIdRotativa();
            secuenciaPorRotativa.computeIfAbsent(idRotativa,
                    id -> rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(id));
        }
        return secuenciaPorRotativa;
    }

    private Map<Integer, List<RotativaDiaEntity>> agruparPorIndice(List<RotativaDiaEntity> secuencia) {
        if (secuencia == null) return Map.of();
        return secuencia.stream().collect(Collectors.groupingBy(RotativaDiaEntity::getDiaIndex));
    }

    private int cicloDias(RotativaEntity rotativa) {
        int semanas = rotativa.getSemanas() != null ? rotativa.getSemanas() : 0;
        int ciclo = semanas * 7;
        if (ciclo <= 0) {
            throw new RuntimeException("La rotativa '" + rotativa.getNombre() + "' no tiene una duración de ciclo válida.");
        }
        return ciclo;
    }

    /** Posición (0-based) de {@code dia} dentro del ciclo de la rotativa, anclada a {@code fechaInicioRotativa}. */
    private int indiceDelDia(LocalDate fechaInicioRotativa, LocalDate dia, int cicloDias) {
        long diasDesdeAncla = ChronoUnit.DAYS.between(fechaInicioRotativa, dia);
        return Math.floorMod(diasDesdeAncla, cicloDias);
    }

    // =========================================================
    // AUXILIAR — validaciones
    // =========================================================

    private void validarRangoEfectivo(LocalDate fechaInicioRotativa, LocalDate fechaInicioEfectiva, LocalDate fechaFinEfectiva) {
        if (fechaInicioRotativa == null) throw new RuntimeException("Debe indicar la fecha de anclaje de la rotativa.");
        if (fechaInicioRotativa.getDayOfWeek() != DayOfWeek.MONDAY) {
            throw new RuntimeException("La fecha de anclaje de la rotativa debe ser un lunes.");
        }
        if (fechaInicioEfectiva == null) throw new RuntimeException("Debe indicar la fecha efectiva de inicio.");
        if (fechaFinEfectiva == null) throw new RuntimeException("Debe indicar la fecha efectiva de término.");
        if (fechaInicioEfectiva.isBefore(fechaInicioRotativa)) {
            throw new RuntimeException("La fecha efectiva de inicio no puede ser anterior al anclaje de la rotativa.");
        }
        if (fechaFinEfectiva.isBefore(fechaInicioEfectiva)) {
            throw new RuntimeException("La fecha efectiva de término no puede ser anterior a la de inicio.");
        }
    }

    /** Rechaza si [inicio,fin] se superpone (extremos inclusivos) con otra ejecución ACTIVA del servicio. */
    private void validarSinSuperposicion(Long idServicio, LocalDate inicio, LocalDate fin, Long idEjecucionExcluir) {
        List<PlanificacionEjecucionEntity> activas =
                ejecucionRepository.findByServicio_IdServicioAndEstado(idServicio, EstadoEjecucion.ACTIVA);
        for (PlanificacionEjecucionEntity e : activas) {
            if (idEjecucionExcluir != null && idEjecucionExcluir.equals(e.getIdEjecucion())) continue;
            boolean solapa = !inicio.isAfter(e.getFechaFinEfectiva()) && !fin.isBefore(e.getFechaInicioEfectiva());
            if (solapa) {
                throw new RuntimeException("Ya existe una planificación vigente en este servicio entre "
                        + e.getFechaInicioEfectiva() + " y " + e.getFechaFinEfectiva()
                        + ". No se permiten vigencias efectivas superpuestas en un mismo servicio.");
            }
        }
    }

    private java.util.Optional<PlanificacionEjecucionEntity> ejecucionActivaMasReciente(Long idServicio) {
        return ejecucionRepository.findByServicio_IdServicioAndEstadoOrderByFechaFinEfectivaDesc(idServicio, EstadoEjecucion.ACTIVA)
                .stream().findFirst();
    }

    /** ¿El candidato choca en horario con un turno existente del funcionario o con uno ya creado en este mismo lote? */
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
