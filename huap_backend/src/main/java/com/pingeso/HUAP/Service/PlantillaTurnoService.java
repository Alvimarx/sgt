package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.PlantillaTurnoEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Repository.PlantillaDiaRepository;
import com.pingeso.HUAP.Repository.PlantillaTurnoRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.List;

@Service
@Transactional
public class PlantillaTurnoService {

    private final PlantillaTurnoRepository plantillaTurnoRepository;
    private final PlantillaDiaRepository plantillaDiaRepository;
    private final ServicioRepository servicioRepository;

    public PlantillaTurnoService(
            PlantillaTurnoRepository plantillaTurnoRepository,
            PlantillaDiaRepository plantillaDiaRepository,
            ServicioRepository servicioRepository
    ) {
        this.plantillaTurnoRepository = plantillaTurnoRepository;
        this.plantillaDiaRepository = plantillaDiaRepository;
        this.servicioRepository = servicioRepository;
    }

    // =========================================================
    // CRUD DEL CATÁLOGO DE TIPOS DE TURNO
    // =========================================================

    public PlantillaTurnoEntity crearTipoDeTurno(
            String nombre,
            LocalTime horaInicio,
            LocalTime horaTermino,
            Long idServicio
    ) {
        validarHorario(horaInicio, horaTermino);

        ServicioEntity servicio = servicioRepository.findById(idServicio)
                .orElseThrow(() -> new RuntimeException("Servicio no encontrado"));

        if (plantillaTurnoRepository.existsByServicio_IdServicioAndNombre(idServicio, nombre)) {
            throw new RuntimeException("Ya existe un tipo de turno con el nombre '" + nombre + "' en este servicio");
        }

        return plantillaTurnoRepository.save(new PlantillaTurnoEntity(nombre, servicio, horaInicio, horaTermino));
    }

    public PlantillaTurnoEntity obtenerTipoDeTurno(Long idPlantillaTurno) {
        return plantillaTurnoRepository.findById(idPlantillaTurno)
                .orElseThrow(() -> new RuntimeException("Tipo de turno no encontrado"));
    }

    public List<PlantillaTurnoEntity> obtenerCatalogo() {
        return plantillaTurnoRepository.findAll();
    }

    /**
     * Devuelve todos los tipos de turno que pertenecen a un servicio específico.
     */
    public List<PlantillaTurnoEntity> obtenerTiposDeTurnoPorServicio(Long idServicio) {
        return plantillaTurnoRepository.findByServicio_IdServicio(idServicio);
    }

    public PlantillaTurnoEntity actualizarTipoDeTurno(
            Long idPlantillaTurno,
            String nombre,
            LocalTime horaInicio,
            LocalTime horaTermino
    ) {
        validarHorario(horaInicio, horaTermino);
        PlantillaTurnoEntity tipo = obtenerTipoDeTurno(idPlantillaTurno);

        Long idServicio = tipo.getServicio().getIdServicio();
        if (plantillaTurnoRepository.existsByServicio_IdServicioAndNombreAndIdPlantillaTurnoNot(idServicio, nombre, idPlantillaTurno)) {
            throw new RuntimeException("Ya existe un tipo de turno con el nombre '" + nombre + "' en este servicio");
        }

        tipo.setNombre(nombre);
        tipo.setHoraInicio(horaInicio);
        tipo.setHoraTermino(horaTermino);

        return plantillaTurnoRepository.save(tipo);
    }

    

    /**
     * Elimina un tipo de turno del catálogo.
     * Falla si el tipo está referenciado en la secuencia de alguna rotativa.
     */
    public void eliminarTipoDeTurno(Long idPlantillaTurno) {
        obtenerTipoDeTurno(idPlantillaTurno);

        long usos = plantillaDiaRepository.countByPlantillaTurno_IdPlantillaTurno(idPlantillaTurno);
        if (usos > 0) {
            throw new RuntimeException(
                    "No se puede eliminar: el tipo de turno está asignado a "
                    + usos + " día(s) en rotativas existentes."
            );
        }

        plantillaTurnoRepository.deleteById(idPlantillaTurno);
    }

    // =========================================================
    // VALIDACIONES PRIVADAS
    // =========================================================

    private void validarHorario(LocalTime horaInicio, LocalTime horaTermino) {
        if (horaInicio.equals(horaTermino)) {
            throw new RuntimeException("La hora de inicio y término no pueden ser iguales");
        }
    }
}
