package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.FuncionarioEntity;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio de {@link FuncionarioEntity}.
 *
 * <p>Además del CRUD de Spring Data, ofrece consultas para localizar funcionarios por
 * identidad, bloquear filas para operaciones concurrentes, filtrar por estado/servicio y
 * obtener conteos de uso para vistas administrativas. Salvo los conteos "advisory",
 * todas filtran {@code eliminado = false} (soft-delete).
 */
@Repository
public interface FuncionarioRepository extends JpaRepository<FuncionarioEntity, Long> {

    // ====================================================================
    // BÚSQUEDAS BÁSICAS POR ENTIDAD
    // ====================================================================

    /** Funcionario por su identificador interno. */
    FuncionarioEntity findByIdFuncionario(Long idFuncionario);

    /**
     * Lock pesimista (SELECT ... FOR UPDATE) sobre la fila del funcionario. Se usa para
     * serializar el chequeo+creación de turnos de un mismo funcionario: mientras una transacción
     * mantiene el lock, otra que intente el mismo funcionario espera hasta el commit y recién ahí
     * ve el turno ya creado, cerrando la carrera check-then-act que permitía doble-reserva.
     * Debe invocarse dentro de una transacción.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT f FROM FuncionarioEntity f WHERE f.idFuncionario = :id")
    Optional<FuncionarioEntity> lockFuncionario(@Param("id") Long id);

    // ====================================================================
    // BÚSQUEDAS POR RUT Y ESTADO
    // ====================================================================

    /** Funcionario vigente por su RUT. */
    @Query("SELECT f FROM FuncionarioEntity f WHERE f.rut = :rut AND f.eliminado = false")
    FuncionarioEntity findByRut(@Param("rut") String rut);

    /** Verifica si ya existe un funcionario vigente con el RUT indicado. */
    boolean existsByRut(String rut);

    /** Todos los funcionarios vigentes (no eliminados). */
    List<FuncionarioEntity> findByEliminadoFalse();

    // ====================================================================
    // BÚSQUEDAS POR SERVICIO
    // ====================================================================

    /** Obtiene todos los funcionarios vigentes de un servicio específico. */
    @Query("SELECT f FROM FuncionarioEntity f " +
            "JOIN f.serviciosFuncionario sf " +
            "WHERE sf.servicio.idServicio = :idServicio " +
            "AND f.eliminado = false")
    List<FuncionarioEntity> findAllByServicioId(@Param ("idServicio") Long idServicio);

    // ====================================================================
    // CONTEOS Y ESTADÍSTICAS
    // ====================================================================

    /** Cuenta funcionarios por estado, opcionalmente filtrando por un servicio. */
    @Query("SELECT COUNT(DISTINCT f) FROM FuncionarioEntity f " +
           "LEFT JOIN f.serviciosFuncionario sf " +
           "WHERE f.estado = :estado " +
           "AND (:servicioId IS NULL OR sf.servicio.idServicio = :servicioId)")
    Long countByEstadoAndServicioId(@Param("estado") Integer estado, @Param("servicioId") Long servicioId);

    /** Cuenta cuántos funcionarios están asociados a un servicio. */
    @Query("SELECT COUNT(sf) FROM FuncionarioEntity f JOIN f.serviciosFuncionario sf WHERE sf.servicio.idServicio = :idServicio")
    long contarFuncionariosPorServicio(@Param("idServicio") Long idServicio);
}
