package com.pingeso.HUAP.Controller;


import com.pingeso.HUAP.DTO.NotificacionDTO;
import com.pingeso.HUAP.Entity.NotificacionEntity;
import com.pingeso.HUAP.Repository.NotificacionRepository;
import com.pingeso.HUAP.Service.NotificacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notificacion")
@CrossOrigin("*")
public class NotificacionController {

    @Autowired
    private NotificacionService notificacionService;

    // 🔹 Obtener todas las notificaciones
    @GetMapping
    public ResponseEntity<List<NotificacionEntity>> getAll() {
        List<NotificacionEntity> notificaciones = notificacionService.findAll();
        return ResponseEntity.ok(notificaciones);
    }

    // 🔹 Buscar por tipo de solicitud
    @GetMapping("/tipo/{tipoSolicitud}")
    public ResponseEntity<List<NotificacionEntity>> getByTipoSolicitud(@PathVariable String tipoSolicitud) {
        List<NotificacionEntity> notificaciones = notificacionService.findByTipoSolicitud(tipoSolicitud);
        return ResponseEntity.ok(notificaciones);
    }

    // 🔹 Buscar notificaciones enviadas por un usuario (emisor)
    @GetMapping("/emisor/{idEmisor}")
    public ResponseEntity<List<NotificacionEntity>> getByEmisor(@PathVariable Long idEmisor) {
        List<NotificacionEntity> notificaciones = notificacionService.findByEmisorId(idEmisor);
        return ResponseEntity.ok(notificaciones);
    }

    // 🔹 Buscar notificaciones recibidas por un usuario (receptor)
    @GetMapping("/receptor/{idReceptor}")
    public ResponseEntity<List<NotificacionEntity>> getByReceptor(@PathVariable Long idReceptor) {
        List<NotificacionEntity> notificaciones = notificacionService.findByReceptorId(idReceptor);
        return ResponseEntity.ok(notificaciones);
    }

    // 🔹 Buscar todas las notificaciones donde participe el usuario
    @GetMapping("/usuario/{idUsuario}")
    public ResponseEntity<List<NotificacionDTO>> obtenerNotificacionesPorUsuario(@PathVariable Long idUsuario) {
        List<NotificacionDTO> notificaciones = notificacionService.obtenerNotificacionesUsuario(idUsuario);
        return ResponseEntity.ok(notificaciones);
    }

    // 🔹 Buscar una notificación por ID
    @GetMapping("/{id}")
    public ResponseEntity<NotificacionEntity> getById(@PathVariable Long id) {
        return notificacionService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Marcar una notificacion como leida
    @PutMapping("/leido/{id}")
    public ResponseEntity<Void> marcarComoLeido(@PathVariable Long id) {
        boolean actualizado = notificacionService.marcarComoLeido(id);
        if (actualizado) {
            return ResponseEntity.ok().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // Marcar una notificacion como eliminada para no mostrarla
    @PutMapping("/eliminado/{id}")
    public ResponseEntity<Void> eliminarNotificacion(@PathVariable Long id) {
        boolean actualizado = notificacionService.marcarComoEliminado(id);
        if (actualizado) {
            return ResponseEntity.ok().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // Buscar el total de notifiaciones no leidas
    @GetMapping("/no-leidas/{idUsuario}")
    public ResponseEntity<Long> contarNoLeidasPorUsuario(@PathVariable Long idUsuario) {
        Long cantidad = notificacionService.contarNoLeidasPorUsuario(idUsuario);
        return ResponseEntity.ok(cantidad);
    }

}

