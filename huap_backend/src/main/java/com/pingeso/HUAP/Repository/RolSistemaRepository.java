package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.RolSistemaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repositorio de {@link RolSistemaEntity}.
 *
 * <p>Proporciona el acceso base para consultar los roles del sistema y mantener la
 * coherencia con el CRUD estándar de Spring Data.</p>
 */
@Repository
public interface RolSistemaRepository extends JpaRepository<RolSistemaEntity, Long> {
}
