package com.pingeso.HUAP.Controller;


import com.pingeso.HUAP.DTO.CrearSolicitudDTO;
import com.pingeso.HUAP.Entity.Solicitud2Entity;
import com.pingeso.HUAP.Repository.BitacoraRepository;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.TipoSolicitudRepository;
import com.pingeso.HUAP.Service.Solicitud2Service;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("api/v2/solicitudes")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class Solicitud2Controller {

    private final FuncionarioRepository funcionarioRepository;
    private final TipoSolicitudRepository tipoSolicitudRepository;
    private final Solicitud2Service solicitud2Service;
    private final BitacoraRepository bitacoraRepository;

    @PostMapping("/crearsolicitud")
    public ResponseEntity<Solicitud2Entity> crear(@RequestBody CrearSolicitudDTO dto) {
        return ResponseEntity.ok(solicitud2Service.crearSolicitud(dto));
    }

    @PutMapping("/responderintercambio/{id}")
    public ResponseEntity<Solicitud2Entity> responderIntercambio(@PathVariable Long id, @RequestParam Long idReceptor,
            @RequestParam boolean respuesta) {
        return ResponseEntity.ok(solicitud2Service.responderOfertaIntercambio(id, idReceptor, respuesta));
    }

    @PutMapping("/estado/{id}")
    public ResponseEntity<Solicitud2Entity> cambiarEstado(@PathVariable Long id, @RequestParam Solicitud2Entity.EstadoSolicitud nuevoEstado,
            @RequestParam Long idUsuarioAsignador) {
        return ResponseEntity.ok(solicitud2Service.cambiarEstado(id, nuevoEstado, idUsuarioAsignador));
    }

    @PatchMapping("/motivo/{id}/")
    public ResponseEntity<Solicitud2Entity> modificarMotivo(@PathVariable Long id, @RequestParam String motivo) {
        return ResponseEntity.ok(
                solicitud2Service.modificarMotivo(id, motivo)
        );
    }

     /*
    Getters
     */

    @GetMapping("/allsolicitud")
    public ResponseEntity<List<Solicitud2Entity>> getAllSolicitud() {
        return  ResponseEntity.ok(solicitud2Service.findAllSolicitudes());
    }

    @GetMapping("/funcionario/{id}")
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
