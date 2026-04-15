package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.TipoTurnoEntity;
import com.pingeso.HUAP.Entity.TurnoBaseEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TurnoBaseRepository extends JpaRepository<TurnoBaseEntity, Long> {

    // Métodos de búsqueda por atributos
    List<TurnoBaseEntity> findByNombre(String nombre);

    List<TurnoBaseEntity> findByTipoTurno(Long tipoTurno);

    // Métodos de búsqueda por Llaves Foráneas

    // Busca por la PK de la entidad Servicio (asumiendo que es idServicio)
    List<TurnoBaseEntity> findByServicioIdServicio(Long idServicio);

    // Busca por la PK de la entidad Personal (asumiendo que es idPersonal)
    List<TurnoBaseEntity> findByCreadorIdPersonal(Long idCreador);
}