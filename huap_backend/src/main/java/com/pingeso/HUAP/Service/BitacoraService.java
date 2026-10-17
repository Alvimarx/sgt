package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.BitacoraResponseDTO;
import com.pingeso.HUAP.Entity.BitacoraEntity;
import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.OfertaGeneralEntity;
import com.pingeso.HUAP.Entity.SolicitudEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.BitacoraRepository;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.OfertaGeneralRepository;
import com.pingeso.HUAP.Repository.SolicitudRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import com.pingeso.HUAP.Security.AlcanceServicio;
import com.pingeso.HUAP.Security.SeguridadServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Historial de eventos del sistema (bitácora), usado para auditoría y trazabilidad.
 *
 * <p>Los eventos se generan sobre todo desde otros servicios ({@code SolicitudService},
 * {@code OfertaGeneralService}, planificación) al resolverse una acción; ver
 * {@link #registrarEvento} y {@link #registrarEventoOferta}. Ambos corren en una transacción
 * nueva ({@code REQUIRES_NEW}) para no acoplar el registro del log al éxito/fallo de la
 * transacción que lo dispara, y tragan cualquier excepción para que un fallo al loguear
 * nunca reviente la operación de negocio real.
 */
@Service
@RequiredArgsConstructor
public class BitacoraService {

    private static final String OTRO_SERVICIO = "No tienes acceso a datos de otro servicio";

    private final BitacoraRepository bitacoraRepository;
    private final SolicitudRepository solicitudRepository;
    private final FuncionarioRepository funcionarioRepository;
    private final OfertaGeneralRepository ofertaGeneralRepository;
    private final SeguridadServicio seguridadServicio;
    private final TurnoRepository turnoRepository;

    // SEC (C-17, BUG-007): las lecturas de la bitácora exigían rol de gestión, pero entregaban
    // los eventos de todo el hospital. Ahora los listados traen solo los del servicio de la
    // sesión y las consultas por id, turno, solicitud o persona de otro servicio responden 403.
    // El ADMINISTRADOR sigue viendo todo. Ver esDelServicio para la regla.

    @Transactional(readOnly = true)
    public List<BitacoraEntity> findAll() {
        return acotarAlServicio(bitacoraRepository.findAll());
    }

    @Transactional(readOnly = true)
    public Optional<BitacoraEntity> findById(Long id) {
        Optional<BitacoraEntity> evento = bitacoraRepository.findById(id);
        evento.ifPresent(this::exigirEventoDelServicio);
        return evento;
    }

    @Transactional(readOnly = true)
    public List<BitacoraEntity> findByTipoEvento(String tipoEvento) {
        return acotarAlServicio(bitacoraRepository.findByTipoEvento(tipoEvento));
    }

    /** Eventos de un actor: la persona debe ser del servicio de la sesión y se ven solo los de ese servicio. */
    @Transactional(readOnly = true)
    public List<BitacoraEntity> findByFuncionario(Long idFuncionario) {
        if (!seguridadServicio.esAdministrador()) {
            FuncionarioEntity actor = funcionarioRepository.findById(idFuncionario).orElse(null);
            if (actor != null && !AlcanceServicio.perteneceAServicio(actor, seguridadServicio.idServicioActual())) {
                throw new AccessDeniedException(OTRO_SERVICIO);
            }
        }
        return acotarAlServicio(bitacoraRepository.findByFuncionario_IdFuncionario(idFuncionario));
    }

    /**
     * C-06 (HU-DET-04): el historial de un turno, para «Ver historial» del detalle. Lo ve el
     * ADMINISTRADOR, la gestión del servicio del turno y quien tiene hoy el turno, aunque sea
     * médico; cualquier otro recibe 403. Si el turno no existe, 404. Antes se revisaba el servicio
     * solo si había eventos: un turno sin eventos de otro servicio respondía 200 con la lista vacía.
     */
    @Transactional(readOnly = true)
    public List<BitacoraEntity> findByTurno(Long idTurno) {
        TurnoEntity turno = turnoRepository.findById(idTurno)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "El turno no existe"));
        exigirAccesoAlHistorialDelTurno(turno);
        return bitacoraRepository.findByTurno_IdTurno(idTurno);
    }

    private void exigirAccesoAlHistorialDelTurno(TurnoEntity turno) {
        if (seguridadServicio.esAdministrador()) return;
        boolean esSuyoHoy = turno.getFuncionario() != null
                && Objects.equals(turno.getFuncionario().getIdFuncionario(), seguridadServicio.idUsuarioActual());
        if (esSuyoHoy) return;
        if (seguridadServicio.esGestionDelServicio()) {
            seguridadServicio.exigirMismoServicio(AlcanceServicio.servicioDe(turno));
            return;
        }
        throw new AccessDeniedException("Solo puedes ver el historial de tus turnos");
    }

    @Transactional(readOnly = true)
    public List<BitacoraEntity> findBySolicitud(Long idSolicitud) {
        List<BitacoraEntity> eventos = bitacoraRepository.findBySolicitud_IdSolicitud(idSolicitud);
        if (!eventos.isEmpty() && !seguridadServicio.esAdministrador()
                && !AlcanceServicio.solicitudEsDelServicio(eventos.get(0).getSolicitud(), seguridadServicio.idServicioActual())) {
            throw new AccessDeniedException(OTRO_SERVICIO);
        }
        return eventos;
    }

    /** Deja solo los eventos del servicio de la sesión (el ADMINISTRADOR los ve todos). */
    private List<BitacoraEntity> acotarAlServicio(List<BitacoraEntity> eventos) {
        if (seguridadServicio.esAdministrador()) return eventos;
        Long servicioSesion = seguridadServicio.idServicioActual();
        return eventos.stream().filter(e -> esDelServicio(e, servicioSesion)).toList();
    }

    private void exigirEventoDelServicio(BitacoraEntity evento) {
        if (!seguridadServicio.esAdministrador() && !esDelServicio(evento, seguridadServicio.idServicioActual())) {
            throw new AccessDeniedException(OTRO_SERVICIO);
        }
    }

    /**
     * Un evento es del servicio de su turno, de su solicitud (la regla de
     * {@link AlcanceServicio#solicitudEsDelServicio}) o del turno de su oferta general
     * ({@code "idOferta=X"} en el motivo). Los que no se pueden atribuir a un servicio, como los
     * resúmenes de planificación, solo los ve el ADMINISTRADOR.
     */
    private boolean esDelServicio(BitacoraEntity evento, Long idServicio) {
        if (idServicio == null) return false;
        if (evento.getTurno() != null) return idServicio.equals(AlcanceServicio.servicioDe(evento.getTurno()));
        if (evento.getSolicitud() != null) return AlcanceServicio.solicitudEsDelServicio(evento.getSolicitud(), idServicio);
        Long idOferta = idOfertaDelMotivo(evento.getMotivo());
        if (idOferta == null) return false;
        return ofertaGeneralRepository.findById(idOferta)
                .map(oferta -> idServicio.equals(AlcanceServicio.servicioDe(oferta.getTurno())))
                .orElse(false);
    }

    private static Long idOfertaDelMotivo(String motivo) {
        if (motivo == null || !motivo.startsWith("idOferta=")) return null;
        try {
            return Long.parseLong(motivo.substring("idOferta=".length()));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public List<BitacoraEntity> findActivos() {
        return bitacoraRepository.findByActivoTrue();
    }

    public BitacoraEntity save(BitacoraEntity evento) {
        // SEC (H-03, High): la bitácora es append-only. Sin este chequeo, enviar el
        // idEvento de un registro existente hace que JPA lo sobrescriba (merge) en vez de
        // insertar uno nuevo, permitiendo borrar o falsificar evidencia de auditoría.
        if (evento.getIdEvento() != null) {
            throw new IllegalArgumentException(
                    "La bitácora es de solo escritura (append-only); no se puede modificar un evento existente");
        }
        if (evento.getFechaModificacion() == null) {
            evento.setFechaModificacion(LocalDateTime.now());
        }
        if (evento.getActivo() == null) {
            evento.setActivo(true);
        }
        return bitacoraRepository.save(evento);
    }

    // ── DTO methods (no modifican los existentes) ──────────────────────────

    /** Igual que {@link #findAll} pero mapeado a {@link BitacoraResponseDTO} (ver {@link #convertToDTO}). */
    @Transactional(readOnly = true)
    public List<BitacoraResponseDTO> findAllDTO() {
        return acotarAlServicio(bitacoraRepository.findAll()).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<BitacoraResponseDTO> findByIdDTO(Long id) {
        return findById(id).map(this::convertToDTO);
    }

    /**
     * Enriquece un evento crudo con los nombres/datos ya resueltos (actor, turno, solicitud
     * y sus relaciones de emisor/receptor/intercambio) para que el frontend no tenga que hacer
     * varios llamados. Caso especial: los eventos de oferta general no tienen {@code solicitud}
     * asociada, sino que codifican el id en {@code motivo} como {@code "idOferta=X"}; ahí se
     * busca la oferta aparte para resolver oferente, turno ofertado y (si el evento es de cierre)
     * el postulante seleccionado.
     */
    @Transactional(readOnly = true)
    public BitacoraResponseDTO convertToDTO(BitacoraEntity e) {
        FuncionarioEntity actor   = e.getFuncionario();
        TurnoEntity       turno   = e.getTurno();
        SolicitudEntity  s       = e.getSolicitud();

        // Relaciones de la solicitud
        FuncionarioEntity emisor    = s != null ? s.getFuncionario()         : null;
        FuncionarioEntity receptor  = s != null ? s.getFuncionarioReceptor() : null;
        TurnoEntity       tSol      = s != null ? s.getTurno()               : null;
        TurnoEntity       tReceptor = s != null ? s.getTurnoReceptor()       : null;

        // Enriquecimiento para oferta general (motivo = "idOferta=X", sin solicitud)
        String nombreOferente          = null;
        String diaInicioTurnoOferta    = null;
        String horaInicioTurnoOferta   = null;
        String horaFinTurnoOferta      = null;
        String nombrePuestoTurnoOferta = null;
        String nombreAsignado          = null;

        if (s == null && e.getMotivo() != null && e.getMotivo().startsWith("idOferta=")) {
            try {
                Long idOferta = Long.parseLong(e.getMotivo().substring("idOferta=".length()));
                Optional<OfertaGeneralEntity> optOferta = ofertaGeneralRepository.findById(idOferta);
                if (optOferta.isPresent()) {
                    OfertaGeneralEntity oferta = optOferta.get();
                    nombreOferente = nombreCompleto(oferta.getOfertor());
                    TurnoEntity tOferta = oferta.getTurno();
                    if (tOferta != null) {
                        diaInicioTurnoOferta    = tOferta.getDiaInicioTurno()  != null ? tOferta.getDiaInicioTurno().toString()  : null;
                        horaInicioTurnoOferta   = tOferta.getHoraInicio()      != null ? tOferta.getHoraInicio().toString()       : null;
                        horaFinTurnoOferta      = tOferta.getHoraFin()         != null ? tOferta.getHoraFin().toString()          : null;
                        nombrePuestoTurnoOferta = tOferta.getPuesto()          != null ? tOferta.getPuesto().getNombre()           : null;
                    }
                    if ("OFERTA_GENERAL_CERRADA".equals(e.getTipoEvento())) {
                        nombreAsignado = oferta.getPostulaciones().stream()
                                .filter(p -> Boolean.TRUE.equals(p.getSeleccionado()))
                                .findFirst()
                                .map(p -> nombreCompleto(p.getPostulante()))
                                .orElse(null);
                    }
                }
            } catch (NumberFormatException ignored) {}
        }

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
                .nombrePuesto(turno != null && turno.getPuesto() != null ? turno.getPuesto().getNombre() : null)
                .idFuncionarioTurno(turno != null && turno.getFuncionario() != null ? turno.getFuncionario().getIdFuncionario() : null)
                .nombreFuncionarioTurno(turno != null ? nombreCompleto(turno.getFuncionario()) : null)
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
                .nombrePuestoSolicitud(tSol != null && tSol.getPuesto() != null ? tSol.getPuesto().getNombre() : null)
                // receptor e intercambio
                .idFuncionarioReceptor(receptor != null ? receptor.getIdFuncionario() : null)
                .nombreFuncionarioReceptor(nombreCompleto(receptor))
                .idTurnoReceptor(tReceptor != null ? tReceptor.getIdTurno() : null)
                .diaInicioTurnoReceptor(tReceptor != null && tReceptor.getDiaInicioTurno() != null ? tReceptor.getDiaInicioTurno().toString() : null)
                .diaFinalTurnoReceptor(tReceptor != null && tReceptor.getDiaFinalTurno() != null ? tReceptor.getDiaFinalTurno().toString() : null)
                .horaInicioTurnoReceptor(tReceptor != null && tReceptor.getHoraInicio() != null ? tReceptor.getHoraInicio().toString() : null)
                .horaFinTurnoReceptor(tReceptor != null && tReceptor.getHoraFin() != null ? tReceptor.getHoraFin().toString() : null)
                .nombrePuestoReceptor(tReceptor != null && tReceptor.getPuesto() != null ? tReceptor.getPuesto().getNombre() : null)
                // oferta general
                .nombreOferente(nombreOferente)
                .diaInicioTurnoOferta(diaInicioTurnoOferta)
                .horaInicioTurnoOferta(horaInicioTurnoOferta)
                .horaFinTurnoOferta(horaFinTurnoOferta)
                .nombrePuestoTurnoOferta(nombrePuestoTurnoOferta)
                .nombreAsignado(nombreAsignado)
                .build();
    }

    private String nombreCompleto(FuncionarioEntity f) {
        if (f == null) return null;
        return (f.getNombre() + (f.getApelPat() != null ? " " + f.getApelPat() : "")).trim();
    }

    /**
     * Registra en la bitácora un turno recién generado desde una planificación.
     */
    @Transactional
    public void registrarTurnoGenerado(TurnoEntity turno, FuncionarioEntity actor, String planificacionNombre) {
        String asignado = (turno.getFuncionario() != null)
                ? nombreCompleto(turno.getFuncionario()) : "Vacante";

        BitacoraEntity log = BitacoraEntity.builder()
                .tipoEvento("GENERACION_TURNO")
                .turno(turno)
                .funcionario(actor) // quién generó (jefatura/admin)
                .motivo(planificacionNombre != null ? "Planificación: " + planificacionNombre : null)
                .observaciones("Turno generado — " + asignado)
                .fechaInicioAfectada(turno.getDiaInicioTurno() != null && turno.getHoraInicio() != null
                        ? turno.getDiaInicioTurno().atTime(turno.getHoraInicio()) : null)
                .fechaFinAfectada(turno.getDiaFinalTurno() != null && turno.getHoraFin() != null
                        ? turno.getDiaFinalTurno().atTime(turno.getHoraFin()) : null)
                .fechaModificacion(LocalDateTime.now())
                .activo(true)
                .build();
        bitacoraRepository.save(log);
    }

    /**
     * Registra un evento a nivel de planificación (generación de una vigencia, edición desde
     * fecha, extensión, acortamiento, anulación de ejecución). A diferencia de
     * {@link #registrarTurnoGenerado} (uno por turno), este es un único evento resumen de la
     * operación, sin turno ni solicitud asociados.
     */
    @Transactional
    public void registrarEventoPlanificacion(String tipoEvento, FuncionarioEntity actor, String observaciones) {
        BitacoraEntity log = BitacoraEntity.builder()
                .tipoEvento(tipoEvento)
                .funcionario(actor)
                .observaciones(observaciones)
                .fechaModificacion(LocalDateTime.now())
                .activo(true)
                .build();
        bitacoraRepository.save(log);
    }

    private String tipoSolicitudLabel(Integer tipo) {
        if (tipo == null) return null;
        return switch (tipo) {
            case 1 -> "Permiso";
            case 2 -> "Botar turno";
            case 3 -> "Cobertura";
            case 4 -> "Intercambio";
            case 5 -> "Oferta particular";
            default -> "Tipo " + tipo;
        };
    }

    /**
     * Registra un evento asociado a una oferta general. No hay FK directa a
     * {@code Oferta_General}: el id se codifica en {@code motivo} como {@code "idOferta=X"}
     * (ver {@link #convertToDTO}, que lo decodifica para enriquecer la respuesta).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrarEventoOferta(String tipoEvento, Long idOferta, Long idFuncionario) {
        try {
            FuncionarioEntity actor = idFuncionario != null
                    ? funcionarioRepository.findById(idFuncionario).orElse(null) : null;

            BitacoraEntity log = BitacoraEntity.builder()
                    .tipoEvento(tipoEvento)
                    .motivo("idOferta=" + idOferta)
                    .funcionario(actor)
                    .fechaInicioAfectada(LocalDateTime.now())
                    .activo(true)
                    .build();
            bitacoraRepository.save(log);
        } catch (Exception e) {
            System.err.println("Error guardando en bitácora (oferta): " + e.getMessage());
        }
    }

    /**
     * Registra un evento asociado a una solicitud. Llamar siempre desde un hook
     * {@code afterCommit} (ver {@code SolicitudService.agendarBitacora}) para evitar conflictos
     * de lock con la transacción principal, dado que corre en una transacción nueva.
     */
    // Llamar siempre desde un afterCommit hook para evitar lock conflicts con la TX principal
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrarEvento(String tipoEvento, Long idSolicitud, Long idFuncionario) {
        try {
            SolicitudEntity solicitud = idSolicitud != null
                    ? solicitudRepository.findById(idSolicitud).orElse(null) : null;
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
