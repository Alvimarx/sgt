package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.PlantillaDiaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlantillaDiaRepository extends JpaRepository<PlantillaDiaEntity, Long> {

    List<PlantillaDiaEntity> findByPlantilla_IdPlantillaOrderByDiaIndexAsc(Long idPlantilla);

    // Usado antes de eliminar un tipo de turno del catálogo para validar que no esté en uso.
    long countByPlantillaTurno_IdPlantillaTurno(Long idPlantillaTurno);
}
