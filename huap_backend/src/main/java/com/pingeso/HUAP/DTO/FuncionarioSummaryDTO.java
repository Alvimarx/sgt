package com.pingeso.HUAP.DTO;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FuncionarioSummaryDTO {

    private Long idFuncionario;
    private String nombre;
    private String apellidoPaterno;
    private String apellidoMaterno;
    private String apellidos;
    private String rut;
    private String dv;
    private String rutCompleto;
    private Integer estado;
    private String profesion;
    private Long idRolSistema;

    //Lista para manejar multiples servicios y roles
    private List<RolServicioDTO> servicios;

}

