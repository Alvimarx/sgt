package com.pingeso.HUAP.DTO;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TipoTurnoDTO {
    private Long idTipoTurno;
    private String nombre;
    private LocalTime horaInicio;
    private LocalTime horaTermino;
    private Long idServicio;
}