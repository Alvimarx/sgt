package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.Entity.EventLogEntity;
import com.pingeso.HUAP.Service.EventLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/evento")
@CrossOrigin("*")
public class EventsController {

    @Autowired
    private EventLogService eventLogService;

    @GetMapping
    public ResponseEntity<List<EventLogEntity>> getAll() {
        return ResponseEntity.ok(eventLogService.findAll());
    }

    @GetMapping("/tipo/{tipo}")
    public ResponseEntity<List<EventLogEntity>> getByTipo(@PathVariable String tipo) {
        return ResponseEntity.ok(eventLogService.findByTipoEvento(tipo));
    }

    @GetMapping("/usuario/{idUsuario}")
    public ResponseEntity<List<EventLogEntity>> getByUsuario(@PathVariable Long idUsuario) {
        return ResponseEntity.ok(eventLogService.findByUsuarioId(idUsuario));
    }

    @GetMapping("/turno/{idTurno}")
    public ResponseEntity<List<EventLogEntity>> getByTurno(@PathVariable Long idTurno) {
        return ResponseEntity.ok(eventLogService.findByIdTurno(idTurno));
    }

    @GetMapping("/solicitud/{idSolicitud}")
    public ResponseEntity<List<EventLogEntity>> getBySolicitud(@PathVariable Long idSolicitud) {
        return ResponseEntity.ok(eventLogService.findByIdSolicitud(idSolicitud));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventLogEntity> getById(@PathVariable Long id) {
        return eventLogService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<EventLogEntity> createEvent(@RequestBody EventLogEntity event) {
        if (event.getFechaEvento() == null) {
            event.setFechaEvento(LocalDateTime.now());
        }
        EventLogEntity saved = eventLogService.save(event);
        return ResponseEntity.ok(saved);
    }
}
