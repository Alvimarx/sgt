package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.PisoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PisoRepository extends JpaRepository<PisoEntity, Long> {
    Optional<PisoEntity> findByNombre(String nombre);
}
