package com.pingeso.HUAP.DTO;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RotativaDTO {
    private Long idRotativa;
    private Long idServicio;
    private String nombreServicio;
    private String nombre;
    private Byte semanas;
    private List<RotativaDiaDTO> secuenciaDias;
}