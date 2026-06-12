package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.TurnoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TurnoRepository extends JpaRepository<TurnoEntity, Long> {

    // Soft-delete: las consultas de agenda/vigentes/conflicto excluyen turnos con
    // eliminado = true. La navegación @ManyToOne NO se filtra, por lo que un turno
    // histórico (ej. en bitácora) sigue resolviendo el nombre de un puesto/tipo eliminado.

    // ====================================================================
    // BÚSQUEDAS BÁSICAS POR ENTIDAD (vigentes)
    // ====================================================================

    // Todos los turnos vigentes (no eliminados).
    List<TurnoEntity> findByEliminadoFalse();

    @Query("SELECT t FROM TurnoEntity t WHERE t.funcionario.idFuncionario = ?1 AND t.eliminado = false")
    List<TurnoEntity> findByFuncionario_IdFuncionario(Long idFuncionario);

    @Query("SELECT t FROM TurnoEntity t WHERE t.servicio.idServicio = ?1 AND t.eliminado = false")
    List<TurnoEntity> findByServicio_IdServicio(Long idServicio);

    @Query("SELECT t FROM TurnoEntity t WHERE t.puesto.idPuesto = ?1 AND t.eliminado = false")
    List<TurnoEntity> findByPuesto_IdPuesto(Long idPuesto);

    // Conteos informativos (advisory). Incluyen histórico; no filtran eliminado.
    long countByPuesto_IdPuesto(Long idPuesto);

    long countByTipoTurno_IdPlantillaTurno(Long idPlantillaTurno);

    long countByServicio_IdServicio(Long idServicio);

    // ====================================================================
    // BÚSQUEDA DE TURNOS VACANTES (SIN ASIGNAR)
    // ====================================================================

    @Query("SELECT t FROM TurnoEntity t WHERE t.funcionario IS NULL AND t.eliminado = false")
    List<TurnoEntity> findByFuncionarioIsNull();

    @Query("SELECT t FROM TurnoEntity t WHERE t.diaInicioTurno = ?1 AND t.funcionario IS NULL AND t.eliminado = false")
    List<TurnoEntity> findByDiaInicioTurnoAndFuncionarioIsNull(LocalDate dia);

    @Query("SELECT t FROM TurnoEntity t WHERE t.servicio.idServicio = ?1 AND t.diaInicioTurno = ?2 AND t.funcionario IS NULL AND t.eliminado = false")
    List<TurnoEntity> findByServicio_IdServicioAndDiaInicioTurnoAndFuncionarioIsNull(
            Long servicioId,
            LocalDate dia
    );

    @Query("SELECT t FROM TurnoEntity t WHERE t.servicio.idServicio = ?1 AND t.diaInicioTurno = ?2 AND t.eliminado = false")
    List<TurnoEntity> findByServicio_IdServicioAndDiaInicioTurno(
            Long servicioId,
            LocalDate dia
    );

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

    // Cobertura general de un Servicio en un rango de fechas
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

    // Turnos de un Funcionario específico por mes/rango
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

    // Conflicto de Funcionario (un turno eliminado no genera conflicto)
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

    // Búsqueda en un Puesto específico
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

    //Prueba de exportación de turnos a CSV
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

}
