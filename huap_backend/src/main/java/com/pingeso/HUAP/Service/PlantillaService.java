package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.PlantillaEntity;
import com.pingeso.HUAP.Entity.PlantillaTurnoEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Repository.PlantillaRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Transactional
public class PlantillaService {

    private final PlantillaRepository plantillaRepository;
    private final ServicioRepository servicioRepository;

    public PlantillaService(
            PlantillaRepository plantillaRepository,
            ServicioRepository servicioRepository
    ) {
        this.plantillaRepository = plantillaRepository;
        this.servicioRepository = servicioRepository;
    }

    // Crear plantilla
    public PlantillaEntity crearPlantilla(
            Long idServicio,
            String nombre,
            Byte semanas
    ) {

        ServicioEntity servicio = servicioRepository.findById(idServicio)
                .orElseThrow(() ->
                        new RuntimeException("Servicio no encontrado")
                );

        if (plantillaRepository.existsByServicio_IdServicioAndNombre(
                idServicio,
                nombre
        )) {
            throw new RuntimeException(
                    "Ya existe una plantilla con ese nombre en el servicio"
            );
        }

        if (semanas <= 0) {
            throw new RuntimeException(
                    "La cantidad de semanas debe ser mayor a 0"
            );
        }

        PlantillaEntity plantilla = new PlantillaEntity(
                servicio,
                nombre,
                semanas
        );

        return plantillaRepository.save(plantilla);
    }

    // Obtener plantilla por id
    public PlantillaEntity obtenerPlantilla(Long idPlantilla) {

        return plantillaRepository.findById(idPlantilla)
                .orElseThrow(() ->
                        new RuntimeException("Plantilla no encontrada")
                );
    }

    // Obtener todas las plantillas
    public List<PlantillaEntity> obtenerPlantillas() {
        return plantillaRepository.findAll();
    }

    // Obtener plantillas por servicio
    public List<PlantillaEntity> obtenerPlantillasPorServicio(
            Long idServicio
    ) {
        return plantillaRepository.findByServicio_IdServicio(idServicio);
    }

    // Actualizar plantilla
    public PlantillaEntity actualizarPlantilla(
            Long idPlantilla,
            String nombre,
            Byte semanas
    ) {

        PlantillaEntity plantilla = obtenerPlantilla(idPlantilla);

        if (semanas <= 0) {
            throw new RuntimeException(
                    "La cantidad de semanas debe ser mayor a 0"
            );
        }

        plantilla.setNombre(nombre);
        plantilla.setSemanas(semanas);

        return plantillaRepository.save(plantilla);
    }

    // Eliminar plantilla
    public void eliminarPlantilla(Long idPlantilla) {

        PlantillaEntity plantilla = obtenerPlantilla(idPlantilla);

        plantillaRepository.delete(plantilla);
    }

    // Duplicar plantilla
    public PlantillaEntity duplicarPlantilla(Long idPlantilla) {

        PlantillaEntity original = obtenerPlantilla(idPlantilla);

        PlantillaEntity copia = new PlantillaEntity(
                original.getServicio(),
                original.getNombre() + " - copia",
                original.getSemanas()
        );

        for (PlantillaTurnoEntity turno : original.getTurnos()) {

            PlantillaTurnoEntity nuevoTurno =
                    new PlantillaTurnoEntity();

            nuevoTurno.setNombre(turno.getNombre());
            nuevoTurno.setHoraInicio(turno.getHoraInicio());
            nuevoTurno.setHoraTermino(turno.getHoraTermino());

            copia.addTurno(nuevoTurno);
        }

        return plantillaRepository.save(copia);
    }

    // Validar plantilla
    public void validarPlantilla(Long idPlantilla) {

        PlantillaEntity plantilla = obtenerPlantilla(idPlantilla);

        if (plantilla.getSemanas() <= 0) {
            throw new RuntimeException(
                    "La plantilla debe tener al menos una semana"
            );
        }

        if (plantilla.getTurnos().isEmpty()) {
            throw new RuntimeException(
                    "La plantilla debe tener al menos un turno"
            );
        }
    }
}