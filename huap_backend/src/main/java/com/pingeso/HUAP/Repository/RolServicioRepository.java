package com.pingeso.HUAP.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.pingeso.HUAP.Entity.RolServicioEntity;

@Repository
public interface RolServicioRepository extends JpaRepository<RolServicioEntity,Long> {

    RolServicioEntity findByIdRolServicio(Long idRolServicio);
    
}
