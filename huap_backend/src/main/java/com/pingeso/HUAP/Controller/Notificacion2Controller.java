package com.pingeso.HUAP.Controller;


import com.pingeso.HUAP.Entity.Notificacion2Entity;
import com.pingeso.HUAP.Entity.Solicitud2Entity;
import com.pingeso.HUAP.Service.Notificacion2Service;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notificacion2")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class Notificacion2Controller {

    private final Notificacion2Service notificacion2Service;


     /*
    Getters
     */

    @GetMapping("/notificacion/{id}")
    public ResponseEntity<Notificacion2Entity> getNotificacion2(@PathVariable long id) {
        return ResponseEntity.ok(notificacion2Service.findNotificacion2ById(id));
    }

    @GetMapping("/allnotificacion/{id}")
    public ResponseEntity<List<Notificacion2Entity>> getAllNotificacion2(@PathVariable long id) {
        return ResponseEntity.ok(notificacion2Service.findAllNotificacion());
    }

    @GetMapping("/notificacion/solicitud/{id}")
    public ResponseEntity<Notificacion2Entity> getNotificacion2Solicitud(@PathVariable long id) {
        return ResponseEntity.ok(notificacion2Service.findByIdSolicitud(id));
    }
}
