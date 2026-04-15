package com.pingeso.HUAP.DTO;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.LocalDate;

/**
 * DTO para representar un feriado desde la API de Boostr
 */
@Data
public class BoostrHolidayDTO {
    private LocalDate date;
    private String title;
    private String type;
    private boolean inalienable; // Cambiado a boolean
    private String extra;

    @JsonProperty("inalienable")
    public boolean isInalienable() {
        return inalienable;
    }

    @JsonProperty("inalienable")
    public void setInalienable(boolean inalienable) {
        this.inalienable = inalienable;
    }
}