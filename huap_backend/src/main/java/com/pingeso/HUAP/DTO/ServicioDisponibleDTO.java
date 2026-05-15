package com.pingeso.HUAP.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ServicioDisponibleDTO {
    Long servicioId;
    String nombre;
    String rol;
}
