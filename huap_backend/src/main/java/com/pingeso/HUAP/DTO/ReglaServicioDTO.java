package com.pingeso.HUAP.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReglaServicioDTO {

    private Long idRegla;
    private Long idServicio;
    private String nombre;
    private boolean activo;
    private boolean aplicaFinDeSemana;
    private boolean aplicaFeriado;

    // Desfase en minutos (aplicado al inicio del tipo de inicio y/o al fin del tipo de fin).
    private int tiempoMinutos;

    // Tipo de turno cuyo inicio se ajusta (nullable = no ajusta inicio).
    private Long idTipoTurnoInicio;
    // Tipo de turno cuyo fin se ajusta (nullable = no ajusta fin).
    private Long idTipoTurnoFin;

    // Salida: nombres resueltos para mostrar en el front.
    private String nombreTipoTurnoInicio;
    private String nombreTipoTurnoFin;
}
