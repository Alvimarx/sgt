package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.ReglaServicioDTO;
import com.pingeso.HUAP.Entity.PlantillaTurnoEntity;
import com.pingeso.HUAP.Entity.ReglasHorariosTurnosServicioEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.PlantillaTurnoRepository;
import com.pingeso.HUAP.Repository.ReglasHorariosTurnosServicioRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

/**
 * Gestión de las reglas de ajuste de horario por servicio: CRUD de la configuración
 * (nombre, condición fin de semana / feriado, minutos y tipos de turno afectados) y la
 * lógica de negocio que aplica esas reglas a un turno al persistirlo.
 */
@Service
@Transactional
public class ReglaServicioService {

    private final ReglasHorariosTurnosServicioRepository reglaRepository;
    private final ServicioRepository servicioRepository;
    private final PlantillaTurnoRepository plantillaTurnoRepository;

    public ReglaServicioService(ReglasHorariosTurnosServicioRepository reglaRepository,
                                ServicioRepository servicioRepository,
                                PlantillaTurnoRepository plantillaTurnoRepository) {
        this.reglaRepository = reglaRepository;
        this.servicioRepository = servicioRepository;
        this.plantillaTurnoRepository = plantillaTurnoRepository;
    }

    // =========================================================
    // CRUD
    // =========================================================

    public List<ReglaServicioDTO> obtenerPorServicio(Long idServicio) {
        return reglaRepository.findByServicio_IdServicioAndEliminadoFalse(idServicio).stream()
                .map(this::toDTO)
                .toList();
    }

    public ReglaServicioDTO crear(ReglaServicioDTO dto) {
        ServicioEntity servicio = servicioRepository.findById(dto.getIdServicio())
                .orElseThrow(() -> new RuntimeException("Servicio no encontrado con ID: " + dto.getIdServicio()));
        validarNombre(dto.getNombre());

        ReglasHorariosTurnosServicioEntity regla = ReglasHorariosTurnosServicioEntity.builder()
                .nombre(dto.getNombre().trim())
                .servicio(servicio)
                .aplicaFinDeSemana(dto.isAplicaFinDeSemana())
                .aplicaFeriado(dto.isAplicaFeriado())
                .tiempoMinutos(dto.getTiempoMinutos())
                .tipoTurnoInicio(resolverTipo(dto.getIdTipoTurnoInicio(), dto.getIdServicio()))
                .tipoTurnoFin(resolverTipo(dto.getIdTipoTurnoFin(), dto.getIdServicio()))
                .build();

        return toDTO(reglaRepository.save(regla));
    }

    public ReglaServicioDTO actualizar(Long idRegla, ReglaServicioDTO dto) {
        ReglasHorariosTurnosServicioEntity regla = obtenerVigente(idRegla);
        Long idServicio = regla.getServicio().getIdServicio();
        validarNombre(dto.getNombre());

        regla.setNombre(dto.getNombre().trim());
        regla.setAplicaFinDeSemana(dto.isAplicaFinDeSemana());
        regla.setAplicaFeriado(dto.isAplicaFeriado());
        regla.setTiempoMinutos(dto.getTiempoMinutos());
        regla.setTipoTurnoInicio(resolverTipo(dto.getIdTipoTurnoInicio(), idServicio));
        regla.setTipoTurnoFin(resolverTipo(dto.getIdTipoTurnoFin(), idServicio));

        return toDTO(reglaRepository.save(regla));
    }

    public void eliminar(Long idRegla) {
        ReglasHorariosTurnosServicioEntity regla = obtenerVigente(idRegla);
        regla.setEliminado(true);
        reglaRepository.save(regla);
    }

    // =========================================================
    // APLICACIÓN DE LAS REGLAS A UN TURNO
    // =========================================================

    /**
     * Carga las reglas seleccionadas (no eliminadas, del servicio) para una generación.
     * Sin ids (null o vacío) devuelve lista vacía → no se aplica ninguna.
     */
    public List<ReglasHorariosTurnosServicioEntity> cargarReglasSeleccionadas(Long idServicio, List<Long> idsReglas) {
        if (idsReglas == null || idsReglas.isEmpty()) return List.of();
        return reglaRepository.findByServicio_IdServicioAndEliminadoFalse(idServicio).stream()
                .filter(r -> idsReglas.contains(r.getIdRegla()))
                .toList();
    }

    /**
     * Aplica in-place al turno la lista de reglas dada (ya filtradas). No-op si la lista
     * está vacía. La ENTRADA se ajusta según el día de inicio; la SALIDA según el día final
     * (necesario para turnos que cruzan a un finde/feriado).
     *
     * @param feriados fechas feriado ya precargadas por el llamador (evita una consulta a BD
     *                 por turno en generaciones masivas).
     */
    public void aplicarReglas(TurnoEntity turno, List<ReglasHorariosTurnosServicioEntity> reglas, Set<LocalDate> feriados) {
        if (turno == null || reglas == null || reglas.isEmpty()
                || turno.getTipoTurno() == null || turno.getDiaInicioTurno() == null) {
            return;
        }

        Long tipoId = turno.getTipoTurno().getIdPlantillaTurno();
        LocalDate diaInicio = turno.getDiaInicioTurno();
        LocalDate diaFin = turno.getDiaFinalTurno();
        boolean esFeriadoInicio = feriados.contains(diaInicio);
        boolean esFeriadoFin = diaFin != null
                && (diaFin.equals(diaInicio) ? esFeriadoInicio : feriados.contains(diaFin));

        LocalTime horaInicio = turno.getHoraInicio();
        LocalTime horaFin = turno.getHoraFin();

        for (ReglasHorariosTurnosServicioEntity r : reglas) {
            if (horaInicio != null && esTipo(r.getTipoTurnoInicio(), tipoId)
                    && condicion(r, diaInicio, esFeriadoInicio)) {
                horaInicio = horaInicio.plusMinutes(r.getTiempoMinutos());
            }
            if (horaFin != null && esTipo(r.getTipoTurnoFin(), tipoId)
                    && condicion(r, diaFin, esFeriadoFin)) {
                horaFin = horaFin.plusMinutes(r.getTiempoMinutos());
            }
        }

        turno.setHoraInicio(horaInicio);
        turno.setHoraFin(horaFin);
    }

    /** ¿El día cae en una condición activada por la regla (finde o feriado)? */
    private boolean condicion(ReglasHorariosTurnosServicioEntity r, LocalDate dia, boolean esFeriado) {
        if (dia == null) return false;
        DayOfWeek d = dia.getDayOfWeek();
        boolean finde = d == DayOfWeek.SATURDAY || d == DayOfWeek.SUNDAY;
        return (finde && r.isAplicaFinDeSemana()) || (esFeriado && r.isAplicaFeriado());
    }

    private boolean esTipo(PlantillaTurnoEntity tipo, Long tipoId) {
        return tipo != null && tipo.getIdPlantillaTurno().equals(tipoId);
    }

    // =========================================================
    // AUXILIAR
    // =========================================================

    private void validarNombre(String nombre) {
        if (nombre == null || nombre.trim().isEmpty()) {
            throw new RuntimeException("El nombre de la regla no puede estar vacío.");
        }
    }

    private ReglasHorariosTurnosServicioEntity obtenerVigente(Long idRegla) {
        ReglasHorariosTurnosServicioEntity regla = reglaRepository.findById(idRegla)
                .orElseThrow(() -> new RuntimeException("Regla no encontrada con ID: " + idRegla));
        if (regla.isEliminado()) {
            throw new RuntimeException("La regla fue eliminada.");
        }
        return regla;
    }

    /** Resuelve y valida un tipo de turno por id; null si no se indica (ajuste opcional). */
    private PlantillaTurnoEntity resolverTipo(Long idTipo, Long idServicio) {
        if (idTipo == null) return null;
        PlantillaTurnoEntity tipo = plantillaTurnoRepository.findById(idTipo)
                .orElseThrow(() -> new RuntimeException("Tipo de turno no encontrado: ID " + idTipo));
        if (tipo.isEliminado()) {
            throw new RuntimeException("El tipo de turno '" + tipo.getNombre() + "' fue eliminado.");
        }
        if (!tipo.getServicio().getIdServicio().equals(idServicio)) {
            throw new RuntimeException("El tipo de turno '" + tipo.getNombre() + "' no pertenece a este servicio.");
        }
        return tipo;
    }

    private ReglaServicioDTO toDTO(ReglasHorariosTurnosServicioEntity r) {
        return ReglaServicioDTO.builder()
                .idRegla(r.getIdRegla())
                .idServicio(r.getServicio() != null ? r.getServicio().getIdServicio() : null)
                .nombre(r.getNombre())
                .aplicaFinDeSemana(r.isAplicaFinDeSemana())
                .aplicaFeriado(r.isAplicaFeriado())
                .tiempoMinutos(r.getTiempoMinutos())
                .idTipoTurnoInicio(r.getTipoTurnoInicio() != null ? r.getTipoTurnoInicio().getIdPlantillaTurno() : null)
                .idTipoTurnoFin(r.getTipoTurnoFin() != null ? r.getTipoTurnoFin().getIdPlantillaTurno() : null)
                .nombreTipoTurnoInicio(r.getTipoTurnoInicio() != null ? r.getTipoTurnoInicio().getNombre() : null)
                .nombreTipoTurnoFin(r.getTipoTurnoFin() != null ? r.getTipoTurnoFin().getNombre() : null)
                .build();
    }
}
