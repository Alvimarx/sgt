package com.pingeso.HUAP.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SesionDTO {
    private String token;
    private Long servicioActivo;
    private String rolActivo;
    private FuncionarioSummaryDTO perfil;
}
