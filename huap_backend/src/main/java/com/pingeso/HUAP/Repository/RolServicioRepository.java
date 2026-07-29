package com.pingeso.HUAP.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.pingeso.HUAP.Entity.RolServicioEntity;

/**
 * Repositorio de {@link RolServicioEntity}.
 *
 * <p>Proporciona accesos básicos para consultar los roles asociados a servicios y
 * resolver entidades por su identificador interno.</p>
 */
@Repository
public interface RolServicioRepository extends JpaRepository<RolServicioEntity,Long> {

    // ====================================================================
    // BÚSQUEDAS BÁSICAS POR ENTIDAD
    // ====================================================================

    /** Recupera un rol de servicio por su identificador interno. */
    RolServicioEntity findByIdRolServicio(Long idRolServicio);
    
}
