package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.RolServicioEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.ServiciosFuncionarioEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Repository.ServiciosFuncionarioRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class ExportacionService {

    private final ServiciosFuncionarioRepository serviciosFuncionarioRepository;
    private final ServicioRepository servicioRepository;
    private final TurnoRepository turnoRepository;

    public ExportacionService(
            ServiciosFuncionarioRepository serviciosFuncionarioRepository,
            ServicioRepository servicioRepository,
            TurnoRepository turnoRepository
    ) {
        this.serviciosFuncionarioRepository = serviciosFuncionarioRepository;
        this.servicioRepository = servicioRepository;
        this.turnoRepository = turnoRepository;
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

        StringBuilder csv = new StringBuilder();

        csv.append('\uFEFF');

        csv.append("ID Turno;Tipo Turno;Fecha Inicio;Fecha Fin;Hora Inicio;Hora Fin;Horas;");
        csv.append("ID Funcionario;RUT;DV;Funcionario;Profesión;");
        csv.append("ID Servicio;Servicio;Puesto\n");

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

}