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

@Repository
public interface FuncionarioRepository extends JpaRepository<FuncionarioEntity, Long> {

    // Repository para encontrar el usuario por id
    FuncionarioEntity findByIdFuncionario(Long idFuncionario);

    /**
     * Lock pesimista (SELECT ... FOR UPDATE) sobre la fila del funcionario. Se usa para
     * serializar el chequeo+creación de turnos de un mismo funcionario: mientras una transacción
     * mantiene el lock, otra que intente el mismo funcionario espera hasta el commit y recién ahí
     * ve el turno ya creado, cerrando la carrera check-then-act que permitía doble-reserva.
     * Debe invocarse dentro de una transacción (si no, lanza).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT f FROM FuncionarioEntity f WHERE f.idFuncionario = :id")
    Optional<FuncionarioEntity> lockFuncionario(@Param("id") Long id);

    // Repository para encontrar al usuario por el rut (excluye eliminados: no autentica ni lista bajas)
    @Query ("SELECT f FROM FuncionarioEntity f WHERE f.rut = :rut AND f.eliminado = false")
    FuncionarioEntity findByRut(@Param ("rut") String rut);

    boolean existsByRut(String rut);

    // Funcionarios no eliminados (para listado global cuando no se filtra por servicio)
    List<FuncionarioEntity> findByEliminadoFalse();

    /**
     * Obtiene todos los funcionarios (no eliminados) de un servicio específico.
     *
     */
    @Query ("SELECT f FROM FuncionarioEntity f " +
            "JOIN f.serviciosFuncionario sf " +
            "WHERE sf.servicio.idServicio = :idServicio " +
            "AND f.eliminado = false")
    List<FuncionarioEntity> findAllByServicioId(@Param ("idServicio") Long idServicio);

    //Query para contar usuarios activos
    // V2: Count users by estado for a given servicio id (soporta múltiples servicios)
    @Query("SELECT COUNT(DISTINCT f) FROM FuncionarioEntity f " +
           "LEFT JOIN f.serviciosFuncionario sf " +
           "WHERE f.estado = :estado " +
           "AND (:servicioId IS NULL OR sf.servicio.idServicio = :servicioId)")
    Long countByEstadoAndServicioId(@Param("estado") Integer estado, @Param("servicioId") Long servicioId);


    @Query("SELECT COUNT(sf) FROM FuncionarioEntity f JOIN f.serviciosFuncionario sf WHERE sf.servicio.idServicio = :idServicio")
    long contarFuncionariosPorServicio(@Param("idServicio") Long idServicio);
}
