package com.pingeso.HUAP.DTO;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LoginResponse {
    private String preAuthToken;
    private boolean requireServiceSelection;
    private List<ServicioDisponibleDTO> servicios;
    private boolean registeredInSystem;
    private String message;
}
