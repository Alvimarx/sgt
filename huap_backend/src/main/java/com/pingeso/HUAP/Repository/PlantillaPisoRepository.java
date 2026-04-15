package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.PlantillaPisoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PlantillaPisoRepository extends JpaRepository<PlantillaPisoEntity, Long> {

    // Buscar por creador
    List<PlantillaPisoEntity> findByCreadorIdPersonal(Long idCreador);
}