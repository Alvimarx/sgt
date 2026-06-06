package com.pingeso.HUAP.DTO;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TurnoDetailDTO {
    private Long id;
    private String nombre;
    private LocalDate diaInicioTurno;
    private LocalDate diaFinalTurno;
    private LocalTime horaInicio;
    private LocalTime horaFin;

    private Long idFuncionario;
    private String nombreFuncionario;

    private Long idServicio;
    private String nombreServicio;

    private Long idPuesto;
    private String nombrePuesto;

    private Long idPlantilla;
    private String nombrePlantilla;

    private Long idTipoTurno;
    private String nombreTipoTurno;
}
