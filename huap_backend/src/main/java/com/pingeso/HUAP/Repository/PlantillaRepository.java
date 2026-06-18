package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.PlantillaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlantillaRepository extends JpaRepository<PlantillaEntity, Long> {

    List<PlantillaEntity> findByServicio_IdServicio(Long idServicio);

    boolean existsByServicio_IdServicioAndNombre(
            Long idServicio,
            String nombre
    );

    List<PlantillaEntity> findByEliminadoFalse();

    List<PlantillaEntity> findByServicio_IdServicioAndEliminadoFalse(Long idServicio);

    boolean existsByServicio_IdServicioAndNombreAndEliminadoFalse(Long idServicio, String nombre);
}