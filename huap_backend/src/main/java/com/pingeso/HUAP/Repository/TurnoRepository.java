package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.TurnoEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Repositorio de {@link TurnoEntity}.
 *
 * <p>Además del CRUD de Spring Data, ofrece consultas para: turnos vigentes por entidad
 * (funcionario/servicio/puesto), vacantes (sin funcionario), vistas de calendario por rango de
 * fechas, detección de conflictos de horario y una consulta optimizada para exportación a CSV.
 * Salvo los conteos "advisory", todas filtran {@code eliminado = false} (soft-delete).
 */
@Repository
public interface TurnoRepository extends JpaRepository<TurnoEntity, Long> {

    // ====================================================================
    // BÚSQUEDAS BÁSICAS POR ENTIDAD
    // ====================================================================

    /** Todos los turnos vigentes (no eliminados). */
    List<TurnoEntity> findByEliminadoFalse();

    /**
     * Carga el turno con lock pesimista (SELECT ... FOR UPDATE). Se usa al inicio de una operación
     * que modifica el turno (asignar/reasignar/etc.) para serializar accesos concurrentes a la MISMA
     * fila de turno y evitar el lost-update de dos asignaciones compitiendo por el mismo turno.
     * Debe invocarse dentro de una transacción.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM TurnoEntity t WHERE t.idTurno = :id")
    Optional<TurnoEntity> findByIdForUpdate(@Param("id") Long id);

    /** Turnos vigentes de un funcionario. */
    @Query("SELECT t FROM TurnoEntity t WHERE t.funcionario.idFuncionario = ?1 AND t.eliminado = false")
    List<TurnoEntity> findByFuncionario_IdFuncionario(Long idFuncionario);

    /** Turnos vigentes de un servicio. */
    @Query("SELECT t FROM TurnoEntity t WHERE t.servicio.idServicio = ?1 AND t.eliminado = false")
    List<TurnoEntity> findByServicio_IdServicio(Long idServicio);

    /** Turnos vigentes de un puesto. */
    @Query("SELECT t FROM TurnoEntity t WHERE t.puesto.idPuesto = ?1 AND t.eliminado = false")
    List<TurnoEntity> findByPuesto_IdPuesto(Long idPuesto);

    // Conteos informativos (advisory). Incluyen histórico; NO filtran eliminado.

    /** Cuenta (histórico, incl. eliminados) los turnos de un puesto. */
    long countByPuesto_IdPuesto(Long idPuesto);

    /** Cuenta (histórico, incl. eliminados) los turnos de un tipo de turno. */
    long countByTipoTurno_IdTipoTurno(Long idTipoTurno);

    /** Cuenta (histórico, incl. eliminados) los turnos de un servicio. */
    long countByServicio_IdServicio(Long idServicio);

    // ====================================================================
    // BÚSQUEDA DE TURNOS VACANTES (SIN ASIGNAR)
    // ====================================================================

    /** Todos los turnos vacantes (sin funcionario). */
    @Query("SELECT t FROM TurnoEntity t WHERE t.funcionario IS NULL AND t.eliminado = false")
    List<TurnoEntity> findByFuncionarioIsNull();

    /** Turnos vacantes que inician en una fecha concreta. */
    @Query("SELECT t FROM TurnoEntity t WHERE t.diaInicioTurno = ?1 AND t.funcionario IS NULL AND t.eliminado = false")
    List<TurnoEntity> findByDiaInicioTurnoAndFuncionarioIsNull(LocalDate dia);

    /** Turnos vacantes de un servicio que inician en una fecha concreta. */
    @Query("SELECT t FROM TurnoEntity t WHERE t.servicio.idServicio = ?1 AND t.diaInicioTurno = ?2 AND t.funcionario IS NULL AND t.eliminado = false")
    List<TurnoEntity> findByServicio_IdServicioAndDiaInicioTurnoAndFuncionarioIsNull(
            Long servicioId,
            LocalDate dia
    );

    /** Turnos de un servicio (asignados o no) que inician en una fecha concreta. */
    @Query("SELECT t FROM TurnoEntity t WHERE t.servicio.idServicio = ?1 AND t.diaInicioTurno = ?2 AND t.eliminado = false")
    List<TurnoEntity> findByServicio_IdServicioAndDiaInicioTurno(
            Long servicioId,
            LocalDate dia
    );

    /** Todos los turnos vacantes de un servicio. */
    @Query("""
           SELECT t
           FROM TurnoEntity t
           WHERE t.funcionario IS NULL
           AND t.servicio.idServicio = :servicioId
           AND t.eliminado = false
           """)
    List<TurnoEntity> findUnassignedTurnosByServicio(
            @Param("servicioId") Long servicioId
    );

    /** Turnos vacantes de un servicio que solapan un rango de fechas, ordenados por inicio. */
    @Query("""
           SELECT t
           FROM TurnoEntity t
           WHERE t.funcionario IS NULL
           AND t.servicio.idServicio = :servicioId
           AND t.diaFinalTurno >= :fechaInicio
           AND t.diaInicioTurno <= :fechaFin
           AND t.eliminado = false
           ORDER BY t.diaInicioTurno ASC
           """)
    List<TurnoEntity> findUnassignedTurnosByServicioAndDateRange(
            @Param("servicioId") Long servicioId,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin
    );

    /** Cuenta cuántos funcionarios distintos tienen turno en un servicio dentro de un rango. */
    @Query("""
           SELECT COUNT(DISTINCT t.funcionario.idFuncionario)
           FROM TurnoEntity t
           WHERE t.funcionario IS NOT NULL
           AND t.servicio.idServicio = :servicioId
           AND t.diaFinalTurno >= :fechaInicio
           AND t.diaInicioTurno <= :fechaFin
           AND t.eliminado = false
           """)
    Long countDistinctFuncionariosByServicioAndDateRange(
            @Param("servicioId") Long servicioId,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin
    );

    // ====================================================================
    // VISTAS DE CALENDARIO Y RANGOS DE FECHAS
    // ====================================================================

    /** Turnos de un servicio que solapan un rango de fechas (cobertura general / calendario). */
    @Query("""
           SELECT t
           FROM TurnoEntity t
           WHERE t.servicio.idServicio = :servicioId
           AND t.diaFinalTurno >= :fechaInicio
           AND t.diaInicioTurno <= :fechaFin
           AND t.eliminado = false
           """)
    List<TurnoEntity> findByServicioIdAndDateRange(
            @Param("servicioId") Long servicioId,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin
    );

    /** Turnos de un funcionario que solapan un rango de fechas (vista "mis turnos"). */
    @Query("""
           SELECT t
           FROM TurnoEntity t
           WHERE t.funcionario.idFuncionario = :funcionarioId
           AND t.diaFinalTurno >= :fechaInicio
           AND t.diaInicioTurno <= :fechaFin
           AND t.eliminado = false
           """)
    List<TurnoEntity> findByFuncionarioIdAndDateRange(
            @Param("funcionarioId") Long funcionarioId,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin
    );

    // ====================================================================
    // RESOLUCIÓN DE CONFLICTOS Y VALIDACIONES
    // ====================================================================

    /** Turnos de un funcionario que solapan un rango (para detectar doble-reserva). */
    @Query("""
           SELECT t
           FROM TurnoEntity t
           WHERE t.funcionario.idFuncionario = :funcionarioId
           AND t.diaFinalTurno >= :fechaInicio
           AND t.diaInicioTurno <= :fechaFin
           AND t.eliminado = false
           """)
    List<TurnoEntity> findConflictosByFuncionario(
            @Param("funcionarioId") Long funcionarioId,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin
    );

    /**
     * Variante en bloque de {@link #findConflictosByFuncionario}: trae los conflictos de varios
     * funcionarios en una sola consulta (para precargar antes de una generación masiva).
     */
    @Query("""
           SELECT t
           FROM TurnoEntity t
           WHERE t.funcionario.idFuncionario IN :funcionarioIds
           AND t.diaFinalTurno >= :fechaInicio
           AND t.diaInicioTurno <= :fechaFin
           AND t.eliminado = false
           """)
    List<TurnoEntity> findConflictosByFuncionarios(
            @Param("funcionarioIds") List<Long> funcionarioIds,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin
    );

    /** Turnos de un puesto que solapan un rango de fechas. */
    @Query("""
           SELECT t
           FROM TurnoEntity t
           WHERE t.puesto.idPuesto = :puestoId
           AND t.diaFinalTurno >= :fechaInicio
           AND t.diaInicioTurno <= :fechaFin
           AND t.eliminado = false
           """)
    List<TurnoEntity> findByPuestoIdAndDateRange(
            @Param("puestoId") Long puestoId,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin
    );

    /**
     * Consulta optimizada para exportación a CSV: trae los turnos de un rango con las relaciones
     * ya cargadas ({@code JOIN FETCH}) y filtros opcionales por funcionario y servicio.
     * @param idFuncionario filtro opcional (o {@code null} para todos).
     * @param idServicio filtro opcional (o {@code null} para todos).
     */
    @Query("""
        SELECT t
        FROM TurnoEntity t
        LEFT JOIN FETCH t.funcionario f
        LEFT JOIN FETCH t.servicio s
        LEFT JOIN FETCH t.puesto p
        LEFT JOIN FETCH t.tipoTurno tt
        WHERE t.eliminado = false
          AND t.diaInicioTurno < :fechaFin
          AND t.diaFinalTurno >= :fechaInicio
          AND (:idFuncionario IS NULL OR f.idFuncionario = :idFuncionario)
          AND (:idServicio IS NULL OR s.idServicio = :idServicio)
          AND (f IS NULL OR f.eliminado = false)
          AND (s IS NULL OR s.eliminado = false)
        ORDER BY t.diaInicioTurno ASC, t.horaInicio ASC
    """)
    List<TurnoEntity> buscarTurnosParaExportacion(
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin,
            @Param("idFuncionario") Long idFuncionario,
            @Param("idServicio") Long idServicio
    );

    /**
     * Soft-delete en bloque de los turnos generados a partir de alguna de las rotativas dadas
     * (típicamente, todas las de una planificación) cuyo día de inicio cae dentro del rango.
     * Se usa para deshacer una generación de turnos hecha por error o duplicada.
     * @return cantidad de turnos marcados como eliminados.
     */
    @Modifying
    @Query("""
           UPDATE TurnoEntity t
           SET t.eliminado = true
           WHERE t.eliminado = false
           AND t.rotativa.idRotativa IN :idsRotativas
           AND t.diaInicioTurno >= :fechaInicio
           AND t.diaInicioTurno <= :fechaFin
           """)
    int softDeleteByRotativasAndRango(
            @Param("idsRotativas") List<Long> idsRotativas,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin
    );

    // ====================================================================
    // ORIGEN POR EJECUCIÓN DE PLANIFICACIÓN
    // ====================================================================

    /** Turnos vigentes generados por una ejecución concreta (origen inequívoco). */
    @Query("SELECT t FROM TurnoEntity t WHERE t.ejecucion.idEjecucion = :idEjecucion AND t.eliminado = false")
    List<TurnoEntity> findByEjecucion_IdEjecucion(@Param("idEjecucion") Long idEjecucion);

    /**
     * Soft-delete de los turnos vigentes de una ejecución concreta cuyo día de inicio sea igual o
     * posterior a la fecha dada. Usado para truncar/anular una ejecución al editar una planificación
     * desde una fecha, o al acortar su vigencia — nunca afecta turnos de otra ejecución ni turnos
     * manuales/legado (sin ejecución asociada).
     * @return cantidad de turnos marcados como eliminados.
     */
    @Modifying
    @Query("""
           UPDATE TurnoEntity t
           SET t.eliminado = true
           WHERE t.eliminado = false
           AND t.ejecucion.idEjecucion = :idEjecucion
           AND t.diaInicioTurno >= :fechaDesde
           """)
    int softDeleteByEjecucionDesde(
            @Param("idEjecucion") Long idEjecucion,
            @Param("fechaDesde") LocalDate fechaDesde
    );

    /** Cuenta los turnos vigentes de una ejecución cuyo día de inicio sea posterior a la fecha dada (para advertencias de "acortar"). */
    @Query("""
           SELECT COUNT(t) FROM TurnoEntity t
           WHERE t.eliminado = false
           AND t.ejecucion.idEjecucion = :idEjecucion
           AND t.diaInicioTurno > :fecha
           """)
    long countByEjecucionDespuesDe(
            @Param("idEjecucion") Long idEjecucion,
            @Param("fecha") LocalDate fecha
    );

}
