package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.BitacoraResponseDTO;
import com.pingeso.HUAP.Entity.BitacoraEntity;
import com.pingeso.HUAP.Service.BitacoraService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v2/bitacoras")
@RequiredArgsConstructor
public class BitacoraController {

    private final BitacoraService bitacoraService;

    @GetMapping
    public ResponseEntity<List<BitacoraEntity>> getAll() {
        return ResponseEntity.ok(bitacoraService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BitacoraEntity> getById(@PathVariable Long id) {
        return bitacoraService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/tipo/{tipo}")
    public ResponseEntity<List<BitacoraEntity>> getByTipo(@PathVariable String tipo) {
        return ResponseEntity.ok(bitacoraService.findByTipoEvento(tipo));
    }

    @GetMapping("/funcionario/{idFuncionario}")
    public ResponseEntity<List<BitacoraEntity>> getByFuncionario(@PathVariable Long idFuncionario) {
        return ResponseEntity.ok(bitacoraService.findByFuncionario(idFuncionario));
    }

    @GetMapping("/turno/{idTurno}")
    public ResponseEntity<List<BitacoraEntity>> getByTurno(@PathVariable Long idTurno) {
        return ResponseEntity.ok(bitacoraService.findByTurno(idTurno));
    }

    @GetMapping("/solicitud/{idSolicitud}")
    public ResponseEntity<List<BitacoraEntity>> getBySolicitud(@PathVariable Long idSolicitud) {
        return ResponseEntity.ok(bitacoraService.findBySolicitud(idSolicitud));
    }

    @PostMapping
    public ResponseEntity<BitacoraEntity> create(@RequestBody BitacoraEntity evento) {
        return ResponseEntity.ok(bitacoraService.save(evento));
    }

    // ── Endpoints DTO (no modifican los existentes) ─────────────────────────

    @GetMapping("/dto")
    public ResponseEntity<List<BitacoraResponseDTO>> getAllDTO() {
        return ResponseEntity.ok(bitacoraService.findAllDTO());
    }

    @GetMapping("/dto/{id}")
    public ResponseEntity<BitacoraResponseDTO> getByIdDTO(@PathVariable Long id) {
        return bitacoraService.findByIdDTO(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}