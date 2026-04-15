package com.pingeso.HUAP.DTO;

public class MedicoDTO {
    private Long id;
    private String primerNombre;
    private String primerApellido;

    //getters y setters
    public Long getId() {
        return id; }

    public void setId(Long id) {
        this.id = id; }

    public String getPrimerNombre() {
        return primerNombre; }

    public void setPrimerNombre(String primerNombre) {
        this.primerNombre = primerNombre; }

    public String getPrimerApellido() {
        return primerApellido; }

    public void setPrimerApellido(String primerApellido) {
        this.primerApellido = primerApellido;
    }
}

