package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.ServicioEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio de {@link ServicioEntity}.
 *
 * <p>CRUD de Spring Data más consultas por nombre (exacto/parcial), verificación de existencia y
 * variantes paginadas. Las variantes {@code ...EliminadoFalse} devuelven solo los servicios
 * <b>vigentes</b> (soft-delete); {@link #findByEliminadoTrue()} devuelve los inactivos.
 */
@Repository
public interface ServicioRepository extends JpaRepository<ServicioEntity, Long> {

    /** Busca un servicio por nombre exacto (incluye eliminados). */
    Optional<ServicioEntity> findByNombre(String nombre);

    /** ¿Existe un servicio con ese nombre (sin distinción de mayúsculas, incluye eliminados)? */
    boolean existsByNombreIgnoreCase(String nombre);

    /** Búsqueda paginada por nombre parcial (incluye eliminados). */
    Page<ServicioEntity> findByNombreContainingIgnoreCase(String nombre, Pageable pageable);

    /** Todos los servicios vigentes (no eliminados). */
    List<ServicioEntity> findByEliminadoFalse();

    /** Todos los servicios inactivos (eliminados). */
    List<ServicioEntity> findByEliminadoTrue();

    /** Servicios vigentes, paginados. */
    Page<ServicioEntity> findByEliminadoFalse(Pageable pageable);

    /** Busca un servicio vigente por nombre exacto. */
    Optional<ServicioEntity> findByNombreAndEliminadoFalse(String nombre);

    /** ¿Existe un servicio vigente con ese nombre (sin distinción de mayúsculas)? */
    boolean existsByNombreIgnoreCaseAndEliminadoFalse(String nombre);

    /** Búsqueda paginada de servicios vigentes por nombre parcial. */
    Page<ServicioEntity> findByNombreContainingIgnoreCaseAndEliminadoFalse(String nombre, Pageable pageable);

    /**
     * Lock pesimista (SELECT ... FOR UPDATE) sobre la fila del servicio. Se usa para serializar,
     * entre peticiones concurrentes, la validación de no-superposición de vigencias efectivas de
     * planificación más la creación de la nueva {@code PlanificacionEjecucionEntity}: mientras una
     * transacción mantiene el lock, otra que intente generar/extender/editar una planificación del
     * mismo servicio espera hasta el commit y recién ahí ve la ejecución ya creada, evitando que dos
     * generaciones concurrentes creen vigencias superpuestas. Debe invocarse dentro de una transacción.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM ServicioEntity s WHERE s.idServicio = :id")
    Optional<ServicioEntity> lockServicio(@Param("id") Long id);

}
