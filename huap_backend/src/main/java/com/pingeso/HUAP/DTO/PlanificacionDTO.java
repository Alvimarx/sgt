package com.pingeso.HUAP.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlanificacionDTO {
    private Long idPlanificacion;
    private Long idServicio;
    private String nombreServicio;
    private String nombre;
    private List<PlanificacionAsignacionDTO> asignaciones;
}
