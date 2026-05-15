package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.Solicitud2Repository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import com.pingeso.HUAP.Repository.PisoRepository;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.time.DayOfWeek;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TurnoService {
    private static final Logger logger = LoggerFactory.getLogger(TurnoService.class);

    @Autowired
    private TurnoRepository turnoRepository;

    @Autowired
    private PisoRepository pisoRepository;

    @Autowired
    private FuncionarioRepository funcionarioRepository;

    @Autowired
    private com.pingeso.HUAP.Service.HolidayService holidayService;

    @Autowired
    private Solicitud2Repository solicitud2Repository;

    // ====================================================================
    // BLOQUE 1: REGLAS DE NEGOCIO DE TIEMPOS Y FERIADOS
    // ====================================================================

    // Umbral usado para considerar un día como cubierto tras redondeo a 2 decimales (22.9 horas)
    private static final double COVERED_THRESHOLD = 22.9;
    // Hora normal de inicio del "día" (08:00)
    private static final int DAY_START_HOUR = 8;
    // Hora de inicio para fines de semana o feriados (09:00)
    private static final int WEEKEND_START_HOUR = 9;

    /*
     * Devuelve la hora de inicio del día para una fecha dada (8 o 9 AM).
     */
    private int getDayStartHour(LocalDate date) {
        return isWeekendOrHoliday(date) ? WEEKEND_START_HOUR : DAY_START_HOUR;
    }

    /*
     * Verifica si la fecha dada es fin de semana o feriado utilizando el HolidayService.
     */
    private boolean isWeekendOrHoliday(LocalDate date) {
        if (date == null) return false;
        DayOfWeek dow = date.getDayOfWeek();
        return dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY || holidayService.isHoliday(date);
    }

    @Transactional
    public TurnoEntity updateTurno(Long id, TurnoEntity turnoActualizado) throws Exception {
        Optional<TurnoEntity> optTurno = turnoRepository.findById(id);
        if (optTurno.isEmpty()) {
            throw new Exception("No se encontró el turno con ID: " + id);
        }
        TurnoEntity turnoExistente = optTurno.get();
        
        turnoExistente.setNombre(turnoActualizado.getNombre());
        turnoExistente.setDiaInicioTurno(turnoActualizado.getDiaInicioTurno());
        turnoExistente.setDiaFinalTurno(turnoActualizado.getDiaFinalTurno());
        turnoExistente.setHoraInicio(turnoActualizado.getHoraInicio());
        turnoExistente.setHoraFin(turnoActualizado.getHoraFin());

        // 2. Relaciones (Piso, Servicio, Funcionario, Plantilla)
        turnoExistente.setFuncionario(turnoActualizado.getFuncionario());
        turnoExistente.setServicio(turnoActualizado.getServicio());
        turnoExistente.setPiso(turnoActualizado.getPiso());
        turnoExistente.setPlantilla(turnoActualizado.getPlantilla());

        return saveTurno(turnoExistente);
    }

    /*
     * Ajusta la hora de inicio para turnos en fines de semana y feriados.
     * Regla: Si el turno empieza en fin de semana/feriado (o es viernes nocturno) 
     * Y la hora está entre 07:30-08:30, se ajusta a 09:00.
     */
    private LocalTime ajustarHoraInicioParaFinDeSemanaOFeriado(LocalTime horaInicio, LocalDate fechaInicio, LocalDate fechaFin) {
        if (horaInicio == null || fechaInicio == null) return horaInicio;

        boolean inicioEsFinDeSemana = isWeekendOrHoliday(fechaInicio);
        boolean esViernesQueTerminaEnSabado = (fechaFin != null && 
                                               fechaInicio.getDayOfWeek() == DayOfWeek.FRIDAY && 
                                               isWeekendOrHoliday(fechaFin));

        if (inicioEsFinDeSemana || esViernesQueTerminaEnSabado) {
            LocalTime limiteInferior = LocalTime.of(7, 30);
            LocalTime limiteSuperior = LocalTime.of(8, 30);

            // Si está dentro del rango, empujamos el inicio a las 09:00
            if (!horaInicio.isBefore(limiteInferior) && !horaInicio.isAfter(limiteSuperior)) {
                return LocalTime.of(9, 0);
            }
        }
        return horaInicio;
    }

    /*
     * Ajusta la hora de fin según si el turno ENTRA o SALE de un fin de semana/feriado.
     * Mantiene los turnos ajustados a 23h, 24h o 25h según corresponda.
     */
    private LocalTime ajustarHoraFinParaDomingoOFeriado(LocalTime horaInicio, LocalTime horaFin, LocalDate fechaInicio, LocalDate fechaFin) {
        if (horaFin == null || fechaInicio == null || fechaFin == null) return horaFin;

        LocalTime limiteInferior = LocalTime.of(7, 0);
        LocalTime limiteSuperior = LocalTime.of(9, 30);

        // Si la hora de fin no está cerca de la mañana, no requiere ajuste
        if (horaFin.isBefore(limiteInferior) || horaFin.isAfter(limiteSuperior)) {
            return horaFin; 
        }

        boolean inicioEsFinDeSemana = isWeekendOrHoliday(fechaInicio);
        boolean finEsFinDeSemana = isWeekendOrHoliday(fechaFin);

        if (!inicioEsFinDeSemana && finEsFinDeSemana) {
            // ENTRANDO a fin de semana: Termina a las 08:59 (día siguiente empieza a las 09:00)
            return LocalTime.of(8, 59);
        } else if (inicioEsFinDeSemana && !finEsFinDeSemana) {
            // SALIENDO de fin de semana: Termina a las 07:59 (día siguiente empieza a las 08:00)
            return LocalTime.of(7, 59);
        } else if (finEsFinDeSemana) {
            // Fin de semana a fin de semana: Termina a las 08:59
            return LocalTime.of(8, 59);
        }

        // Normal: día de semana a día de semana
        return LocalTime.of(7, 59);
    }

    // ====================================================================
    // BLOQUE 2: CRUD BASE Y VALIDACIONES DE INTEGRIDAD
    // ====================================================================

    /**
     * Obtiene todos los turnos del sistema.
     */
    public List<TurnoEntity> getAllTurnos() {
        return turnoRepository.findAll();
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
        
        // 1. Validar conflictos de Puesto/Plantilla (evitar duplicar vacantes)
        if (turno.getPlantilla() != null && turno.getServicio() != null) {
            List<TurnoEntity> conflictosPlantilla = turnoRepository.findConflictsByPlantilla(
                    turno.getPlantilla().getIdPlantilla(),
                    turno.getServicio().getIdServicio(), 
                    turno.getDiaInicioTurno(), 
                    turno.getDiaFinalTurno());
            
            // Excluimos el turno actual (útil para cuando saveTurno se usa desde updateTurno)
            boolean hayConflicto = conflictosPlantilla.stream()
                    .anyMatch(t -> turno.getIdTurno() == null || !t.getIdTurno().equals(turno.getIdTurno()));
            
            if (hayConflicto) {
                throw new Exception("Conflicto: El puesto (Plantilla) ya tiene un turno generado en estas fechas para este servicio.");
            }
        }

        // 2. Validar conflictos de Funcionario (evitar que un médico esté en dos lugares a la vez)
        if (turno.getFuncionario() != null) {
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

        // 3. Aplicar ajustes de horas (Reglas matemáticas del Bloque 1)
        if (turno.getDiaInicioTurno() != null && turno.getHoraInicio() != null) {
            turno.setHoraInicio(ajustarHoraInicioParaFinDeSemanaOFeriado(
                    turno.getHoraInicio(), turno.getDiaInicioTurno(), turno.getDiaFinalTurno()));
        }

        if (turno.getDiaInicioTurno() != null && turno.getDiaFinalTurno() != null &&
            turno.getHoraInicio() != null && turno.getHoraFin() != null) {
            turno.setHoraFin(ajustarHoraFinParaDomingoOFeriado(
                    turno.getHoraInicio(), turno.getHoraFin(), 
                    turno.getDiaInicioTurno(), turno.getDiaFinalTurno()));
        }

        return turnoRepository.save(turno);
    }

    //Necesita revision
    /**
    @Transactional
    public void deleteTurno(Long id) throws Exception {
        turnoRepository.findById(id)
                .orElseThrow(() -> new Exception("No se encontró el turno a eliminar con ID: " + id));

        // 1. Limpiar join table: remover el turno de turnosAfectados en cada solicitud
        List<com.pingeso.HUAP.Entity.Solicitud2Entity> conTurnoAfectado =
                solicitud2Repository.findByTurnosAfectados_Id(id);
        for (com.pingeso.HUAP.Entity.Solicitud2Entity s : conTurnoAfectado) {
            s.getTurnosAfectados().removeIf(t -> t.getId().equals(id));
        }
        solicitud2Repository.saveAll(conTurnoAfectado);

        // 2. Eliminar solicitudes cuyo turno objetivo es este turno
        solicitud2Repository.deleteAll(solicitud2Repository.findAllByTurno_Id(id));

        // 3. Eliminar solicitudes de intercambio donde este turno era el ofrecido
        solicitud2Repository.deleteAll(solicitud2Repository.findAllByTurnoDeSolicitanteId(id));

        // 4. Eliminar el turno
        turnoRepository.deleteById(id);
    }
    **/

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
        m.put("nombre", t.getNombre());

        // --- 2. Fechas y Horas ---
        m.put("diaInicioTurno", t.getDiaInicioTurno() != null ? t.getDiaInicioTurno().toString() : null);
        m.put("diaFinalTurno", t.getDiaFinalTurno() != null ? t.getDiaFinalTurno().toString() : null);
        m.put("horaInicio", t.getHoraInicio() != null ? t.getHoraInicio().toString() : null);
        m.put("horaFin", t.getHoraFin() != null ? t.getHoraFin().toString() : null);

        // --- 3. Ubicación (Piso) ---
        if (t.getPiso() != null) {
            m.put("idPiso", t.getPiso().getIdPiso());
            m.put("nombrePiso", t.getPiso().getNombre());
        } else {
            m.put("idPiso", null);
            m.put("nombrePiso", "Sin Piso");
        }

        // --- 4. Médico Asignado ---
        if (t.getFuncionario() != null) {
            m.put("idMedico", t.getFuncionario().getIdFuncionario());
            m.put("nombreMedico", t.getFuncionario().getNombre() + " " + t.getFuncionario().getApelPat());
            m.put("rutMedico", t.getFuncionario().getRut());
        } else {
            m.put("idMedico", null);
            m.put("nombreMedico", "Sin Asignar");
            m.put("rutMedico", null);
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
     * Obtiene todos los turnos de un piso específico.
     */
    public List<Map<String, Object>> getTurnosByPiso(Long pisoId) {
        return turnoRepository.findByPiso_IdPiso(pisoId).stream()
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
     * Elimina todos los turnos dentro de un rango de fechas para un piso específico.
     * Reutiliza la lógica segura de deleteTurno() para no romper llaves foráneas.
     */
    //Necesita revision
    /**
    @Transactional
    public void deleteTurnosByRange(LocalDate fechaInicio, LocalDate fechaFin, Long pisoId) {
        List<TurnoEntity> turnosAEliminar = turnoRepository.findByPisoIdAndDateRange(pisoId, fechaInicio, fechaFin);
        
        for (TurnoEntity t : turnosAEliminar) {
            try {
                deleteTurno(t.getId()); 
            } catch (Exception e) {
                logger.error("Error al eliminar el turno masivo con ID: " + t.getId(), e);
            }
        }
    }
    **/

    /**
     * Obtiene los turnos "vacantes" (sin asignar) para un piso y rango de fechas.
     * Reutiliza nuestra poderosa función de mapeo del Bloque 3.
     */
    public List<Map<String, Object>> getTurnosParaAsignacion(Long pisoId, LocalDate inicio, LocalDate fin) {
        // 1. Buscamos todos los turnos del piso en esa fecha
        List<TurnoEntity> turnos = turnoRepository.findByPisoIdAndDateRange(pisoId, inicio, fin);

        // 2. Filtramos solo los que NO tienen funcionario y los convertimos a DTO
        return turnos.stream()
                .filter(t -> t.getFuncionario() == null)
                .map(this::convertirTurnoAMap)           
                .collect(Collectors.toList());
    }

    /**
     * Asignación Masiva Inteligente.
     * Busca todos los turnos vacantes generados a partir de una Plantilla (ej. "Volante 1")
     * en un servicio y rango de fechas, y le asigna el funcionario de una sola vez.
     * asignarMasivoPorRotativa
     */
    @Transactional
    public int asignarMasivoPorPlantilla(Long idFuncionario, Long idPlantilla, Long idServicio, LocalDate inicio, LocalDate fin) throws Exception {
        
        // 1. Validar que el funcionario existe
        Optional<com.pingeso.HUAP.Entity.FuncionarioEntity> optFuncionario = funcionarioRepository.findById(idFuncionario);
        if (optFuncionario.isEmpty()) {
            throw new Exception("El funcionario seleccionado no existe.");
        }
        com.pingeso.HUAP.Entity.FuncionarioEntity funcionario = optFuncionario.get();

        // 2. Buscar TODOS los turnos que pertenecen a esta plantilla en ese servicio y fechas
        // ¡Usamos el método que creamos en el Repositorio!
        List<TurnoEntity> turnosDeLaPlantilla = turnoRepository.findConflictsByPlantilla(idPlantilla, idServicio, inicio, fin);

        int turnosAsignados = 0;

        for (TurnoEntity turno : turnosDeLaPlantilla) {
            // 3. Validar que el turno esté vacante
            if (turno.getFuncionario() == null) {
                
                // 4. Validar que este funcionario no choque con OTRO turno que ya tenga asignado
                List<TurnoEntity> conflictosFunc = turnoRepository.findConflictosByFuncionario(
                        funcionario.getIdFuncionario(), turno.getDiaInicioTurno(), turno.getDiaFinalTurno());
                
                if (conflictosFunc.isEmpty()) {
                    turno.setFuncionario(funcionario);
                    turnoRepository.save(turno);
                    turnosAsignados++;
                } else {
                    logger.warn("Se omitió asignación masiva para el turno {} porque el funcionario {} tiene tope de horario.", 
                                turno.getIdTurno(), funcionario.getNombre());
                }
            }
        }
        
        return turnosAsignados; // Devuelve cuántos turnos logró asignar exitosamente
    }

    // ====================================================================
    // BLOQUE 5: MÉTRICAS, ESTADÍSTICAS Y COBERTURA (DASHBOARDS)
    // ====================================================================

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
     * Calcula las horas reales de cobertura para un Piso específico.
     * Solo toma en cuenta los turnos que YA tienen un funcionario asignado.
     * getCoveragePerPisoLastMonth, getCoveragePerPisoCurrentMonth, getCoveragePerPisoByMonth
     */
    public Map<String, Object> getCoberturaRealByPiso(Long pisoId, LocalDate inicio, LocalDate fin) {
        List<TurnoEntity> turnosDelPiso = turnoRepository.findByPisoIdAndDateRange(pisoId, inicio, fin);
        
        // Filtramos solo los turnos que tienen un médico/funcionario asignado
        List<TurnoEntity> turnosAsignados = turnosDelPiso.stream()
                .filter(t -> t.getFuncionario() != null)
                .collect(Collectors.toList());
                
        double horasReales = computeUnionHours(turnosAsignados);
        
        Map<String, Object> cobertura = new HashMap<>();
        cobertura.put("idPiso", pisoId);
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
     * Calcula la cobertura real agrupada DÍA POR DÍA para un piso específico.
     * Reutiliza el motor matemático computeUnionHours para evitar repetir código.
     */
    public Map<String, Map<LocalDate, Double>> computeUnionHoursByPiso(Long pisoId, LocalDate inicio, LocalDate fin) {
        
        // 1. Buscamos los turnos con médico asignado
        List<TurnoEntity> turnos = turnoRepository.findByPisoIdAndDateRange(pisoId, inicio, fin);
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
        resultado.put(String.valueOf(pisoId), horasPorDia);

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
     * Detecta turnos existentes que colisionan con un rango de fechas,
     * revisando tanto conflictos por funcionario como por plantilla.
     */
    public List<TurnoEntity> checkConflicts(LocalDate fechaInicio, LocalDate fechaFin,
                                             Long funcionarioId, Long plantillaId, Long servicioId) {
        List<TurnoEntity> conflictos = new ArrayList<>();

        if (funcionarioId != null) {
            conflictos.addAll(turnoRepository.findConflictosByFuncionario(funcionarioId, fechaInicio, fechaFin));
        }
        if (plantillaId != null && servicioId != null) {
            conflictos.addAll(turnoRepository.findConflictsByPlantilla(plantillaId, servicioId, fechaInicio, fechaFin));
        }

        return conflictos.stream().distinct().collect(Collectors.toList());
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