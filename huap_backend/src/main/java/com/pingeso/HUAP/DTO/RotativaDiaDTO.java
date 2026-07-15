package com.pingeso.HUAP.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RotativaDiaDTO {
    private int diaIndex;
    private TipoTurnoDTO turno; // Será null si es un día libre
}