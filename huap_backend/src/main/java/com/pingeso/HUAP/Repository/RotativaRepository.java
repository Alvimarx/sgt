package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.RotativaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio de {@link RotativaEntity}.
 *
 * <p>CRUD de Spring Data más consultas por servicio y verificación de nombre duplicado. Las
 * variantes {@code ...EliminadoFalse} operan solo sobre rotativas <b>vigentes</b> (soft-delete).
 */
@Repository
public interface RotativaRepository extends JpaRepository<RotativaEntity, Long> {

    /** Rotativas de un servicio (incluye eliminadas). */
    List<RotativaEntity> findByServicio_IdServicio(Long idServicio);

    /** ¿Existe una rotativa con ese nombre en el servicio (incluye eliminadas)? */
    boolean existsByServicio_IdServicioAndNombre(
            Long idServicio,
            String nombre
    );

    /** Todas las rotativas vigentes (no eliminadas). */
    List<RotativaEntity> findByEliminadoFalse();

    /** Rotativas vigentes de un servicio. */
    List<RotativaEntity> findByServicio_IdServicioAndEliminadoFalse(Long idServicio);

    /** ¿Existe una rotativa <b>vigente</b> con ese nombre en el servicio? (para evitar duplicados). */
    boolean existsByServicio_IdServicioAndNombreAndEliminadoFalse(Long idServicio, String nombre);
}
