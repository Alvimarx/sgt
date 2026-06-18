package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.PlantillaTurnoEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Repository.PlantillaDiaRepository;
import com.pingeso.HUAP.Repository.PlantillaTurnoRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
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
    private final TurnoRepository turnoRepository;

    public PlantillaTurnoService(
            PlantillaTurnoRepository plantillaTurnoRepository,
            PlantillaDiaRepository plantillaDiaRepository,
            ServicioRepository servicioRepository,
            TurnoRepository turnoRepository
    ) {
        this.plantillaTurnoRepository = plantillaTurnoRepository;
        this.plantillaDiaRepository = plantillaDiaRepository;
        this.servicioRepository = servicioRepository;
        this.turnoRepository = turnoRepository;
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

        if (plantillaTurnoRepository.existsByServicio_IdServicioAndNombreAndEliminadoFalse(idServicio, nombre)) {
            throw new RuntimeException("Ya existe un tipo de turno con el nombre '" + nombre + "' en este servicio");
        }

        return plantillaTurnoRepository.save(new PlantillaTurnoEntity(nombre, servicio, horaInicio, horaTermino));
    }

    public PlantillaTurnoEntity obtenerTipoDeTurno(Long idPlantillaTurno) {
        return plantillaTurnoRepository.findById(idPlantillaTurno)
                .orElseThrow(() -> new RuntimeException("Tipo de turno no encontrado"));
    }

    /**
     * Nombres de las rotativas que se verán afectadas al eliminar el tipo de turno
     * (los días que lo usan pasarán a ser libres). Lista vacía = no está en uso.
     */
    public List<String> obtenerRotativasAfectadas(Long idPlantillaTurno) {
        obtenerTipoDeTurno(idPlantillaTurno);
        return plantillaDiaRepository.findNombresRotativasUsando(idPlantillaTurno);
    }

    public List<PlantillaTurnoEntity> obtenerCatalogo() {
        return plantillaTurnoRepository.findByEliminadoFalse();
    }

    /**
     * Devuelve todos los tipos de turno (no eliminados) que pertenecen a un servicio específico.
     */
    public List<PlantillaTurnoEntity> obtenerTiposDeTurnoPorServicio(Long idServicio) {
        return plantillaTurnoRepository.findByServicio_IdServicioAndEliminadoFalse(idServicio);
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
        if (plantillaTurnoRepository.existsByServicio_IdServicioAndNombreAndIdPlantillaTurnoNotAndEliminadoFalse(idServicio, nombre, idPlantillaTurno)) {
            throw new RuntimeException("Ya existe un tipo de turno con el nombre '" + nombre + "' en este servicio");
        }

        tipo.setNombre(nombre);
        tipo.setHoraInicio(horaInicio);
        tipo.setHoraTermino(horaTermino);

        return plantillaTurnoRepository.save(tipo);
    }

    

    /**
     * Elimina un tipo de turno del catálogo (soft-delete): lo marca como eliminado y libera
     * sus referencias en las rotativas (esos días pasan a libres). El tipo sigue existiendo
     * por detrás: los turnos ya creados conservan su referencia y resuelven su nombre
     * (navegación FK no filtrada). El catálogo lo oculta.
     */
    public void eliminarTipoDeTurno(Long idPlantillaTurno) {
        PlantillaTurnoEntity tipo = obtenerTipoDeTurno(idPlantillaTurno);

        // Libera las referencias en las rotativas (plantilla_secuencia_dias):
        // id_plantilla_turno -> NULL, el día queda libre conservando su posición.
        plantillaDiaRepository.liberarReferenciasAlTipoTurno(idPlantillaTurno);

        tipo.setEliminado(true);
        plantillaTurnoRepository.save(tipo);
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
