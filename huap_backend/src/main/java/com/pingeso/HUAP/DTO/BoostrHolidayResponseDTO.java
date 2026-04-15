package com.pingeso.HUAP.DTO;

import lombok.Data;
import java.util.List;

/**
 * DTO para la respuesta completa de la API de Boostr
 */
@Data
public class BoostrHolidayResponseDTO {
    private String status;
    private List<BoostrHolidayDTO> data;
}