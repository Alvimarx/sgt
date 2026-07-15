package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.TipoTurnoEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Repository.RotativaDiaRepository;
import com.pingeso.HUAP.Repository.TipoTurnoRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.List;

@Service
@Transactional
public class TipoTurnoService {

    private final TipoTurnoRepository tipoTurnoRepository;
    private final RotativaDiaRepository rotativaDiaRepository;
    private final ServicioRepository servicioRepository;
    private final TurnoRepository turnoRepository;

    public TipoTurnoService(
            TipoTurnoRepository tipoTurnoRepository,
            RotativaDiaRepository rotativaDiaRepository,
            ServicioRepository servicioRepository,
            TurnoRepository turnoRepository
    ) {
        this.tipoTurnoRepository = tipoTurnoRepository;
        this.rotativaDiaRepository = rotativaDiaRepository;
        this.servicioRepository = servicioRepository;
        this.turnoRepository = turnoRepository;
    }

    // =========================================================
    // CRUD DEL CATÁLOGO DE TIPOS DE TURNO
    // =========================================================

    public TipoTurnoEntity crearTipoDeTurno(
            String nombre,
            LocalTime horaInicio,
            LocalTime horaTermino,
            Long idServicio
    ) {
        validarHorario(horaInicio, horaTermino);

        ServicioEntity servicio = servicioRepository.findById(idServicio)
                .orElseThrow(() -> new RuntimeException("Servicio no encontrado"));

        if (tipoTurnoRepository.existsByServicio_IdServicioAndNombreAndEliminadoFalse(idServicio, nombre)) {
            throw new RuntimeException("Ya existe un tipo de turno con el nombre '" + nombre + "' en este servicio");
        }

        return tipoTurnoRepository.save(new TipoTurnoEntity(nombre, servicio, horaInicio, horaTermino));
    }

    public TipoTurnoEntity obtenerTipoDeTurno(Long idTipoTurno) {
        return tipoTurnoRepository.findById(idTipoTurno)
                .orElseThrow(() -> new RuntimeException("Tipo de turno no encontrado"));
    }

    /**
     * Nombres de las rotativas que se verán afectadas al eliminar el tipo de turno
     * (los días que lo usan pasarán a ser libres). Lista vacía = no está en uso.
     */
    public List<String> obtenerRotativasAfectadas(Long idTipoTurno) {
        obtenerTipoDeTurno(idTipoTurno);
        return rotativaDiaRepository.findNombresRotativasUsando(idTipoTurno);
    }

    public List<TipoTurnoEntity> obtenerCatalogo() {
        return tipoTurnoRepository.findByEliminadoFalse();
    }

    /**
     * Devuelve todos los tipos de turno (no eliminados) que pertenecen a un servicio específico.
     */
    public List<TipoTurnoEntity> obtenerTiposDeTurnoPorServicio(Long idServicio) {
        return tipoTurnoRepository.findByServicio_IdServicioAndEliminadoFalse(idServicio);
    }

    public TipoTurnoEntity actualizarTipoDeTurno(
            Long idTipoTurno,
            String nombre,
            LocalTime horaInicio,
            LocalTime horaTermino
    ) {
        validarHorario(horaInicio, horaTermino);
        TipoTurnoEntity tipo = obtenerTipoDeTurno(idTipoTurno);

        Long idServicio = tipo.getServicio().getIdServicio();
        if (tipoTurnoRepository.existsByServicio_IdServicioAndNombreAndIdTipoTurnoNotAndEliminadoFalse(idServicio, nombre, idTipoTurno)) {
            throw new RuntimeException("Ya existe un tipo de turno con el nombre '" + nombre + "' en este servicio");
        }

        tipo.setNombre(nombre);
        tipo.setHoraInicio(horaInicio);
        tipo.setHoraTermino(horaTermino);

        return tipoTurnoRepository.save(tipo);
    }

    

    /**
     * Elimina un tipo de turno del catálogo (soft-delete): lo marca como eliminado y libera
     * sus referencias en las rotativas (esos días pasan a libres). El tipo sigue existiendo
     * por detrás: los turnos ya creados conservan su referencia y resuelven su nombre
     * (navegación FK no filtrada). El catálogo lo oculta.
     */
    public void eliminarTipoDeTurno(Long idTipoTurno) {
        TipoTurnoEntity tipo = obtenerTipoDeTurno(idTipoTurno);

        // Libera las referencias en las rotativas (rotativa_secuencia_dias):
        // id_tipo_turno -> NULL, el día queda libre conservando su posición.
        rotativaDiaRepository.liberarReferenciasAlTipoTurno(idTipoTurno);

        tipo.setEliminado(true);
        tipoTurnoRepository.save(tipo);
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
