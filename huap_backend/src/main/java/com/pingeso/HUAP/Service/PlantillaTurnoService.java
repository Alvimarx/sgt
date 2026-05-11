package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.PlantillaEntity;
import com.pingeso.HUAP.Entity.PlantillaTurnoEntity;
import com.pingeso.HUAP.Repository.PlantillaRepository;
import com.pingeso.HUAP.Repository.PlantillaTurnoRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.List;

@Service
@Transactional
public class PlantillaTurnoService {

    private final PlantillaTurnoRepository plantillaTurnoRepository;
    private final PlantillaRepository plantillaRepository;

    public PlantillaTurnoService(
            PlantillaTurnoRepository plantillaTurnoRepository,
            PlantillaRepository plantillaRepository
    ) {
        this.plantillaTurnoRepository = plantillaTurnoRepository;
        this.plantillaRepository = plantillaRepository;
    }

    // Agregar bloque horario a plantilla
    public PlantillaTurnoEntity agregarBloqueHorarioPlantilla(
            Long idPlantilla,
            LocalTime horaInicio,
            LocalTime horaTermino,
            String nombre
    ) {

        PlantillaEntity plantilla = plantillaRepository.findById(idPlantilla)
                .orElseThrow(() ->
                        new RuntimeException("Plantilla no encontrada")
                );

        validarHorario(horaInicio, horaTermino);

        if (plantillaTurnoRepository
                .existsByPlantilla_IdPlantillaAndNombre(
                        idPlantilla,
                        nombre
                )) {

            throw new RuntimeException(
                    "Ya existe un bloque con ese nombre en la plantilla"
            );
        }

        if (existeSolapamientoHorarioPlantilla(
                idPlantilla,
                horaInicio,
                horaTermino
        )) {

            throw new RuntimeException(
                    "Existe solapamiento de horarios"
            );
        }

        PlantillaTurnoEntity bloqueHorario =
                new PlantillaTurnoEntity(
                        plantilla,
                        horaInicio,
                        horaTermino,
                        nombre
                );

        return plantillaTurnoRepository.save(bloqueHorario);
    }

    // Obtener bloque horario por id
    public PlantillaTurnoEntity obtenerBloqueHorarioPlantilla(
            Long idPlantillaTurno
    ) {

        return plantillaTurnoRepository.findById(idPlantillaTurno)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Bloque horario no encontrado"
                        )
                );
    }

    // Obtener bloques horarios de plantilla
    public List<PlantillaTurnoEntity>
    obtenerBloquesHorarioPorPlantilla(Long idPlantilla) {

        return plantillaTurnoRepository
                .findByPlantilla_IdPlantilla(idPlantilla);
    }

    // Actualizar bloque horario
    public PlantillaTurnoEntity actualizarBloqueHorarioPlantilla(
            Long idPlantillaTurno,
            LocalTime horaInicio,
            LocalTime horaTermino,
            String nombre
    ) {

        PlantillaTurnoEntity bloqueHorario =
                obtenerBloqueHorarioPlantilla(idPlantillaTurno);

        validarHorario(horaInicio, horaTermino);

        List<PlantillaTurnoEntity> solapamientos =
                plantillaTurnoRepository
                        .findByPlantilla_IdPlantillaAndHoraInicioLessThanAndHoraTerminoGreaterThan(
                                bloqueHorario.getPlantilla().getIdPlantilla(),
                                horaTermino,
                                horaInicio
                        );

        boolean existeOtroSolapado = solapamientos.stream()
                .anyMatch(t ->
                        !t.getIdPlantillaTurno()
                                .equals(idPlantillaTurno)
                );

        if (existeOtroSolapado) {

            throw new RuntimeException(
                    "Existe solapamiento de horarios"
            );
        }

        bloqueHorario.setHoraInicio(horaInicio);
        bloqueHorario.setHoraTermino(horaTermino);
        bloqueHorario.setNombre(nombre);

        return plantillaTurnoRepository.save(bloqueHorario);
    }

    // Eliminar bloque horario
    public void eliminarBloqueHorarioPlantilla(
            Long idPlantillaTurno
    ) {

        PlantillaTurnoEntity bloqueHorario =
                obtenerBloqueHorarioPlantilla(idPlantillaTurno);

        plantillaTurnoRepository.delete(bloqueHorario);
    }

    // Validar horarios
    private void validarHorario(
            LocalTime horaInicio,
            LocalTime horaTermino
    ) {

        if (horaInicio.equals(horaTermino)) {

            throw new RuntimeException(
                    "La hora de inicio y término no pueden ser iguales"
            );
        }
    }

    // Validar solapamientos
    public boolean existeSolapamientoHorarioPlantilla(
            Long idPlantilla,
            LocalTime horaInicio,
            LocalTime horaTermino
    ) {

        List<PlantillaTurnoEntity> solapamientos =
                plantillaTurnoRepository
                        .findByPlantilla_IdPlantillaAndHoraInicioLessThanAndHoraTerminoGreaterThan(
                                idPlantilla,
                                horaTermino,
                                horaInicio
                        );

        return !solapamientos.isEmpty();
    }
}