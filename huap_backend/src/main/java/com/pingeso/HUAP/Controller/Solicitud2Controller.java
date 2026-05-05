package com.pingeso.HUAP.Controller;


import com.pingeso.HUAP.Entity.Solicitud2Entity;
import com.pingeso.HUAP.Service.Solicitud2Service;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("api/v2/solicitudes")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class Solicitud2Controller {

    private final Solicitud2Service solicitud2Service;

    //Mas tarde hay que cambiar state por algo mas representativo
    @PatchMapping("/state/{id}/estado")
    public ResponseEntity<Solicitud2Entity> cambiarEstado(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Solicitud2Entity.EstadoSolicitud estado =
                Solicitud2Entity.EstadoSolicitud.valueOf(body.get("estado"));
        return ResponseEntity.ok(
                solicitud2Service.cambiarEstado(id, estado)
        );
    }

    @PatchMapping("/{id}/motivo")
    public ResponseEntity<Solicitud2Entity> modificarMotivo(@PathVariable Long id, @RequestParam String motivo) {
        return ResponseEntity.ok(
                solicitud2Service.modificarMotivo(id, motivo)
        );
    }

    @PostMapping()

     /*
    Getters
     */

    @GetMapping("/allsolicitud")
    public ResponseEntity<List<Solicitud2Entity>> getAllSolicitud() {
        return  ResponseEntity.ok(solicitud2Service.findAllSolicitudes());
    }

    @GetMapping("/allsolicitud/funcionario/{id}")
    public ResponseEntity<List<Solicitud2Entity>> getAllSolicitudFuncionario(@PathVariable Long id) {
        return ResponseEntity.ok(solicitud2Service.findByFuncionario(id));
    }

    @GetMapping("/allsolicitud/receptor/{id}")
    public ResponseEntity<List<Solicitud2Entity>> getAllSolicitudReceptor(@PathVariable Long id) {
        return ResponseEntity.ok(solicitud2Service.findByFuncionarioReceptor(id));
    }

    @GetMapping("/allsolicitud/tipo/{id}")
    public ResponseEntity<List<Solicitud2Entity>> getAllSolicitudByTipo(@PathVariable Long id) {
        return ResponseEntity.ok(solicitud2Service.findByTipoSolicitud(id));
    }

    @GetMapping("/allsolicitud/turno/{id}")
    public ResponseEntity<List<Solicitud2Entity>> getAllSolicitudTurno(@PathVariable Long id) {
        return  ResponseEntity.ok(solicitud2Service.findByTurno(id));
    }
}
