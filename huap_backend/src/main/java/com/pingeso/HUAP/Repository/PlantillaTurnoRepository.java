package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.PlantillaTurnoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PlantillaTurnoRepository extends JpaRepository<PlantillaTurnoEntity, Long> {

    boolean existsByServicio_IdServicioAndNombre(Long idServicio, String nombre);

    boolean existsByServicio_IdServicioAndNombreAndIdPlantillaTurnoNot(Long idServicio, String nombre, Long idPlantillaTurno);

    // Busca todos los tipos de turno asociados a un ID de servicio específico
    List<PlantillaTurnoEntity> findByServicio_IdServicio(Long idServicio);

}
