package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.Entity.PlantillaTurnoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalTime;
import java.util.List;

@Repository
public interface PlantillaTurnoRepository
        extends JpaRepository<PlantillaTurnoEntity, Long> {

    // Obtener todos los turnos de una plantilla
    List<PlantillaTurnoEntity>
    findByPlantilla_IdPlantilla(Long idPlantilla);

    // Validar nombres repetidos dentro de una plantilla
    boolean existsByPlantilla_IdPlantillaAndNombre(
            Long idPlantilla,
            String nombre
    );

    // Buscar posibles solapamientos
    List<PlantillaTurnoEntity>
    findByPlantilla_IdPlantillaAndHoraInicioLessThanAndHoraTerminoGreaterThan(
            Long idPlantilla,
            LocalTime horaTermino,
            LocalTime horaInicio
    );
}