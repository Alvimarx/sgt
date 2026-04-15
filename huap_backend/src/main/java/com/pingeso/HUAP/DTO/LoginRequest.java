package com.pingeso.HUAP.DTO;

import lombok.Data;

@Data
public class LoginRequest {
    private String rut;
    private String password;

    public LoginRequest() {
    }

    public String getRut() {
        return rut;
    }

    public void setRut(String rut) {
        this.rut = rut;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
