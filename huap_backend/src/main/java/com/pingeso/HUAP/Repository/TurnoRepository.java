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

    // ====================================================================
    // BÚSQUEDAS BÁSICAS POR ENTIDAD
    // ====================================================================

    List<TurnoEntity> findByNombre(String nombre);

    List<TurnoEntity> findByFuncionario_IdFuncionario(Long idFuncionario);

    List<TurnoEntity> findByServicio_IdServicio(Long idServicio);

    List<TurnoEntity> findByPiso_IdPiso(Long idPiso);

    // Cantidad de turnos asociados a un piso. Si es > 0 no se permite eliminar el piso.
    long countByPiso_IdPiso(Long idPiso);

    long countByServicio_IdServicio(Long idServicio);

    List<TurnoEntity> findByPlantilla_IdPlantilla(Long idPlantilla);

    // ====================================================================
    // BÚSQUEDA DE TURNOS VACANTES (SIN ASIGNAR)
    // ====================================================================

    List<TurnoEntity> findByFuncionarioIsNull();

    List<TurnoEntity> findByDiaInicioTurnoAndFuncionarioIsNull(LocalDate dia);

    List<TurnoEntity> findByServicio_IdServicioAndDiaInicioTurnoAndFuncionarioIsNull(
            Long servicioId,
            LocalDate dia
    );

    List<TurnoEntity> findByServicio_IdServicioAndDiaInicioTurno(
            Long servicioId,
            LocalDate dia
    );

    @Query("""
           SELECT t
           FROM TurnoEntity t
           WHERE t.funcionario IS NULL
           AND t.servicio.idServicio = :servicioId
           """)
    List<TurnoEntity> findUnassignedTurnosByServicio(
            @Param("servicioId") Long servicioId
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
           """)
    List<TurnoEntity> findByFuncionarioIdAndDateRange(
            @Param("funcionarioId") Long funcionarioId,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin
    );

    // ====================================================================
    // RESOLUCIÓN DE CONFLICTOS Y VALIDACIONES
    // ====================================================================

    // Conflicto de Funcionario
    @Query("""
           SELECT t
           FROM TurnoEntity t
           WHERE t.funcionario.idFuncionario = :funcionarioId
           AND t.diaFinalTurno >= :fechaInicio
           AND t.diaInicioTurno <= :fechaFin
           """)
    List<TurnoEntity> findConflictosByFuncionario(
            @Param("funcionarioId") Long funcionarioId,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin
    );

    // Búsqueda en un Piso específico
    @Query("""
           SELECT t
           FROM TurnoEntity t
           WHERE t.piso.idPiso = :pisoId
           AND t.diaFinalTurno >= :fechaInicio
           AND t.diaInicioTurno <= :fechaFin
           """)
    List<TurnoEntity> findByPisoIdAndDateRange(
            @Param("pisoId") Long pisoId,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin
    );

    // Conflictos en Asignación Masiva por Plantilla
    @Query("""
           SELECT t
           FROM TurnoEntity t
           WHERE t.plantilla.idPlantilla = :plantillaId
           AND t.servicio.idServicio = :servicioId
           AND t.diaFinalTurno >= :fechaInicio
           AND t.diaInicioTurno <= :fechaFin
           """)
    List<TurnoEntity> findConflictsByPlantilla(
            @Param("plantillaId") Long plantillaId,
            @Param("servicioId") Long servicioId,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin
    );
}