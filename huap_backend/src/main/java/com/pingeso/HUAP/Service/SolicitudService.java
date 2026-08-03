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
 *
 * <p>Antes de crear una solicitud que agregaría un turno a un funcionario (Cobertura,
 * Intercambio, Oferta particular), y de nuevo — de forma obligatoria — al aprobarla, se valida
 * mediante {@link ValidadorAsignacionTurnoService} que el calendario resultante del funcionario
 * no quede con turnos superpuestos ni con una secuencia incompatible de dos turnos de 12 horas
 * consecutivos sin descanso (corrección funcional "turnos de 12 horas", ver
 * {@code Archivo de funcionalidades.md}). La revalidación en la aprobación es indispensable porque
 * el calendario del funcionario puede haber cambiado entre la creación de la solicitud y su
 * aprobación.
 */
@Service
@RequiredArgsConstructor
public class SolicitudService {

    private final SolicitudRepository solicitudRepository;
    private final FuncionarioRepository funcionarioRepository;
    private final TipoSolicitudRepository tipoSolicitudRepository;
    private final TurnoRepository turnoRepository;
    private final BitacoraService bitacoraService;
    private final ValidadorAsignacionTurnoService validadorAsignacion;

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

        validarConflictoSegunTipo(solicitud);

        SolicitudEntity guardada = solicitudRepository.save(solicitud);

        agendarBitacora("SOLICITUD_CREADA", guardada.getIdSolicitud(),
                funcionario.getIdFuncionario());

        return guardada;
    }

    // ============================ Validación de 12 horas consecutivas ============================

    /**
     * Valida, según el tipo de solicitud, que el/los funcionario(s) que terminarían con un turno
     * nuevo no queden con superposición ni con una secuencia incompatible de 12 horas. Se usa tanto
     * al crear la solicitud (aviso temprano) como al aprobarla (revalidación obligatoria y definitiva
     * con el calendario más reciente). Los tipos 1 (Permiso) y 2 (Botar turno) solo liberan un turno,
     * nunca agregan uno, por lo que no requieren esta validación.
     */
    private void validarConflictoSegunTipo(SolicitudEntity solicitud) {
        Integer tipo = solicitud.getTipoSolicitud() != null ? solicitud.getTipoSolicitud().getTipo() : null;
        if (tipo == null) return;

        if (tipo.equals(3)) {
            // Cobertura: el emisor tomaría el turno.
            TurnoEntity turno = solicitud.getTurno();
            FuncionarioEntity emisor = solicitud.getFuncionario();
            if (turno != null && emisor != null) {
                validarNuevoTurnoParaFuncionario(emisor, turno, List.of());
            }
        } else if (tipo.equals(4)) {
            // Intercambio: el emisor recibe turnoDeseado (solicitud.turno), el receptor recibe
            // turnoPropio (solicitud.turnoReceptor). Se simula excluyendo de cada calendario el
            // turno que esa persona está entregando, antes de validar el que recibe.
            TurnoEntity turnoDeseado = solicitud.getTurno();
            TurnoEntity turnoPropio = solicitud.getTurnoReceptor();
            FuncionarioEntity emisor = solicitud.getFuncionario();
            FuncionarioEntity receptor = solicitud.getFuncionarioReceptor();
            if (turnoDeseado != null && turnoPropio != null && emisor != null && receptor != null) {
                validarNuevoTurnoParaFuncionario(emisor, turnoDeseado, List.of(turnoPropio.getIdTurno()));
                validarNuevoTurnoParaFuncionario(receptor, turnoPropio, List.of(turnoDeseado.getIdTurno()));
            }
        } else if (tipo.equals(5)) {
            // Oferta particular: el receptor tomaría el turno.
            TurnoEntity turno = solicitud.getTurno();
            FuncionarioEntity receptor = solicitud.getFuncionarioReceptor();
            if (turno != null && receptor != null) {
                validarNuevoTurnoParaFuncionario(receptor, turno, List.of());
            }
        }
        // Tipos 1 y 2 (Permiso, Botar turno): solo liberan, no requieren validar.
    }

    /**
     * Valida que {@code turnoCandidato} pueda asignarse a {@code funcionario} contra su calendario
     * vigente actual (en cualquier servicio), excluyendo de ese calendario los turnos que el propio
     * movimiento le hace entregar simultáneamente (relevante en un intercambio).
     */
    private void validarNuevoTurnoParaFuncionario(FuncionarioEntity funcionario, TurnoEntity turnoCandidato,
            List<Long> idsExcluirDelCalendario) {
        if (turnoCandidato.getDiaInicioTurno() == null || turnoCandidato.getHoraInicio() == null
                || turnoCandidato.getDiaFinalTurno() == null || turnoCandidato.getHoraFin() == null) {
            return; // datos incompletos (p. ej. en pruebas unitarias): no hay base temporal para validar.
        }

        List<TurnoEntity> vigentes = turnoRepository.findByFuncionario_IdFuncionario(funcionario.getIdFuncionario());
        Long[] idsExcluir = idsExcluirDelCalendario.toArray(new Long[0]);
        List<TurnoEntity> calendarioResultante = validadorAsignacion.excluyendo(vigentes, idsExcluir);

        LocalDateTime nuevoInicio = turnoCandidato.getDiaInicioTurno().atTime(turnoCandidato.getHoraInicio());
        LocalDateTime nuevoFin = turnoCandidato.getDiaFinalTurno().atTime(turnoCandidato.getHoraFin());

        validadorAsignacion.validarAsignacion(
                nombreCompleto(funcionario), nuevoInicio, nuevoFin, turnoCandidato.getIdTurno(), calendarioResultante);
    }

    private String nombreCompleto(FuncionarioEntity f) {
        if (f == null) return "el funcionario";
        return (f.getNombre() + (f.getApelPat() != null ? " " + f.getApelPat() : "")).trim();
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
            validarConflictoSegunTipo(solicitud); // aviso temprano; la aprobación revalida de todos modos
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
            validarConflictoSegunTipo(solicitud); // aviso temprano; la aprobación revalida de todos modos
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

            // Revalidación OBLIGATORIA y definitiva con el calendario más reciente: el funcionario
            // pudo haber tomado otro turno entre la creación de la solicitud y esta aprobación.
            validarConflictoSegunTipo(solicitud);

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
