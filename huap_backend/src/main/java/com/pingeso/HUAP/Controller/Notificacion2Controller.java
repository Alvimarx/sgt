package com.pingeso.HUAP.Controller;


import com.pingeso.HUAP.DTO.CrearNotificacionDTO;
import com.pingeso.HUAP.DTO.NotificacionRespuestaDTO;
import com.pingeso.HUAP.Entity.Notificacion2Entity;
import com.pingeso.HUAP.Service.Notificacion2Service;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v2/notificacion")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class Notificacion2Controller {

    private final Notificacion2Service notificacion2Service;

    @GetMapping("/sinleer/{idFuncionario}")
    public ResponseEntity<Long> contarSinLeer(@PathVariable Long idFuncionario) {
        return ResponseEntity.ok(notificacion2Service.contarNoLeidasPorUsuario(idFuncionario));
    }

    @PutMapping("/leer/{id}")
    public ResponseEntity<Void> marcarLeida(@PathVariable Long id) {
        boolean actualizado = notificacion2Service.marcarLeido(id);
        return actualizado ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/eliminar/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        boolean eliminado = notificacion2Service.marcarComoEliminado(id);
        return eliminado ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }

    @PostMapping("/crear")
    public ResponseEntity<Notificacion2Entity> crear(@RequestBody CrearNotificacionDTO dto) {
        return ResponseEntity.ok(notificacion2Service.crearNotificacion(dto));
    }

     /*
    Getters
     */

    @GetMapping("/usuario/{idFuncionario}")
    public ResponseEntity<List<NotificacionRespuestaDTO>> getBandeja(@PathVariable Long idFuncionario) {
        return ResponseEntity.ok(notificacion2Service.obtenerNotificacionesFuncionario(idFuncionario));
    }

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
