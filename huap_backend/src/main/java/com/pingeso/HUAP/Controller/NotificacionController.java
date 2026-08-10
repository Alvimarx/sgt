package com.pingeso.HUAP.Controller;


import com.pingeso.HUAP.DTO.CrearNotificacionDTO;
import com.pingeso.HUAP.DTO.NotificacionRespuestaDTO;
import com.pingeso.HUAP.Entity.NotificacionEntity;
import com.pingeso.HUAP.Security.SeguridadServicio;
import com.pingeso.HUAP.Service.NotificacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v2/notificaciones")
@RequiredArgsConstructor
public class NotificacionController {

    private final NotificacionService notificacionService;
    private final SeguridadServicio seguridadServicio;

    /** Nadie más que el propio dueño (o ADMINISTRADOR) puede consultar la bandeja de otro. */
    private void exigirPropiaONadaBandeja(Long idFuncionario) {
        if (!seguridadServicio.esAdministrador() && !idFuncionario.equals(seguridadServicio.idUsuarioActual())) {
            throw new AccessDeniedException("No puedes consultar la bandeja de otro funcionario");
        }
    }

    @GetMapping("/sin-leer/{idFuncionario}")
    public ResponseEntity<Long> contarSinLeer(@PathVariable Long idFuncionario) {
        exigirPropiaONadaBandeja(idFuncionario);
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
        exigirPropiaONadaBandeja(idFuncionario);
        return ResponseEntity.ok(notificacionService.obtenerNotificacionesFuncionario(idFuncionario));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NotificacionEntity> getNotificacion(@PathVariable long id) {
        return ResponseEntity.ok(notificacionService.findNotificacionById(id));
    }

    // SEC (M-03/M-05): listado global de notificaciones de todo el hospital — solo ADMIN.
    @GetMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<List<NotificacionEntity>> getAllNotificacion() {
        return ResponseEntity.ok(notificacionService.findAllNotificacion());
    }

    @GetMapping("/solicitud/{id}")
    public ResponseEntity<NotificacionEntity> getNotificacionSolicitud(@PathVariable long id) {
        return ResponseEntity.ok(notificacionService.findByIdSolicitud(id));
    }
}
