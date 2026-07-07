package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.AlterarTurnoRequest;
import com.pingeso.HUAP.Entity.BitacoraEntity;
import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.pingeso.HUAP.Repository.ServiciosFuncionarioRepository;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GestionTurnoService {

    private final TurnoRepository turnoRepository;
    private final FuncionarioRepository funcionarioRepository;
    private final TurnoService turnoService;
    private final BitacoraService bitacoraService;
    private final Notificacion2Service notificacion2Service;
    private final ServiciosFuncionarioRepository serviciosFuncionarioRepository;

    @Transactional
    public Map<String, Object> alterarTurno(AlterarTurnoRequest request) throws Exception {

        TurnoEntity turno = turnoRepository.findById(request.getIdTurno())
                .orElseThrow(() -> new RuntimeException("Turno no encontrado: " + request.getIdTurno()));

        if (turno.isEliminado()) {
                throw new RuntimeException("No se puede alterar un turno eliminado.");
        }

        if (turno.getServicio() == null || turno.getServicio().getIdServicio() == null) {
                throw new RuntimeException("El turno no tiene servicio asociado.");
        }

        FuncionarioEntity admin = funcionarioRepository.findById(request.getIdAdministrador())
                .orElseThrow(() -> new RuntimeException("Administrador no encontrado: " + request.getIdAdministrador()));

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
            FuncionarioEntity admin, FuncionarioEntity funcionarioAnterior) throws Exception {

        if (funcionarioAnterior != null)
            throw new RuntimeException("El turno ya tiene un funcionario asignado. Use REASIGNAR.");
        if (request.getIdNuevoMedico() == null)
            throw new RuntimeException("Debe especificar el ID del funcionario a asignar.");

        FuncionarioEntity nuevo = funcionarioRepository.findById(request.getIdNuevoMedico())
                .orElseThrow(() -> new RuntimeException("Funcionario no encontrado: " + request.getIdNuevoMedico()));

        validarFuncionarioAsignable(nuevo, turno);
        validarConflictoFuncionario(nuevo.getIdFuncionario(), turno);

        turno.setFuncionario(nuevo);
        turnoRepository.save(turno);

        registrarEnBitacora(admin, turno, "ASIGNACION_MANUAL_TURNO",
                "Turno asignado manualmente a " + nombreCompleto(nuevo), request.getMotivo());

        notificacion2Service.crearNotificacionSistema(nuevo,
                "Se te ha asignado un turno del " + turno.getDiaInicioTurno()
                + " (" + turno.getHoraInicio() + " - " + turno.getHoraFin() + ").");

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
            notificacion2Service.crearNotificacionSistema(funcionarioAnterior,
                    "Tu turno del " + turno.getDiaInicioTurno()
                    + " ha sido desasignado. Motivo: " + request.getMotivo());
        }

        return Map.of("accion", "desasignado", "anterior", anteriorNombre);
    }

    private Map<String, Object> accionReasignar(AlterarTurnoRequest request, TurnoEntity turno,
            FuncionarioEntity admin, FuncionarioEntity funcionarioAnterior) throws Exception {

        if (request.getIdNuevoMedico() == null)
            throw new RuntimeException("Debe especificar el ID del nuevo funcionario.");

        FuncionarioEntity nuevo = funcionarioRepository.findById(request.getIdNuevoMedico())
                .orElseThrow(() -> new RuntimeException("Funcionario no encontrado: " + request.getIdNuevoMedico()));

        validarFuncionarioAsignable(nuevo, turno);
        validarConflictoFuncionario(nuevo.getIdFuncionario(), turno);

        String anteriorNombre = funcionarioAnterior != null ? nombreCompleto(funcionarioAnterior) : "N/A";

        turno.setFuncionario(nuevo);
        turnoRepository.save(turno);

        registrarEnBitacora(admin, turno, "REASIGNACION_MANUAL_TURNO",
                "Turno reasignado manualmente de " + anteriorNombre + " a " + nombreCompleto(nuevo),
                request.getMotivo());

        if (funcionarioAnterior != null) {
            notificacion2Service.crearNotificacionSistema(funcionarioAnterior,
                    "Tu turno del " + turno.getDiaInicioTurno()
                    + " ha sido reasignado a otro funcionario. Motivo: " + request.getMotivo());
        }
        notificacion2Service.crearNotificacionSistema(nuevo,
                "Se te ha reasignado el turno del " + turno.getDiaInicioTurno()
                + " (" + turno.getHoraInicio() + " - " + turno.getHoraFin() + ").");

        return Map.of("accion", "reasignado", "anterior", anteriorNombre, "nuevo", nombreCompleto(nuevo));
    }

    private Map<String, Object> accionCambiarHoras(AlterarTurnoRequest request,
            TurnoEntity turno, FuncionarioEntity admin) throws Exception {

        if (request.getNuevaHoraInicio() == null || request.getNuevaHoraFin() == null)
            throw new RuntimeException("Debe especificar nueva hora de inicio y fin.");

        String horasAnteriores = turno.getHoraInicio() + " - " + turno.getHoraFin();
        FuncionarioEntity asignado = turno.getFuncionario();

        turno.setHoraInicio(request.getNuevaHoraInicio());
        turno.setHoraFin(request.getNuevaHoraFin());
        turnoService.saveTurno(turno); // aplica ajustes de feriados/fines de semana

        registrarEnBitacora(admin, turno, "MODIFICACION_HORARIO",
                "Horario cambiado de " + horasAnteriores
                + " a " + request.getNuevaHoraInicio() + " - " + request.getNuevaHoraFin(),
                request.getMotivo());

        if (asignado != null) {
            notificacion2Service.crearNotificacionSistema(asignado,
                    "El horario de tu turno del " + turno.getDiaInicioTurno()
                    + " fue modificado. Nuevo horario: "
                    + request.getNuevaHoraInicio() + " - " + request.getNuevaHoraFin()
                    + (request.getMotivo() != null ? ". Motivo: " + request.getMotivo() : ""));
        }

        return Map.of("accion", "horario_modificado",
                "nuevaHoraInicio", request.getNuevaHoraInicio().toString(),
                "nuevaHoraFin", request.getNuevaHoraFin().toString());
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    private void validarConflictoFuncionario(Long idFuncionario, TurnoEntity turno) throws Exception {
        LocalDateTime inicioObjetivo = turno.getDiaInicioTurno().atTime(turno.getHoraInicio());
        LocalDateTime finObjetivo = turno.getDiaFinalTurno().atTime(turno.getHoraFin());

        boolean hayConflicto = turnoRepository
                .findConflictosByFuncionario(
                        idFuncionario,
                        turno.getDiaInicioTurno(),
                        turno.getDiaFinalTurno()
                )
                .stream()
                .filter(t -> !t.getIdTurno().equals(turno.getIdTurno()))
                .anyMatch(t -> {
                        LocalDateTime inicioExistente = t.getDiaInicioTurno().atTime(t.getHoraInicio());
                        LocalDateTime finExistente = t.getDiaFinalTurno().atTime(t.getHoraFin());

                        return solapan(inicioObjetivo, finObjetivo, inicioExistente, finExistente);
                });

        if (hayConflicto) {
                throw new Exception("El funcionario ya tiene otro turno asignado en este rango horario.");
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
