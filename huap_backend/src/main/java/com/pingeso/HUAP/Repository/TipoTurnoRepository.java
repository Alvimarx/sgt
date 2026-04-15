package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.TipoTurnoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TipoTurnoRepository extends JpaRepository<TipoTurnoEntity, Long> {

    // Buscar por nombre
    List<TipoTurnoEntity> findByNombre(String nombre);

    // Buscar por la PK de Categoria
    List<TipoTurnoEntity> findByCategoriaIdCategoriaTipoTurno(Long idCategoria);

    // Buscar por la PK de Creador
    List<TipoTurnoEntity> findByCreadorIdPersonal(Long idCreador);

    // Buscar por categoría, ordenado por prioridad interna
    List<TipoTurnoEntity> findByCategoriaIdCategoriaTipoTurnoOrderByPrioridadInternaAsc(Long idCategoria);

    // Query compleja para el "pintado":
    // Obtener todos los tipos de turno de un servicio,
    // ordenados primero por la prioridad de la CATEGORÍA,
    // y luego por la prioridad INTERNA del tipo de turno.
    @Query("SELECT tt FROM TipoTurnoEntity tt " +
            "JOIN tt.categoria c " +
            "WHERE c.servicio.idServicio = :idServicio " +
            "ORDER BY c.prioridad ASC, tt.prioridadInterna ASC")
    List<TipoTurnoEntity> findAllByServicioIdOrdenadoParaPintado(@Param("idServicio") Long idServicio);

}