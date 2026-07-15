package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.TipoTurnoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TipoTurnoRepository extends JpaRepository<TipoTurnoEntity, Long> {

    boolean existsByServicio_IdServicioAndNombre(Long idServicio, String nombre);

    boolean existsByServicio_IdServicioAndNombreAndIdTipoTurnoNot(Long idServicio, String nombre, Long idTipoTurno);

    // Busca todos los tipos de turno asociados a un ID de servicio específico
    List<TipoTurnoEntity> findByServicio_IdServicio(Long idServicio);

    List<TipoTurnoEntity> findByEliminadoFalse();

    List<TipoTurnoEntity> findByServicio_IdServicioAndEliminadoFalse(Long idServicio);

    boolean existsByServicio_IdServicioAndNombreAndEliminadoFalse(Long idServicio, String nombre);

    boolean existsByServicio_IdServicioAndNombreAndIdTipoTurnoNotAndEliminadoFalse(Long idServicio, String nombre, Long idTipoTurno);

}
