package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Entity.PisoEntity;
import com.pingeso.HUAP.Entity.VinculoTurnoRotativaEntity;
import com.pingeso.HUAP.Repository.TurnoRepository;
import com.pingeso.HUAP.Repository.PisoRepository;
import com.pingeso.HUAP.Repository.PersonalRepository;
import com.pingeso.HUAP.Repository.VinculoTurnoRotativaRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.DayOfWeek;
import java.time.temporal.ChronoUnit;
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
    private PersonalRepository personalRepository;

    @Autowired
    private com.pingeso.HUAP.Repository.SolicitudRepository solicitudRepository;

    @Autowired
    private VinculoTurnoRotativaRepository vinculoRepository;

    @Autowired
    private HolidayService holidayService;

    // ... (rest of autowired) ...

    // Umbral usado para considerar un día como cubierto tras redondeo a 2 decimales
    // Ajustado a 22.9 para considerar completos los días con turnos ajustados
    // (07:59, 08:59)
    // que intencionalmente tienen 1 minuto menos para evitar solapamiento
    private static final double COVERED_THRESHOLD = 22.9;
    // Hora de inicio del "día" para el cálculo de cobertura (8 = 08:00)
    private static final int DAY_START_HOUR = 8;

    /**
     * Devuelve la hora de inicio del día para una fecha dada:
     * - Si es sábado, domingo o festivo -> 09:00
     * - En otro caso -> 08:00
     *
     * Actualmente `isHoliday` está como stub y retorna false —
     * puedes implementar la lógica de festivos consultando una tabla o servicio.
     */
    private int getDayStartHour(LocalDate date) {
        DayOfWeek dow = date.getDayOfWeek();
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY || isHoliday(date)) {
            return 9;
        }
        return DAY_START_HOUR;
    }

    /**
     * Stub para detección de festivos. Por defecto devuelve false.
     * Puedes reemplazar esta implementación para leer desde BD u otro servicio.
     */
    private boolean isHoliday(LocalDate date) {
        // Usar el servicio de feriados que consume la API de Boostr
        return holidayService.isHoliday(date);
    }

    /**
     * Verifica si la fecha dada es fin de semana o feriado.
     */
    private boolean isWeekendOrHoliday(LocalDate date) {
        DayOfWeek dow = date.getDayOfWeek();
        return dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY || isHoliday(date);
    }

    /**
     * Ajusta la hora de inicio para turnos en fines de semana y feriados.
     * Regla: Si el turno empieza en fin de semana/feriado Y la hora está entre
     * 07:30-08:30,
     * se ajusta a 09:00 (la hora de inicio normal para esos días).
     * Aplica a CUALQUIER turno (8h, 12h, 24h, etc.)
     */
    private java.time.LocalTime ajustarHoraInicioParaFinDeSemanaOFeriado(java.time.LocalTime horaInicio,
            LocalDate fechaInicio, LocalDate fechaFin) {
        if (horaInicio == null || fechaInicio == null) {
            return horaInicio;
        }

        // Verificar si el día de inicio es fin de semana o feriado
        boolean inicioEsFinDeSemana = isWeekendOrHoliday(fechaInicio);

        // También verificar si es viernes y el turno termina en sábado (caso especial
        // de turno nocturno)
        boolean esViernesQueTerminaEnSabado = false;
        if (fechaFin != null && fechaInicio.getDayOfWeek() == DayOfWeek.FRIDAY) {
            esViernesQueTerminaEnSabado = isWeekendOrHoliday(fechaFin);
        }

        if (inicioEsFinDeSemana || esViernesQueTerminaEnSabado) {
            // Margen: si la hora está entre 07:30 y 08:30, ajustar a 09:00
            java.time.LocalTime limiteInferior = java.time.LocalTime.of(7, 30);
            java.time.LocalTime limiteSuperior = java.time.LocalTime.of(8, 30);

            if (!horaInicio.isBefore(limiteInferior) && !horaInicio.isAfter(limiteSuperior)) {
                return java.time.LocalTime.of(9, 0);
            }
        }

        return horaInicio;
    }

    /**
     * Ajusta la hora de fin según si el turno ENTRA o SALE de fin de
     * semana/feriado.
     * 
     * REGLAS:
     * 1. Turno que ENTRA a fin de semana/feriado → termina a las 08:59 (25h total)
     * Ejemplo: Viernes 20:00 → Sábado 08:59 (13h en lugar de 12h)
     * 
     * 2. Turno que SALE de fin de semana/feriado → termina a las 07:59 (23h total)
     * Ejemplo: Domingo 20:00 → Lunes 07:59 (12h en lugar de 13h)
     * 
     * 3. Turno normal (no cruza fin de semana) → no se ajusta
     * Ejemplo: Lunes 20:00 → Martes 08:00 (sin cambios)
     */
    private java.time.LocalTime ajustarHoraFinParaDomingoOFeriado(java.time.LocalTime horaInicio,
            java.time.LocalTime horaFin, LocalDate fechaInicio, LocalDate fechaFin) {
        if (horaFin == null || fechaInicio == null || fechaFin == null) {
            return horaFin;
        }

        // Rango amplio para detectar turnos que terminan "cerca" de la hora de inicio
        // del día
        // De 07:00 a 09:30 (cubre 08:00 normal y 09:00 fin de semana con margen)
        java.time.LocalTime limiteInferior = java.time.LocalTime.of(7, 0);
        java.time.LocalTime limiteSuperior = java.time.LocalTime.of(9, 30);

        // Solo ajustar si la hora de fin está en el rango de horas de inicio
        if (horaFin.isBefore(limiteInferior) || horaFin.isAfter(limiteSuperior)) {
            return horaFin; // Fuera del rango, no ajustar
        }

        // Verificar si estamos ENTRANDO o SALIENDO de fin de semana/feriado
        boolean inicioEsFinDeSemana = isWeekendOrHoliday(fechaInicio);
        boolean finEsFinDeSemana = isWeekendOrHoliday(fechaFin);

        if (!inicioEsFinDeSemana && finEsFinDeSemana) {
            // ENTRANDO a fin de semana: Termina a las 08:59 (día siguiente empieza a las
            // 09:00)
            return java.time.LocalTime.of(8, 59);
        } else if (inicioEsFinDeSemana && !finEsFinDeSemana) {
            // SALIENDO de fin de semana: Termina a las 07:59 (día siguiente empieza a las
            // 08:00)
            return java.time.LocalTime.of(7, 59);
        } else if (finEsFinDeSemana) {
            // Fin de semana a fin de semana (ej: Sábado→Domingo): Termina a las 08:59
            return java.time.LocalTime.of(8, 59);
        }

        // Normal: día de semana a día de semana → 07:59
        return java.time.LocalTime.of(7, 59);
    }

    public List<TurnoEntity> getAllTurnos() {
        return turnoRepository.findAll();
    }

    public TurnoEntity getTurnoById(Long id) {
        return turnoRepository.findById(id).orElse(null);
    }

    public TurnoEntity saveTurno(TurnoEntity turno) {
        // Aplicar ajuste de hora de inicio para fines de semana y feriados
        if (turno.getDiaInicioTurno() != null && turno.getHoraInicio() != null) {
            java.time.LocalTime horaAjustada = ajustarHoraInicioParaFinDeSemanaOFeriado(
                    turno.getHoraInicio(),
                    turno.getDiaInicioTurno(),
                    turno.getDiaFinalTurno() // Pasar también el día final
            );
            turno.setHoraInicio(horaAjustada);
        }

        // Aplicar ajuste de hora de fin para mantener turnos de 24h
        // IMPORTANTE: Usar la hora de inicio YA AJUSTADA
        if (turno.getDiaInicioTurno() != null && turno.getDiaFinalTurno() != null &&
                turno.getHoraInicio() != null && turno.getHoraFin() != null) {
            java.time.LocalTime horaFinAjustada = ajustarHoraFinParaDomingoOFeriado(
                    turno.getHoraInicio(), // Ya está ajustada (ej: 09:00)
                    turno.getHoraFin(),
                    turno.getDiaInicioTurno(),
                    turno.getDiaFinalTurno());
            turno.setHoraFin(horaFinAjustada);
        }

        return turnoRepository.save(turno);
    }

    @Transactional
    public boolean deleteTurno(Long id) {
        try {
            // Eliminar solicitudes vinculadas a este turno (como turno objetivo)
            List<com.pingeso.HUAP.Entity.SolicitudEntity> solicitudesDestino = solicitudRepository.findAllByTurno_Id(id);
            if(solicitudesDestino != null && !solicitudesDestino.isEmpty()) {
                solicitudRepository.deleteAll(solicitudesDestino);
            }
            
            // Eliminar solicitudes donde este turno es el del solicitante (intercambios/cesiones)
            List<com.pingeso.HUAP.Entity.SolicitudEntity> solicitudesOrigen = solicitudRepository.findAllByTurnoDeSolicitanteId(id);
            if(solicitudesOrigen != null && !solicitudesOrigen.isEmpty()) {
                solicitudRepository.deleteAll(solicitudesOrigen);
            }
            
            turnoRepository.deleteById(id);
            return true;
        } catch (Exception e) {
            logger.error("Error al eliminar turno id={}: {}", id, e.getMessage());
            return false;
        }
    }

    // --- DETECCIÓN Y MANEJO DE CONFLICTOS ---

    public List<TurnoEntity> checkConflicts(LocalDate fechaInicio, LocalDate fechaFin, List<String> pisosIds) {
        return turnoRepository.findByDiaInicioTurnoBetweenAndIdPisoIn(fechaInicio, fechaFin, pisosIds);
    }

    @Transactional
    public void deleteTurnosByRange(LocalDate fechaInicio, LocalDate fechaFin, List<String> pisosIds) {
        List<TurnoEntity> conflictingTurnos = turnoRepository.findByDiaInicioTurnoBetweenAndIdPisoIn(fechaInicio, fechaFin, pisosIds);
        
        for (TurnoEntity t : conflictingTurnos) {
            deleteTurno(t.getId()); // Reutiliza la lógica segura de eliminación (solicitudes, etc.)
        }
    }

    // --- (NUEVO) Obtener DTO optimizado para AsignadorTurnos ---
    public List<Map<String, Object>> getTurnosParaAsignacion(String idPiso, LocalDate inicio, LocalDate fin) {
        // 1. Obtener solo los turnos del piso y rango (Filtrado en DB)
        List<TurnoEntity> turnos = turnoRepository.findByPisoIdAndDateRange(idPiso, inicio, fin);

        if (turnos.isEmpty()) {
            return new ArrayList<>();
        }

        // 2. Obtener los IDs de estos turnos
        List<Long> turnoIds = turnos.stream().map(TurnoEntity::getId).toList();

        // 3. Obtener todos los vínculos (satélite) de un solo golpe (Batch)
        List<VinculoTurnoRotativaEntity> vinculos = vinculoRepository.findByIdTurnoIn(turnoIds);

        // Mapa rápido para buscar rotativa por idTurno: Map<IdTurno, IdRotativa>
        Map<Long, Long> mapaRotativas = new HashMap<>();
        for (VinculoTurnoRotativaEntity v : vinculos) {
            mapaRotativas.put(v.getIdTurno(), v.getIdTipoTurno());
        }

        // 4. Construir el DTO final
        List<Map<String, Object>> salida = new ArrayList<>();

        // Cache de nombres de médicos para no consultar repetidamente
        Map<Long, String> cacheMedicos = new HashMap<>();

        for (TurnoEntity t : turnos) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", t.getId());
            m.put("nombre", t.getNombre());

            // Inyectar ID de Rotativa (Sidecar)
            m.put("idTipoTurnoRef", mapaRotativas.get(t.getId())); // null si no tiene
            m.put("tipoTurno", t.getTipoTurno()); // Nombre legacy

            m.put("diaInicioTurno", t.getDiaInicioTurno().toString());
            m.put("horaInicio", t.getHoraInicio().toString());
            m.put("horaFin", t.getHoraFin().toString());
            m.put("idPiso", t.getIdPiso());
            m.put("idMedico", t.getIdMedico());
            m.put("estado", t.getEstado());

            // Resolver nombre médico (con caché simple local)
            if (t.getIdMedico() != null) {
                if (!cacheMedicos.containsKey(t.getIdMedico())) {
                    personalRepository.findById(t.getIdMedico()).ifPresent(
                            p -> cacheMedicos.put(t.getIdMedico(), p.getNombre() + " " + p.getApellidoPaterno()));
                }
                m.put("medicoNombre", cacheMedicos.get(t.getIdMedico()));
            }

            salida.add(m);
        }

        return salida;
    }

    public List<TurnoEntity> getTurnosByMedico(Long idMedico) {
        return turnoRepository.findByIdMedico(idMedico);
    }

    public List<TurnoEntity> getTurnosByMedicoAndMonthAndYear(Long idMedico, int year, int month) {
        LocalDate today = LocalDate.now();
        return turnoRepository.findByMedicoAndMonthAndYearAndPast(idMedico, year, month, today);
    }

    public List<Map<String, Object>> getTurnosFuturos(Long idMedico) {
        LocalDate hoy = LocalDate.now();
        return turnoRepository.findByIdMedico(idMedico).stream()
                .filter(turno -> turno.getDiaInicioTurno().isAfter(hoy) || turno.getDiaInicioTurno().isEqual(hoy))
                .sorted((t1, t2) -> t1.getDiaInicioTurno().compareTo(t2.getDiaInicioTurno()))
                .map(this::convertirTurnoAMap)
                .collect(Collectors.toList());
    }

    private Map<String, Object> convertirTurnoAMap(TurnoEntity t) {
        Map<String, Object> m = new HashMap<>();

        m.put("id", t.getId());
        m.put("nombre", t.getNombre());
        m.put("diaSemana", t.getDiaSemana());
        m.put("horaInicio", t.getHoraInicio() != null ? t.getHoraInicio().toString() : null);
        m.put("horaFin", t.getHoraFin() != null ? t.getHoraFin().toString() : null);
        m.put("diaInicioTurno", t.getDiaInicioTurno() != null ? t.getDiaInicioTurno().toString() : null);
        m.put("diaFinalTurno", t.getDiaFinalTurno() != null ? t.getDiaFinalTurno().toString() : null);
        m.put("tipoTurno", t.getTipoTurno());
        m.put("estado", t.getEstado());
        m.put("tipoDeTurnoCantidad", t.getTipoDeTurnoCantidad());
        m.put("idMedico", t.getIdMedico());
        m.put("idCreador", t.getCreador() != null ? t.getCreador().getIdPersonal() : null);
        m.put("idAsignador", t.getAsignador() != null ? t.getAsignador().getIdPersonal() : null);

        // --- Lógica de corrección de Piso ---
        String idPisoRaw = t.getIdPiso();
        String pisoNombre = idPisoRaw;
        Long pisoIdReal = null;

        if (idPisoRaw != null) {
            try {
                pisoIdReal = Long.parseLong(idPisoRaw.trim());
                Optional<PisoEntity> opt = pisoRepository.findById(pisoIdReal);
                if (opt.isPresent())
                    pisoNombre = opt.get().getNombre();
            } catch (NumberFormatException nfe) {
                Optional<PisoEntity> opt2 = pisoRepository.findByNombre(idPisoRaw);
                if (opt2.isPresent()) {
                    pisoNombre = opt2.get().getNombre();
                    pisoIdReal = opt2.get().getId();
                }
            }
        }

        m.put("idPiso", pisoIdReal != null ? pisoIdReal : idPisoRaw);
        m.put("nombrePiso", pisoNombre);
        m.put("Seccion", pisoNombre); // Clave para el frontend
        m.put("piso", pisoNombre); // Campo adicional para compatibilidad con el frontend
        // ------------------------------------

        if (t.getIdMedico() != null) {
            try {
                Optional<com.pingeso.HUAP.Entity.PersonalEntity> pOpt = personalRepository.findById(t.getIdMedico());
                if (pOpt.isPresent()) {
                    com.pingeso.HUAP.Entity.PersonalEntity p = pOpt.get();
                    Map<String, Object> personalInfo = new HashMap<>();
                    personalInfo.put("nombre", p.getNombre());
                    personalInfo.put("apellidoPaterno", p.getApellidoPaterno());
                    personalInfo.put("apellidoMaterno", p.getApellidoMaterno());
                    m.put("personalEntity", personalInfo);
                }
            } catch (Exception e) {
                /* Ignorar error leve de médico */ }
        }

        return m;
    }

    public List<TurnoEntity> getTurnosByPiso(String idPiso) {
        return turnoRepository.findByIdPiso(idPiso);
    }

    public List<TurnoEntity> getTurnosByEstado(String estado) {
        return turnoRepository.findByEstado(estado);
    }

    public List<TurnoEntity> getTurnosByTipo(String tipoTurno) {
        return turnoRepository.findByTipoTurno(tipoTurno);
    }

    public List<TurnoEntity> getTurnosByTipoDeTurnoCantidad(String tipoDeTurnoCantidad) {
        return turnoRepository.findByTipoDeTurnoCantidad(tipoDeTurnoCantidad);
    }

    public TurnoEntity updateTurno(Long id, TurnoEntity turnoActualizado) {
        Optional<TurnoEntity> turnoExistente = turnoRepository.findById(id);
        if (turnoExistente.isPresent()) {
            TurnoEntity turno = turnoExistente.get();
            turno.setNombre(turnoActualizado.getNombre());
            turno.setCreador(turnoActualizado.getCreador());
            turno.setAsignador(turnoActualizado.getAsignador());
            turno.setIdMedico(turnoActualizado.getIdMedico());
            turno.setIdPiso(turnoActualizado.getIdPiso());
            turno.setDiaSemana(turnoActualizado.getDiaSemana());
            turno.setHoraInicio(turnoActualizado.getHoraInicio());
            turno.setHoraFin(turnoActualizado.getHoraFin());
            turno.setDiaInicioTurno(turnoActualizado.getDiaInicioTurno());
            turno.setDiaFinalTurno(turnoActualizado.getDiaFinalTurno());
            turno.setTipoTurno(turnoActualizado.getTipoTurno());
            turno.setEstado(turnoActualizado.getEstado());
            turno.setTipoDeTurnoCantidad(turnoActualizado.getTipoDeTurnoCantidad());

            return turnoRepository.save(turno);
        }
        return null;
    }

    // Nuevos métodos para servicio

    // --- NUEVO MÉTODO: Asignación Masiva usando Tabla Satélite ---
    @Transactional
    public int asignarMasivoPorRotativa(Long idMedico, Long idTipoTurnoRef, Long idPiso, String fechaInicioStr,
            String fechaFinStr) {
        LocalDate inicio = LocalDate.parse(fechaInicioStr);
        LocalDate fin = LocalDate.parse(fechaFinStr);

        // 1. Obtener los IDs de turnos que pertenecen a esta rotativa desde la tabla
        // satélite
        List<VinculoTurnoRotativaEntity> vinculos = vinculoRepository.findByIdTipoTurno(idTipoTurnoRef);

        Set<Long> idsTurnosDeRotativa = vinculos.stream()
                .map(VinculoTurnoRotativaEntity::getIdTurno)
                .collect(Collectors.toSet());

        if (idsTurnosDeRotativa.isEmpty()) {
            return 0;
        }

        // 2. Buscar turnos reales en el rango de fechas y servicio
        // CORRECCIÓN: Convertimos el Integer del servicio a Long
        Integer servicioIdInt = pisoRepository.findById(idPiso).get().getServicio().getIdServicio();
        Long servicioId = Long.valueOf(servicioIdInt);

        List<TurnoEntity> turnosCandidatos = turnoRepository.findByServicioIdAndDateRange(servicioId, inicio, fin);

        int count = 0;
        for (TurnoEntity t : turnosCandidatos) {
            // 3. Validar condiciones:
            boolean isMismoPiso = t.getIdPiso() != null && t.getIdPiso().equals(String.valueOf(idPiso));
            boolean perteneceARotativa = idsTurnosDeRotativa.contains(t.getId());

            if (isMismoPiso && perteneceARotativa) {
                t.setIdMedico(idMedico);
                t.setEstado(idMedico != null ? "ASIGNADO" : "PENDIENTE");
                turnoRepository.save(t);
                count++;
            }
        }
        return count;
    }

    public List<TurnoEntity> getTurnosByServicio(Long servicioId) {
        if (servicioId == null)
            return getAllTurnos();
        return turnoRepository.findAllByServicioId(servicioId);
    }

    public List<TurnoEntity> getTurnosByServicioAndDateRange(Long servicioId, LocalDate fechaInicio,
            LocalDate fechaFin) {
        if (servicioId == null)
            return java.util.Collections.emptyList();
        return turnoRepository.findByServicioIdAndDateRange(servicioId, fechaInicio, fechaFin);
    }

    // Método optimizado para calendario usando stored procedure
    // Método optimizado para calendario usando stored procedure
    // Versión 100% Java - Sin Stored Procedures rotos
    public List<Map<String, Object>> getTurnosCalendario(Long servicioId, LocalDate fechaInicio, LocalDate fechaFin) {
        if (servicioId == null)
            return new ArrayList<>();

        List<TurnoEntity> rawTurnos = turnoRepository.findByServicioIdAndDateRange(servicioId, fechaInicio, fechaFin);
        List<Map<String, Object>> salida = new ArrayList<>();

        for (TurnoEntity t : rawTurnos) {
            Map<String, Object> m = new HashMap<>();

            m.put("id", t.getId());
            m.put("nombre", t.getNombre());
            m.put("diaSemana", t.getDiaSemana());
            m.put("horaInicio", t.getHoraInicio() != null ? t.getHoraInicio().toString() : null);
            m.put("horaFin", t.getHoraFin() != null ? t.getHoraFin().toString() : null);
            m.put("diaInicioTurno", t.getDiaInicioTurno() != null ? t.getDiaInicioTurno().toString() : null);
            m.put("diaFinalTurno", t.getDiaFinalTurno() != null ? t.getDiaFinalTurno().toString() : null);
            m.put("tipoTurno", t.getTipoTurno());
            m.put("estado", t.getEstado());
            m.put("tipoDeTurnoCantidad", t.getTipoDeTurnoCantidad());
            m.put("idMedico", t.getIdMedico());
            m.put("idCreador", t.getCreador() != null ? t.getCreador().getIdPersonal() : null);
            m.put("idAsignador", t.getAsignador() != null ? t.getAsignador().getIdPersonal() : null);

            // --- Lógica de corrección de Piso ---
            String idPisoRaw = t.getIdPiso();
            String pisoNombre = idPisoRaw;
            Long pisoIdReal = null;

            if (idPisoRaw != null) {
                try {
                    pisoIdReal = Long.parseLong(idPisoRaw.trim());
                    Optional<PisoEntity> opt = pisoRepository.findById(pisoIdReal);
                    if (opt.isPresent())
                        pisoNombre = opt.get().getNombre();
                } catch (NumberFormatException nfe) {
                    Optional<PisoEntity> opt2 = pisoRepository.findByNombre(idPisoRaw);
                    if (opt2.isPresent()) {
                        pisoNombre = opt2.get().getNombre();
                        pisoIdReal = opt2.get().getId();
                    }
                }
            }

            m.put("idPiso", pisoIdReal != null ? pisoIdReal : idPisoRaw);
            m.put("nombrePiso", pisoNombre);
            m.put("Seccion", pisoNombre); // Clave para el frontend
            // ------------------------------------

            if (t.getIdMedico() != null) {
                try {
                    Optional<com.pingeso.HUAP.Entity.PersonalEntity> pOpt = personalRepository
                            .findById(t.getIdMedico());
                    if (pOpt.isPresent()) {
                        com.pingeso.HUAP.Entity.PersonalEntity p = pOpt.get();
                        Map<String, Object> personalInfo = new HashMap<>();
                        personalInfo.put("nombre", p.getNombre());
                        personalInfo.put("apellidoPaterno", p.getApellidoPaterno());
                        personalInfo.put("apellidoMaterno", p.getApellidoMaterno());
                        m.put("personalEntity", personalInfo);
                    }
                } catch (Exception e) {
                    /* Ignorar error leve de médico */ }
            }
            salida.add(m);
        }
        return salida;
    }

    public List<TurnoEntity> getUnassignedTurnosByServicio(Long servicioId) {
        if (servicioId == null)
            return java.util.Collections.emptyList();
        return turnoRepository.findUnassignedTurnosByServicio(servicioId);
    }

    public Map<String, Object> getTurnosStatsByServicio(Long servicioId) {
        Map<String, Object> stats = new HashMap<>();
        try {
            if (servicioId == null) {
                stats.put("error", "servicioId es requerido");
                return stats;
            }

            List<TurnoEntity> todosTurnos = getTurnosByServicio(servicioId);
            long total = todosTurnos.size();
            long asignados = todosTurnos.stream().filter(t -> t.getIdMedico() != null).count();
            long sinAsignar = total - asignados;

            double porcentajeAsignado = total > 0 ? (asignados * 100.0 / total) : 0.0;

            stats.put("total", total);
            stats.put("asignados", asignados);
            stats.put("sinAsignar", sinAsignar);
            stats.put("porcentajeAsignado", Math.round(porcentajeAsignado * 10) / 10.0);

            // Agrupar por piso
            Map<String, Map<String, Long>> porPiso = new HashMap<>();
            for (TurnoEntity t : todosTurnos) {
                String piso = t.getIdPiso() != null ? t.getIdPiso() : "Sin piso";
                porPiso.putIfAbsent(piso, new HashMap<>());
                Map<String, Long> pisoCounts = porPiso.get(piso);
                pisoCounts.put("total", pisoCounts.getOrDefault("total", 0L) + 1);
                if (t.getIdMedico() != null) {
                    pisoCounts.put("asignados", pisoCounts.getOrDefault("asignados", 0L) + 1);
                }
            }
            stats.put("porPiso", porPiso);

        } catch (Exception e) {
            logger.error("Error al obtener estadísticas de turnos para servicioId={}: {}", servicioId, e.getMessage(),
                    e);
            stats.put("error", e.getMessage());
        }
        return stats;
    }

    public Map<String, Object> getCoberturaByServicio(Long servicioId, LocalDate fechaInicio, LocalDate fechaFin) {
        Map<String, Object> result = new HashMap<>();
        try {
            if (servicioId == null) {
                result.put("error", "servicioId es requerido");
                return result;
            }

            // Si no se proporcionan fechas, usar mes actual
            if (fechaInicio == null) {
                fechaInicio = LocalDate.now().withDayOfMonth(1);
            }
            if (fechaFin == null) {
                fechaFin = fechaInicio.plusMonths(1).minusDays(1);
            }

            List<TurnoEntity> turnos = turnoRepository.findByServicioIdAndDateRange(servicioId, fechaInicio, fechaFin);

            // Obtener lista de pisos del servicio para garantizar que evaluamos TODOS los
            // pisos
            java.util.List<PisoEntity> pisosDelServicio = new java.util.ArrayList<>();
            try {
                pisosDelServicio = pisoRepository.findAll().stream()
                        .filter(p -> p.getServicio() != null
                                && p.getServicio().getIdServicio() == servicioId.intValue())
                        .toList();
            } catch (Exception ex) {
                logger.warn("No se pudo listar pisos del servicio en getCoberturaByServicio: {}", ex.getMessage());
            }

            // Reusar helper que calcula la unión de intervalos por piso y día
            Map<String, Map<LocalDate, Double>> horasPorPiso = computeUnionHoursByPiso(turnos, fechaInicio, fechaFin);

            Map<String, Map<String, Object>> coberturaPorDia = new HashMap<>();

            // Construir por cada día del rango la información por piso
            LocalDate cursor = fechaInicio;
            while (!cursor.isAfter(fechaFin)) {
                String diaKey = cursor.toString();
                Map<String, Object> diaInfo = new HashMap<>();
                Map<String, Map<String, Object>> porPisoInfo = new HashMap<>();

                // Si no tenemos pisos definidos, usar los pisos detectados en los turnos
                java.util.List<String> pisosKeys = new java.util.ArrayList<>();
                if (pisosDelServicio != null && !pisosDelServicio.isEmpty()) {
                    for (PisoEntity p : pisosDelServicio)
                        pisosKeys.add(String.valueOf(p.getId()));
                } else {
                    pisosKeys.addAll(horasPorPiso.keySet());
                }

                boolean allPisosCovered = true;
                double totalHorasSum = 0.0;

                for (String pisoKey : pisosKeys) {
                    Map<LocalDate, Double> horasPorDia = horasPorPiso.getOrDefault(pisoKey,
                            java.util.Collections.emptyMap());
                    double horas = horasPorDia.getOrDefault(cursor, 0.0);
                    double rounded = round2(horas);
                    boolean pisoCovered = rounded >= COVERED_THRESHOLD;

                    // Intentar resolver nombre del piso si está disponible
                    String nombrePiso = pisoKey;
                    try {
                        Long pisoIdLong = Long.parseLong(pisoKey);
                        java.util.Optional<PisoEntity> pe = pisoRepository.findById(pisoIdLong);
                        if (pe.isPresent())
                            nombrePiso = pe.get().getNombre();
                    } catch (NumberFormatException nfe) {
                        try {
                            java.util.Optional<PisoEntity> pe2 = pisoRepository.findByNombre(pisoKey);
                            if (pe2.isPresent())
                                nombrePiso = pe2.get().getNombre();
                        } catch (Exception inner) {
                            /* ignore */ }
                    } catch (Exception ex) {
                        /* ignore */ }

                    Map<String, Object> pisoStats = new HashMap<>();
                    pisoStats.put("horas", rounded);
                    pisoStats.put("isCovered", pisoCovered);
                    pisoStats.put("nombre", nombrePiso);
                    porPisoInfo.put(pisoKey, pisoStats);

                    if (!pisoCovered)
                        allPisosCovered = false;
                    totalHorasSum += rounded;
                }

                double displayTotal = allPisosCovered ? 24.0 : round2(totalHorasSum);
                diaInfo.put("totalHoras", displayTotal);
                diaInfo.put("isCovered", allPisosCovered);
                diaInfo.put("porPiso", porPisoInfo);

                coberturaPorDia.put(diaKey, diaInfo);
                cursor = cursor.plusDays(1);
            }
            result.put("fechaInicio", fechaInicio.toString());
            result.put("fechaFin", fechaFin.toString());
            result.put("cobertura", coberturaPorDia);
            result.put("totalDias", coberturaPorDia.size());

        } catch (Exception e) {
            logger.error("Error al obtener cobertura para servicioId={}: {}", servicioId, e.getMessage(), e);
            result.put("error", e.getMessage());
        }
        return result;
    }

    /**
     * Devuelve la lista de turnos para un servicio, pero reemplazando el campo
     * idPiso
     * por el nombre del piso si es posible. Esto facilita al frontend mostrar el
     * nombre
     * legible en lugar de un identificador.
     */
    // --- MÉTODO CORREGIDO: Usando Tabla Satélite ---
    public List<Map<String, Object>> getTurnosByServicioWithPisoNombre(Long servicioId) {
        List<TurnoEntity> turnos = getTurnosByServicio(servicioId);
        List<Map<String, Object>> salida = new ArrayList<>();

        for (TurnoEntity t : turnos) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", t.getId());
            m.put("nombre", t.getNombre());

            // --- BÚSQUEDA EN TABLA SATÉLITE ---
            // Consultamos si este turno tiene un vínculo
            VinculoTurnoRotativaEntity vinculo = vinculoRepository.findByIdTurno(t.getId());
            if (vinculo != null) {
                m.put("idTipoTurnoRef", vinculo.getIdTipoTurno());
            } else {
                m.put("idTipoTurnoRef", null);
            }
            // ----------------------------------

            // Resolver nombre médico
            String medicoNombre = null;
            try {
                Long idMed = t.getIdMedico();
                if (idMed != null) {
                    Optional<com.pingeso.HUAP.Entity.PersonalEntity> pOpt = personalRepository.findById(idMed);
                    if (pOpt.isPresent()) {
                        com.pingeso.HUAP.Entity.PersonalEntity p = pOpt.get();
                        StringBuilder sb = new StringBuilder();
                        if (p.getNombre() != null)
                            sb.append(p.getNombre());
                        if (p.getApellidoPaterno() != null) {
                            if (sb.length() > 0)
                                sb.append(' ');
                            sb.append(p.getApellidoPaterno());
                        }
                        medicoNombre = sb.toString();
                    }
                }
            } catch (Exception ex) {
            }
            m.put("medicoNombre", medicoNombre);

            // Resolver nombre piso
            String idPisoRaw = t.getIdPiso();
            String pisoNombre = idPisoRaw;
            if (idPisoRaw != null) {
                try {
                    Long pisoId = Long.parseLong(idPisoRaw.trim());
                    Optional<PisoEntity> opt = pisoRepository.findById(pisoId);
                    if (opt.isPresent()) {
                        pisoNombre = opt.get().getNombre();
                    }
                } catch (NumberFormatException nfe) {
                    Optional<PisoEntity> opt2 = pisoRepository.findByNombre(idPisoRaw);
                    if (opt2.isPresent())
                        pisoNombre = opt2.get().getNombre();
                }
            }
            m.put("idPiso", pisoNombre);

            m.put("diaSemana", t.getDiaSemana());
            m.put("horaInicio", t.getHoraInicio() != null ? t.getHoraInicio().toString() : null);
            m.put("horaFin", t.getHoraFin() != null ? t.getHoraFin().toString() : null);
            m.put("diaInicioTurno", t.getDiaInicioTurno() != null ? t.getDiaInicioTurno().toString() : null);
            m.put("diaFinalTurno", t.getDiaFinalTurno() != null ? t.getDiaFinalTurno().toString() : null);
            m.put("tipoTurno", t.getTipoTurno());
            m.put("estado", t.getEstado());
            m.put("idMedico", t.getIdMedico());

            salida.add(m);
        }

        return salida;
    }

    /**
     * Calcula la cobertura por piso para el mes anterior al momento de la petición.
     * Devuelve un mapa con clave "porPiso" cuyo valor es otro mapa { piso -> {
     * total, asignados, porcentaje } }
     */
    public Map<String, Object> getCoveragePerPisoLastMonth(Long servicioId) {
        Map<String, Object> result = new HashMap<>();
        try {
            if (servicioId == null) {
                result.put("error", "servicioId es requerido");
                return result;
            }

            // calcular rango: primer día del mes anterior hasta el último día del mes
            // anterior
            LocalDate today = LocalDate.now();
            LocalDate firstDayThisMonth = today.withDayOfMonth(1);
            LocalDate firstDayPrevMonth = firstDayThisMonth.minusMonths(1).withDayOfMonth(1);
            // el último día del mes anterior es el día anterior al primer día de este mes
            LocalDate lastDay = firstDayThisMonth.minusDays(1);

            List<TurnoEntity> turnos = turnoRepository.findByServicioIdAndDateRange(servicioId, firstDayPrevMonth,
                    lastDay);

            // número de días en el periodo (incluye ambos extremos)
            long periodDays = ChronoUnit.DAYS.between(firstDayPrevMonth, lastDay) + 1;

            // Agrupar horas por día por piso usando la unión de intervalos (evita doble
            // conteo)
            Map<String, Map<LocalDate, Double>> horasPorDiaPorPiso = computeUnionHoursByPiso(turnos, firstDayPrevMonth,
                    lastDay);

            Map<String, Map<String, Object>> porPiso = new HashMap<>();
            for (Map.Entry<String, Map<LocalDate, Double>> e : horasPorDiaPorPiso.entrySet()) {
                String piso = e.getKey();
                Map<LocalDate, Double> horasPorDia = e.getValue();
                long asignados = horasPorDia.values().stream().filter(h -> round2(h) >= COVERED_THRESHOLD).count();
                // Usar el número de días del mes como total (denominador constante)
                long totalDiasMes = periodDays;
                double porcentaje = periodDays > 0 ? Math.round((asignados * 100.0 / periodDays) * 10) / 10.0 : 0.0;
                Map<String, Object> stats = new HashMap<>();
                stats.put("total", totalDiasMes);
                stats.put("asignados", asignados);
                stats.put("porcentaje", porcentaje);

                // Intentar resolver nombre y color del piso desde la entidad Piso
                try {
                    // Primero intentar interpretar la clave como ID numérico
                    String nombrePiso = null;
                    String colorHex = null;
                    try {
                        Long pisoIdLong = Long.parseLong(piso);
                        java.util.Optional<PisoEntity> pe = pisoRepository.findById(pisoIdLong);
                        if (pe.isPresent()) {
                            nombrePiso = pe.get().getNombre();
                            colorHex = pe.get().getColorHexa();
                        }
                    } catch (NumberFormatException ex) {
                        // no es un id numérico, intentar buscar por nombre
                        java.util.Optional<PisoEntity> pe2 = pisoRepository.findByNombre(piso);
                        if (pe2.isPresent()) {
                            nombrePiso = pe2.get().getNombre();
                            colorHex = pe2.get().getColorHexa();
                        }
                    }

                    if (nombrePiso != null) {
                        stats.put("nombre", nombrePiso);
                    } else {
                        // dejar el valor original como nombre si no se resolvió
                        stats.put("nombre", piso);
                    }
                    if (colorHex != null)
                        stats.put("colorHexa", colorHex);
                } catch (Exception ex) {
                    // no interrumpir el cálculo si falla la resolución de pisos
                    stats.put("nombre", piso);
                }

                porPiso.put(piso, stats);
            }

            // Asegurar que se incluyan todos los pisos definidos para el servicio (aunque
            // no tengan turnos en el mes)
            try {
                List<PisoEntity> pisosDelServicio = pisoRepository.findAll().stream()
                        .filter(p -> p.getServicio() != null
                                && p.getServicio().getIdServicio() == servicioId.intValue())
                        .toList();

                for (PisoEntity p : pisosDelServicio) {
                    String key = String.valueOf(p.getId());
                    if (!porPiso.containsKey(key)) {
                        Map<String, Object> stats = new HashMap<>();
                        // si no hay actividad, total es la cantidad de días del periodo
                        long totalDiasMes = ChronoUnit.DAYS.between(firstDayPrevMonth, lastDay) + 1;
                        stats.put("total", totalDiasMes);
                        stats.put("asignados", 0L);
                        stats.put("porcentaje", 0.0);
                        stats.put("nombre", p.getNombre());
                        if (p.getColorHexa() != null)
                            stats.put("colorHexa", p.getColorHexa());
                        porPiso.put(key, stats);
                    }
                }
            } catch (Exception ex) {
                // si falla, no interrumpir — ya tenemos los pisos con actividad
                logger.warn("No se pudo listar pisos del servicio para completar porPiso: {}", ex.getMessage());
            }

            result.put("fechaInicio", firstDayPrevMonth.toString());
            result.put("fechaFin", lastDay.toString());
            result.put("porPiso", porPiso);
            result.put("totalPisos", porPiso.size());

        } catch (Exception e) {
            logger.error("Error al calcular coverage per piso para servicioId={}: {}", servicioId, e.getMessage(), e);
            result.put("error", e.getMessage());
        }
        return result;
    }

    /**
     * Calcula la cobertura por piso para el mes actual.
     * Comportamiento equivalente a getCoveragePerPisoLastMonth pero usando el mes
     * en curso.
     */
    public Map<String, Object> getCoveragePerPisoCurrentMonth(Long servicioId) {
        Map<String, Object> result = new HashMap<>();
        try {
            if (servicioId == null) {
                result.put("error", "servicioId es requerido");
                return result;
            }

            // calcular rango: primer día del mes actual hasta el último día del mes actual
            LocalDate today = LocalDate.now();
            LocalDate firstDayThisMonth = today.withDayOfMonth(1);
            LocalDate lastDay = firstDayThisMonth.plusMonths(1).minusDays(1);

            List<TurnoEntity> turnos = turnoRepository.findByServicioIdAndDateRange(servicioId, firstDayThisMonth,
                    lastDay);

            // número de días en el periodo (incluye ambos extremos)
            long periodDays = ChronoUnit.DAYS.between(firstDayThisMonth, lastDay) + 1;

            // Agrupar horas por día por piso usando la unión de intervalos
            Map<String, Map<LocalDate, Double>> horasPorDiaPorPiso = computeUnionHoursByPiso(turnos, firstDayThisMonth,
                    lastDay);

            Map<String, Map<String, Object>> porPiso = new HashMap<>();
            for (Map.Entry<String, Map<LocalDate, Double>> e : horasPorDiaPorPiso.entrySet()) {
                String piso = e.getKey();
                Map<LocalDate, Double> horasPorDia = e.getValue();
                long asignados = horasPorDia.values().stream().filter(h -> round2(h) >= COVERED_THRESHOLD).count();
                // Usar el número de días del mes como total (denominador constante)
                long totalDiasMes = periodDays;
                double porcentaje = periodDays > 0 ? Math.round((asignados * 100.0 / periodDays) * 10) / 10.0 : 0.0;
                Map<String, Object> stats = new HashMap<>();
                stats.put("total", totalDiasMes);
                stats.put("asignados", asignados);
                stats.put("porcentaje", porcentaje);

                // Intentar resolver nombre y color del piso desde la entidad Piso
                try {
                    String nombrePiso = null;
                    String colorHex = null;
                    try {
                        Long pisoIdLong = Long.parseLong(piso);
                        java.util.Optional<PisoEntity> pe = pisoRepository.findById(pisoIdLong);
                        if (pe.isPresent()) {
                            nombrePiso = pe.get().getNombre();
                            colorHex = pe.get().getColorHexa();
                        }
                    } catch (NumberFormatException ex) {
                        java.util.Optional<PisoEntity> pe2 = pisoRepository.findByNombre(piso);
                        if (pe2.isPresent()) {
                            nombrePiso = pe2.get().getNombre();
                            colorHex = pe2.get().getColorHexa();
                        }
                    }

                    if (nombrePiso != null) {
                        stats.put("nombre", nombrePiso);
                    } else {
                        stats.put("nombre", piso);
                    }
                    if (colorHex != null)
                        stats.put("colorHexa", colorHex);
                } catch (Exception ex) {
                    stats.put("nombre", piso);
                }

                porPiso.put(piso, stats);
            }

            // Asegurar que se incluyan todos los pisos definidos para el servicio (aunque
            // no tengan turnos en el mes)
            try {
                List<PisoEntity> pisosDelServicio = pisoRepository.findAll().stream()
                        .filter(p -> p.getServicio() != null
                                && p.getServicio().getIdServicio() == servicioId.intValue())
                        .toList();

                for (PisoEntity p : pisosDelServicio) {
                    String key = String.valueOf(p.getId());
                    if (!porPiso.containsKey(key)) {
                        Map<String, Object> stats = new HashMap<>();
                        long totalDiasMes = ChronoUnit.DAYS.between(firstDayThisMonth, lastDay) + 1;
                        stats.put("total", totalDiasMes);
                        stats.put("asignados", 0L);
                        stats.put("porcentaje", 0.0);
                        stats.put("nombre", p.getNombre());
                        if (p.getColorHexa() != null)
                            stats.put("colorHexa", p.getColorHexa());
                        porPiso.put(key, stats);
                    }
                }
            } catch (Exception ex) {
                logger.warn("No se pudo listar pisos del servicio para completar porPiso: {}", ex.getMessage());
            }

            result.put("fechaInicio", firstDayThisMonth.toString());
            result.put("fechaFin", lastDay.toString());
            result.put("porPiso", porPiso);
            result.put("totalPisos", porPiso.size());

        } catch (Exception e) {
            logger.error("Error al calcular coverage per piso (mes actual) para servicioId={}: {}", servicioId,
                    e.getMessage(), e);
            result.put("error", e.getMessage());
        }
        return result;
    }

    /**
     * Calcula la cobertura por piso para un mes específico dado por año y mes.
     * Devuelve un mapa con clave "porPiso" cuyo valor es otro mapa { piso -> {
     * total, asignados, porcentaje } }
     */
    public Map<String, Object> getCoveragePerPisoByMonth(Long servicioId, int year, int month) {
        Map<String, Object> result = new HashMap<>();
        try {
            if (servicioId == null) {
                result.put("error", "servicioId es requerido");
                return result;
            }

            // calcular rango: primer día del mes especificado hasta el último día del mes
            // especificado
            LocalDate firstDayOfMonth = LocalDate.of(year, month, 1);
            LocalDate lastDayOfMonth = firstDayOfMonth.withDayOfMonth(firstDayOfMonth.lengthOfMonth());

            List<TurnoEntity> turnos = turnoRepository.findByServicioIdAndDateRange(servicioId, firstDayOfMonth,
                    lastDayOfMonth);

            // número de días en el periodo (incluye ambos extremos)
            long periodDays = ChronoUnit.DAYS.between(firstDayOfMonth, lastDayOfMonth) + 1;

            // Agrupar horas por día por piso usando la unión de intervalos
            Map<String, Map<LocalDate, Double>> horasPorDiaPorPiso = computeUnionHoursByPiso(turnos, firstDayOfMonth,
                    lastDayOfMonth);

            Map<String, Map<String, Object>> porPiso = new HashMap<>();
            for (Map.Entry<String, Map<LocalDate, Double>> e : horasPorDiaPorPiso.entrySet()) {
                String piso = e.getKey();
                Map<LocalDate, Double> horasPorDia = e.getValue();
                long asignados = horasPorDia.values().stream().filter(h -> round2(h) >= COVERED_THRESHOLD).count();
                // Usar el número de días del mes como total (denominador constante)
                long totalDiasMes = periodDays;
                double porcentaje = periodDays > 0 ? Math.round((asignados * 100.0 / periodDays) * 10) / 10.0 : 0.0;
                Map<String, Object> stats = new HashMap<>();
                stats.put("total", totalDiasMes);
                stats.put("asignados", asignados);
                stats.put("porcentaje", porcentaje);

                // Intentar resolver nombre y color del piso desde la entidad Piso
                try {
                    // Primero intentar interpretar la clave como ID numérico
                    String nombrePiso = null;
                    String colorHex = null;
                    try {
                        Long pisoIdLong = Long.parseLong(piso);
                        java.util.Optional<PisoEntity> pe = pisoRepository.findById(pisoIdLong);
                        if (pe.isPresent()) {
                            nombrePiso = pe.get().getNombre();
                            colorHex = pe.get().getColorHexa();
                        }
                    } catch (NumberFormatException ex) {
                        // no es un id numérico, intentar buscar por nombre
                        java.util.Optional<PisoEntity> pe2 = pisoRepository.findByNombre(piso);
                        if (pe2.isPresent()) {
                            nombrePiso = pe2.get().getNombre();
                            colorHex = pe2.get().getColorHexa();
                        }
                    }

                    if (nombrePiso != null) {
                        stats.put("nombre", nombrePiso);
                    } else {
                        // dejar el valor original como nombre si no se resolvió
                        stats.put("nombre", piso);
                    }
                    if (colorHex != null)
                        stats.put("colorHexa", colorHex);
                } catch (Exception ex) {
                    // no interrumpir el cálculo si falla la resolución de pisos
                    stats.put("nombre", piso);
                }

                porPiso.put(piso, stats);
            }

            // Asegurar que se incluyan todos los pisos definidos para el servicio (aunque
            // no tengan turnos en el mes)
            try {
                List<PisoEntity> pisosDelServicio = pisoRepository.findAll().stream()
                        .filter(p -> p.getServicio() != null
                                && p.getServicio().getIdServicio() == servicioId.intValue())
                        .toList();

                for (PisoEntity p : pisosDelServicio) {
                    String key = String.valueOf(p.getId());
                    if (!porPiso.containsKey(key)) {
                        Map<String, Object> stats = new HashMap<>();
                        // si no hay actividad, total es la cantidad de días del periodo
                        long totalDiasMes = ChronoUnit.DAYS.between(firstDayOfMonth, lastDayOfMonth) + 1;
                        stats.put("total", totalDiasMes);
                        stats.put("asignados", 0L);
                        stats.put("porcentaje", 0.0);
                        stats.put("nombre", p.getNombre());
                        if (p.getColorHexa() != null)
                            stats.put("colorHexa", p.getColorHexa());
                        porPiso.put(key, stats);
                    }
                }
            } catch (Exception ex) {
                // si falla, no interrumpir — ya tenemos los pisos con actividad
                logger.warn("No se pudo listar pisos del servicio para completar porPiso: {}", ex.getMessage());
            }

            result.put("fechaInicio", firstDayOfMonth.toString());
            result.put("fechaFin", lastDayOfMonth.toString());
            result.put("porPiso", porPiso);
            result.put("totalPisos", porPiso.size());

        } catch (Exception e) {
            logger.error("Error al calcular coverage per piso para mes {}-{} y servicioId={}: {}", year, month,
                    servicioId, e.getMessage(), e);
            result.put("error", e.getMessage());
        }
        return result;
    }

    /**
     * Helper: calcula, para una lista de turnos y un rango de fechas, la cantidad
     * de horas cubiertas
     * por cada piso y por cada día, usando la unión de intervalos para evitar doble
     * conteo.
     * Retorna: Map<piso, Map<LocalDate, horasCubiertas>>
     */
    private Map<String, Map<LocalDate, Double>> computeUnionHoursByPiso(List<TurnoEntity> turnos, LocalDate rangeStart,
            LocalDate rangeEnd) {
        Map<String, Map<LocalDate, java.util.List<LocalDateTime[]>>> intervals = new HashMap<>();

        for (TurnoEntity t : turnos) {
            // Ignorar turnos sin horas definidas
            if (t.getHoraInicio() == null || t.getHoraFin() == null)
                continue;

            // Ignorar turnos que no están asignados a ningún médico (idMedico == null)
            // La cobertura se debe calcular sólo con turnos con médico asignado.
            if (t.getIdMedico() == null)
                continue;

            LocalDate start = t.getDiaInicioTurno() != null ? t.getDiaInicioTurno() : rangeStart;
            LocalDate end = t.getDiaFinalTurno() != null ? t.getDiaFinalTurno() : rangeStart;

            if (start.isBefore(rangeStart))
                start = rangeStart;
            if (end.isAfter(rangeEnd))
                end = rangeEnd;

            String piso = t.getIdPiso() != null ? t.getIdPiso() : "Sin piso";

            LocalDate d = start;
            while (!d.isAfter(end)) {
                LocalDateTime turnoStart = LocalDateTime.of(t.getDiaInicioTurno() != null ? t.getDiaInicioTurno() : d,
                        t.getHoraInicio());
                LocalDateTime turnoEnd = LocalDateTime.of(t.getDiaFinalTurno() != null ? t.getDiaFinalTurno() : d,
                        t.getHoraFin());

                // Corregir turnos nocturnos/overnight: si la hora de fin resulta antes
                // que la hora de inicio en la misma fecha, es muy probable que el turno
                // termine el día siguiente. Ajustamos sumando un día a turnoEnd.
                if (turnoEnd.isBefore(turnoStart)) {
                    turnoEnd = turnoEnd.plusDays(1);
                }

                // La ventana del día puede variar: inicio en getDayStartHour(d) y termina en la
                // hora
                // de inicio del siguiente día (p. ej. 08:00 -> 08:00 o 08:00 -> 09:00 si el
                // siguiente día es fin de semana)
                LocalDateTime dayStart = d.atTime(getDayStartHour(d), 0);
                LocalDateTime dayEnd = d.plusDays(1).atTime(getDayStartHour(d.plusDays(1)), 0);

                LocalDateTime overlapStart = turnoStart.isAfter(dayStart) ? turnoStart : dayStart;
                LocalDateTime overlapEnd = turnoEnd.isBefore(dayEnd) ? turnoEnd : dayEnd;

                if (!overlapEnd.isBefore(overlapStart)) {
                    intervals.computeIfAbsent(piso, k -> new HashMap<>())
                            .computeIfAbsent(d, k -> new java.util.ArrayList<>())
                            .add(new LocalDateTime[] { overlapStart, overlapEnd });
                }

                d = d.plusDays(1);
            }
        }

        Map<String, Map<LocalDate, Double>> result = new HashMap<>();
        for (Map.Entry<String, Map<LocalDate, java.util.List<LocalDateTime[]>>> pisoEntry : intervals.entrySet()) {
            String piso = pisoEntry.getKey();
            Map<LocalDate, Double> horasPorDia = new HashMap<>();
            for (Map.Entry<LocalDate, java.util.List<LocalDateTime[]>> dayEntry : pisoEntry.getValue().entrySet()) {
                java.util.List<LocalDateTime[]> list = dayEntry.getValue();
                list.sort((a, b) -> a[0].compareTo(b[0]));
                java.util.List<LocalDateTime[]> merged = new java.util.ArrayList<>();
                for (LocalDateTime[] in : list) {
                    if (merged.isEmpty())
                        merged.add(new LocalDateTime[] { in[0], in[1] });
                    else {
                        LocalDateTime[] last = merged.get(merged.size() - 1);
                        if (!in[0].isAfter(last[1])) {
                            if (in[1].isAfter(last[1]))
                                last[1] = in[1];
                        } else
                            merged.add(new LocalDateTime[] { in[0], in[1] });
                    }
                }

                double horas = 0.0;
                for (LocalDateTime[] m : merged) {
                    long minutes = Duration.between(m[0], m[1]).toMinutes();
                    if (minutes < 0)
                        minutes = 0;
                    horas += minutes / 60.0;
                }

                horasPorDia.put(dayEntry.getKey(), horas);
            }
            result.put(piso, horasPorDia);
        }

        return result;
    }

    /**
     * Devuelve la lista de turnos para un servicio y día específico, pero
     * reemplazando el campo idPiso
     * por el nombre del piso si es posible. Esto facilita al frontend mostrar el
     * nombre
     * legible en lugar de un identificador.
     */
    public List<Map<String, Object>> getTurnosByServicioAndDiaWithPisoNombre(Long servicioId, LocalDate fecha) {
        List<TurnoEntity> turnos = turnoRepository.findByServicioIdAndDateRange(servicioId, fecha, fecha);
        List<Map<String, Object>> salida = new ArrayList<>();

        for (TurnoEntity t : turnos) {
            // Filtrar turnos que cubren la fecha específica
            if (t.getDiaInicioTurno() == null || t.getDiaFinalTurno() == null)
                continue;
            if (t.getDiaInicioTurno().isAfter(fecha) || t.getDiaFinalTurno().isBefore(fecha))
                continue;

            Map<String, Object> m = new HashMap<>();
            m.put("id", t.getId());
            m.put("nombre", t.getNombre());

            // --- BÚSQUEDA EN TABLA SATÉLITE ---
            VinculoTurnoRotativaEntity vinculo = vinculoRepository.findByIdTurno(t.getId());
            if (vinculo != null) {
                m.put("idTipoTurnoRef", vinculo.getIdTipoTurno());
            } else {
                m.put("idTipoTurnoRef", null);
            }

            // Resolver nombre médico
            String medicoNombre = null;
            try {
                Long idMed = t.getIdMedico();
                if (idMed != null) {
                    Optional<com.pingeso.HUAP.Entity.PersonalEntity> pOpt = personalRepository.findById(idMed);
                    if (pOpt.isPresent()) {
                        com.pingeso.HUAP.Entity.PersonalEntity p = pOpt.get();
                        StringBuilder sb = new StringBuilder();
                        if (p.getNombre() != null)
                            sb.append(p.getNombre());
                        if (p.getApellidoPaterno() != null) {
                            if (sb.length() > 0)
                                sb.append(' ');
                            sb.append(p.getApellidoPaterno());
                        }
                        medicoNombre = sb.toString();
                    }
                }
            } catch (Exception ex) {
            }
            m.put("medicoNombre", medicoNombre);

            // --- INICIO CORRECCIÓN PISO ---
            String idPisoRaw = t.getIdPiso();
            String pisoNombre = idPisoRaw;
            Long pisoIdReal = null;

            if (idPisoRaw != null) {
                try {
                    pisoIdReal = Long.parseLong(idPisoRaw.trim());
                    Optional<PisoEntity> opt = pisoRepository.findById(pisoIdReal);
                    if (opt.isPresent()) {
                        pisoNombre = opt.get().getNombre();
                    }
                } catch (NumberFormatException nfe) {
                    Optional<PisoEntity> opt2 = pisoRepository.findByNombre(idPisoRaw);
                    if (opt2.isPresent()) {
                        pisoNombre = opt2.get().getNombre();
                        pisoIdReal = opt2.get().getId();
                    }
                }
            }

            // Enviamos datos consistentes
            m.put("idPiso", pisoIdReal != null ? pisoIdReal : idPisoRaw);
            m.put("nombrePiso", pisoNombre);
            m.put("Seccion", pisoNombre); // Para compatibilidad
            // --- FIN CORRECCIÓN PISO ---

            m.put("diaSemana", t.getDiaSemana());
            m.put("horaInicio", t.getHoraInicio() != null ? t.getHoraInicio().toString() : null);
            m.put("horaFin", t.getHoraFin() != null ? t.getHoraFin().toString() : null);
            m.put("diaInicioTurno", t.getDiaInicioTurno() != null ? t.getDiaInicioTurno().toString() : null);
            m.put("diaFinalTurno", t.getDiaFinalTurno() != null ? t.getDiaFinalTurno().toString() : null);
            m.put("tipoTurno", t.getTipoTurno());
            m.put("estado", t.getEstado());
            m.put("idMedico", t.getIdMedico());

            salida.add(m);
        }

        return salida;
    }

    /**
     * Devuelve la lista de turnos SIN ASIGNAR (idMedico es null) para un servicio y
     * día específico.
     * Estos son turnos disponibles que pueden ser asignados a un médico.
     */
    public List<Map<String, Object>> getTurnosSinAsignarByDia(Long servicioId, LocalDate fecha) {
        List<TurnoEntity> turnos = turnoRepository.findByServicioIdAndDateRange(servicioId, fecha, fecha);
        List<Map<String, Object>> salida = new ArrayList<>();

        for (TurnoEntity t : turnos) {
            // SOLO incluir turnos sin médico asignado
            if (t.getIdMedico() != null)
                continue;

            // SOLO incluir turnos que EMPIEZAN en esta fecha (no turnos que la cubren)
            // Esto evita duplicados cuando un turno cubre múltiples días
            if (t.getDiaInicioTurno() == null)
                continue;
            if (!t.getDiaInicioTurno().equals(fecha))
                continue;

            Map<String, Object> m = new HashMap<>();
            m.put("id", t.getId());
            m.put("nombre", t.getNombre());
            m.put("estado", t.getEstado());

            // --- RESOLUCIÓN DE PISO ---
            String idPisoRaw = t.getIdPiso();
            String pisoNombre = idPisoRaw;
            Long pisoIdReal = null;

            if (idPisoRaw != null) {
                try {
                    pisoIdReal = Long.parseLong(idPisoRaw.trim());
                    Optional<PisoEntity> opt = pisoRepository.findById(pisoIdReal);
                    if (opt.isPresent()) {
                        pisoNombre = opt.get().getNombre();
                    }
                } catch (NumberFormatException nfe) {
                    Optional<PisoEntity> opt2 = pisoRepository.findByNombre(idPisoRaw);
                    if (opt2.isPresent()) {
                        pisoNombre = opt2.get().getNombre();
                        pisoIdReal = opt2.get().getId();
                    }
                }
            }

            m.put("idPiso", pisoIdReal != null ? pisoIdReal : idPisoRaw);
            m.put("nombrePiso", pisoNombre);
            m.put("Seccion", pisoNombre);

            m.put("diaSemana", t.getDiaSemana());
            m.put("horaInicio", t.getHoraInicio() != null ? t.getHoraInicio().toString() : null);
            m.put("horaFin", t.getHoraFin() != null ? t.getHoraFin().toString() : null);
            m.put("diaInicioTurno", t.getDiaInicioTurno() != null ? t.getDiaInicioTurno().toString() : null);
            m.put("diaFinalTurno", t.getDiaFinalTurno() != null ? t.getDiaFinalTurno().toString() : null);
            m.put("tipoTurno", t.getTipoTurno());
            m.put("tipoDeTurnoCantidad", t.getTipoDeTurnoCantidad());

            salida.add(m);
        }

        return salida;
    }

    /**
     * Redondea a 2 decimales usando el comportamiento aritmético estándar.
     */
    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}