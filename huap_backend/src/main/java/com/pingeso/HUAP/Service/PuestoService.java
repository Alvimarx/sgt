package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.PuestoEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Repository.PlanificacionAsignacionRepository;
import com.pingeso.HUAP.Repository.PuestoRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Servicio de puestos.
 *
 * <p>Gestiona el ciclo de vida de los {@link PuestoEntity} de un servicio: creación (validando
 * servicio y nombre), consulta (por id, por servicio, por nombre), actualización, conteo de
 * turnos asociados y eliminación por <b>soft-delete</b> (que además lo quita de las
 * planificaciones que lo referencien).
 */
@Service
@Transactional
public class PuestoService {

    private final PuestoRepository puestoRepository;
    private final ServicioRepository servicioRepository;
    private final TurnoRepository turnoRepository;
    private final PlanificacionAsignacionRepository planificacionAsignacionRepository;

    public PuestoService(
            PuestoRepository puestoRepository,
            ServicioRepository servicioRepository,
            TurnoRepository turnoRepository,
            PlanificacionAsignacionRepository planificacionAsignacionRepository
    ) {
        this.puestoRepository = puestoRepository;
        this.servicioRepository = servicioRepository;
        this.turnoRepository = turnoRepository;
        this.planificacionAsignacionRepository = planificacionAsignacionRepository;
    }

    /**
     * Crea un puesto en un servicio.
     * @param idServicio servicio al que pertenece.
     * @param nombre nombre del puesto (no puede estar vacío).
     * @return el puesto creado.
     * @throws RuntimeException si el servicio no existe o el nombre está vacío.
     */
    public PuestoEntity crearPuesto(
            Long idServicio,
            String nombre
    ) {

        ServicioEntity servicio = servicioRepository.findById(idServicio)
                .orElseThrow(() ->
                        new RuntimeException("Servicio no encontrado")
                );

        if (nombre == null || nombre.trim().isEmpty()) {
            throw new RuntimeException("El nombre del puesto no puede estar vacío");
        }

        PuestoEntity puesto = new PuestoEntity();
        puesto.setNombre(nombre);
        puesto.setServicio(servicio);

        return puestoRepository.save(puesto);
    }

    /**
     * Obtiene un puesto por su id.
     * @throws RuntimeException si no existe.
     */
    public PuestoEntity obtenerPuesto(Long idPuesto) {

        return puestoRepository.findById(idPuesto)
                .orElseThrow(() ->
                        new RuntimeException("Puesto no encontrado")
                );
    }

    /** Lista todos los puestos vigentes (no eliminados). */
    public List<PuestoEntity> obtenerTodosPuestos() {
        return puestoRepository.findByEliminadoFalse();
    }

    /** Lista los puestos vigentes de un servicio. */
    public List<PuestoEntity> obtenerPuestosPorServicio(Long idServicio) {
        return puestoRepository.findByServicio_IdServicioAndEliminadoFalse(idServicio);
    }

    /**
     * Actualiza el nombre de un puesto.
     * @throws RuntimeException si el puesto no existe o el nombre está vacío.
     */
    public PuestoEntity actualizarPuesto(
            Long idPuesto,
            String nombre
    ) {

        PuestoEntity puesto = obtenerPuesto(idPuesto);

        if (nombre == null || nombre.trim().isEmpty()) {
            throw new RuntimeException("El nombre del puesto no puede estar vacío");
        }

        puesto.setNombre(nombre);

        return puestoRepository.save(puesto);
    }

    /**
     * Cuenta los turnos (histórico) asociados a un puesto. Se usa para advertir en la UI
     * antes de eliminarlo.
     * @throws RuntimeException si el puesto no existe.
     */
    public long contarTurnosAsociados(Long idPuesto) {
        obtenerPuesto(idPuesto);
        return turnoRepository.countByPuesto_IdPuesto(idPuesto);
    }

    /**
     * Elimina un puesto por soft-delete y lo quita de cualquier planificación que lo referencie.
     * @throws RuntimeException si el puesto no existe.
     */
    public void eliminarPuesto(Long idPuesto) {

        PuestoEntity puesto = obtenerPuesto(idPuesto);

        // Quita el puesto de cualquier planificación que lo referencie.
        planificacionAsignacionRepository.deleteByPuesto(idPuesto);

        puesto.setEliminado(true);
        puestoRepository.save(puesto);
    }

    /**
     * Obtiene un puesto vigente por su nombre.
     * @throws RuntimeException si no existe.
     */
    public PuestoEntity obtenerPuestosPorNombre(String nombre) {

        return puestoRepository.findByNombreAndEliminadoFalse(nombre)
                .orElseThrow(() ->
                        new RuntimeException("Puesto no encontrado")
                );
    }
}
