package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.CategoriaTipoTurnoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoriaTipoTurnoRepository extends JpaRepository<CategoriaTipoTurnoEntity, Long> {

    // Buscar por nombre
    List<CategoriaTipoTurnoEntity> findByNombre(String nombre);

    // Buscar por servicio (usando la PK de ServicioEntity)
    List<CategoriaTipoTurnoEntity> findByServicioIdServicio(Long idServicio);

    // Encontrar todas ordenadas por prioridad (para el "pintado")
    List<CategoriaTipoTurnoEntity> findAllByOrderByPrioridadAsc();

    // Encontrar todas de un servicio, ordenadas por prioridad
    List<CategoriaTipoTurnoEntity> findByServicioIdServicioOrderByPrioridadAsc(Long idServicio);

}