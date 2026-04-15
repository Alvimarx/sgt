package com.pingeso.HUAP.DTO;

public class LoginResponse {
    private String token;
    private Long userId;
    private Long servicioId;
    private String rol;
    private String nombre;
    private String apellidoPaterno;
    private String apellidoMaterno;

    // Constructor sin argumentos
    public LoginResponse() {
    }

    // Constructor con todos los argumentos (esto es lo que faltaba)
    public LoginResponse(String token, Long userId, Long servicioId, String rol,
                         String nombre, String apellidoPaterno, String apellidoMaterno) {
        this.token = token;
        this.userId = userId;
        this.servicioId = servicioId;
        this.rol = rol;
        this.nombre = nombre;
        this.apellidoPaterno = apellidoPaterno;
        this.apellidoMaterno = apellidoMaterno;
    }

    // Getters y Setters
    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getServicioId() {
        return servicioId;
    }

    public void setServicioId(Long servicioId) {
        this.servicioId = servicioId;
    }

    public String getRol() {
        return rol;
    }

    public void setRol(String rol) {
        this.rol = rol;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getApellidoPaterno() {
        return apellidoPaterno;
    }

    public void setApellidoPaterno(String apellidoPaterno) {
        this.apellidoPaterno = apellidoPaterno;
    }

    public String getApellidoMaterno() {
        return apellidoMaterno;
    }

    public void setApellidoMaterno(String apellidoMaterno) {
        this.apellidoMaterno = apellidoMaterno;
    }
}