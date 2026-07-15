package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.RolServicioEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.ServiciosFuncionarioEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.BitacoraRepository;
import com.pingeso.HUAP.Repository.OfertaGeneralRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Repository.ServiciosFuncionarioRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.util.List;
import com.pingeso.HUAP.Entity.BitacoraEntity;
import com.pingeso.HUAP.Entity.OfertaGeneralEntity;
import com.pingeso.HUAP.Entity.SolicitudEntity;
import com.pingeso.HUAP.Repository.BitacoraRepository;
import com.pingeso.HUAP.Repository.OfertaGeneralRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ExportacionService {

    private final ServiciosFuncionarioRepository serviciosFuncionarioRepository;
    private final ServicioRepository servicioRepository;
    private final TurnoRepository turnoRepository;
    private final BitacoraRepository bitacoraRepository;
    private final OfertaGeneralRepository ofertaGeneralRepository;

    public ExportacionService(
            ServiciosFuncionarioRepository serviciosFuncionarioRepository,
            ServicioRepository servicioRepository,
            TurnoRepository turnoRepository,
            BitacoraRepository bitacoraRepository,
            OfertaGeneralRepository ofertaGeneralRepository
    ) {
        this.serviciosFuncionarioRepository = serviciosFuncionarioRepository;
        this.servicioRepository = servicioRepository;
        this.turnoRepository = turnoRepository;
        this.bitacoraRepository = bitacoraRepository;
        this.ofertaGeneralRepository = ofertaGeneralRepository;
    }

    public byte[] exportarFuncionariosPorServicioCsv(Long idServicio) {
        ServicioEntity servicio = servicioRepository.findById(idServicio)
                .orElseThrow(() -> new RuntimeException("Servicio no encontrado"));

        if (servicio.isEliminado()) {
            throw new RuntimeException("El servicio se encuentra eliminado");
        }

        List<ServiciosFuncionarioEntity> relaciones =
                serviciosFuncionarioRepository.findByServicio_IdServicioAndFuncionario_EliminadoFalse(idServicio);

        StringBuilder csv = new StringBuilder();

        csv.append('\uFEFF');

        csv.append("ID Funcionario;RUT;DV;Nombre;Apellido Paterno;Apellido Materno;Profesión;Servicio;Rol en Servicio\n");

        for (ServiciosFuncionarioEntity relacion : relaciones) {
            FuncionarioEntity funcionario = relacion.getFuncionario();
            RolServicioEntity rolServicio = relacion.getRolServicio();

            csv.append(valor(funcionario.getIdFuncionario())).append(";");
            csv.append(valor(funcionario.getRut())).append(";");
            csv.append(valor(funcionario.getDv())).append(";");
            csv.append(valor(funcionario.getNombre())).append(";");
            csv.append(valor(funcionario.getApelPat())).append(";");
            csv.append(valor(funcionario.getApelMat())).append(";");
            csv.append(valor(funcionario.getProfesion())).append(";");
            csv.append(valor(servicio.getNombre())).append(";");
            csv.append(valor(rolServicio != null ? rolServicio.getNombreRol() : "")).append("\n");
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String valor(Object valor) {
        if (valor == null) {
            return "";
        }

        String texto = String.valueOf(valor);
        texto = texto.replace("\"", "\"\"");

        return "\"" + texto + "\"";
    }
    


    public byte[] exportarTurnosCsv(
        Integer anio,
        Integer mes,
        Long idFuncionario,
        Long idServicio) 
        {
        if (anio == null || mes == null) {
            throw new RuntimeException("Debe indicar anio y mes");
        }

        if (mes < 1 || mes > 12) {
            throw new RuntimeException("El mes debe estar entre 1 y 12");
        }

        LocalDate fechaInicio = LocalDate.of(anio, mes, 1);
        LocalDate fechaFin = fechaInicio.plusMonths(1);

        List<TurnoEntity> turnos = turnoRepository.buscarTurnosParaExportacion(
                fechaInicio,
                fechaFin,
                idFuncionario,
                idServicio
        );

        List<Long> idsTurnos = turnos.stream()
                .map(TurnoEntity::getIdTurno)
                .filter(Objects::nonNull)
                .toList();

        Map<Long, List<BitacoraEntity>> eventosPorTurno = cargarEventosPorTurno(idsTurnos);
        Map<Long, List<OfertaGeneralEntity>> ofertasPorTurno = cargarOfertasPorTurno(idsTurnos);

        StringBuilder csv = new StringBuilder();

        csv.append('\uFEFF');

        csv.append("ID Turno;Tipo Turno;Fecha Inicio;Fecha Fin;Hora Inicio;Hora Fin;Horas;");
        csv.append("ID Funcionario;RUT;DV;Funcionario;Profesión;");
        csv.append("ID Servicio;Servicio;Puesto;Origen Turno;Detalle Origen\n");

        for (TurnoEntity turno : turnos) {
            String nombreCompleto = construirNombreCompleto(
                    turno.getFuncionario() != null ? turno.getFuncionario().getNombre() : "",
                    turno.getFuncionario() != null ? turno.getFuncionario().getApelPat() : "",
                    turno.getFuncionario() != null ? turno.getFuncionario().getApelMat() : ""
            );

            csv.append(valor(turno.getIdTurno())).append(";");

            csv.append(valor(
                    turno.getTipoTurno() != null
                            ? turno.getTipoTurno().getNombre()
                            : ""
            )).append(";");

            csv.append(valor(turno.getDiaInicioTurno())).append(";");
            csv.append(valor(turno.getDiaFinalTurno())).append(";");
            csv.append(valor(turno.getHoraInicio())).append(";");
            csv.append(valor(turno.getHoraFin())).append(";");
            csv.append(valor(calcularHoras(turno.getHoraInicio(), turno.getHoraFin()))).append(";");

            if (turno.getFuncionario() != null) {
                csv.append(valor(turno.getFuncionario().getIdFuncionario())).append(";");
                csv.append(valor(turno.getFuncionario().getRut())).append(";");
                csv.append(valor(turno.getFuncionario().getDv())).append(";");
                csv.append(valor(nombreCompleto)).append(";");
                csv.append(valor(turno.getFuncionario().getProfesion())).append(";");
            } else {
                csv.append(";;;;;");
            }

            if (turno.getServicio() != null) {
                csv.append(valor(turno.getServicio().getIdServicio())).append(";");
                csv.append(valor(turno.getServicio().getNombre())).append(";");
            } else {
                csv.append(";;");
            }

                csv.append(valor(
                    turno.getPuesto() != null
                        ? turno.getPuesto().getNombre()
                        : ""
                ));

                OrigenTurnoInfo origenTurno = determinarOrigenTurno(
                    turno,
                    eventosPorTurno,
                    ofertasPorTurno
                );

                csv.append(";").append(valor(origenTurno.origen()));
                csv.append(";").append(valor(origenTurno.detalle()));
                csv.append("\n");
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String construirNombreCompleto(String nombre, String apelPat, String apelMat) {
        return String.join(" ",
                nombre != null ? nombre : "",
                apelPat != null ? apelPat : "",
                apelMat != null ? apelMat : ""
        ).trim();
    }

    private BigDecimal calcularHoras(LocalTime horaInicio, LocalTime horaFin) {
        if (horaInicio == null || horaFin == null) {
            return BigDecimal.ZERO;
        }

        Duration duracion = Duration.between(horaInicio, horaFin);

        if (duracion.isNegative() || duracion.isZero()) {
            duracion = duracion.plusHours(24);
        }

        return BigDecimal.valueOf(duracion.toMinutes())
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
    }
    private record OrigenTurnoInfo(
            String origen,
            String detalle
    ) {}

    private record OrigenTurnoCandidato(
            String origen,
            String detalle,
            LocalDateTime fecha
    ) {}

    private Map<Long, List<BitacoraEntity>> cargarEventosPorTurno(List<Long> idsTurnos) {
        Map<Long, List<BitacoraEntity>> eventosPorTurno = new HashMap<>();

        if (idsTurnos == null || idsTurnos.isEmpty()) {
            return eventosPorTurno;
        }

        List<BitacoraEntity> eventos = bitacoraRepository.findEventosOrigenByTurnos(idsTurnos);

        for (BitacoraEntity evento : eventos) {
            agregarEvento(eventosPorTurno, evento.getTurno(), evento);

            SolicitudEntity solicitud = evento.getSolicitud();
            if (solicitud != null) {
                agregarEvento(eventosPorTurno, solicitud.getTurno(), evento);
                agregarEvento(eventosPorTurno, solicitud.getTurnoReceptor(), evento);
            }
        }

        Comparator<BitacoraEntity> comparadorFecha = Comparator
                .comparing(
                        BitacoraEntity::getFechaModificacion,
                        Comparator.nullsLast(Comparator.naturalOrder())
                )
                .reversed();

        eventosPorTurno.values().forEach(lista -> lista.sort(comparadorFecha));

        return eventosPorTurno;
    }

    private void agregarEvento(
            Map<Long, List<BitacoraEntity>> eventosPorTurno,
            TurnoEntity turno,
            BitacoraEntity evento
    ) {
        if (turno == null || turno.getIdTurno() == null || evento == null) {
            return;
        }

        eventosPorTurno
                .computeIfAbsent(turno.getIdTurno(), id -> new ArrayList<>())
                .add(evento);
    }

    private Map<Long, List<OfertaGeneralEntity>> cargarOfertasPorTurno(List<Long> idsTurnos) {
        if (idsTurnos == null || idsTurnos.isEmpty()) {
            return new HashMap<>();
        }

        List<OfertaGeneralEntity> ofertas =
                ofertaGeneralRepository.findByTurnoIdInWithPostulaciones(idsTurnos);

        return ofertas.stream()
                .filter(o -> o.getTurno() != null && o.getTurno().getIdTurno() != null)
                .collect(Collectors.groupingBy(o -> o.getTurno().getIdTurno()));
    }
    private OrigenTurnoInfo determinarOrigenTurno(
            TurnoEntity turno,
            Map<Long, List<BitacoraEntity>> eventosPorTurno,
            Map<Long, List<OfertaGeneralEntity>> ofertasPorTurno
    ) {
        if (turno == null || turno.getIdTurno() == null) {
            return sinInformacion();
        }

        List<OrigenTurnoCandidato> candidatos = new ArrayList<>();

        List<BitacoraEntity> eventos = eventosPorTurno.getOrDefault(
                turno.getIdTurno(),
                List.of()
        );

        for (BitacoraEntity evento : eventos) {
            clasificarEventoComoOrigen(evento)
                    .ifPresent(candidatos::add);
        }

        List<OfertaGeneralEntity> ofertas = ofertasPorTurno.getOrDefault(
                turno.getIdTurno(),
                List.of()
        );

        for (OfertaGeneralEntity oferta : ofertas) {
            clasificarOfertaGeneralComoOrigen(oferta)
                    .ifPresent(candidatos::add);
        }

        return candidatos.stream()
                .max(Comparator.comparing(c ->
                        c.fecha() != null ? c.fecha() : LocalDateTime.MIN
                ))
                .map(c -> new OrigenTurnoInfo(c.origen(), c.detalle()))
                .orElseGet(() -> {
                    if (turno.getRotativa() != null) {
                        return new OrigenTurnoInfo(
                                "Rotativa habitual",
                                "Generado desde planificación mensual"
                        );
                    }

                    return sinInformacion();
                });
    }
/* // Métodos auxiliares para clasificar eventos como origen de turno de vieja lógica, se mantienen para referencia histórica y posibles usos futuros

    private boolean esIntercambioAprobado(BitacoraEntity evento) {
        SolicitudEntity solicitud = evento.getSolicitud();

        if (solicitud != null
                && solicitud.getTipoSolicitud() != null
                && solicitud.getTipoSolicitud().getTipo() != null
                && solicitud.getTipoSolicitud().getTipo().equals(4)
                && solicitud.getEstado() == SolicitudEntity.EstadoSolicitud.APROBADA) {
            return true;
        }

        String tipoEvento = normalizar(evento.getTipoEvento());

        return tipoEvento.contains("INTERCAMBIO")
                || tipoEvento.equals("OFERTA_ACEPTADA_POR_RECEPTOR");
    }

    private boolean esSolicitudAprobadaComun(BitacoraEntity evento) {
        SolicitudEntity solicitud = evento.getSolicitud();

        if (solicitud == null
                || solicitud.getTipoSolicitud() == null
                || solicitud.getTipoSolicitud().getTipo() == null
                || solicitud.getEstado() != SolicitudEntity.EstadoSolicitud.APROBADA) {
            return false;
        }

        Integer tipo = solicitud.getTipoSolicitud().getTipo();

        // 1 = Permiso, 2 = Botar turno, 3 = Cobertura
        return tipo.equals(1) || tipo.equals(2) || tipo.equals(3);
    }

    private boolean esOfertaParticularAprobada(BitacoraEntity evento) {
        SolicitudEntity solicitud = evento.getSolicitud();

        if (solicitud != null
                && solicitud.getTipoSolicitud() != null
                && solicitud.getTipoSolicitud().getTipo() != null
                && solicitud.getTipoSolicitud().getTipo().equals(5)
                && solicitud.getEstado() == SolicitudEntity.EstadoSolicitud.APROBADA) {
            return true;
        }

        String tipoEvento = normalizar(evento.getTipoEvento());

        return tipoEvento.contains("OFERTA_PARTICULAR")
                && tipoEvento.contains("ACEPTADA");
    }

    private boolean esGeneracionPlanificacion(BitacoraEntity evento) {
        String tipoEvento = normalizar(evento.getTipoEvento());

        return tipoEvento.equals("GENERACION_TURNO")
                || tipoEvento.contains("PLANIFICACION")
                || tipoEvento.contains("ROTATIVA");
    }
*/
    private boolean esAsignacionManual(BitacoraEntity evento) {
        String tipoEvento = normalizar(evento.getTipoEvento());

        return tipoEvento.contains("ASIGNACION_MANUAL")
                || tipoEvento.contains("LIBERACION_MANUAL")
                || tipoEvento.contains("REASIGNACION_MANUAL")
                || tipoEvento.contains("TURNO_ASIGNADO_MANUALMENTE")
                || tipoEvento.contains("MODIFICACION_MANUAL_TURNO");
    }

    private OrigenTurnoInfo sinInformacion() {
        return new OrigenTurnoInfo(
                "Sin información",
                "No existen eventos registrados para este turno"
        );
    }

    private String normalizar(String texto) {
        if (texto == null) {
            return "";
        }

        return texto
                .trim()
                .toUpperCase()
                .replace("Á", "A")
                .replace("É", "E")
                .replace("Í", "I")
                .replace("Ó", "O")
                .replace("Ú", "U");
    }

    private Optional<OrigenTurnoCandidato> clasificarEventoComoOrigen(BitacoraEntity evento) {
        if (evento == null) {
            return Optional.empty();
        }

        String tipoEvento = normalizar(evento.getTipoEvento());
        LocalDateTime fecha = evento.getFechaModificacion();

        if (tipoEvento.equals("GENERACION_TURNO")) {
            String detalle = evento.getMotivo() != null
                    ? evento.getMotivo()
                    : "Generado desde planificación mensual";

            return Optional.of(new OrigenTurnoCandidato(
                    "Rotativa habitual",
                    detalle,
                    fecha
            ));
        }

        if (esAsignacionManual(evento)) {
        String detalle;

        if (tipoEvento.contains("LIBERACION_MANUAL")) {
            detalle = "Funcionario eliminado manualmente del turno por administración";
        } else if (tipoEvento.contains("REASIGNACION_MANUAL")) {
            detalle = "Funcionario reasignado manualmente por administración";
        } else if (tipoEvento.contains("ASIGNACION_MANUAL")) {
            detalle = "Funcionario asignado manualmente por administración";
        } else {
            detalle = "Turno modificado manualmente por administración";
        }

        return Optional.of(new OrigenTurnoCandidato(
                "Asignación manual",
                detalle,
                fecha
        ));
    }

        if (tipoEvento.equals("OFERTA_GENERAL_CERRADA")) {
            return Optional.of(new OrigenTurnoCandidato(
                    "Oferta general",
                    "Turno tomado desde oferta general",
                    fecha
            ));
        }

        if (tipoEvento.equals("CAMBIO_ESTADO_APROBADA")) {
            SolicitudEntity solicitud = evento.getSolicitud();

            if (solicitud == null
                    || solicitud.getTipoSolicitud() == null
                    || solicitud.getTipoSolicitud().getTipo() == null) {
                return Optional.empty();
            }

            Integer tipoSolicitud = solicitud.getTipoSolicitud().getTipo();

            return switch (tipoSolicitud) {
                case 1, 2, 3 -> Optional.of(new OrigenTurnoCandidato(
                        "Solicitud",
                        "Turno tomado mediante solicitud aprobada",
                        fecha
                ));

                case 4 -> Optional.of(new OrigenTurnoCandidato(
                        "Cambio / intercambio",
                        "Turno modificado por intercambio entre funcionarios",
                        fecha
                ));

                case 5 -> Optional.of(new OrigenTurnoCandidato(
                        "Oferta particular",
                        "Turno ofrecido a un funcionario específico y aceptado",
                        fecha
                ));

                default -> Optional.empty();
            };
        }

        return Optional.empty();
    }

    private Optional<OrigenTurnoCandidato> clasificarOfertaGeneralComoOrigen(OfertaGeneralEntity oferta) {
        if (oferta == null || oferta.getEstado() != OfertaGeneralEntity.EstadoOferta.CERRADA) {
            return Optional.empty();
        }

        return Optional.of(new OrigenTurnoCandidato(
                "Oferta general",
                "Turno tomado desde oferta general",
                oferta.getFechaCreacion()
        ));
    }

}