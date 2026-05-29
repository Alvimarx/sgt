package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.PisoEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Repository.PisoRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Transactional
public class PisoService {

    private final PisoRepository pisoRepository;
    private final ServicioRepository servicioRepository;
    private final TurnoRepository turnoRepository;

    public PisoService(
            PisoRepository pisoRepository,
            ServicioRepository servicioRepository,
            TurnoRepository turnoRepository
    ) {
        this.pisoRepository = pisoRepository;
        this.servicioRepository = servicioRepository;
        this.turnoRepository = turnoRepository;
    }

    // Crear piso
    public PisoEntity crearPiso(
            Long idServicio,
            String nombre
    ) {

        ServicioEntity servicio = servicioRepository.findById(idServicio)
                .orElseThrow(() ->
                        new RuntimeException("Servicio no encontrado")
                );

        if (nombre == null || nombre.trim().isEmpty()) {
            throw new RuntimeException("El nombre del piso no puede estar vacío");
        }

        PisoEntity piso = new PisoEntity();
        piso.setNombre(nombre);
        piso.setServicio(servicio);

        return pisoRepository.save(piso);
    }

    // Obtener piso por id
    public PisoEntity obtenerPiso(Long idPiso) {

        return pisoRepository.findById(idPiso)
                .orElseThrow(() ->
                        new RuntimeException("Piso no encontrado")
                );
    }

    // Obtener todos los pisos
    public List<PisoEntity> obtenerTodosPisos() {
        return pisoRepository.findAll();
    }

    // Obtener pisos por servicio
    public List<PisoEntity> obtenerPisosPorServicio(Long idServicio) {
        return pisoRepository.findByServicio_IdServicio(idServicio);
    }

    // Actualizar piso
    public PisoEntity actualizarPiso(
            Long idPiso,
            String nombre
    ) {

        PisoEntity piso = obtenerPiso(idPiso);

        if (nombre == null || nombre.trim().isEmpty()) {
            throw new RuntimeException("El nombre del piso no puede estar vacío");
        }

        piso.setNombre(nombre);

        return pisoRepository.save(piso);
    }

    // Cantidad de turnos asociados a un piso (para advertir antes de eliminar).
    public long contarTurnosAsociados(Long idPiso) {
        obtenerPiso(idPiso);
        return turnoRepository.countByPiso_IdPiso(idPiso);
    }

    // Eliminar piso. Se bloquea si el piso tiene turnos asociados.
    public void eliminarPiso(Long idPiso) {

        PisoEntity piso = obtenerPiso(idPiso);

        long turnos = turnoRepository.countByPiso_IdPiso(idPiso);
        if (turnos > 0) {
            throw new RuntimeException(
                    "No se puede eliminar: el piso está asociado a "
                    + turnos + " turno(s). Reasigna esos turnos a otro piso antes de eliminarlo."
            );
        }

        pisoRepository.delete(piso);
    }

    // Obtener piso por nombre
    public PisoEntity obtenerPisosPorNombre(String nombre) {

        return pisoRepository.findByNombre(nombre)
                .orElseThrow(() ->
                        new RuntimeException("Piso no encontrado")
                );
    }
}
