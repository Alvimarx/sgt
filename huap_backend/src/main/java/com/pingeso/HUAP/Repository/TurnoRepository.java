package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.TurnoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/* 
@Repository
public interface TurnoRepository extends JpaRepository<TurnoEntity, Long> {

    List<TurnoEntity> findByIdMedico(Long idMedico);

    List<TurnoEntity> findByIdPiso(String idPiso);

    List<TurnoEntity> findByEstado(String estado);

    List<TurnoEntity> findByTipoTurno(String tipoTurno);

    List<TurnoEntity> findByTipoDeTurnoCantidad(String tipoDeTurnoCantidad);

    List<TurnoEntity> findByNombre(String nombre);

    List<TurnoEntity> findByCreadorIdPersonal(Long idCreador);

    List<TurnoEntity> findByAsignadorIdPersonal(Long idAsignador);

    //encontrar el turno por id
    Optional<TurnoEntity> findById(Long id);


    @Query("SELECT t FROM TurnoEntity t WHERE t.idMedico = :idMedico AND YEAR(t.diaInicioTurno) = :year AND MONTH(t.diaInicioTurno) = :month AND t.diaInicioTurno < :today ORDER BY t.diaInicioTurno DESC")
    List<TurnoEntity> findByMedicoAndMonthAndYearAndPast(@Param("idMedico") Long idMedico, @Param("year") int year, @Param("month") int month, @Param("today") LocalDate today);
    

    // Obtener turnos de usuarios de un servicio específico
    @Query("SELECT t FROM TurnoEntity t JOIN t.creador u WHERE u.idServicio = :servicioId")
    List<TurnoEntity> findAllByServicioId(@Param("servicioId") Long servicioId);


    // Obtener turnos sin asignar (idMedico null) de un servicio
    @Query("SELECT t FROM TurnoEntity t WHERE t.idMedico IS NULL AND t.idPiso IN " +
            "(SELECT DISTINCT t2.idPiso FROM TurnoEntity t2 JOIN t2.creador u WHERE u.idServicio = :servicioId)")
    List<TurnoEntity> findUnassignedTurnosByServicio(@Param("servicioId") Long servicioId);

    // Contar turnos por estado para un servicio
    @Query("SELECT COUNT(t) FROM TurnoEntity t JOIN t.creador u WHERE u.idServicio = :servicioId AND t.estado = :estado")
    Long countByServicioIdAndEstado(@Param("servicioId") Long servicioId, @Param("estado") String estado);

    // Obtener turnos por rango de fechas y servicio (para cobertura del calendario)
    @Query("SELECT t FROM TurnoEntity t JOIN t.creador u WHERE u.idServicio = :servicioId " +
            "AND t.diaFinalTurno >= :fechaInicio AND t.diaInicioTurno <= :fechaFin")
    List<TurnoEntity> findByServicioIdAndDateRange(@Param("servicioId") Long servicioId,
                                                   @Param("fechaInicio") LocalDate fechaInicio,
                                                   @Param("fechaFin") LocalDate fechaFin);

    // --- (NUEVO) Búsqueda optimizada para Asignación ---
    // Asumiendo que 'idPiso' en la BD guarda el ID como String (ej: "1")
    @Query("SELECT t FROM TurnoEntity t WHERE t.idPiso = :idPiso " +
            "AND t.diaInicioTurno >= :fechaInicio AND t.diaInicioTurno <= :fechaFin")
    List<TurnoEntity> findByPisoIdAndDateRange(@Param("idPiso") String idPiso,
                                               @Param("fechaInicio") LocalDate fechaInicio,
                                               @Param("fechaFin") LocalDate fechaFin);

    // Método optimizado usando stored procedure para calendario
    @Query(value = "CALL obtener_turnos_calendario(:servicioId, :fechaInicio, :fechaFin)", nativeQuery = true)
    List<Object[]> findTurnosCalendario(@Param("servicioId") Long servicioId,
                                        @Param("fechaInicio") LocalDate fechaInicio,
                                        @Param("fechaFin") LocalDate fechaFin);

    // Método para detectar conflictos de turnos en un rango de fechas y lista de pisos
    List<TurnoEntity> findByDiaInicioTurnoBetweenAndIdPisoIn(LocalDate fechaInicio, LocalDate fechaFin, List<String> pisosIds);

    // Spring deduce que debe buscar por el campo "idMedico" de tu entidad
    List<TurnoEntity> findAllByIdMedico(Long idMedico);
}
*/

@Repository
public interface TurnoRepository extends JpaRepository<TurnoEntity, Long> {

    // ====================================================================
    // MÉTODOS BÁSICOS
    // ====================================================================
    Optional<TurnoEntity> findById(Long id);

    List<TurnoEntity> findByNombre(String nombre);

    List<TurnoEntity> findByPiso_Id(Long idPiso);

    // ====================================================================
    // MÉTODOS DE FUNCIONARIO 
    // ====================================================================
    List<TurnoEntity> findByFuncionario_Id(Long idServicioFuncionario);
    List<TurnoEntity> findAllByFuncionario_Id(Long idServicioFuncionario);

    @Query("SELECT t FROM TurnoEntity t WHERE t.funcionario.id = :idServicioFuncionario " +
           "AND YEAR(t.diaInicioTurno) = :year AND MONTH(t.diaInicioTurno) = :month " +
           "AND t.diaInicioTurno < :today ORDER BY t.diaInicioTurno DESC")
    List<TurnoEntity> findByMedicoAndMonthAndYearAndPast(
            @Param("idServicioFuncionario") Long idServicioFuncionario, 
            @Param("year") int year, 
            @Param("month") int month, 
            @Param("today") LocalDate today);

    // ====================================================================
    // SERVICIOS 
    // ====================================================================

    // Obtener turnos usando el objeto servicio dentro de funcionario
    @Query("SELECT t FROM TurnoEntity t WHERE t.funcionario.servicio.id = :servicioId")
    List<TurnoEntity> findAllByServicioId(@Param("servicioId") Long servicioId);

    // Para turnos sin asignar: Subconsulta usando los pisos vinculados al servicio 
    // a través de Servicio_Funcionario
    @Query("SELECT t FROM TurnoEntity t WHERE t.funcionario IS NULL AND t.piso.id IN " +
           "(SELECT DISTINCT t2.piso.id FROM TurnoEntity t2 WHERE t2.funcionario.servicio.id = :servicioId)")
    List<TurnoEntity> findUnassignedTurnosByServicio(@Param("servicioId") Long servicioId);

    @Query("SELECT t FROM TurnoEntity t WHERE t.funcionario.servicio.id = :servicioId " +
           "AND t.diaFinalTurno >= :fechaInicio AND t.diaInicioTurno <= :fechaFin")
    List<TurnoEntity> findByServicioIdAndDateRange(
            @Param("servicioId") Long servicioId,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin);

    // ====================================================================
    // OPTIMIZACIONES PISOS Y CALENDARIO
    // ====================================================================

    @Query("SELECT t FROM TurnoEntity t WHERE t.piso.id = :idPiso " +
           "AND t.diaInicioTurno >= :fechaInicio AND t.diaInicioTurno <= :fechaFin")
    List<TurnoEntity> findByPisoIdAndDateRange(
            @Param("idPiso") Long idPiso,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin);

    List<TurnoEntity> findByDiaInicioTurnoBetweenAndPiso_IdIn(
            LocalDate fechaInicio, 
            LocalDate fechaFin, 
            List<Long> pisosIds);

    @Query(value = "CALL obtener_turnos_calendario(:servicioId, :fechaInicio, :fechaFin)", nativeQuery = true)
    List<Object[]> findTurnosCalendario(
            @Param("servicioId") Long servicioId,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin);

    @Query("SELECT t FROM TurnoEntity t WHERE t.plantillaTurno.id = :plantillaId " +
           "AND t.diaInicioTurno <= :fechaFin AND t.diaFinalTurno >= :fechaInicio")
    List<TurnoEntity> findConflictosByPlantilla(
            @Param("plantillaId") Long plantillaId,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin);
}