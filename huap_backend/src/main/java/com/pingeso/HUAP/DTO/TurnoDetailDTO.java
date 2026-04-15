package com.pingeso.HUAP.DTO;

import java.time.LocalDateTime;

public class TurnoDetailDTO {
    private Long id;
    private String idPiso;
    private String diaSemana;
    private String tipoTurno;
    private LocalDateTime diaInicioTurno;
    private String horaInicio;
    private String horaFin;

    //getters
    public Long getId() {
        return id;
    }

    public String getIdPiso() {
        return idPiso;
    }

    public String getDiaSemana() {
        return diaSemana;
    }

    public String getTipoTurno() {
        return tipoTurno;
    }

    public LocalDateTime getDiaInicioTurno() {
        return diaInicioTurno;
    }

    public String getHoraInicio() {
        return horaInicio;
    }

    public String getHoraFin() {
        return horaFin;
    }

    //setters
    public void setId(Long id) {
        this.id = id;
    }

    public void setIdPiso(String idPiso) {
        this.idPiso = idPiso;
    }

    public void setDiaSemana(String diaSemana) {
        this.diaSemana = diaSemana;
    }

    public void setTipoTurno(String tipoTurno) {
        this.tipoTurno = tipoTurno;
    }

    public void setDiaInicioTurno(LocalDateTime diaInicioTurno) {
        this.diaInicioTurno = diaInicioTurno;
    }

    public void setHoraInicio(String horaInicio) {
        this.horaInicio = horaInicio;
    }

    public void setHoraFin(String horaFin) {
        this.horaFin = horaFin;
    }
}