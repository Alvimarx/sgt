package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.CrearOfertaGeneralDTO;
import com.pingeso.HUAP.Entity.OfertaGeneralEntity;
import com.pingeso.HUAP.Entity.PostulacionEntity;
import com.pingeso.HUAP.Service.OfertaGeneralService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v2/ofertas-generales")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OfertaGeneralController {

    private final OfertaGeneralService ofertaGeneralService;

    @PostMapping
    public ResponseEntity<OfertaGeneralEntity> crear(@RequestBody CrearOfertaGeneralDTO dto) {
        return ResponseEntity.ok(ofertaGeneralService.crearOferta(dto));
    }

    @PutMapping("/{id}/aprobar")
    public ResponseEntity<OfertaGeneralEntity> aprobar(@PathVariable Long id, @RequestParam Long idJefatura) {
        return ResponseEntity.ok(ofertaGeneralService.aprobarOferta(id, idJefatura));
    }

    @PutMapping("/{id}/rechazar")
    public ResponseEntity<OfertaGeneralEntity> rechazar(@PathVariable Long id, @RequestParam Long idJefatura) {
        return ResponseEntity.ok(ofertaGeneralService.rechazarOferta(id, idJefatura));
    }

    @PostMapping("/{id}/postular")
    public ResponseEntity<PostulacionEntity> postular(@PathVariable Long id, @RequestParam Long idFuncionario) {
        return ResponseEntity.ok(ofertaGeneralService.postular(id, idFuncionario));
    }

    @DeleteMapping("/{id}/postular/{idPostulacion}")
    public ResponseEntity<Void> retirarPostulacion(@PathVariable Long id, @PathVariable Long idPostulacion,
            @RequestParam Long idFuncionario) {
        ofertaGeneralService.retirarPostulacion(idPostulacion, idFuncionario);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/seleccionar/{idPostulacion}")
    public ResponseEntity<OfertaGeneralEntity> seleccionar(@PathVariable Long id, @PathVariable Long idPostulacion,
            @RequestParam Long idJefatura) {
        return ResponseEntity.ok(ofertaGeneralService.seleccionarPostulante(id, idPostulacion, idJefatura));
    }

    @GetMapping("/servicio/{idServicio}")
    public ResponseEntity<List<OfertaGeneralEntity>> getByServicio(@PathVariable Long idServicio) {
        return ResponseEntity.ok(ofertaGeneralService.findByServicio(idServicio));
    }

    @GetMapping("/ofertor/{idFuncionario}")
    public ResponseEntity<List<OfertaGeneralEntity>> getByOfertor(@PathVariable Long idFuncionario) {
        return ResponseEntity.ok(ofertaGeneralService.findByOfertor(idFuncionario));
    }
}
