package com.pingeso.HUAP.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Una asignación dentro de una planificación. Al crear/actualizar solo se usan
 * los ids; los nombres se rellenan al devolver la planificación.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlanificacionAsignacionDTO {
    private Long idAsignacion;

    private Long idPlantilla;
    private String nombrePlantilla;

    private Long idFuncionario;     // opcional (puede ser null)
    private String nombreFuncionario;

    private Long idPuesto;          // opcional (puede ser null)
    private String nombrePuesto;
}
