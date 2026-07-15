package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.CrearSolicitudDTO;
import com.pingeso.HUAP.Entity.*;
import com.pingeso.HUAP.Repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SolicitudService {

    private final SolicitudRepository solicitudRepository;
    private final FuncionarioRepository funcionarioRepository;
    private final TipoSolicitudRepository tipoSolicitudRepository;
    private final TurnoRepository turnoRepository;
    private final BitacoraService bitacoraService;

    @Transactional
    public List<SolicitudEntity> findAllSolicitudes() {
        return solicitudRepository.findAll();
    }

    @Transactional
    public List<SolicitudEntity> findByFuncionario(Long idFuncionario) {
        return solicitudRepository.findByFuncionario_IdFuncionario(idFuncionario);
    }

    @Transactional
    public List<SolicitudEntity> findByFuncionarioReceptor(Long idFuncionario) {
        return solicitudRepository.findByFuncionarioReceptor_IdFuncionario(idFuncionario);
    }

    @Transactional
    public List<SolicitudEntity> findByTipoSolicitud(Long idTipoSolicitud) {
        return solicitudRepository.findByTipoSolicitud_IdTipoSolicitud(idTipoSolicitud);
    }

    @Transactional
    public List<SolicitudEntity> findByTurno(Long idTurno) {
        return solicitudRepository.findByTurno_IdTurno(idTurno);
    }

    /*
       Modificadores y utilidades
    */

    @Transactional
    public SolicitudEntity crearSolicitud(CrearSolicitudDTO dto) {
        FuncionarioEntity funcionario = funcionarioRepository.findById(dto.getIdFuncionario())
                .orElseThrow(() -> new RuntimeException("Funcionario emisor no existe"));

        TipoSolicitudEntity tipoSolicitud = tipoSolicitudRepository.findById(dto.getIdTipoSolicitud())
                .orElseThrow(() -> new RuntimeException("Tipo de solicitud no existe"));

        FuncionarioEntity receptor = dto.getIdFuncionarioReceptor() != null ?
                funcionarioRepository.findById(dto.getIdFuncionarioReceptor()).orElse(null) : null;

        TurnoEntity turno = dto.getIdTurno() != null ?
                turnoRepository.findById(dto.getIdTurno()).orElse(null) : null;

        TurnoEntity turnoIntercambio = dto.getIdTurnoIntercambio() != null ?
                turnoRepository.findById(dto.getIdTurnoIntercambio()).orElse(null) : null;

        SolicitudEntity solicitud = SolicitudEntity.builder()
                .funcionario(funcionario)
                .funcionarioReceptor(receptor)
                .tipoSolicitud(tipoSolicitud)
                .turno(turno)
                .turnoReceptor(turnoIntercambio)
                .estado(SolicitudEntity.EstadoSolicitud.PENDIENTE)
                .fechaCreacion(LocalDateTime.now())
                .fechaInicioPermiso(dto.getFechaInicioPermiso())
                .fechaTerminoPermiso(dto.getFechaTerminoPermiso())
                .motivo(dto.getMotivo())
                .aceptadoReceptor(null)
                .build();

        SolicitudEntity guardada = solicitudRepository.save(solicitud);

        agendarBitacora("SOLICITUD_CREADA", guardada.getIdSolicitud(),
                funcionario.getIdFuncionario());

        return guardada;
    }

    @Transactional
    public SolicitudEntity responderOfertaParticular(Long idSolicitud, Long idReceptor, boolean acepta) {
        SolicitudEntity solicitud = solicitudRepository.findById(idSolicitud)
                .orElseThrow(() -> new RuntimeException("Solicitud no existe"));

        if (!solicitud.getFuncionarioReceptor().getIdFuncionario().equals(idReceptor)) {
            throw new RuntimeException("No eres el receptor de esta solicitud");
        }

        FuncionarioEntity receptor = funcionarioRepository.findById(idReceptor).orElseThrow();

        if (acepta) {
            solicitud.setAceptadoReceptor(true);
        } else {
            solicitud.setAceptadoReceptor(false);
            solicitud.setEstado(SolicitudEntity.EstadoSolicitud.RECHAZADA);
        }

        SolicitudEntity guardada = solicitudRepository.save(solicitud);

        String evento = acepta ? "OFERTA_PARTICULAR_ACEPTADA_POR_RECEPTOR" : "OFERTA_PARTICULAR_RECHAZADA_POR_RECEPTOR";
        agendarBitacora(evento, guardada.getIdSolicitud(), receptor.getIdFuncionario());

        return guardada;
    }

    @Transactional
    public SolicitudEntity responderOfertaIntercambio(Long idSolicitud, Long idReceptor, boolean acepta) {
        SolicitudEntity solicitud = solicitudRepository.findById(idSolicitud)
                .orElseThrow(() -> new RuntimeException("Solicitud no existe"));

        if (!solicitud.getFuncionarioReceptor().getIdFuncionario().equals(idReceptor)) {
            throw new RuntimeException("No eres el receptor de esta solicitud");
        }

        FuncionarioEntity receptor = funcionarioRepository.findById(idReceptor).orElseThrow();

        if (acepta) {
            solicitud.setAceptadoReceptor(true);
        } else {
            solicitud.setAceptadoReceptor(false);
            solicitud.setEstado(SolicitudEntity.EstadoSolicitud.RECHAZADA);
        }

        SolicitudEntity guardada = solicitudRepository.save(solicitud);

        String evento = acepta ? "OFERTA_ACEPTADA_POR_RECEPTOR" : "OFERTA_RECHAZADA_POR_RECEPTOR";
        agendarBitacora(evento, guardada.getIdSolicitud(), receptor.getIdFuncionario());

        return guardada;
    }

    @Transactional
    public SolicitudEntity cambiarEstado(Long idSolicitud, SolicitudEntity.EstadoSolicitud nuevoEstado, Long idUsuarioAsignador) {
        SolicitudEntity solicitud = solicitudRepository.findById(idSolicitud)
                .orElseThrow(() -> new RuntimeException("Solicitud no existe"));

        FuncionarioEntity asignador = funcionarioRepository.findById(idUsuarioAsignador).orElse(null);
        Integer tipoSolicitud = solicitud.getTipoSolicitud().getTipo();

        if (nuevoEstado == SolicitudEntity.EstadoSolicitud.APROBADA) {
            if (solicitud.getTurno() != null) {
                rechazarSolicitudesCompetitivas(solicitud.getTurno().getIdTurno(), idSolicitud, asignador);
            }

            if (tipoSolicitud.equals(1) || tipoSolicitud.equals(2)) {
                TurnoEntity turno = solicitud.getTurno();
                if (turno != null) {
                    turno.setFuncionario(null);
                    turnoRepository.save(turno);
                }
            } else if (tipoSolicitud.equals(3)) {
                TurnoEntity turno = solicitud.getTurno();
                turno.setFuncionario(solicitud.getFuncionario());
                turnoRepository.save(turno);
            } else if (tipoSolicitud.equals(4)) {
                TurnoEntity turnoDeseado = solicitud.getTurno();
                TurnoEntity turnoPropio = solicitud.getTurnoReceptor();
                turnoDeseado.setFuncionario(solicitud.getFuncionario());
                turnoPropio.setFuncionario(solicitud.getFuncionarioReceptor());
                turnoRepository.save(turnoDeseado);
                turnoRepository.save(turnoPropio);
            } else if (tipoSolicitud.equals(5)) {
                TurnoEntity turno = solicitud.getTurno();
                turno.setFuncionario(solicitud.getFuncionarioReceptor());
                turnoRepository.save(turno);
            }
        }

        solicitud.setEstado(nuevoEstado);
        SolicitudEntity guardada = solicitudRepository.save(solicitud);

        Long idAsignador = asignador != null ? asignador.getIdFuncionario() : null;
        agendarBitacora("CAMBIO_ESTADO_" + nuevoEstado.name(), guardada.getIdSolicitud(), idAsignador);

        return guardada;
    }

    private void rechazarSolicitudesCompetitivas(Long idTurno, Long idSolicitudAprobada, FuncionarioEntity asignador) {
        Long idAsignador = asignador != null ? asignador.getIdFuncionario() : null;

        solicitudRepository.findByTurno_IdTurno(idTurno).stream()
                .filter(s -> s.getEstado() == SolicitudEntity.EstadoSolicitud.PENDIENTE
                        && !s.getIdSolicitud().equals(idSolicitudAprobada))
                .forEach(conflicto -> {
                    conflicto.setEstado(SolicitudEntity.EstadoSolicitud.RECHAZADA);
                    conflicto.setMotivo("Rechazo automático: Otra solicitud para este turno fue aprobada.");
                    SolicitudEntity guardado = solicitudRepository.save(conflicto);
                    agendarBitacora("RECHAZO_AUTOMATICO", guardado.getIdSolicitud(), idAsignador);
                });
    }

    @Transactional
    public SolicitudEntity modificarMotivo(Long idSolicitud, String nuevoMotivo) {
        SolicitudEntity solicitud = solicitudRepository.findById(idSolicitud)
                .orElseThrow(() -> new RuntimeException("Solicitud no existe"));
        if (solicitud.getEstado() != SolicitudEntity.EstadoSolicitud.PENDIENTE) {
            throw new RuntimeException("Solo se puede modificar el motivo si la solicitud está en estado PENDIENTE");
        }
        solicitud.setMotivo(nuevoMotivo);
        return solicitudRepository.save(solicitud);
    }

    // Registra el evento en bitácora DESPUÉS de que la TX principal commitee,
    // evitando lock conflicts por FKs a filas aún no commiteadas.
    private void agendarBitacora(String evento, Long idSolicitud, Long idFuncionario) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            bitacoraService.registrarEvento(evento, idSolicitud, idFuncionario);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                bitacoraService.registrarEvento(evento, idSolicitud, idFuncionario);
            }
        });
    }
}
