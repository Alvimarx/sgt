package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.RotativaDiaEntity;
import com.pingeso.HUAP.Entity.RotativaEntity;
import com.pingeso.HUAP.Entity.TipoTurnoEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Repository.PlanificacionAsignacionRepository;
import com.pingeso.HUAP.Repository.RotativaDiaRepository;
import com.pingeso.HUAP.Repository.RotativaRepository;
import com.pingeso.HUAP.Repository.TipoTurnoRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Servicio de rotativas (patrones cíclicos de turnos).
 *
 * <p>Gestiona las {@code Rotativa} de un servicio y su secuencia de días
 * ({@code RotativaDia}) a lo largo de una o varias semanas: creación, consulta,
 * actualización, duplicado y definición/lectura de la secuencia. Las rotativas sirven de
 * plantilla para la generación de turnos dentro de una planificación.
 */
@Service
@Transactional
public class RotativaService {

    private final RotativaRepository rotativaRepository;
    private final ServicioRepository servicioRepository;
    private final TipoTurnoRepository tipoTurnoRepository;
    private final RotativaDiaRepository rotativaDiaRepository;
    private final PlanificacionAsignacionRepository planificacionAsignacionRepository;

    public RotativaService(
            RotativaRepository rotativaRepository,
            ServicioRepository servicioRepository,
            TipoTurnoRepository tipoTurnoRepository,
            RotativaDiaRepository rotativaDiaRepository,
            PlanificacionAsignacionRepository planificacionAsignacionRepository
    ) {
        this.rotativaRepository = rotativaRepository;
        this.servicioRepository = servicioRepository;
        this.tipoTurnoRepository = tipoTurnoRepository;
        this.rotativaDiaRepository = rotativaDiaRepository;
        this.planificacionAsignacionRepository = planificacionAsignacionRepository;
    }

    // =========================================================
    // CRUD DE ROTATIVA
    // =========================================================

    public RotativaEntity crearRotativa(Long idServicio, String nombre, Byte semanas, List<Long> idsDias) {
        ServicioEntity servicio = servicioRepository.findById(idServicio)
                .orElseThrow(() -> new RuntimeException("Servicio no encontrado con ID: " + idServicio));

        if (rotativaRepository.existsByServicio_IdServicioAndNombreAndEliminadoFalse(idServicio, nombre)) {
            throw new RuntimeException("Ya existe una rotativa con el nombre '" + nombre + "' en este servicio");
        }

        if (semanas <= 0) {
            throw new RuntimeException("La cantidad de semanas debe ser mayor a 0");
        }

        RotativaEntity rotativa = new RotativaEntity(servicio, nombre, semanas);

        if (idsDias != null && !idsDias.isEmpty()) {
            for (Long idTurno : idsDias) {
                TipoTurnoEntity turno = null;
                if (idTurno != null) {
                    turno = tipoTurnoRepository.findById(idTurno)
                            .orElseThrow(() -> new RuntimeException("Tipo de turno no encontrado: ID " + idTurno));
                    if (turno.isEliminado()) {
                        throw new RuntimeException("El tipo de turno seleccionado fue eliminado y no puede usarse.");
                    }
                    if (!turno.getServicio().getIdServicio().equals(idServicio)) {
                        throw new RuntimeException("El turno '" + turno.getNombre() + "' no pertenece a este servicio.");
                    }
                }
                rotativa.getSecuenciaDias().add(
                        new RotativaDiaEntity(rotativa, rotativa.getSecuenciaDias().size(), turno)
                );
            }
        }

        RotativaEntity guardada = rotativaRepository.save(rotativa);

        if (idsDias != null && !idsDias.isEmpty()) {
            validarRotativa(guardada.getIdRotativa());
        }

        return guardada;
    }

    public RotativaEntity obtenerRotativa(Long idRotativa) {
        return rotativaRepository.findById(idRotativa)
                .orElseThrow(() -> new RuntimeException("Rotativa no encontrada"));
    }

    public List<RotativaEntity> obtenerRotativas() {
        return rotativaRepository.findByEliminadoFalse();
    }

    public List<RotativaEntity> obtenerRotativasPorServicio(Long idServicio) {
        return rotativaRepository.findByServicio_IdServicioAndEliminadoFalse(idServicio);
    }

    public RotativaEntity actualizarRotativa(Long idRotativa, String nombre, Byte semanas) {
        RotativaEntity rotativa = obtenerRotativa(idRotativa);

        if (semanas <= 0) {
            throw new RuntimeException("La cantidad de semanas debe ser mayor a 0");
        }

        rotativa.setNombre(nombre);
        rotativa.setSemanas(semanas);
        return rotativaRepository.save(rotativa);
    }

    public void eliminarRotativa(Long idRotativa) {
        RotativaEntity rotativa = obtenerRotativa(idRotativa);

        // Quita la rotativa de cualquier planificación que la referencie.
        planificacionAsignacionRepository.deleteByRotativa(idRotativa);

        rotativa.setEliminado(true);
        rotativaRepository.save(rotativa);
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
    public RotativaEntity establecerSecuencia(Long idRotativa, List<List<Long>> dias) {
        RotativaEntity rotativa = obtenerRotativa(idRotativa);
        Long idServicio = rotativa.getServicio().getIdServicio();

        // 1. Limpiar la secuencia actual
        rotativa.getSecuenciaDias().clear();
        rotativaRepository.flush();

        // 2. Insertar la nueva secuencia con su diaIndex explícito
        for (int diaIndex = 0; diaIndex < dias.size(); diaIndex++) {
            List<Long> turnosDelDia = dias.get(diaIndex);

            if (turnosDelDia == null || turnosDelDia.isEmpty()) {
                // Día libre: una fila con turno null para conservar el diaIndex.
                rotativa.getSecuenciaDias().add(new RotativaDiaEntity(rotativa, diaIndex, null));
                continue;
            }

            for (Long idTipo : turnosDelDia) {
                if (idTipo == null) continue;
                TipoTurnoEntity tipo = tipoTurnoRepository.findById(idTipo)
                        .orElseThrow(() -> new RuntimeException("Tipo de turno no encontrado: ID " + idTipo));
                if (tipo.isEliminado()) {
                    throw new RuntimeException("El tipo de turno seleccionado fue eliminado y no puede usarse.");
                }
                if (!tipo.getServicio().getIdServicio().equals(idServicio)) {
                    throw new RuntimeException("Seguridad: El turno '" + tipo.getNombre() +
                            "' no pertenece al servicio (" + rotativa.getServicio().getNombre() + ") de esta rotativa.");
                }
                rotativa.getSecuenciaDias().add(new RotativaDiaEntity(rotativa, diaIndex, tipo));
            }
        }

        return rotativaRepository.save(rotativa);
    }

    /**
     * Devuelve la secuencia de días de una rotativa ordenada por diaIndex.
     * Las entradas con tipoTurno == null representan días libres.
     */
    public List<RotativaDiaEntity> obtenerSecuencia(Long idRotativa) {
        obtenerRotativa(idRotativa);
        return rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(idRotativa);
    }

    // =========================================================
    // OPERACIONES COMPUESTAS
    // =========================================================

    /**
     * Crea una copia de la rotativa preservando su secuencia de días completa.
     * Los días libres (null) se preservan en la copia.
     */
    public RotativaEntity duplicarRotativa(Long idRotativa) {
        RotativaEntity original = obtenerRotativa(idRotativa);

        RotativaEntity copia = new RotativaEntity(
                original.getServicio(),
                original.getNombre() + " - copia",
                original.getSemanas()
        );
        // Persiste primero para obtener el ID antes de crear los RotativaDia hijos.
        rotativaRepository.save(copia);

        for (RotativaDiaEntity dia : original.getSecuenciaDias()) {
            copia.getSecuenciaDias().add(
                    new RotativaDiaEntity(copia, copia.getSecuenciaDias().size(), dia.getTipoTurno())
            );
        }

        return rotativaRepository.save(copia);
    }

    /**
     * Valida que la rotativa tenga una secuencia coherente con las semanas declaradas y sea apta para generar turnos. Lanza excepciones con mensajes claros si encuentra problemas.
     */
    public void validarRotativa(Long idRotativa) {
        RotativaEntity rotativa = obtenerRotativa(idRotativa);

        if (rotativa.getSemanas() <= 0) {
            throw new RuntimeException("La rotativa debe tener al menos una semana");
        }

        if (rotativa.getSecuenciaDias().isEmpty()) {
            throw new RuntimeException("La rotativa no tiene días configurados en su patrón");
        }

        int esperado = rotativa.getSemanas() * 7;
        // Cuenta días distintos (un día puede tener varias filas: día + noche, etc.).
        long actual = rotativa.getSecuenciaDias().stream()
                .map(RotativaDiaEntity::getDiaIndex)
                .distinct()
                .count();
        if (actual != esperado) {
            throw new RuntimeException(
                    "El patrón cubre " + actual + " días pero se esperan " + esperado
                    + " (" + rotativa.getSemanas() + " semana/s × 7 días)"
            );
        }
    }

}
