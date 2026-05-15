package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.AlterarTurnoRequest;
import com.pingeso.HUAP.Entity.EventLogEntity;
import com.pingeso.HUAP.Entity.PersonalEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.PersonalRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class AlterarTurnoService {

    private final TurnoRepository turnoRepository;
    private final PersonalRepository personalRepository;
    private final EventLogService eventLogService;
    private final NotificacionService notificacionService;

    @Autowired
    public AlterarTurnoService(TurnoRepository turnoRepository,
            PersonalRepository personalRepository,
            EventLogService eventLogService,
            NotificacionService notificacionService) {
        this.turnoRepository = turnoRepository;
        this.personalRepository = personalRepository;
        this.eventLogService = eventLogService;
        this.notificacionService = notificacionService;
    }
    //Necesita revision
    /**
    @Transactional
    public Map<String, Object> alterarTurno(AlterarTurnoRequest request) {
        // Validar turno existe
        TurnoEntity turno = turnoRepository.findById(request.getIdTurno())
                .orElseThrow(() -> new RuntimeException("Turno no encontrado"));

        // Validar administrador existe
        PersonalEntity admin = personalRepository.findById(request.getIdAdministrador())
                .orElseThrow(() -> new RuntimeException("Administrador no encontrado"));

        // Guardar estado anterior para la bitácora
        Long idMedicoAnterior = turno.getIdMedico();
        PersonalEntity medicoAnterior = idMedicoAnterior != null
                ? personalRepository.findById(idMedicoAnterior).orElse(null)
                : null;
        String horasAnteriores = turno.getHoraInicio() + " - " + turno.getHoraFin();

        Map<String, Object> resultado = new HashMap<>();

        switch (request.getAccion().toUpperCase()) {
            case "DESASIGNAR":
                turno.setIdMedico(null);
                turno.setEstado("DISPONIBLE");
                registrarEnBitacora(admin, turno, medicoAnterior, null,
                        "DESASIGNACION",
                        "Turno desasignado de " + (medicoAnterior != null ? medicoAnterior.getNombre() : "N/A"),
                        request.getMotivo());
                // Notificar al médico que fue desasignado
                if (medicoAnterior != null) {
                    String fechaTurno = turno.getDiaInicioTurno() != null ? turno.getDiaInicioTurno().toString()
                            : "N/A";
                    notificacionService.crearNotificacion(
                            "DESASIGNACION_TURNO",
                            "Su turno del " + fechaTurno + " ha sido desasignado. Motivo: " + request.getMotivo(),
                            "Turno desasignado de " + medicoAnterior.getNombre(),
                            "INFORMATIVO",
                            admin,
                            medicoAnterior);
                }
                resultado.put("accion", "desasignado");
                break;

            case "REASIGNAR":
                if (request.getIdNuevoMedico() == null) {
                    throw new RuntimeException("Debe especificar el ID del nuevo médico");
                }
                PersonalEntity nuevoMedico = personalRepository.findById(request.getIdNuevoMedico())
                        .orElseThrow(() -> new RuntimeException("Nuevo médico no encontrado"));

                turno.setIdMedico(nuevoMedico.getIdPersonal());
                turno.setEstado("ASIGNADO");
                registrarEnBitacora(admin, turno, medicoAnterior, nuevoMedico,
                        "REASIGNACION",
                        "Turno reasignado de " + (medicoAnterior != null ? medicoAnterior.getNombre() : "N/A") +
                                " a " + nuevoMedico.getNombre(),
                        request.getMotivo());
                // Notificar al médico anterior que fue reasignado
                if (medicoAnterior != null) {
                    String fechaTurnoReasig = turno.getDiaInicioTurno() != null ? turno.getDiaInicioTurno().toString()
                            : "N/A";
                    notificacionService.crearNotificacion(
                            "REASIGNACION_TURNO",
                            "Su turno del " + fechaTurnoReasig + " ha sido reasignado a otro médico. Motivo: "
                                    + request.getMotivo(),
                            "Turno reasignado de " + medicoAnterior.getNombre() + " a " + nuevoMedico.getNombre(),
                            "INFORMATIVO",
                            admin,
                            medicoAnterior);
                }
            // Notificar al nuevo médico que le asignaron un turno
            {
                String fechaTurnoNuevo = turno.getDiaInicioTurno() != null ? turno.getDiaInicioTurno().toString()
                        : "N/A";
                String horarioTurno = (turno.getHoraInicio() != null ? turno.getHoraInicio().toString() : "") + " - " +
                        (turno.getHoraFin() != null ? turno.getHoraFin().toString() : "");
                notificacionService.crearNotificacion(
                        "ASIGNACION_TURNO",
                        "Se le ha asignado un turno para el " + fechaTurnoNuevo + " (" + horarioTurno + ")",
                        "Turno asignado a " + nuevoMedico.getNombre(),
                        "INFORMATIVO",
                        admin,
                        nuevoMedico);
            }
                resultado.put("accion", "reasignado");
                resultado.put("nuevoMedico", nuevoMedico.getNombre());
                break;

            case "CAMBIAR_HORAS":
                if (request.getNuevaHoraInicio() == null || request.getNuevaHoraFin() == null) {
                    throw new RuntimeException("Debe especificar nueva hora de inicio y fin");
                }
                turno.setHoraInicio(request.getNuevaHoraInicio());
                turno.setHoraFin(request.getNuevaHoraFin());
                registrarEnBitacora(admin, turno, null, null,
                        "MODIFICACION_HORARIO",
                        "Horario cambiado de " + horasAnteriores + " a " +
                                request.getNuevaHoraInicio() + " - " + request.getNuevaHoraFin(),
                        request.getMotivo());
                // Notificar al médico asignado si existe
                if (turno.getIdMedico() != null) {
                    PersonalEntity medicoActual = personalRepository.findById(turno.getIdMedico()).orElse(null);
                    if (medicoActual != null) {
                        String fechaCambio = turno.getDiaInicioTurno() != null ? turno.getDiaInicioTurno().toString()
                                : "N/A";
                        notificacionService.crearNotificacion(
                                "CAMBIO_HORARIO",
                                "El horario de su turno del " + fechaCambio + " ha sido modificado. Nuevo horario: " +
                                        request.getNuevaHoraInicio() + " - " + request.getNuevaHoraFin() +
                                        (request.getMotivo() != null ? ". Motivo: " + request.getMotivo() : ""),
                                "Horario modificado para " + medicoActual.getNombre(),
                                "INFORMATIVO",
                                admin,
                                medicoActual);
                    }
                }
                resultado.put("accion", "horario_modificado");
                resultado.put("nuevaHoraInicio", request.getNuevaHoraInicio().toString());
                resultado.put("nuevaHoraFin", request.getNuevaHoraFin().toString());
                break;

            case "ASIGNAR":
                // Asignar un turno sin asignar a un médico
                if (request.getIdNuevoMedico() == null) {
                    throw new RuntimeException("Debe especificar el ID del médico a asignar");
                }
                if (turno.getIdMedico() != null) {
                    throw new RuntimeException("El turno ya tiene un médico asignado. Use REASIGNAR en su lugar.");
                }
                PersonalEntity medicoAsignado = personalRepository.findById(request.getIdNuevoMedico())
                        .orElseThrow(() -> new RuntimeException("Médico no encontrado"));

                turno.setIdMedico(medicoAsignado.getIdPersonal());
                turno.setEstado("ASIGNADO");
                registrarEnBitacora(admin, turno, null, medicoAsignado,
                        "ASIGNACION",
                        "Turno asignado a " + medicoAsignado.getNombre() + " " +
                                (medicoAsignado.getApellidoPaterno() != null ? medicoAsignado.getApellidoPaterno()
                                        : ""),
                        request.getMotivo());
            // Notificar al médico que le asignaron un turno
            {
                String fechaAsig = turno.getDiaInicioTurno() != null ? turno.getDiaInicioTurno().toString() : "N/A";
                String horario = (turno.getHoraInicio() != null ? turno.getHoraInicio().toString() : "") + " - " +
                        (turno.getHoraFin() != null ? turno.getHoraFin().toString() : "");
                notificacionService.crearNotificacion(
                        "ASIGNACION_TURNO",
                        "Se le ha asignado un nuevo turno para el " + fechaAsig + " (" + horario + ")",
                        "Turno asignado a " + medicoAsignado.getNombre(),
                        "INFORMATIVO",
                        admin,
                        medicoAsignado);
            }
                resultado.put("accion", "asignado");
                resultado.put("medicoAsignado", medicoAsignado.getNombre());
                resultado.put("medicoId", medicoAsignado.getIdPersonal());
                break;

            default:
                throw new RuntimeException("Acción no válida: " + request.getAccion());
        }

        // Guardar cambios
        TurnoEntity turnoActualizado = turnoRepository.save(turno);

        resultado.put("success", true);
        resultado.put("turno", turnoActualizado);
        resultado.put("mensaje", "Turno alterado exitosamente");

        return resultado;
    }
    **/
    //Necesita revision
    /**
    private void registrarEnBitacora(PersonalEntity admin, TurnoEntity turno,
            PersonalEntity medicoAnterior, PersonalEntity nuevoMedico,
            String tipoEvento, String descripcion, String motivo) {
        EventLogEntity evento = new EventLogEntity();
        evento.setTipoEvento(tipoEvento);
        evento.setDescripcion(descripcion);
        evento.setFechaEvento(LocalDateTime.now());
        evento.setUsuario(admin); // Administrador que realiza la acción
        evento.setIdTurno(turno.getId());

        if (medicoAnterior != null) {
            evento.setUsuarioSecundario(medicoAnterior);
        }
        if (nuevoMedico != null && !nuevoMedico.equals(medicoAnterior)) {
            evento.setUsuarioSecundario(nuevoMedico);
        }

        evento.setEstadoAnterior(turno.getEstado());
        evento.setEstadoNuevo(turno.getEstado());
        evento.setMotivo(motivo);
        evento.setFechaInicioAfectada(turno.getDiaInicioTurno());
        evento.setFechaFinAfectada(turno.getDiaFinalTurno());
        evento.setActivo(true);
        evento.setFechaModificacion(LocalDateTime.now());

        eventLogService.save(evento);
    }
     **/
}
