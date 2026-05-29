package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.PisoRequestDTO;
import com.pingeso.HUAP.Entity.PisoEntity;
import com.pingeso.HUAP.Service.PisoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v2/pisos")
@CrossOrigin("*")
public class PisoController {

    @Autowired
    private PisoService pisoService;

    // Crear piso
    @PostMapping
        public ResponseEntity<PisoEntity> crearPiso(@RequestBody PisoRequestDTO request) {
        PisoEntity piso = pisoService.crearPiso(
                request.getIdServicio(),
                request.getNombre()
        );

        return ResponseEntity.ok(piso);
        }

    // Obtener piso por id
    @GetMapping("/{id}")
    public ResponseEntity<PisoEntity> obtenerPiso(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                pisoService.obtenerPiso(id)
        );
    }

    // Obtener todos
    @GetMapping
    public ResponseEntity<List<PisoEntity>> obtenerTodosPisos() {

        return ResponseEntity.ok(
                pisoService.obtenerTodosPisos()
        );
    }

    // Obtener por servicio
    @GetMapping("/servicio/{idServicio}")
    public ResponseEntity<List<PisoEntity>> obtenerPorServicio(
            @PathVariable Long idServicio
    ) {

        return ResponseEntity.ok(
                pisoService.obtenerPisosPorServicio(idServicio)
        );
    }

    // Obtener por nombre
    @GetMapping("/nombre/{nombre}")
    public ResponseEntity<PisoEntity> obtenerPorNombre(
            @PathVariable String nombre
    ) {

        return ResponseEntity.ok(
                pisoService.obtenerPisosPorNombre(nombre)
        );
    }

    // Actualizar piso
    @PutMapping("/{id}")
    public ResponseEntity<PisoEntity> actualizarPiso(
            @PathVariable Long id,
            @RequestParam String nombre
    ) {

        return ResponseEntity.ok(
                pisoService.actualizarPiso(id, nombre)
        );
    }

    // Cantidad de turnos asociados a un piso (para advertir antes de eliminar)
    @GetMapping("/{id}/turnos-asociados")
    public ResponseEntity<Long> contarTurnosAsociados(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                pisoService.contarTurnosAsociados(id)
        );
    }

    // Eliminar piso
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarPiso(
            @PathVariable Long id
    ) {

        pisoService.eliminarPiso(id);

        return ResponseEntity.noContent().build();
    }
}
