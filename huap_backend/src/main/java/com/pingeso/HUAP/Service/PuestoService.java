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

    // Crear puesto
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

    // Obtener puesto por id
    public PuestoEntity obtenerPuesto(Long idPuesto) {

        return puestoRepository.findById(idPuesto)
                .orElseThrow(() ->
                        new RuntimeException("Puesto no encontrado")
                );
    }

    // Obtener todos los puestos (no eliminados)
    public List<PuestoEntity> obtenerTodosPuestos() {
        return puestoRepository.findByEliminadoFalse();
    }

    // Obtener puestos por servicio (no eliminados)
    public List<PuestoEntity> obtenerPuestosPorServicio(Long idServicio) {
        return puestoRepository.findByServicio_IdServicioAndEliminadoFalse(idServicio);
    }

    // Actualizar puesto
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

    // Cantidad de turnos asociados a un puesto (para advertir antes de eliminar).
    public long contarTurnosAsociados(Long idPuesto) {
        obtenerPuesto(idPuesto);
        return turnoRepository.countByPuesto_IdPuesto(idPuesto);
    }

    public void eliminarPuesto(Long idPuesto) {

        PuestoEntity puesto = obtenerPuesto(idPuesto);

        // Quita el puesto de cualquier planificación que lo referencie.
        planificacionAsignacionRepository.deleteByPuesto(idPuesto);

        puesto.setEliminado(true);
        puestoRepository.save(puesto);
    }

    // Obtener puesto por nombre (no eliminado)
    public PuestoEntity obtenerPuestosPorNombre(String nombre) {

        return puestoRepository.findByNombreAndEliminadoFalse(nombre)
                .orElseThrow(() ->
                        new RuntimeException("Puesto no encontrado")
                );
    }
}
