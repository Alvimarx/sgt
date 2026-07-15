package com.pingeso.HUAP.Controller;


import com.pingeso.HUAP.DTO.CrearNotificacionDTO;
import com.pingeso.HUAP.DTO.NotificacionRespuestaDTO;
import com.pingeso.HUAP.Entity.NotificacionEntity;
import com.pingeso.HUAP.Service.NotificacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v2/notificaciones")
@RequiredArgsConstructor
public class NotificacionController {

    private final NotificacionService notificacionService;

    @GetMapping("/sin-leer/{idFuncionario}")
    public ResponseEntity<Long> contarSinLeer(@PathVariable Long idFuncionario) {
        return ResponseEntity.ok(notificacionService.contarNoLeidasPorUsuario(idFuncionario));
    }

    @PutMapping("/{id}/leer")
    public ResponseEntity<Void> marcarLeida(@PathVariable Long id) {
        boolean actualizado = notificacionService.marcarLeido(id);
        return actualizado ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        boolean eliminado = notificacionService.marcarComoEliminado(id);
        return eliminado ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<NotificacionEntity> crear(@RequestBody CrearNotificacionDTO dto) {
        return ResponseEntity.ok(notificacionService.crearNotificacion(dto));
    }

    @GetMapping("/usuario/{idFuncionario}")
    public ResponseEntity<List<NotificacionRespuestaDTO>> getBandeja(@PathVariable Long idFuncionario) {
        return ResponseEntity.ok(notificacionService.obtenerNotificacionesFuncionario(idFuncionario));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NotificacionEntity> getNotificacion(@PathVariable long id) {
        return ResponseEntity.ok(notificacionService.findNotificacionById(id));
    }

    @GetMapping
    public ResponseEntity<List<NotificacionEntity>> getAllNotificacion() {
        return ResponseEntity.ok(notificacionService.findAllNotificacion());
    }

    @GetMapping("/solicitud/{id}")
    public ResponseEntity<NotificacionEntity> getNotificacionSolicitud(@PathVariable long id) {
        return ResponseEntity.ok(notificacionService.findByIdSolicitud(id));
    }
}
