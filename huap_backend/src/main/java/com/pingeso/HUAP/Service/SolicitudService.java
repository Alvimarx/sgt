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
import java.util.Objects;
import java.util.stream.Stream;

/**
 * Servicio de solicitudes y ofertas de turnos.
 *
 * <p>Cubre la creación y el ciclo de vida de las {@code Solicitud} (intercambio de turnos,
 * oferta particular a un médico y oferta general al servicio), la respuesta de los
 * receptores (aceptar/rechazar), el cambio de estado y la modificación del motivo.
 * Al resolverse una solicitud, coordina la reasignación de los turnos implicados.
 */
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

    /** Solicitudes emitidas por el funcionario (el que las crea, no el receptor). */
    @Transactional
    public List<SolicitudEntity> findByFuncionario(Long idFuncionario) {
        return solicitudRepository.findByFuncionario_IdFuncionario(idFuncionario);
    }

    /** Solicitudes donde el funcionario es el receptor (intercambio u oferta particular). */
    @Transactional
    public List<SolicitudEntity> findByFuncionarioReceptor(Long idFuncionario) {
        return solicitudRepository.findByFuncionarioReceptor_IdFuncionario(idFuncionario);
    }

    /** Solicitudes de un tipo (Tipo_Solicitud.tipo: 1=Permiso, 2=Botar turno, 3=Cobertura, 4=Intercambio, 5=Oferta particular). */
    @Transactional
    public List<SolicitudEntity> findByTipoSolicitud(Long idTipoSolicitud) {
        return solicitudRepository.findByTipoSolicitud_IdTipoSolicitud(idTipoSolicitud);
    }

    /** Solicitudes asociadas a un turno (como turno solicitado o como turno propio en un intercambio). */
    @Transactional
    public List<SolicitudEntity> findByTurno(Long idTurno) {
        return solicitudRepository.findByTurno_IdTurno(idTurno);
    }

    /*
       Modificadores y utilidades
    */

    /**
     * Crea una solicitud en estado {@code PENDIENTE}. No reasigna ningún turno todavía:
     * eso solo ocurre al aprobarla en {@link #cambiarEstado}.
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

    /**
     * Registra la respuesta del receptor a una oferta particular. Aceptar solo marca
     * {@code aceptadoReceptor}; no reasigna el turno (eso lo hace la aprobación de jefatura
     * en {@link #cambiarEstado}). Rechazar sí resuelve la solicitud directamente (RECHAZADA).
     */
    @Transactional
    public SolicitudEntity responderOfertaParticular(Long idSolicitud, Long idReceptor, boolean acepta) {
        SolicitudEntity solicitud = solicitudRepository.findById(idSolicitud)
                .orElseThrow(() -> new RuntimeException("Solicitud no existe"));

        if (solicitud.getFuncionarioReceptor() == null || !solicitud.getFuncionarioReceptor().getIdFuncionario().equals(idReceptor)) {
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

    /** Igual que {@link #responderOfertaParticular} pero para solicitudes de intercambio. */
    @Transactional
    public SolicitudEntity responderOfertaIntercambio(Long idSolicitud, Long idReceptor, boolean acepta) {
        SolicitudEntity solicitud = solicitudRepository.findById(idSolicitud)
                .orElseThrow(() -> new RuntimeException("Solicitud no existe"));

        if (solicitud.getFuncionarioReceptor() == null || !solicitud.getFuncionarioReceptor().getIdFuncionario().equals(idReceptor)) {
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

    /**
     * Resuelve una solicitud cambiándole el estado. Es aquí donde, al aprobar, se mueven
     * de verdad los turnos:
     * <ul>
     *   <li>Tipo 1/2 (permiso / botar turno): libera el turno (funcionario = null).</li>
     *   <li>Tipo 3 (cobertura): asigna el funcionario solicitante al turno.</li>
     *   <li>Tipo 4 (intercambio): intercambia el funcionario entre el turno deseado y el propio.</li>
     *   <li>Tipo 5 (oferta particular): asigna el funcionario receptor al turno.</li>
     * </ul>
     * Antes de tocar nada, bloquea (lock pesimista) el/los turno(s) involucrados para serializar
     * aprobaciones concurrentes que compitan por el mismo turno, relee la solicitud con lock propio
     * (por si otra aprobación ya la resolvió mientras se esperaba el lock) y rechaza automáticamente
     * cualquier otra solicitud PENDIENTE que apunte al mismo turno.
     */
    @Transactional
    public SolicitudEntity cambiarEstado(Long idSolicitud, SolicitudEntity.EstadoSolicitud nuevoEstado, Long idUsuarioAsignador) {
        SolicitudEntity solicitud = solicitudRepository.findById(idSolicitud)
                .orElseThrow(() -> new RuntimeException("Solicitud no existe"));

        FuncionarioEntity asignador = funcionarioRepository.findById(idUsuarioAsignador).orElse(null);
        Integer tipoSolicitud = solicitud.getTipoSolicitud().getTipo();

        if (nuevoEstado == SolicitudEntity.EstadoSolicitud.APROBADA) {
            // Serializa aprobaciones concurrentes que compiten por el/los mismo(s) turno(s):
            // se bloquean los turnos involucrados ANTES de tocar cualquier solicitud. En el
            // intercambio (tipo 4) hay dos turnos; se bloquean siempre ordenados por id para que
            // dos intercambios cruzados nunca se esperen mutuamente en sentido opuesto (deadlock).
            lockTurnosInvolucrados(solicitud, tipoSolicitud);

            // Tras obtener el lock, se relee la solicitud CON LOCK PROPIO: una lectura normal
            // seguiría viendo la foto de antes de esperar (snapshot de la transacción), por lo
            // que si otra aprobación concurrente ya la resolvió mientras esperábamos, esto lo
            // detecta con datos frescos.
            solicitud = solicitudRepository.findByIdForUpdate(idSolicitud)
                    .orElseThrow(() -> new RuntimeException("Solicitud no existe"));
            if (solicitud.getEstado() != SolicitudEntity.EstadoSolicitud.PENDIENTE) {
                throw new RuntimeException(
                        "Esta solicitud ya no está pendiente (probablemente otra jefatura ya la resolvió)");
            }

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
                if (turno == null) {
                    throw new RuntimeException("La solicitud de cobertura no tiene un turno asociado");
                }
                turno.setFuncionario(solicitud.getFuncionario());
                turnoRepository.save(turno);
            } else if (tipoSolicitud.equals(4)) {
                TurnoEntity turnoDeseado = solicitud.getTurno();
                TurnoEntity turnoPropio = solicitud.getTurnoReceptor();
                if (turnoDeseado == null || turnoPropio == null) {
                    throw new RuntimeException("La solicitud de intercambio no tiene ambos turnos asociados");
                }
                turnoDeseado.setFuncionario(solicitud.getFuncionario());
                turnoPropio.setFuncionario(solicitud.getFuncionarioReceptor());
                turnoRepository.save(turnoDeseado);
                turnoRepository.save(turnoPropio);
            } else if (tipoSolicitud.equals(5)) {
                TurnoEntity turno = solicitud.getTurno();
                if (turno == null) {
                    throw new RuntimeException("La solicitud de oferta particular no tiene un turno asociado");
                }
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

    private void lockTurnosInvolucrados(SolicitudEntity solicitud, Integer tipoSolicitud) {
        if (Integer.valueOf(4).equals(tipoSolicitud)) {
            Long idTurnoDeseado = solicitud.getTurno() != null ? solicitud.getTurno().getIdTurno() : null;
            Long idTurnoPropio = solicitud.getTurnoReceptor() != null ? solicitud.getTurnoReceptor().getIdTurno() : null;
            Stream.of(idTurnoDeseado, idTurnoPropio)
                    .filter(Objects::nonNull)
                    .sorted()
                    .forEach(turnoRepository::findByIdForUpdate);
        } else if (solicitud.getTurno() != null) {
            turnoRepository.findByIdForUpdate(solicitud.getTurno().getIdTurno());
        }
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

    /** Solo permitido mientras la solicitud está {@code PENDIENTE}. */
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
