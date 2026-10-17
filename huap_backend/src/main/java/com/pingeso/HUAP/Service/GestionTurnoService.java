package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.AlterarTurnoRequest;
import com.pingeso.HUAP.Entity.BitacoraEntity;
import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import com.pingeso.HUAP.Security.SeguridadServicio;
import com.pingeso.HUAP.Utils.FormatoFecha;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import com.pingeso.HUAP.Repository.ServiciosFuncionarioRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Servicio de gestión (alteración) de turnos ya existentes.
 *
 * <p>Concentra la operación de {@code alterarTurno}: cambios sobre un turno asignado
 * (reasignación, liberación o modificación) verificando las reglas y conflictos
 * correspondientes. Es el punto único de entrada para mutar turnos fuera del flujo de
 * planificación, de modo que la lógica de validación no quede duplicada en los controllers.
 */
@Service
@RequiredArgsConstructor
public class GestionTurnoService {

    private final TurnoRepository turnoRepository;
    private final FuncionarioRepository funcionarioRepository;
    private final TurnoService turnoService;
    private final BitacoraService bitacoraService;
    private final NotificacionService notificacionService;
    private final ServiciosFuncionarioRepository serviciosFuncionarioRepository;
    private final SeguridadServicio seguridadServicio;
    private final ValidadorAsignacionTurnoService validadorAsignacion;
    private final SolicitudService solicitudService;

    // §5.1 (P-01): motivos con que quedan RECHAZADAS las solicitudes pendientes sobre un turno que
    // la gestión asigna, reasigna o libera a mano (mismo estilo que el rechazo automático de R10).
    static final String MOTIVO_ASIGNADO = "Rechazo automático: El turno fue asignado manualmente.";
    static final String MOTIVO_REASIGNADO = "Rechazo automático: El turno fue reasignado manualmente.";
    static final String MOTIVO_LIBERADO = "Rechazo automático: El turno fue liberado manualmente.";

    /**
     * Kill-switch del lock pesimista (por defecto activado). Existe para poder medir A/B el costo del
     * lock contra la versión sin él (ver {@code LockBenchmark}). En producción NO debe desactivarse:
     * sin el lock, {@link #alterarTurno} vuelve a ser vulnerable al lost-update.
     */
    @Value("${huap.concurrencia.lock-pesimista:true}")
    private boolean lockPesimista;

    /**
     * Asigna, libera, reasigna o cambia el horario de un turno. Los conflictos con el calendario
     * de la persona (cruce de horario, R13 y el cruce que detecta el cambio de horario) salen como
     * 409 con su mensaje; antes el cruce se lanzaba como {@code Exception} y respondía 500.
     */
    @Transactional
    public Map<String, Object> alterarTurno(AlterarTurnoRequest request) {

        // Lock pesimista de la fila del turno: serializa cualquier par de operaciones sobre el MISMO
        // turno, evitando el lost-update de dos asignaciones concurrentes (el 2º hilo espera, re-lee
        // el estado ya committeado y los guards de cada acción lo tratan correctamente).
        TurnoEntity turno = (lockPesimista
                        ? turnoRepository.findByIdForUpdate(request.getIdTurno())
                        : turnoRepository.findById(request.getIdTurno()))
                .orElseThrow(() -> new RuntimeException("Turno no encontrado: " + request.getIdTurno()));

        if (turno.isEliminado()) {
                throw new RuntimeException("No se puede alterar un turno eliminado.");
        }

        if (turno.getServicio() == null || turno.getServicio().getIdServicio() == null) {
                throw new RuntimeException("El turno no tiene servicio asociado.");
        }

        // SEC (H-06, High): antes se podía alterar (asignar/desasignar/reasignar/cambiar
        // horas) un turno de un servicio ajeno con solo indicar su id.
        seguridadServicio.exigirMismoServicio(turno.getServicio().getIdServicio());

        // SEC (C-02, Critical): el administrador que ejecuta la acción SIEMPRE es quien está
        // autenticado, nunca el idAdministrador del body — de lo contrario cualquiera podía
        // alterar turnos atribuyendo la acción a un tercero en la bitácora.
        FuncionarioEntity admin = funcionarioRepository.findById(seguridadServicio.idUsuarioActual())
                .orElseThrow(() -> new RuntimeException("Administrador no encontrado"));

        FuncionarioEntity funcionarioAnterior = turno.getFuncionario();

        return switch (request.getAccion().toUpperCase()) {
                case "ASIGNAR"       -> accionAsignar(request, turno, admin, funcionarioAnterior);
                case "DESASIGNAR"    -> accionDesasignar(request, turno, admin, funcionarioAnterior);
                case "REASIGNAR"     -> accionReasignar(request, turno, admin, funcionarioAnterior);
                case "CAMBIAR_HORAS" -> accionCambiarHoras(request, turno, admin);
                default -> throw new RuntimeException("Acción no válida: " + request.getAccion());
        };
    }

    // ---------------------------------------------------------------
    // Acciones
    // ---------------------------------------------------------------

    private Map<String, Object> accionAsignar(AlterarTurnoRequest request, TurnoEntity turno,
            FuncionarioEntity admin, FuncionarioEntity funcionarioAnterior) {

        if (funcionarioAnterior != null)
            throw new RuntimeException("El turno ya tiene un funcionario asignado. Use REASIGNAR.");
        if (request.getIdNuevoMedico() == null)
            throw new RuntimeException("Debe especificar el ID del funcionario a asignar.");

        FuncionarioEntity nuevo = funcionarioRepository.findById(request.getIdNuevoMedico())
                .orElseThrow(() -> new RuntimeException("Funcionario no encontrado: " + request.getIdNuevoMedico()));

        validarFuncionarioAsignable(nuevo, turno);
        validarConflictoFuncionario(nuevo, turno);

        turno.setFuncionario(nuevo);
        turnoRepository.save(turno);

        registrarEnBitacora(admin, turno, "ASIGNACION_MANUAL_TURNO",
                "Turno asignado manualmente a " + nombreCompleto(nuevo), request.getMotivo());
        solicitudService.rechazarPendientesPorCambioManual(turno.getIdTurno(), admin.getIdFuncionario(), MOTIVO_ASIGNADO);

        notificacionService.crearNotificacionSistema(nuevo,
                "Se te ha asignado un turno del " + diaYHorario(turno) + ".");

        return Map.of("accion", "asignado", "funcionario", nombreCompleto(nuevo));
    }

    private Map<String, Object> accionDesasignar(AlterarTurnoRequest request, TurnoEntity turno,
            FuncionarioEntity admin, FuncionarioEntity funcionarioAnterior) {

        String anteriorNombre = funcionarioAnterior != null ? nombreCompleto(funcionarioAnterior) : "N/A";

        turno.setFuncionario(null);
        turnoRepository.save(turno);

        registrarEnBitacora(admin, turno, "LIBERACION_MANUAL_TURNO",
          "Funcionario eliminado manualmente del turno: " + anteriorNombre, request.getMotivo());

        if (funcionarioAnterior != null) {
            // Liberar un cupo que ya estaba libre no cambia nada: sus coberturas pendientes siguen.
            solicitudService.rechazarPendientesPorCambioManual(turno.getIdTurno(), admin.getIdFuncionario(), MOTIVO_LIBERADO);
            notificacionService.crearNotificacionSistema(funcionarioAnterior,
                    "Tu turno del " + FormatoFecha.dia(turno.getDiaInicioTurno())
                    + " ha sido desasignado. Motivo: " + request.getMotivo());
        }

        return Map.of("accion", "desasignado", "anterior", anteriorNombre);
    }

    private Map<String, Object> accionReasignar(AlterarTurnoRequest request, TurnoEntity turno,
            FuncionarioEntity admin, FuncionarioEntity funcionarioAnterior) {

        if (request.getIdNuevoMedico() == null)
            throw new RuntimeException("Debe especificar el ID del nuevo funcionario.");

        FuncionarioEntity nuevo = funcionarioRepository.findById(request.getIdNuevoMedico())
                .orElseThrow(() -> new RuntimeException("Funcionario no encontrado: " + request.getIdNuevoMedico()));

        validarFuncionarioAsignable(nuevo, turno);
        validarConflictoFuncionario(nuevo, turno);

        String anteriorNombre = funcionarioAnterior != null ? nombreCompleto(funcionarioAnterior) : "N/A";

        turno.setFuncionario(nuevo);
        turnoRepository.save(turno);

        registrarEnBitacora(admin, turno, "REASIGNACION_MANUAL_TURNO",
                "Turno reasignado manualmente de " + anteriorNombre + " a " + nombreCompleto(nuevo),
                request.getMotivo());
        // Reasignar a quien ya lo tiene no cambia de dueño: sus solicitudes siguen en pie.
        boolean cambiaDeDueno = funcionarioAnterior == null
                || !funcionarioAnterior.getIdFuncionario().equals(nuevo.getIdFuncionario());
        if (cambiaDeDueno) {
            solicitudService.rechazarPendientesPorCambioManual(turno.getIdTurno(), admin.getIdFuncionario(), MOTIVO_REASIGNADO);
        }

        if (funcionarioAnterior != null) {
            notificacionService.crearNotificacionSistema(funcionarioAnterior,
                    "Tu turno del " + FormatoFecha.dia(turno.getDiaInicioTurno())
                    + " ha sido reasignado a otro funcionario. Motivo: " + request.getMotivo());
        }
        notificacionService.crearNotificacionSistema(nuevo,
                "Se te ha reasignado el turno del " + diaYHorario(turno) + ".");

        return Map.of("accion", "reasignado", "anterior", anteriorNombre, "nuevo", nombreCompleto(nuevo));
    }

    private Map<String, Object> accionCambiarHoras(AlterarTurnoRequest request,
            TurnoEntity turno, FuncionarioEntity admin) {

        if (request.getNuevaHoraInicio() == null || request.getNuevaHoraFin() == null)
            throw new RuntimeException("Debe especificar nueva hora de inicio y fin.");

        String horasAnteriores = FormatoFecha.hora(turno.getHoraInicio()) + " - " + FormatoFecha.hora(turno.getHoraFin());
        String horasNuevas = FormatoFecha.hora(request.getNuevaHoraInicio()) + " - " + FormatoFecha.hora(request.getNuevaHoraFin());
        FuncionarioEntity asignado = turno.getFuncionario();

        turno.setHoraInicio(request.getNuevaHoraInicio());
        turno.setHoraFin(request.getNuevaHoraFin());
        try {
            turnoService.saveTurno(turno); // aplica ajustes de feriados/fines de semana
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            // §5.1 (P-01): saveTurno lanza Exception solo por el cruce con otro turno de la persona;
            // es un conflicto (409), no un error interno (antes respondía 500).
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }

        registrarEnBitacora(admin, turno, "MODIFICACION_HORARIO",
                "Horario cambiado de " + horasAnteriores + " a " + horasNuevas,
                request.getMotivo());

        if (asignado != null) {
            notificacionService.crearNotificacionSistema(asignado,
                    "El horario de tu turno del " + FormatoFecha.dia(turno.getDiaInicioTurno())
                    + " fue modificado. Nuevo horario: " + horasNuevas
                    + (request.getMotivo() != null ? ". Motivo: " + request.getMotivo() : ""));
        }

        return Map.of("accion", "horario_modificado",
                "nuevaHoraInicio", request.getNuevaHoraInicio().toString(),
                "nuevaHoraFin", request.getNuevaHoraFin().toString());
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    /**
     * Revisa el calendario de quien recibe el turno a mano (asignar o reasignar): ni cruce de
     * horario ni noche seguida de día (R13). Los dos son conflictos de estado: 409 con el mensaje.
     */
    private void validarConflictoFuncionario(FuncionarioEntity funcionario, TurnoEntity turno) {
        Long idFuncionario = funcionario.getIdFuncionario();
        // Lock pesimista del funcionario ANTES del chequeo: serializa validación+asignación para un
        // mismo funcionario (cubre ASIGNAR y REASIGNAR), cerrando la carrera check-then-act que
        // permitía doble-reserva entre acciones concurrentes. Se libera al commit de alterarTurno.
        if (lockPesimista) {
            funcionarioRepository.lockFuncionario(idFuncionario);
        }

        LocalDateTime inicioObjetivo = turno.getDiaInicioTurno().atTime(turno.getHoraInicio());
        LocalDateTime finObjetivo = turno.getDiaFinalTurno().atTime(turno.getHoraFin());

        // Trae los turnos de la persona que tocan los días del turno: alcanza para el cruce y para
        // R13, cuya noche termina (o cuyo día empieza) en uno de esos días.
        List<TurnoEntity> cercanos = turnoRepository
                .findConflictosByFuncionario(
                        idFuncionario,
                        turno.getDiaInicioTurno(),
                        turno.getDiaFinalTurno()
                )
                .stream()
                .filter(t -> !t.getIdTurno().equals(turno.getIdTurno()))
                .toList();

        boolean hayConflicto = cercanos.stream().anyMatch(t -> {
                LocalDateTime inicioExistente = t.getDiaInicioTurno().atTime(t.getHoraInicio());
                LocalDateTime finExistente = t.getDiaFinalTurno().atTime(t.getHoraFin());

                return solapan(inicioObjetivo, finObjetivo, inicioExistente, finExistente);
        });

        // §5.1 (P-01): antes se lanzaba como Exception y /turnos/alterar respondía 500.
        if (hayConflicto) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "El funcionario ya tiene otro turno asignado en este rango horario.");
        }

        // C-04 (HU-SOL-14, criterio 5): R13 también al asignar y reasignar a mano, con el mismo
        // validador y el mismo mensaje de las solicitudes y las ofertas. No hay excepción de
        // emergencia. La generación de la planificación no lo aplica (limitación conocida).
        try {
            validadorAsignacion.validarDescansoPostNocturno(
                    nombreParaMensaje(funcionario), inicioObjetivo, finObjetivo, turno.getIdTurno(), cercanos);
        } catch (ValidadorAsignacionTurnoService.ConflictoAsignacionException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
        }

        private boolean solapan(
                LocalDateTime aInicio,
                LocalDateTime aFin,
                LocalDateTime bInicio,
                LocalDateTime bFin
        ) {
        return aInicio.isBefore(bFin) && bInicio.isBefore(aFin);
    }

    private void registrarEnBitacora(FuncionarioEntity admin, TurnoEntity turno,
            String tipoEvento, String observaciones, String motivo) {
        BitacoraEntity evento = BitacoraEntity.builder()
                .funcionario(admin)
                .turno(turno)
                .tipoEvento(tipoEvento)
                .observaciones(observaciones)
                .motivo(motivo)
                .fechaInicioAfectada(turno.getDiaInicioTurno() != null
                        ? turno.getDiaInicioTurno().atStartOfDay() : null)
                .fechaFinAfectada(turno.getDiaFinalTurno() != null
                        ? turno.getDiaFinalTurno().atStartOfDay() : null)
                .fechaModificacion(LocalDateTime.now())
                .activo(true)
                .build();

        bitacoraService.save(evento);
    }

    private String nombreCompleto(FuncionarioEntity f) {
        return f.getNombre() + " " + f.getApelPat();
    }

    /** Nombre y apellido paterno, como lo nombran los mensajes de R13 de las solicitudes. */
    private static String nombreParaMensaje(FuncionarioEntity f) {
        return (f.getNombre() + (f.getApelPat() != null ? " " + f.getApelPat() : "")).trim();
    }

    /** «lun 19 oct (08:00 - 20:00)»: el turno en los avisos al funcionario, sin fechas ISO (P-01). */
    private static String diaYHorario(TurnoEntity turno) {
        return FormatoFecha.dia(turno.getDiaInicioTurno())
                + " (" + FormatoFecha.hora(turno.getHoraInicio()) + " - " + FormatoFecha.hora(turno.getHoraFin()) + ")";
    }

    private void validarFuncionarioAsignable(FuncionarioEntity funcionario, TurnoEntity turno) {
        if (funcionario == null) {
                throw new RuntimeException("Debe especificar un funcionario válido.");
        }

        if (funcionario.isEliminado()) {
                throw new RuntimeException("No se puede asignar un funcionario eliminado.");
        }

        Long idServicioTurno = turno.getServicio().getIdServicio();

        boolean perteneceAlServicio =
                serviciosFuncionarioRepository
                        .existsByServicio_IdServicioAndFuncionario_IdFuncionarioAndFuncionario_EliminadoFalse(
                                idServicioTurno,
                                funcionario.getIdFuncionario()
                        );

        if (!perteneceAlServicio) {
                throw new RuntimeException("El funcionario seleccionado no pertenece al servicio del turno.");
        }
        }
}
