package com.pingeso.HUAP.DTO;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlantillaDTO {
    private Long idPlantilla;
    private Long idServicio;
    private String nombreServicio;
    private String nombre;
    private Byte semanas;
    private List<PlantillaDiaDTO> secuenciaDias;
}