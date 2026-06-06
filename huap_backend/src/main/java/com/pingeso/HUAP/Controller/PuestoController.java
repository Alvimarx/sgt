package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.PuestoRequestDTO;
import com.pingeso.HUAP.Entity.PuestoEntity;
import com.pingeso.HUAP.Service.PuestoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v2/puestos")
@CrossOrigin("*")
public class PuestoController {

    @Autowired
    private PuestoService puestoService;

    // Crear puesto
    @PostMapping
    public ResponseEntity<PuestoEntity> crearPuesto(@RequestBody PuestoRequestDTO request) {
        PuestoEntity puesto = puestoService.crearPuesto(
                request.getIdServicio(),
                request.getNombre()
        );

        return ResponseEntity.ok(puesto);
    }

    // Obtener puesto por id
    @GetMapping("/{id}")
    public ResponseEntity<PuestoEntity> obtenerPuesto(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                puestoService.obtenerPuesto(id)
        );
    }

    // Obtener todos
    @GetMapping
    public ResponseEntity<List<PuestoEntity>> obtenerTodosPuestos() {

        return ResponseEntity.ok(
                puestoService.obtenerTodosPuestos()
        );
    }

    // Obtener por servicio
    @GetMapping("/servicio/{idServicio}")
    public ResponseEntity<List<PuestoEntity>> obtenerPorServicio(
            @PathVariable Long idServicio
    ) {

        return ResponseEntity.ok(
                puestoService.obtenerPuestosPorServicio(idServicio)
        );
    }

    // Obtener por nombre
    @GetMapping("/nombre/{nombre}")
    public ResponseEntity<PuestoEntity> obtenerPorNombre(
            @PathVariable String nombre
    ) {

        return ResponseEntity.ok(
                puestoService.obtenerPuestosPorNombre(nombre)
        );
    }

    // Actualizar puesto
    @PutMapping("/{id}")
    public ResponseEntity<PuestoEntity> actualizarPuesto(
            @PathVariable Long id,
            @RequestParam String nombre
    ) {

        return ResponseEntity.ok(
                puestoService.actualizarPuesto(id, nombre)
        );
    }

    // Cantidad de turnos asociados a un puesto (para advertir antes de eliminar)
    @GetMapping("/{id}/turnos-asociados")
    public ResponseEntity<Long> contarTurnosAsociados(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                puestoService.contarTurnosAsociados(id)
        );
    }

    // Eliminar puesto
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarPuesto(
            @PathVariable Long id
    ) {

        puestoService.eliminarPuesto(id);

        return ResponseEntity.noContent().build();
    }
}
