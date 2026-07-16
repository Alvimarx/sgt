package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.SolicitudRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import com.pingeso.HUAP.Repository.PuestoRepository;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TurnoService {
    private static final Logger logger = LoggerFactory.getLogger(TurnoService.class);

    @Autowired
    private TurnoRepository turnoRepository;

    @Autowired
    private PuestoRepository puestoRepository;

    @Autowired
    private FuncionarioRepository funcionarioRepository;

    @Autowired
    private SolicitudRepository solicitudRepository;

    /**
     * Kill-switch del lock pesimista sobre el funcionario (por defecto activado). Existe para poder
     * medir A/B el costo del lock contra la versión sin él (ver {@code LockBenchmark}). En producción
     * NO debe desactivarse: sin el lock, {@link #saveTurno} vuelve a ser vulnerable a doble-reserva.
     */
    @Value("${huap.concurrencia.lock-pesimista:true}")
    private boolean lockPesimista;

    @Transactional
    public TurnoEntity updateTurno(Long id, TurnoEntity turnoActualizado) throws Exception {
        Optional<TurnoEntity> optTurno = turnoRepository.findById(id);
        if (optTurno.isEmpty()) {
            throw new Exception("No se encontró el turno con ID: " + id);
        }
        TurnoEntity turnoExistente = optTurno.get();

        turnoExistente.setDiaInicioTurno(turnoActualizado.getDiaInicioTurno());
        turnoExistente.setDiaFinalTurno(turnoActualizado.getDiaFinalTurno());
        turnoExistente.setHoraInicio(turnoActualizado.getHoraInicio());
        turnoExistente.setHoraFin(turnoActualizado.getHoraFin());

        // 2. Relaciones (Puesto, Servicio, Funcionario, Rotativa, TipoTurno)
        turnoExistente.setFuncionario(turnoActualizado.getFuncionario());
        turnoExistente.setServicio(turnoActualizado.getServicio());
        turnoExistente.setPuesto(turnoActualizado.getPuesto());
        turnoExistente.setRotativa(turnoActualizado.getRotativa());
        turnoExistente.setTipoTurno(turnoActualizado.getTipoTurno());

        return saveTurno(turnoExistente);
    }

    // ====================================================================
    // BLOQUE 2: CRUD BASE Y VALIDACIONES DE INTEGRIDAD
    // ====================================================================

    /**
     * Obtiene todos los turnos vigentes del sistema (excluye eliminados).
     */
    public List<TurnoEntity> getAllTurnos() {
        return turnoRepository.findByEliminadoFalse();
    }

    /**
     * Obtiene un turno específico por su ID.
     */
    public Optional<TurnoEntity> getTurnoById(Long id) {
        return turnoRepository.findById(id);
    }

    /**
     * Crea un nuevo turno aplicando validaciones de negocio y ajustes de tiempo.
     */
    @Transactional
    public TurnoEntity saveTurno(TurnoEntity turno) throws Exception {

        // 1. Validar conflictos de Funcionario (evitar que un médico esté en dos lugares a la vez)
        if (turno.getFuncionario() != null) {
            // Lock pesimista del funcionario ANTES del chequeo: serializa chequeo+inserción para un
            // mismo funcionario, cerrando la carrera check-then-act que permitía doble-reserva cuando
            // dos transacciones validaban en paralelo (ninguna veía el turno aún no committeado de la otra).
            if (lockPesimista) {
                funcionarioRepository.lockFuncionario(turno.getFuncionario().getIdFuncionario());
            }

            List<TurnoEntity> conflictosFuncionario = turnoRepository.findConflictosByFuncionario(
                    turno.getFuncionario().getIdFuncionario(),
                    turno.getDiaInicioTurno(),
                    turno.getDiaFinalTurno());
            
            boolean hayConflicto = conflictosFuncionario.stream()
                    .anyMatch(t -> turno.getIdTurno() == null || !t.getIdTurno().equals(turno.getIdTurno()));
            
            if (hayConflicto) {
                throw new Exception("Conflicto: El funcionario seleccionado ya tiene otro turno asignado en este rango de fechas.");
            }
        }

        return turnoRepository.save(turno);
    }

    /**
     * Soft-delete de un turno: lo marca como eliminado para que desaparezca de la agenda
     * vigente. No se borra físicamente, conservando las referencias históricas
     * (solicitudes, bitácora) que lo apuntan.
     */
    @Transactional
    public void eliminarTurno(Long id) throws Exception {
        TurnoEntity turno = turnoRepository.findById(id)
                .orElseThrow(() -> new Exception("No se encontró el turno a eliminar con ID: " + id));
        turno.setEliminado(true);
        turnoRepository.save(turno);
    }

    // ====================================================================
    // BLOQUE 3: TRANSFORMACIÓN DE DATOS 
    // ====================================================================

    /**
     * Solo extrae la información real de la base de datos.
     */
    private Map<String, Object> convertirTurnoAMap(TurnoEntity t) {
        Map<String, Object> m = new HashMap<>();

        // --- 1. Identificadores y Datos Básicos ---
        m.put("id", t.getIdTurno());

        if (t.getTipoTurno() != null) {
            m.put("idTipoTurno", t.getTipoTurno().getIdTipoTurno());
            m.put("nombre", t.getTipoTurno().getNombre());
            m.put("nombreTipo", t.getTipoTurno().getNombre());
            m.put("nombreTipoTurno", t.getTipoTurno().getNombre());
        } else {
            m.put("idTipoTurno", null);
            m.put("nombre", "Sin Tipo");
            m.put("nombreTipo", "Sin Tipo");
            m.put("nombreTipoTurno", "Sin Tipo");
        }

        // --- 2. Fechas y Horas ---
        m.put("diaInicioTurno", t.getDiaInicioTurno() != null ? t.getDiaInicioTurno().toString() : null);
        m.put("diaFinalTurno", t.getDiaFinalTurno() != null ? t.getDiaFinalTurno().toString() : null);
        m.put("horaInicio", t.getHoraInicio() != null ? t.getHoraInicio().toString() : null);
        m.put("horaFin", t.getHoraFin() != null ? t.getHoraFin().toString() : null);

        // --- 3. Ubicación (Puesto) ---
        if (t.getPuesto() != null) {
            m.put("idPuesto", t.getPuesto().getIdPuesto());
            m.put("nombrePuesto", t.getPuesto().getNombre());
        } else {
            m.put("idPuesto", null);
            m.put("nombrePuesto", "Sin Puesto");
        }

        // --- 4. Médico Asignado ---
        if (t.getFuncionario() != null) {
            m.put("idFuncionario", t.getFuncionario().getIdFuncionario());
            m.put("nombreFuncionario", t.getFuncionario().getNombre() + " " + t.getFuncionario().getApelPat());
            m.put("rutFuncionario", t.getFuncionario().getRut());
        } else {
            m.put("idFuncionario", null);
            m.put("nombreFuncionario", "Sin Asignar");
            m.put("rutFuncionario", null);
        }

        // Rotativa (rotativa con la que fue designado el turno)
        if (t.getRotativa() != null) {
            m.put("idRotativa", t.getRotativa().getIdRotativa());
            m.put("nombreRotativa", t.getRotativa().getNombre());
        } else {
            m.put("idRotativa", null);
            m.put("nombreRotativa", "Sin Rotativa");
        }

        return m;
    }

    /**
     * Obtiene los turnos de un servicio para la vista de calendario en un rango de fechas.
     * getTurnosByServicioAndDiaWithPisoNombre
     */
    public List<Map<String, Object>> getTurnosCalendario(Long servicioId, LocalDate inicio, LocalDate fin) {
        List<TurnoEntity> turnos = turnoRepository.findByServicioIdAndDateRange(servicioId, inicio, fin);
        return turnos.stream()
                     .map(this::convertirTurnoAMap)
                     .collect(Collectors.toList());
    }

    /**
     * Obtiene todos los turnos de un puesto específico.
     */
    public List<Map<String, Object>> getTurnosByPuesto(Long puestoId) {
        return turnoRepository.findByPuesto_IdPuesto(puestoId).stream()
                .map(this::convertirTurnoAMap)
                .collect(Collectors.toList());
    }

    /**
     * Obtiene todos los turnos asignados a un médico específico (Historial completo).
     */
    public List<Map<String, Object>> getTurnosByMedico(Long funcionarioId) {
        return turnoRepository.findByFuncionario_IdFuncionario(funcionarioId).stream()
                .map(this::convertirTurnoAMap)
                .collect(Collectors.toList());
    }

    /**
     * Obtiene los turnos de un médico para un mes y año específicos.
     * Útil para la vista de "Mis Turnos" del mes.
     */
    public List<Map<String, Object>> getTurnosByMedicoAndMonthAndYear(Long funcionarioId, int mes, int anio) {
        LocalDate inicio = LocalDate.of(anio, mes, 1);
        LocalDate fin = inicio.withDayOfMonth(inicio.lengthOfMonth());
        
        return turnoRepository.findByFuncionarioIdAndDateRange(funcionarioId, inicio, fin).stream()
                .map(this::convertirTurnoAMap)
                .collect(Collectors.toList());
    }

    /**
     * Obtiene todos los turnos sin asignar (vacantes) de un Servicio específico.
     */
    public List<Map<String, Object>> getUnassignedTurnosByServicio(Long servicioId) {
        // 1. Llamamos al método que ya tienes en tu nuevo Repository
        List<TurnoEntity> turnosVacantes = turnoRepository.findUnassignedTurnosByServicio(servicioId);

        // 2. Lo convertimos al formato limpio para el Frontend usando nuestro mapeador
        return turnosVacantes.stream()
                .map(this::convertirTurnoAMap)
                .collect(Collectors.toList());
    }

    /**
     * Obtiene los turnos sin asignar (vacantes) de un Servicio en un rango de fechas,
     * ordenados por fecha de inicio ascendente.
     */
    public List<Map<String, Object>> getUnassignedTurnosByServicioAndPeriodo(Long servicioId, LocalDate inicio, LocalDate fin) {
        List<TurnoEntity> turnosVacantes = turnoRepository.findUnassignedTurnosByServicioAndDateRange(servicioId, inicio, fin);
        return turnosVacantes.stream()
                .map(this::convertirTurnoAMap)
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getFuncionariosConTurnosServicio(Long servicioId, LocalDate inicio, LocalDate fin) {
        List<TurnoEntity> turnos = turnoRepository.findByServicioIdAndDateRange(servicioId, inicio, fin);

        Map<Long, List<TurnoEntity>> porFuncionario = turnos.stream()
                .filter(t -> t.getFuncionario() != null)
                .collect(Collectors.groupingBy(t -> t.getFuncionario().getIdFuncionario()));

        List<com.pingeso.HUAP.Entity.FuncionarioEntity> todosFuncionarios =
                funcionarioRepository.findAllByServicioId(servicioId);

        return todosFuncionarios.stream()
                .map(func -> {
                    String nombre = ((func.getNombre() != null ? func.getNombre() : "") + " " +
                                    (func.getApelPat() != null ? func.getApelPat() : "")).trim();

                    List<TurnoEntity> turnosFuncionario = porFuncionario.getOrDefault(func.getIdFuncionario(), List.of());

                    List<Map<String, Object>> turnosDetalle = turnosFuncionario.stream()
                            .sorted(Comparator.comparing(TurnoEntity::getDiaInicioTurno))
                            .map(t -> {
                                Map<String, Object> tm = new HashMap<>();
                                tm.put("tipoTurno",    t.getTipoTurno() != null ? t.getTipoTurno().getNombre() : null);
                                tm.put("nombrePuesto", t.getPuesto()    != null ? t.getPuesto().getNombre()    : null);
                                tm.put("fecha",        t.getDiaInicioTurno() != null ? t.getDiaInicioTurno().toString() : null);
                                return tm;
                            })
                            .collect(Collectors.toList());

                    Map<String, Object> funcMap = new HashMap<>();
                    funcMap.put("idFuncionario",  func.getIdFuncionario());
                    funcMap.put("nombre",         nombre);
                    funcMap.put("cantidadTurnos", turnosFuncionario.size());
                    funcMap.put("turnos",         turnosDetalle);
                    return funcMap;
                })
                .sorted(Comparator.comparing(m -> m.get("nombre").toString()))
                .collect(Collectors.toList());
    }

    public Map<String, Object> getFuncionariosStatsServicio(Long servicioId, LocalDate inicio, LocalDate fin) {
        long conTurno = turnoRepository.countDistinctFuncionariosByServicioAndDateRange(servicioId, inicio, fin);
        long total = funcionarioRepository.contarFuncionariosPorServicio(servicioId);
        Map<String, Object> result = new HashMap<>();
        result.put("funcionariosConTurno", conTurno);
        result.put("totalFuncionarios", total);
        return result;
    }

    /**
     * Obtiene los turnos vacantes de un Servicio que EMPIEZAN exactamente en una fecha.
     */
    public List<Map<String, Object>> getTurnosSinAsignarByDia(Long servicioId, LocalDate fecha) {
        
        // La base de datos hace los 3 filtros a la vez: 
        // 1. Servicio, 2. Día de inicio exacto (evita duplicados), 3. Funcionario es NULL
        List<TurnoEntity> turnos = turnoRepository.findByServicio_IdServicioAndDiaInicioTurnoAndFuncionarioIsNull(servicioId, fecha);

        // Convertimos al formato que espera tu frontend
        return turnos.stream()
                .map(this::convertirTurnoAMap)
                .collect(Collectors.toList());
    }


    /**
     * Obtiene todos los turnos de un servicio con sus nombres de piso ya resueltos.
     * getTurnosByServicioWithPisoNombre
     */
    public List<Map<String, Object>> getTurnosByServicioConDetalles(Long servicioId) {
        List<TurnoEntity> turnos = turnoRepository.findByServicio_IdServicio(servicioId);
        return turnos.stream()
                     .map(this::convertirTurnoAMap)
                     .collect(Collectors.toList());
    }

    /**
     * Obtiene los turnos futuros de un funcionario específico.
     */
    public List<Map<String, Object>> getTurnosFuturosFuncionario(Long funcionarioId) {
        // Buscamos turnos desde hoy en adelante para este funcionario
        List<TurnoEntity> turnos = turnoRepository.findByFuncionarioIdAndDateRange(
                funcionarioId,
                LocalDate.now(),
                LocalDate.now().plusMonths(3)
        );
        
        return turnos.stream()
                     .map(this::convertirTurnoAMap)
                     .collect(Collectors.toList());
    }

    // ====================================================================
    // BLOQUE 4: ASIGNACIONES MASIVAS Y PLANIFICACIÓN
    // ====================================================================

    /**
     * Obtiene los turnos "vacantes" (sin asignar) para un puesto y rango de fechas.
     * Reutiliza nuestra poderosa función de mapeo del Bloque 3.
     */
    public List<Map<String, Object>> getTurnosParaAsignacion(Long puestoId, LocalDate inicio, LocalDate fin) {
        // 1. Buscamos todos los turnos del puesto en esa fecha
        List<TurnoEntity> turnos = turnoRepository.findByPuestoIdAndDateRange(puestoId, inicio, fin);

        // 2. Filtramos solo los que NO tienen funcionario y los convertimos a DTO
        return turnos.stream()
                .filter(t -> t.getFuncionario() == null)
                .map(this::convertirTurnoAMap)           
                .collect(Collectors.toList());
    }

    // ====================================================================
    // BLOQUE 5: MÉTRICAS, ESTADÍSTICAS Y COBERTURA (DASHBOARDS)
    // ====================================================================

    public List<Map<String, Object>> getTurnosDetalleServicio(Long servicioId, LocalDate inicio, LocalDate fin) {
        List<TurnoEntity> turnos = turnoRepository.findByServicioIdAndDateRange(servicioId, inicio, fin);
        return turnos.stream()
                .sorted(Comparator.comparing(TurnoEntity::getDiaInicioTurno))
                .map(t -> {
                    boolean asignado = t.getFuncionario() != null;
                    String nombreFuncionario = null;
                    if (asignado) {
                        nombreFuncionario = ((t.getFuncionario().getNombre() != null ? t.getFuncionario().getNombre() : "") + " " +
                                            (t.getFuncionario().getApelPat() != null ? t.getFuncionario().getApelPat() : "")).trim();
                    }
                    Map<String, Object> m = new HashMap<>();
                    m.put("idTurno",          t.getIdTurno());
                    m.put("tipoTurno",        t.getTipoTurno() != null ? t.getTipoTurno().getNombre() : null);
                    m.put("nombrePuesto",     t.getPuesto()    != null ? t.getPuesto().getNombre()    : null);
                    m.put("fecha",            t.getDiaInicioTurno() != null ? t.getDiaInicioTurno().toString() : null);
                    m.put("horaInicio",       t.getHoraInicio() != null ? t.getHoraInicio().toString() : null);
                    m.put("horaFin",          t.getHoraFin()    != null ? t.getHoraFin().toString()    : null);
                    m.put("asignado",          asignado);
                    m.put("nombreFuncionario", nombreFuncionario);
                    m.put("nombreRotativa",   t.getRotativa() != null ? t.getRotativa().getNombre() : null);
                    return m;
                })
                .collect(Collectors.toList());
    }

    /**
     * Calcula las estadísticas generales de un servicio en un rango de fechas.
     * Ideal para los gráficos de "Turnos Asignados vs Vacantes".
     */
    public Map<String, Object> getTurnosStatsByServicio(Long servicioId, LocalDate inicio, LocalDate fin) {
        List<TurnoEntity> turnos = turnoRepository.findByServicioIdAndDateRange(servicioId, inicio, fin);
        
        long totalTurnos = turnos.size();
        long asignados = turnos.stream().filter(t -> t.getFuncionario() != null).count();
        long vacantes = totalTurnos - asignados;
        
        double porcentaje = totalTurnos > 0 ? ((double) asignados / totalTurnos) * 100 : 0.0;
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalTurnos", totalTurnos);
        stats.put("turnosAsignados", asignados);
        stats.put("turnosVacantes", vacantes);
        stats.put("porcentajeCobertura", Math.round(porcentaje * 100.0) / 100.0); // Redondeo a 2 decimales
        
        return stats;
    }

    /**
     * Calcula las horas reales de cobertura para un Puesto específico.
     * Solo toma en cuenta los turnos que YA tienen un funcionario asignado.
     * getCoveragePerPuestoLastMonth, getCoveragePerPuestoCurrentMonth, getCoveragePerPuestoByMonth
     */
    public Map<String, Object> getCoberturaRealByPuesto(Long puestoId, LocalDate inicio, LocalDate fin) {
        List<TurnoEntity> turnosDelPuesto = turnoRepository.findByPuestoIdAndDateRange(puestoId, inicio, fin);

        // Filtramos solo los turnos que tienen un médico/funcionario asignado
        List<TurnoEntity> turnosAsignados = turnosDelPuesto.stream()
                .filter(t -> t.getFuncionario() != null)
                .collect(Collectors.toList());

        double horasReales = computeUnionHours(turnosAsignados);

        Map<String, Object> cobertura = new HashMap<>();
        cobertura.put("idPuesto", puestoId);
        cobertura.put("horasRealesCubiertas", horasReales);

        return cobertura;
    }

    /**
     * Motor matemático genérico: Suma las horas reales de una lista de turnos evitando 
     * duplicidades si hay superposición de horarios.
     */
    private double computeUnionHours(List<TurnoEntity> turnos) {
        if (turnos == null || turnos.isEmpty()) return 0.0;

        List<Intervalo> intervalos = turnos.stream()
                .filter(t -> t.getDiaInicioTurno() != null && t.getHoraInicio() != null && 
                             t.getDiaFinalTurno() != null && t.getHoraFin() != null)
                .map(t -> new Intervalo(
                        LocalDateTime.of(t.getDiaInicioTurno(), t.getHoraInicio()),
                        LocalDateTime.of(t.getDiaFinalTurno(), t.getHoraFin())
                ))
                .sorted(Comparator.comparing(Intervalo::getInicio))
                .collect(Collectors.toList());

        List<Intervalo> fusionados = new ArrayList<>();
        if (!intervalos.isEmpty()) {
            Intervalo actual = intervalos.get(0);
            for (int i = 1; i < intervalos.size(); i++) {
                Intervalo siguiente = intervalos.get(i);
                if (!actual.getFin().isBefore(siguiente.getInicio())) {
                    if (siguiente.getFin().isAfter(actual.getFin())) {
                        actual.setFin(siguiente.getFin());
                    }
                } else {
                    fusionados.add(actual);
                    actual = siguiente;
                }
            }
            fusionados.add(actual);
        }

        return fusionados.stream()
                .mapToDouble(inv -> Duration.between(inv.getInicio(), inv.getFin()).toMinutes() / 60.0)
                .sum();
    }

    /**
     * Calcula la cobertura real agrupada DÍA POR DÍA para un puesto específico.
     * Reutiliza el motor matemático computeUnionHours para evitar repetir código.
     */
    public Map<String, Map<LocalDate, Double>> computeUnionHoursByPuesto(Long puestoId, LocalDate inicio, LocalDate fin) {

        // 1. Buscamos los turnos con médico asignado
        List<TurnoEntity> turnos = turnoRepository.findByPuestoIdAndDateRange(puestoId, inicio, fin);
        List<TurnoEntity> turnosAsignados = turnos.stream()
                .filter(t -> t.getFuncionario() != null && t.getDiaInicioTurno() != null)
                .collect(Collectors.toList());

        // 2. Agrupamos automáticamente los turnos por su Día de Inicio
        Map<LocalDate, List<TurnoEntity>> turnosAgrupadosPorDia = turnosAsignados.stream()
                .collect(Collectors.groupingBy(TurnoEntity::getDiaInicioTurno));

        Map<LocalDate, Double> horasPorDia = new HashMap<>();

        // 3. Procesamos cada día delegando el cálculo al motor centralizado
        for (Map.Entry<LocalDate, List<TurnoEntity>> entry : turnosAgrupadosPorDia.entrySet()) {
            LocalDate dia = entry.getKey();
            List<TurnoEntity> turnosDelDia = entry.getValue();

            // ¡Llamamos a tu método privado en lugar de reescribir la lógica de intervalos!
            double totalHorasDia = computeUnionHours(turnosDelDia);

            horasPorDia.put(dia, totalHorasDia);
        }

        // 4. Armamos la respuesta para el frontend
        Map<String, Map<LocalDate, Double>> resultado = new HashMap<>();
        resultado.put(String.valueOf(puestoId), horasPorDia);

        return resultado;
    }

    /**
     * Calcula las horas reales de cobertura para
     * getCoberturaByServicio.
     */
    public Map<String, Object> getCoberturaRealByServicio(Long servicioId, LocalDate inicio, LocalDate fin) {
        // 1. Buscamos TODOS los turnos del servicio en el rango de fechas
        List<TurnoEntity> turnosDelServicio = turnoRepository.findByServicioIdAndDateRange(servicioId, inicio, fin);
        
        // 2. Filtramos solo los que tienen médico asignado
        List<TurnoEntity> turnosAsignados = turnosDelServicio.stream()
                .filter(t -> t.getFuncionario() != null)
                .collect(Collectors.toList());
                
        // 3. Calculamos las horas reales (evitando contar dobles si hay superposición)
        double horasReales = computeUnionHours(turnosAsignados);
        
        Map<String, Object> cobertura = new HashMap<>();
        cobertura.put("idServicio", servicioId);
        cobertura.put("horasRealesCubiertas", horasReales);
        
        return cobertura;
    }

    /**
     * Clase auxiliar privada (DTO) exclusiva para el cálculo de horas.
     */
    private static class Intervalo {
        private LocalDateTime inicio;
        private LocalDateTime fin;

        public Intervalo(LocalDateTime inicio, LocalDateTime fin) {
            this.inicio = inicio;
            this.fin = fin;
        }

        public LocalDateTime getInicio() { return inicio; }
        public LocalDateTime getFin() { return fin; }
        public void setFin(LocalDateTime fin) { this.fin = fin; }
    }
}