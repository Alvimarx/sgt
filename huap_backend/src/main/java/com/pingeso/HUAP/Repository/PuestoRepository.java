package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.PuestoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio de {@link PuestoEntity}.
 *
 * <p>CRUD de Spring Data más consultas por nombre y por servicio. Las variantes
 * {@code ...EliminadoFalse} devuelven solo los puestos <b>vigentes</b> (soft-delete);
 * las otras incluyen los eliminados.
 */
@Repository
public interface PuestoRepository extends JpaRepository<PuestoEntity, Long> {

    /** Busca un puesto por nombre (incluye eliminados). */
    Optional<PuestoEntity> findByNombre(String nombre);

    /** Puestos de un servicio (incluye eliminados). */
    List<PuestoEntity> findByServicio_IdServicio(Long idServicio);

    /** Todos los puestos vigentes (no eliminados). */
    List<PuestoEntity> findByEliminadoFalse();

    /** Puestos vigentes de un servicio. */
    List<PuestoEntity> findByServicio_IdServicioAndEliminadoFalse(Long idServicio);

    /** Busca un puesto vigente por nombre. */
    Optional<PuestoEntity> findByNombreAndEliminadoFalse(String nombre);
}
