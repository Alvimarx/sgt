package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.PuestoRequestDTO;
import com.pingeso.HUAP.Entity.PuestoEntity;
import com.pingeso.HUAP.Service.PuestoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;

/**
 * Controlador REST de puestos.
 *
 * <p>Un {@link PuestoEntity} es una ubicación/posición dentro de un servicio a la que se asignan
 * turnos. Expone el CRUD de puestos, consultas (por servicio y por nombre) y el conteo de turnos
 * asociados (para advertir antes de eliminar). Ruta base: {@code /api/v2/puestos}.
 */
@RestController
@RequestMapping("/api/v2/puestos")
@Tag(name = "Puestos",
        description = "CRUD de puestos (ubicaciones de un servicio), consultas por servicio/nombre "
                + "y conteo de turnos asociados.")
public class PuestoController {

    @Autowired
    private PuestoService puestoService;

    /**
     * Crea un puesto en un servicio.
     * @param request idServicio y nombre del puesto.
     * @return el puesto creado.
     */
    @Operation(summary = "Crear un puesto",
            description = "Crea un puesto en un servicio. Falla si el servicio no existe o el nombre está vacío.")
    @PostMapping
    public ResponseEntity<PuestoEntity> crearPuesto(@RequestBody PuestoRequestDTO request) {
        PuestoEntity puesto = puestoService.crearPuesto(
                request.getIdServicio(),
                request.getNombre()
        );

        return ResponseEntity.ok(puesto);
    }

    /**
     * Obtiene un puesto por su id.
     * @param id identificador del puesto.
     */
    @Operation(summary = "Obtener un puesto por id",
            description = "Devuelve el puesto; lanza error si no existe.")
    @GetMapping("/{id}")
    public ResponseEntity<PuestoEntity> obtenerPuesto(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                puestoService.obtenerPuesto(id)
        );
    }

    /** Lista todos los puestos vigentes (no eliminados). */
    @Operation(summary = "Listar todos los puestos (vigentes)")
    @GetMapping
    public ResponseEntity<List<PuestoEntity>> obtenerTodosPuestos() {

        return ResponseEntity.ok(
                puestoService.obtenerTodosPuestos()
        );
    }

    /** Lista los puestos vigentes de un servicio. */
    @Operation(summary = "Puestos de un servicio (vigentes)")
    @GetMapping("/servicio/{idServicio}")
    public ResponseEntity<List<PuestoEntity>> obtenerPorServicio(
            @PathVariable Long idServicio
    ) {

        return ResponseEntity.ok(
                puestoService.obtenerPuestosPorServicio(idServicio)
        );
    }

    /** Obtiene un puesto vigente por su nombre. */
    @Operation(summary = "Obtener un puesto por nombre",
            description = "Devuelve el puesto vigente con ese nombre; lanza error si no existe.")
    @GetMapping("/nombre/{nombre}")
    public ResponseEntity<PuestoEntity> obtenerPorNombre(
            @PathVariable String nombre
    ) {

        return ResponseEntity.ok(
                puestoService.obtenerPuestosPorNombre(nombre)
        );
    }

    /**
     * Actualiza el nombre de un puesto.
     * @param id identificador del puesto.
     * @param nombre nuevo nombre.
     */
    @Operation(summary = "Actualizar el nombre de un puesto")
    @PutMapping("/{id}")
    public ResponseEntity<PuestoEntity> actualizarPuesto(
            @PathVariable Long id,
            @RequestParam String nombre
    ) {

        return ResponseEntity.ok(
                puestoService.actualizarPuesto(id, nombre)
        );
    }

    /**
     * Cuenta los turnos (histórico) asociados a un puesto. Útil para advertir en la UI
     * antes de eliminarlo.
     * @param id identificador del puesto.
     */
    @Operation(summary = "Contar turnos asociados a un puesto",
            description = "Total histórico de turnos del puesto; se usa para advertir antes de eliminar.")
    @GetMapping("/{id}/turnos-asociados")
    public ResponseEntity<Long> contarTurnosAsociados(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                puestoService.contarTurnosAsociados(id)
        );
    }

    /**
     * Elimina (soft-delete) un puesto y lo quita de las planificaciones que lo referencien.
     * @param id identificador del puesto.
     */
    @Operation(summary = "Eliminar un puesto",
            description = "Soft-delete del puesto; además lo quita de cualquier planificación que lo use.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Puesto eliminado")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarPuesto(
            @PathVariable Long id
    ) {

        puestoService.eliminarPuesto(id);

        return ResponseEntity.noContent().build();
    }
}
