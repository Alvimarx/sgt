package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.PlanificacionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlanificacionRepository extends JpaRepository<PlanificacionEntity, Long> {

    List<PlanificacionEntity> findByServicio_IdServicio(Long idServicio);

    boolean existsByServicio_IdServicioAndNombre(Long idServicio, String nombre);

    boolean existsByServicio_IdServicioAndNombreAndIdPlanificacionNot(Long idServicio, String nombre, Long idPlanificacion);
}
