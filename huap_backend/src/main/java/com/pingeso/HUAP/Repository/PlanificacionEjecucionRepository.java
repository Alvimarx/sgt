package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.PlanificacionEjecucionEntity;
import com.pingeso.HUAP.Entity.PlanificacionEjecucionEntity.EstadoEjecucion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Repositorio de {@link PlanificacionEjecucionEntity}.
 *
 * <p>Además del CRUD de Spring Data, ofrece la consulta de solapamiento de vigencias efectivas
 * (base de la regla "una sola planificación efectiva por servicio") y la búsqueda de la ejecución
 * vigente que cubre una fecha dada (base de "editar planificación desde fecha").
 */
@Repository
public interface PlanificacionEjecucionRepository extends JpaRepository<PlanificacionEjecucionEntity, Long> {

    List<PlanificacionEjecucionEntity> findByPlanificacion_IdPlanificacion(Long idPlanificacion);

    /** Ejecuciones de un servicio en el estado dado, para validar superposición o ubicar la vigente. */
    List<PlanificacionEjecucionEntity> findByServicio_IdServicioAndEstado(Long idServicio, EstadoEjecucion estado);

    /** Ejecución activa de un servicio cuyo rango efectivo contiene la fecha dada, si existe. */
    @Query("""
           SELECT e FROM PlanificacionEjecucionEntity e
           WHERE e.servicio.idServicio = :idServicio
           AND e.estado = :estado
           AND e.fechaInicioEfectiva <= :fecha
           AND e.fechaFinEfectiva >= :fecha
           """)
    Optional<PlanificacionEjecucionEntity> findVigenteEnFecha(
            @Param("idServicio") Long idServicio,
            @Param("fecha") LocalDate fecha,
            @Param("estado") EstadoEjecucion estado
    );

    /** Ejecuciones de un servicio y estado cuyo rango comienza en o después de la fecha dada, ordenadas por inicio. */
    @Query("""
           SELECT e FROM PlanificacionEjecucionEntity e
           WHERE e.servicio.idServicio = :idServicio
           AND e.estado = :estado
           AND e.fechaInicioEfectiva >= :fecha
           ORDER BY e.fechaInicioEfectiva ASC
           """)
    List<PlanificacionEjecucionEntity> findDesde(
            @Param("idServicio") Long idServicio,
            @Param("fecha") LocalDate fecha,
            @Param("estado") EstadoEjecucion estado
    );

    /** Ejecuciones de un servicio y estado, ordenadas por fecha de término efectivo descendente (la más reciente primero). */
    List<PlanificacionEjecucionEntity> findByServicio_IdServicioAndEstadoOrderByFechaFinEfectivaDesc(
            Long idServicio, EstadoEjecucion estado);

    /**
     * Todas las ejecuciones (cualquier estado, de cualquier molde) de un servicio, más recientes
     * primero. Permite al usuario ver y actuar sobre "las planificaciones vigentes" del servicio
     * sin depender de tener cargado el molde específico que las generó.
     */
    List<PlanificacionEjecucionEntity> findByServicio_IdServicioOrderByFechaInicioEfectivaDesc(Long idServicio);
}
