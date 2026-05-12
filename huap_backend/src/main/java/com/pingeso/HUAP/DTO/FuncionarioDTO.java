package com.pingeso.HUAP.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FuncionarioDTO {

    private Long idFuncionario;
    private String rut;
    private String nombre;
    private String apelPat;
    private String apelMat;
    private String profesion;

}

