package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.ReglaServicioDTO;
import com.pingeso.HUAP.Security.SeguridadServicio;
import com.pingeso.HUAP.Service.ReglaServicioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v2/reglas-servicio")
public class ReglaServicioController {

    private final ReglaServicioService reglaServicioService;
    private final SeguridadServicio seguridadServicio;

    public ReglaServicioController(ReglaServicioService reglaServicioService, SeguridadServicio seguridadServicio) {
        this.reglaServicioService = reglaServicioService;
        this.seguridadServicio = seguridadServicio;
    }

    /** SEC (C-17): las reglas de un servicio solo las lee ese servicio (o el ADMINISTRADOR). */
    @GetMapping("/servicio/{idServicio}")
    public ResponseEntity<List<ReglaServicioDTO>> obtenerPorServicio(@PathVariable Long idServicio) {
        seguridadServicio.exigirMismoServicio(idServicio);
        return ResponseEntity.ok(reglaServicioService.obtenerPorServicio(idServicio));
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestBody ReglaServicioDTO dto) {
        try {
            return ResponseEntity.ok(reglaServicioService.crear(dto));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody ReglaServicioDTO dto) {
        try {
            return ResponseEntity.ok(reglaServicioService.actualizar(id, dto));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        reglaServicioService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
