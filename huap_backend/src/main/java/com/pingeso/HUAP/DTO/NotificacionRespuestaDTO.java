package com.pingeso.HUAP.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class NotificacionRespuestaDTO {
    private Long idNotificacion;
    private String mensaje;
    private String estado;
    private LocalDateTime fechaEnvio;
    private Long idSolicitud;
}
