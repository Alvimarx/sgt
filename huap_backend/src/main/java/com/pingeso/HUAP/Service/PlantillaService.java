package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.PlantillaDiaEntity;
import com.pingeso.HUAP.Entity.PlantillaEntity;
import com.pingeso.HUAP.Entity.PlantillaTurnoEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Repository.PlanificacionAsignacionRepository;
import com.pingeso.HUAP.Repository.PlantillaDiaRepository;
import com.pingeso.HUAP.Repository.PlantillaRepository;
import com.pingeso.HUAP.Repository.PlantillaTurnoRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Transactional
public class PlantillaService {

    private final PlantillaRepository plantillaRepository;
    private final ServicioRepository servicioRepository;
    private final PlantillaTurnoRepository plantillaTurnoRepository;
    private final PlantillaDiaRepository plantillaDiaRepository;
    private final PlanificacionAsignacionRepository planificacionAsignacionRepository;

    public PlantillaService(
            PlantillaRepository plantillaRepository,
            ServicioRepository servicioRepository,
            PlantillaTurnoRepository plantillaTurnoRepository,
            PlantillaDiaRepository plantillaDiaRepository,
            PlanificacionAsignacionRepository planificacionAsignacionRepository
    ) {
        this.plantillaRepository = plantillaRepository;
        this.servicioRepository = servicioRepository;
        this.plantillaTurnoRepository = plantillaTurnoRepository;
        this.plantillaDiaRepository = plantillaDiaRepository;
        this.planificacionAsignacionRepository = planificacionAsignacionRepository;
    }

    // =========================================================
    // CRUD DE PLANTILLA
    // =========================================================

    public PlantillaEntity crearPlantilla(Long idServicio, String nombre, Byte semanas, List<Long> idsDias) {
        ServicioEntity servicio = servicioRepository.findById(idServicio)
                .orElseThrow(() -> new RuntimeException("Servicio no encontrado con ID: " + idServicio));

        if (plantillaRepository.existsByServicio_IdServicioAndNombreAndEliminadoFalse(idServicio, nombre)) {
            throw new RuntimeException("Ya existe una plantilla con el nombre '" + nombre + "' en este servicio");
        }

        if (semanas <= 0) {
            throw new RuntimeException("La cantidad de semanas debe ser mayor a 0");
        }

        PlantillaEntity plantilla = new PlantillaEntity(servicio, nombre, semanas);

        if (idsDias != null && !idsDias.isEmpty()) {
            for (Long idTurno : idsDias) {
                PlantillaTurnoEntity turno = null;
                if (idTurno != null) {
                    turno = plantillaTurnoRepository.findById(idTurno)
                            .orElseThrow(() -> new RuntimeException("Tipo de turno no encontrado: ID " + idTurno));
                    if (turno.isEliminado()) {
                        throw new RuntimeException("El tipo de turno seleccionado fue eliminado y no puede usarse.");
                    }
                    if (!turno.getServicio().getIdServicio().equals(idServicio)) {
                        throw new RuntimeException("El turno '" + turno.getNombre() + "' no pertenece a este servicio.");
                    }
                }
                plantilla.getSecuenciaDias().add(
                        new PlantillaDiaEntity(plantilla, plantilla.getSecuenciaDias().size(), turno)
                );
            }
        }

        PlantillaEntity guardada = plantillaRepository.save(plantilla);

        if (idsDias != null && !idsDias.isEmpty()) {
            validarPlantilla(guardada.getIdPlantilla());
        }

        return guardada;
    }

    public PlantillaEntity obtenerPlantilla(Long idPlantilla) {
        return plantillaRepository.findById(idPlantilla)
                .orElseThrow(() -> new RuntimeException("Plantilla no encontrada"));
    }

    public List<PlantillaEntity> obtenerPlantillas() {
        return plantillaRepository.findByEliminadoFalse();
    }

    public List<PlantillaEntity> obtenerPlantillasPorServicio(Long idServicio) {
        return plantillaRepository.findByServicio_IdServicioAndEliminadoFalse(idServicio);
    }

    public PlantillaEntity actualizarPlantilla(Long idPlantilla, String nombre, Byte semanas) {
        PlantillaEntity plantilla = obtenerPlantilla(idPlantilla);

        if (semanas <= 0) {
            throw new RuntimeException("La cantidad de semanas debe ser mayor a 0");
        }

        plantilla.setNombre(nombre);
        plantilla.setSemanas(semanas);
        return plantillaRepository.save(plantilla);
    }

    public void eliminarPlantilla(Long idPlantilla) {
        PlantillaEntity plantilla = obtenerPlantilla(idPlantilla);

        // Quita la rotativa de cualquier planificación que la referencie.
        planificacionAsignacionRepository.deleteByPlantilla(idPlantilla);

        plantilla.setEliminado(true);
        plantillaRepository.save(plantilla);
    }

    // =========================================================
    // GESTIÓN DE LA SECUENCIA (PATRÓN DE DÍAS)
    // =========================================================

    /**
     * Reemplaza la secuencia completa. Cada posición de la lista exterior es un día
     * (diaIndex); la lista interior son los tipos de turno de ese día. Varios turnos
     * en un mismo día generan filas con el mismo diaIndex (p. ej. día + noche para
     * cubrir 24h). Una lista interior vacía o null representa un día libre.
     */
    public PlantillaEntity establecerSecuencia(Long idPlantilla, List<List<Long>> dias) {
        PlantillaEntity plantilla = obtenerPlantilla(idPlantilla);
        Long idServicio = plantilla.getServicio().getIdServicio();

        // 1. Limpiar la secuencia actual
        plantilla.getSecuenciaDias().clear();
        plantillaRepository.flush();

        // 2. Insertar la nueva secuencia con su diaIndex explícito
        for (int diaIndex = 0; diaIndex < dias.size(); diaIndex++) {
            List<Long> turnosDelDia = dias.get(diaIndex);

            if (turnosDelDia == null || turnosDelDia.isEmpty()) {
                // Día libre: una fila con turno null para conservar el diaIndex.
                plantilla.getSecuenciaDias().add(new PlantillaDiaEntity(plantilla, diaIndex, null));
                continue;
            }

            for (Long idTipo : turnosDelDia) {
                if (idTipo == null) continue;
                PlantillaTurnoEntity tipo = plantillaTurnoRepository.findById(idTipo)
                        .orElseThrow(() -> new RuntimeException("Tipo de turno no encontrado: ID " + idTipo));
                if (tipo.isEliminado()) {
                    throw new RuntimeException("El tipo de turno seleccionado fue eliminado y no puede usarse.");
                }
                if (!tipo.getServicio().getIdServicio().equals(idServicio)) {
                    throw new RuntimeException("Seguridad: El turno '" + tipo.getNombre() +
                            "' no pertenece al servicio (" + plantilla.getServicio().getNombre() + ") de esta plantilla.");
                }
                plantilla.getSecuenciaDias().add(new PlantillaDiaEntity(plantilla, diaIndex, tipo));
            }
        }

        return plantillaRepository.save(plantilla);
    }

    /**
     * Devuelve la secuencia de días de una plantilla ordenada por diaIndex.
     * Las entradas con plantillaTurno == null representan días libres.
     */
    public List<PlantillaDiaEntity> obtenerSecuencia(Long idPlantilla) {
        obtenerPlantilla(idPlantilla);
        return plantillaDiaRepository.findByPlantilla_IdPlantillaOrderByDiaIndexAsc(idPlantilla);
    }

    // =========================================================
    // OPERACIONES COMPUESTAS
    // =========================================================

    /**
     * Crea una copia de la plantilla preservando su secuencia de días completa.
     * Los días libres (null) se preservan en la copia.
     */
    public PlantillaEntity duplicarPlantilla(Long idPlantilla) {
        PlantillaEntity original = obtenerPlantilla(idPlantilla);

        PlantillaEntity copia = new PlantillaEntity(
                original.getServicio(),
                original.getNombre() + " - copia",
                original.getSemanas()
        );
        // Persiste primero para obtener el ID antes de crear los PlantillaDia hijos.
        plantillaRepository.save(copia);

        for (PlantillaDiaEntity dia : original.getSecuenciaDias()) {
            copia.getSecuenciaDias().add(
                    new PlantillaDiaEntity(copia, copia.getSecuenciaDias().size(), dia.getPlantillaTurno())
            );
        }

        return plantillaRepository.save(copia);
    }

    /**
     * Valida que la plantilla tenga una secuencia coherente con las semanas declaradas y sea apta para generar turnos. Lanza excepciones con mensajes claros si encuentra problemas.
     */
    public void validarPlantilla(Long idPlantilla) {
        PlantillaEntity plantilla = obtenerPlantilla(idPlantilla);

        if (plantilla.getSemanas() <= 0) {
            throw new RuntimeException("La plantilla debe tener al menos una semana");
        }

        if (plantilla.getSecuenciaDias().isEmpty()) {
            throw new RuntimeException("La plantilla no tiene días configurados en su patrón");
        }

        int esperado = plantilla.getSemanas() * 7;
        // Cuenta días distintos (un día puede tener varias filas: día + noche, etc.).
        long actual = plantilla.getSecuenciaDias().stream()
                .map(PlantillaDiaEntity::getDiaIndex)
                .distinct()
                .count();
        if (actual != esperado) {
            throw new RuntimeException(
                    "El patrón cubre " + actual + " días pero se esperan " + esperado
                    + " (" + plantilla.getSemanas() + " semana/s × 7 días)"
            );
        }
    }

}
