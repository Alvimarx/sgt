package com.pingeso.HUAP.Service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * 23 oct: una solicitud u oferta pendiente sobre un turno que ya empezó ya no está vigente. Quien
 * intenta resolverla (aprobar, rechazar, cancelar, responder, postular, elegir) recibe un 409 con el
 * aviso, y el cierre por vencimiento queda guardado de todos modos: los métodos que la lanzan se
 * anotan con {@code dontRollbackOn = VencidoPorInicioException.class}, porque de lo contrario el
 * rollback deshacía el cierre y la solicitud seguía «pendiente» en la base.
 */
public class VencidoPorInicioException extends ResponseStatusException {

    public VencidoPorInicioException(String mensaje) {
        super(HttpStatus.CONFLICT, mensaje);
    }
}
