package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.FuncionarioEntity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface FuncionarioRepository extends JpaRepository<FuncionarioEntity, Long> {

    // Repository para encontrar el usuario por id
    FuncionarioEntity findByIdFuncionario(Long idFuncionario);

    // Repository para encontrar al usuario por el rut
    @Query ("SELECT f FROM FuncionarioEntity f WHERE f.rut = :rut")
    FuncionarioEntity findByRut(@Param ("rut") String rut); 

    /**
     * Obtiene todos los funcionarios de un servicio específico.
     * 
     */
    @Query ("SELECT f FROM FuncionarioEntity f " +
            "JOIN f.serviciosFuncionario sf " +
            "WHERE sf.servicio.idServicio = :idServicio")
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
