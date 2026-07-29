package com.pingeso.HUAP.Repository;

import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.JpaRepository;

import com.pingeso.HUAP.Entity.ServiciosFuncionarioEntity;

import java.util.List;

/**
 * Repositorio de {@link ServiciosFuncionarioEntity}.
 *
 * <p>Gestiona la relación entre servicios y funcionarios, incluyendo la carga de asociaciones
 * vigentes para operaciones de administración y validaciones de pertenencia.
 */
@Repository
public interface ServiciosFuncionarioRepository extends JpaRepository<ServiciosFuncionarioEntity, Long> {

    // ====================================================================
    // BÚSQUEDAS POR SERVICIO Y FUNCIONARIO
    // ====================================================================

    /** Devuelve las asociaciones vigentes de un servicio, excluyendo funcionarios eliminados. */
    List<ServiciosFuncionarioEntity> findByServicio_IdServicioAndFuncionario_EliminadoFalse(Long idServicio);

    /** Verifica si un funcionario vigente ya está asociado a un servicio. */
    boolean existsByServicio_IdServicioAndFuncionario_IdFuncionarioAndFuncionario_EliminadoFalse(
            Long idServicio,
            Long idFuncionario
    );
    
}
