package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.RotativaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RotativaRepository extends JpaRepository<RotativaEntity, Long> {

    List<RotativaEntity> findByServicio_IdServicio(Long idServicio);

    boolean existsByServicio_IdServicioAndNombre(
            Long idServicio,
            String nombre
    );

    List<RotativaEntity> findByEliminadoFalse();

    List<RotativaEntity> findByServicio_IdServicioAndEliminadoFalse(Long idServicio);

    boolean existsByServicio_IdServicioAndNombreAndEliminadoFalse(Long idServicio, String nombre);
}