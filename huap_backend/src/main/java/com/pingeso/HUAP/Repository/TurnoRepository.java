package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.TurnoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TurnoRepository extends JpaRepository<TurnoEntity, Long> {

    List<TurnoEntity> findByIdMedico(Long idMedico);

    @Query("SELECT t FROM TurnoEntity t WHERE t.idMedico = :idMedico AND YEAR(t.diaInicioTurno) = :year AND MONTH(t.diaInicioTurno) = :month AND t.diaInicioTurno < :today ORDER BY t.diaInicioTurno DESC")
    List<TurnoEntity> findByMedicoAndMonthAndYearAndPast(@Param("idMedico") Long idMedico, @Param("year") int year, @Param("month") int month, @Param("today") LocalDate today);

    List<TurnoEntity> findByIdPiso(String idPiso);

    List<TurnoEntity> findByEstado(String estado);

    List<TurnoEntity> findByTipoTurno(String tipoTurno);

    List<TurnoEntity> findByTipoDeTurnoCantidad(String tipoDeTurnoCantidad);

    List<TurnoEntity> findByNombre(String nombre);

    List<TurnoEntity> findByCreadorIdPersonal(Long idCreador);

    List<TurnoEntity> findByAsignadorIdPersonal(Long idAsignador);

    //encontrar el turno por id
    Optional<TurnoEntity> findById(Long id);

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