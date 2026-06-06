package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.PuestoEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
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

    public PuestoService(
            PuestoRepository puestoRepository,
            ServicioRepository servicioRepository,
            TurnoRepository turnoRepository
    ) {
        this.puestoRepository = puestoRepository;
        this.servicioRepository = servicioRepository;
        this.turnoRepository = turnoRepository;
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

    // Obtener todos los puestos
    public List<PuestoEntity> obtenerTodosPuestos() {
        return puestoRepository.findAll();
    }

    // Obtener puestos por servicio
    public List<PuestoEntity> obtenerPuestosPorServicio(Long idServicio) {
        return puestoRepository.findByServicio_IdServicio(idServicio);
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

    // Eliminar puesto. Se bloquea si el puesto tiene turnos asociados.
    public void eliminarPuesto(Long idPuesto) {

        PuestoEntity puesto = obtenerPuesto(idPuesto);

        long turnos = turnoRepository.countByPuesto_IdPuesto(idPuesto);
        if (turnos > 0) {
            throw new RuntimeException(
                    "No se puede eliminar: el puesto está asociado a "
                    + turnos + " turno(s). Reasigna esos turnos a otro puesto antes de eliminarlo."
            );
        }

        puestoRepository.delete(puesto);
    }

    // Obtener puesto por nombre
    public PuestoEntity obtenerPuestosPorNombre(String nombre) {

        return puestoRepository.findByNombre(nombre)
                .orElseThrow(() ->
                        new RuntimeException("Puesto no encontrado")
                );
    }
}
