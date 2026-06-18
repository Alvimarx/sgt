package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.PlanificacionAsignacionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PlanificacionAsignacionRepository extends JpaRepository<PlanificacionAsignacionEntity, Long> {

    /**
     * Borra todas las asignaciones de planificación que usan una rotativa concreta.
     */
    @Modifying
    @Query("DELETE FROM PlanificacionAsignacionEntity a WHERE a.plantilla.idPlantilla = :idPlantilla")
    int deleteByPlantilla(@Param("idPlantilla") Long idPlantilla);

    /**
     * Borra las rotativas de planificación que usan un puesto concreto.
     */
    @Modifying
    @Query("DELETE FROM PlanificacionAsignacionEntity a WHERE a.puesto.idPuesto = :idPuesto")
    int deleteByPuesto(@Param("idPuesto") Long idPuesto);

    /**
     * Libera el funcionario de las asignaciones que lo usan (FK nullable)
     */
    @Modifying
    @Query("UPDATE PlanificacionAsignacionEntity a SET a.funcionario = NULL WHERE a.funcionario.idFuncionario = :idFuncionario")
    int liberarFuncionario(@Param("idFuncionario") Long idFuncionario);
}
