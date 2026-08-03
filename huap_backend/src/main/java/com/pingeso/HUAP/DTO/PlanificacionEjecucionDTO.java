package com.pingeso.HUAP.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Vista de solo lectura de una {@code PlanificacionEjecucionEntity}, para listar versiones/vigencias en el frontend. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlanificacionEjecucionDTO {
    private Long idEjecucion;
    private Long idPlanificacion;
    private String nombrePlanificacion;
    private LocalDate fechaInicioRotativa;
    private LocalDate fechaInicioEfectiva;
    private LocalDate fechaFinEfectiva;
    private LocalDateTime fechaGeneracion;
    private String estado;
    private String nombreActor;
}
