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

    Optional<TurnoEntity> findById(Long id);

    List<TurnoEntity> findByNombre(String nombre);

    List<TurnoEntity> findByFuncionario_Id(Long idServicioFuncionario);

    List<TurnoEntity> findByServicio_Id(Long idServicio);

    List<TurnoEntity> findByPiso_Id(Long idPiso);

    List<TurnoEntity> findByPlantilla_Id(Long idPlantilla);

    // Métodos para encontrar turnos sin asignar (funcionario null)
    List<TurnoEntity> findByFuncionarioIsNull();
        // Método para encontrar turnos sin asignar de un servicio específico
    @Query("SELECT t FROM TurnoEntity t WHERE t.funcionario IS NULL AND t.servicio.id = :servicioId")
    List<TurnoEntity> findUnassignedTurnosByServicio(@Param("servicioId") Long servicioId);

    // - - - VISTAS CALENDARIO - - -

    // Obtener turnos por rango de fechas y servicio (para cobertura del calendario)
    @Query("SELECT t FROM TurnoEntity t WHERE t.servicio.id = :servicioId " +
           "AND t.diaFinalTurno >= :fechaInicio AND t.diaInicioTurno <= :fechaFin")
    List<TurnoEntity> findByServicioIdAndDateRange(
            @Param("servicioId") Long servicioId,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin);

    // Obtener los turnos de un funcionario específico por rango de fechas y servicio 
    @Query("SELECT t FROM TurnoEntity t WHERE t.servicio.id = :servicioId " +
           "AND t.funcionario.id = :funcionarioId " +
           "AND t.diaFinalTurno >= :fechaInicio AND t.diaInicioTurno <= :fechaFin")
    List<TurnoEntity> findByServicioIdAndFuncionarioIdAndDateRange(
            @Param("servicioId") Long servicioId,
            @Param("funcionarioId") Long funcionarioId,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin);


    // - - - RESOLUCION DE CONFLICTOS - - -

    // Método para detectar conflictos de turnos en un rango de fechas para un funcionario específico, independiente del servicio
    @Query("SELECT t FROM TurnoEntity t WHERE t.funcionario.id = :funcionarioId " +
           "AND t.diaFinalTurno >= :fechaInicio AND t.diaInicioTurno <= :fechaFin")
    List<TurnoEntity> findConflictosByFuncionario(
            @Param("funcionarioId") Long funcionarioId,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin);

    // Método para detectar conflictos de turnos en un rango de fechas para un piso específico, independiente del servicio
    @Query("SELECT t FROM TurnoEntity t WHERE t.piso.id = :pisoId " +
           "AND t.diaFinalTurno >= :fechaInicio AND t.diaInicioTurno <= :fechaFin")
    List<TurnoEntity> findByPisoIdAndDateRange(
            @Param("pisoId") Long pisoId,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin);

    // Verificar conflictos de turnos en un rango de fechas para una plantilla específica
    @Query("SELECT t FROM TurnoEntity t WHERE t.plantilla.id = :plantillaId " +
           "AND t.servicio.id = :servicioId " +
           "AND t.diaFinalTurno >= :fechaInicio AND t.diaInicioTurno <= :fechaFin")
    List<TurnoEntity> findConflictsByPlantilla(
            @Param("plantillaId") Long plantillaId,
            @Param("servicioId") Long servicioId,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin);

    

}