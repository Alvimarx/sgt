package com.pingeso.HUAP.Controller;


import com.pingeso.HUAP.DTO.CrearSolicitudDTO;
import com.pingeso.HUAP.Entity.SolicitudEntity;
import com.pingeso.HUAP.Repository.BitacoraRepository;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.TipoSolicitudRepository;
import com.pingeso.HUAP.Service.SolicitudService;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v2/solicitudes")
@RequiredArgsConstructor
public class SolicitudController {

    private final FuncionarioRepository funcionarioRepository;
    private final TipoSolicitudRepository tipoSolicitudRepository;
    private final SolicitudService solicitudService;
    private final BitacoraRepository bitacoraRepository;

    @PostMapping
    public ResponseEntity<SolicitudEntity> crear(@RequestBody CrearSolicitudDTO dto) {
        return ResponseEntity.ok(solicitudService.crearSolicitud(dto));
    }

    @PutMapping("/{id}/oferta-particular")
    public ResponseEntity<SolicitudEntity> responderOfertaParticular(@PathVariable Long id, @RequestParam Long idReceptor,
            @RequestParam boolean respuesta) {
        return ResponseEntity.ok(solicitudService.responderOfertaParticular(id, idReceptor, respuesta));
    }

    @PutMapping("/{id}/intercambio")
    public ResponseEntity<SolicitudEntity> responderIntercambio(@PathVariable Long id, @RequestParam Long idReceptor,
            @RequestParam boolean respuesta) {
        return ResponseEntity.ok(solicitudService.responderOfertaIntercambio(id, idReceptor, respuesta));
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<SolicitudEntity> cambiarEstado(@PathVariable Long id, @RequestParam SolicitudEntity.EstadoSolicitud nuevoEstado,
            @RequestParam Long idUsuarioAsignador) {
        return ResponseEntity.ok(solicitudService.cambiarEstado(id, nuevoEstado, idUsuarioAsignador));
    }

    @PatchMapping("/{id}/motivo")
    public ResponseEntity<SolicitudEntity> modificarMotivo(@PathVariable Long id, @RequestParam String motivo) {
        return ResponseEntity.ok(
                solicitudService.modificarMotivo(id, motivo)
        );
    }

    @GetMapping
    public ResponseEntity<List<SolicitudEntity>> getAllSolicitud() {
        return ResponseEntity.ok(solicitudService.findAllSolicitudes());
    }

    @GetMapping("/funcionario/{id}")
    public ResponseEntity<List<SolicitudEntity>> getAllSolicitudFuncionario(@PathVariable Long id) {
        return ResponseEntity.ok(solicitudService.findByFuncionario(id));
    }

    @GetMapping("/receptor/{id}")
    public ResponseEntity<List<SolicitudEntity>> getAllSolicitudReceptor(@PathVariable Long id) {
        return ResponseEntity.ok(solicitudService.findByFuncionarioReceptor(id));
    }

    @GetMapping("/tipo/{id}")
    public ResponseEntity<List<SolicitudEntity>> getAllSolicitudByTipo(@PathVariable Long id) {
        return ResponseEntity.ok(solicitudService.findByTipoSolicitud(id));
    }

    @GetMapping("/turno/{id}")
    public ResponseEntity<List<SolicitudEntity>> getAllSolicitudTurno(@PathVariable Long id) {
        return ResponseEntity.ok(solicitudService.findByTurno(id));
    }
}
