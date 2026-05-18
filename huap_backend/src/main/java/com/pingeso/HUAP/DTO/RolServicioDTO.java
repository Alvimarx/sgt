package com.pingeso.HUAP.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RolServicioDTO {
    private Long idServicio;
    private String nombreServicio;
    private Long idRolServicio;
    private String rolServicioNombre;
}