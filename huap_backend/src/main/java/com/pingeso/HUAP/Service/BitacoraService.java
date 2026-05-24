package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.BitacoraResponseDTO;
import com.pingeso.HUAP.Entity.BitacoraEntity;
import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.Solicitud2Entity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.BitacoraRepository;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.Solicitud2Repository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BitacoraService {

    private final BitacoraRepository bitacoraRepository;
    private final Solicitud2Repository solicitud2Repository;
    private final FuncionarioRepository funcionarioRepository;

    public List<BitacoraEntity> findAll() {
        return bitacoraRepository.findAll();
    }

    public Optional<BitacoraEntity> findById(Long id) {
        return bitacoraRepository.findById(id);
    }

    public List<BitacoraEntity> findByTipoEvento(String tipoEvento) {
        return bitacoraRepository.findByTipoEvento(tipoEvento);
    }

    public List<BitacoraEntity> findByFuncionario(Long idFuncionario) {
        return bitacoraRepository.findByFuncionario_IdFuncionario(idFuncionario);
    }

    public List<BitacoraEntity> findByTurno(Long idTurno) {
        return bitacoraRepository.findByTurno_IdTurno(idTurno);
    }

    public List<BitacoraEntity> findBySolicitud(Long idSolicitud) {
        return bitacoraRepository.findBySolicitud_IdSolicitud(idSolicitud);
    }

    public List<BitacoraEntity> findActivos() {
        return bitacoraRepository.findByActivoTrue();
    }

    public BitacoraEntity save(BitacoraEntity evento) {
        if (evento.getFechaModificacion() == null) {
            evento.setFechaModificacion(LocalDateTime.now());
        }
        if (evento.getActivo() == null) {
            evento.setActivo(true);
        }
        return bitacoraRepository.save(evento);
    }

    // ── DTO methods (no modifican los existentes) ──────────────────────────

    @Transactional(readOnly = true)
    public List<BitacoraResponseDTO> findAllDTO() {
        return bitacoraRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<BitacoraResponseDTO> findByIdDTO(Long id) {
        return bitacoraRepository.findById(id).map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public BitacoraResponseDTO convertToDTO(BitacoraEntity e) {
        FuncionarioEntity actor   = e.getFuncionario();
        TurnoEntity       turno   = e.getTurno();
        Solicitud2Entity  s       = e.getSolicitud();

        // Relaciones de la solicitud
        FuncionarioEntity emisor    = s != null ? s.getFuncionario()         : null;
        FuncionarioEntity receptor  = s != null ? s.getFuncionarioReceptor() : null;
        TurnoEntity       tSol      = s != null ? s.getTurno()               : null;
        TurnoEntity       tReceptor = s != null ? s.getTurnoReceptor()       : null;

        return BitacoraResponseDTO.builder()
                .idEvento(e.getIdEvento())
                .tipoEvento(e.getTipoEvento())
                .motivo(e.getMotivo())
                .observaciones(e.getObservaciones())
                .fechaModificacion(e.getFechaModificacion())
                .fechaInicioAfectada(e.getFechaInicioAfectada())
                .fechaFinAfectada(e.getFechaFinAfectada())
                .activo(e.getActivo())
                // actor del evento
                .idFuncionario(actor != null ? actor.getIdFuncionario() : null)
                .nombreFuncionario(nombreCompleto(actor))
                .rutFuncionario(actor != null ? actor.getRut() : null)
                // turno directo del evento (suele ser null; preferir turnoSolicitud)
                .idTurno(turno != null ? turno.getIdTurno() : null)
                .diaInicioTurno(turno != null && turno.getDiaInicioTurno() != null ? turno.getDiaInicioTurno().toString() : null)
                .diaFinalTurno(turno != null && turno.getDiaFinalTurno() != null ? turno.getDiaFinalTurno().toString() : null)
                .horaInicioTurno(turno != null && turno.getHoraInicio() != null ? turno.getHoraInicio().toString() : null)
                .horaFinTurno(turno != null && turno.getHoraFin() != null ? turno.getHoraFin().toString() : null)
                .nombrePiso(turno != null && turno.getPiso() != null ? turno.getPiso().getNombre() : null)
                // solicitud base
                .idSolicitud(s != null ? s.getIdSolicitud() : null)
                .tipoSolicitud(s != null && s.getTipoSolicitud() != null ? tipoSolicitudLabel(s.getTipoSolicitud().getTipo()) : null)
                .estadoSolicitud(s != null && s.getEstado() != null ? s.getEstado().name() : null)
                .motivoSolicitud(s != null ? s.getMotivo() : null)
                .aceptadoReceptor(s != null ? s.getAceptadoReceptor() : null)
                .fechaInicioPermiso(s != null ? s.getFechaInicioPermiso() : null)
                .fechaTerminoPermiso(s != null ? s.getFechaTerminoPermiso() : null)
                // emisor de la solicitud
                .idFuncionarioEmisor(emisor != null ? emisor.getIdFuncionario() : null)
                .nombreFuncionarioEmisor(nombreCompleto(emisor))
                // turno principal de la solicitud
                .idTurnoSolicitud(tSol != null ? tSol.getIdTurno() : null)
                .diaInicioTurnoSolicitud(tSol != null && tSol.getDiaInicioTurno() != null ? tSol.getDiaInicioTurno().toString() : null)
                .diaFinalTurnoSolicitud(tSol != null && tSol.getDiaFinalTurno() != null ? tSol.getDiaFinalTurno().toString() : null)
                .horaInicioTurnoSolicitud(tSol != null && tSol.getHoraInicio() != null ? tSol.getHoraInicio().toString() : null)
                .horaFinTurnoSolicitud(tSol != null && tSol.getHoraFin() != null ? tSol.getHoraFin().toString() : null)
                .nombrePisoSolicitud(tSol != null && tSol.getPiso() != null ? tSol.getPiso().getNombre() : null)
                // receptor e intercambio
                .idFuncionarioReceptor(receptor != null ? receptor.getIdFuncionario() : null)
                .nombreFuncionarioReceptor(nombreCompleto(receptor))
                .idTurnoReceptor(tReceptor != null ? tReceptor.getIdTurno() : null)
                .diaInicioTurnoReceptor(tReceptor != null && tReceptor.getDiaInicioTurno() != null ? tReceptor.getDiaInicioTurno().toString() : null)
                .diaFinalTurnoReceptor(tReceptor != null && tReceptor.getDiaFinalTurno() != null ? tReceptor.getDiaFinalTurno().toString() : null)
                .horaInicioTurnoReceptor(tReceptor != null && tReceptor.getHoraInicio() != null ? tReceptor.getHoraInicio().toString() : null)
                .horaFinTurnoReceptor(tReceptor != null && tReceptor.getHoraFin() != null ? tReceptor.getHoraFin().toString() : null)
                .nombrePisoReceptor(tReceptor != null && tReceptor.getPiso() != null ? tReceptor.getPiso().getNombre() : null)
                .build();
    }

    private String nombreCompleto(FuncionarioEntity f) {
        if (f == null) return null;
        return (f.getNombre() + (f.getApelPat() != null ? " " + f.getApelPat() : "")).trim();
    }

    private String tipoSolicitudLabel(Integer tipo) {
        if (tipo == null) return null;
        return switch (tipo) {
            case 1 -> "Permiso";
            case 2 -> "Botar turno";
            case 3 -> "Cobertura";
            case 4 -> "Intercambio";
            default -> "Tipo " + tipo;
        };
    }

    // Llamar siempre desde un afterCommit hook para evitar lock conflicts con la TX principal
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrarEvento(String tipoEvento, Long idSolicitud, Long idFuncionario) {
        try {
            Solicitud2Entity solicitud = idSolicitud != null
                    ? solicitud2Repository.findById(idSolicitud).orElse(null) : null;
            FuncionarioEntity actor = idFuncionario != null
                    ? funcionarioRepository.findById(idFuncionario).orElse(null) : null;

            BitacoraEntity log = BitacoraEntity.builder()
                    .tipoEvento(tipoEvento)
                    .solicitud(solicitud)
                    .funcionario(actor)
                    .fechaInicioAfectada(LocalDateTime.now())
                    .activo(true)
                    .build();
            bitacoraRepository.save(log);
        } catch (Exception e) {
            System.err.println("Error guardando en bitácora: " + e.getMessage());
        }
    }
}
