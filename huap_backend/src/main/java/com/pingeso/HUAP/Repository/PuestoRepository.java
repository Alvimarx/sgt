package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.PuestoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PuestoRepository extends JpaRepository<PuestoEntity, Long> {

    Optional<PuestoEntity> findByNombre(String nombre);

    List<PuestoEntity> findByServicio_IdServicio(Long idServicio);

    List<PuestoEntity> findByEliminadoFalse();

    List<PuestoEntity> findByServicio_IdServicioAndEliminadoFalse(Long idServicio);

    Optional<PuestoEntity> findByNombreAndEliminadoFalse(String nombre);
}
