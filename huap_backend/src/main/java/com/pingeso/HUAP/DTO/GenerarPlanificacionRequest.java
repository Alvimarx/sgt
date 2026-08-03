package com.pingeso.HUAP.DTO;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/**
 * Cuerpo de la petición para generar (o extender) los turnos reales de un molde de planificación.
 *
 * <p>Separa el <b>ancla de rotativa</b> ({@code fechaInicioRotativa}, siempre un lunes, que fija la
 * fase del ciclo) de la <b>vigencia efectiva</b> ({@code fechaInicioEfectiva}..{@code
 * fechaFinEfectiva}, el rango real con turnos), permitiendo generar cualquier rango de fechas, no
 * solo un ciclo o un mes.
 */
@Data
public class GenerarPlanificacionRequest {
    private LocalDate fechaInicioRotativa;
    private LocalDate fechaInicioEfectiva;
    private LocalDate fechaFinEfectiva;
    private List<Long> idsReglas;
}
