package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.PlantillaPisoLineaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PlantillaPisoLineaRepository extends JpaRepository<PlantillaPisoLineaEntity, Long> {
    // Obtener todas las líneas de una plantilla, ordenadas por 'orden'
    List<PlantillaPisoLineaEntity> findByPlantillaPisoIdPlantillaPisoOrderByOrdenAsc(Long idPlantillaPiso);

    void deleteByPlantillaPisoIdPlantillaPiso(Long idPlantillaPiso);
}