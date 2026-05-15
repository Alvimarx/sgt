package com.pingeso.HUAP.DTO;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LoginResponseV2 {
    private String preAuthToken;
    private boolean requireServiceSelection;
    private List<ServicioDisponibleDTO> servicios;
}
