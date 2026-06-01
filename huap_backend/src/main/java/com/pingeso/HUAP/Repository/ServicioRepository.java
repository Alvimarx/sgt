package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.ServicioEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServicioRepository extends JpaRepository<ServicioEntity, Long> {

    Optional<ServicioEntity> findByNombre(String nombre);

    boolean existsByNombreIgnoreCase(String nombre);

    Page<ServicioEntity> findByNombreContainingIgnoreCase(String nombre, Pageable pageable);


}