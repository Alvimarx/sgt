package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.Service.ServicioService;
import com.pingeso.HUAP.Entity.ServicioEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST de servicios.
 *
 * <p>Un {@link ServicioEntity} es una unidad del hospital (p. ej. Urgencias) que agrupa puestos,
 * rotativas y funcionarios. Expone el CRUD de servicios, búsquedas (por nombre, paginada) y el
 * conteo de dependencias (turnos y funcionarios asociados, para advertir antes de eliminar).
 * Ruta base: {@code /api/v2/servicios}.
 */
@RestController
@RequestMapping("/api/v2/servicios")
@Tag(name = "Servicios",
        description = "CRUD de servicios (unidades del hospital), búsqueda paginada y conteo de "
                + "dependencias (turnos/funcionarios).")
public class ServicioController {

    private final ServicioService servicioService;

    @Autowired
    public ServicioController(ServicioService servicioService) {
        this.servicioService = servicioService;
    }

    /** Lista todos los servicios vigentes (resumen: id y nombre). */
    @Operation(summary = "Listar servicios vigentes")
    @GetMapping("")
    public ResponseEntity<?> listServicios() {
        return ResponseEntity.ok().body(servicioService.getAllServiciosSummary());
    }

    /** Lista los servicios inactivos (eliminados por soft-delete). */
    @Operation(summary = "Listar servicios inactivos (eliminados)")
    @GetMapping("/inactivos")
    public ResponseEntity<List<ServicioEntity>> getServiciosInactivos() {
        List<ServicioEntity> inactivos = servicioService.getAllServiciosInactivos();
        return ResponseEntity.ok(inactivos);
    }

    /**
     * Obtiene un servicio por su id.
     * @return el resumen del servicio, o 404 si no existe.
     */
    @Operation(summary = "Obtener un servicio por id")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Servicio encontrado"),
            @ApiResponse(responseCode = "404", description = "Servicio no encontrado")
    })
    @GetMapping("/{id}")
    public ResponseEntity<?> getServicioById(@PathVariable Long id) {
        Map<String, Object> servicio = servicioService.getServicioSummary(id);
        if (servicio == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().body(servicio);
    }

    /**
     * Busca un servicio vigente por su nombre exacto.
     * @return el servicio, o 404 si no existe.
     */
    @Operation(summary = "Buscar un servicio por nombre exacto")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Servicio encontrado"),
            @ApiResponse(responseCode = "404", description = "Servicio no encontrado")
    })
    @GetMapping("/nombre/{nombre}")
    public ResponseEntity<?> getServicioByNombre(@PathVariable String nombre) {
        ServicioEntity servicio = servicioService.getServicioByNombre(nombre);
        if (servicio == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().body(servicio);
    }

    /**
     * Crea un servicio.
     * @param payload debe incluir el campo {@code nombre}.
     * @return el servicio creado (201) o 400 si falta el nombre.
     */
    @Operation(summary = "Crear un servicio")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Servicio creado"),
            @ApiResponse(responseCode = "400", description = "Falta el nombre u otro dato inválido")
    })
    @PostMapping("")
    public ResponseEntity<?> createServicio(@RequestBody Map<String, Object> payload) {
        try {
            ServicioEntity nuevoServicio = servicioService.createServicio(payload);
            Map<String, Object> summary = servicioService.getServicioSummary(nuevoServicio.getIdServicio());
            return ResponseEntity.status(HttpStatus.CREATED).body(summary);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Actualiza un servicio (p. ej. su nombre).
     * @return el servicio actualizado, 404 si no existe o 400 si el payload es inválido.
     */
    @Operation(summary = "Actualizar un servicio")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Servicio actualizado"),
            @ApiResponse(responseCode = "400", description = "Payload inválido"),
            @ApiResponse(responseCode = "404", description = "Servicio no encontrado")
    })
    @PutMapping("/{id}")
    public ResponseEntity<?> updateServicio(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            Map<String, Object> updated = servicioService.updateServicio(id, payload);
            if (updated == null) return ResponseEntity.notFound().build();
            return ResponseEntity.ok().body(updated);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    /** Cuenta los turnos (histórico) asociados a un servicio. */
    @Operation(summary = "Contar turnos asociados a un servicio")
    @GetMapping("/{id}/turnos-asociados")
    public ResponseEntity<Long> contarTurnosAsociados(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                servicioService.contarTurnosAsociados(id)
        );
    }

    /** Cuenta las dependencias (turnos + funcionarios) de un servicio, para advertir antes de eliminar. */
    @Operation(summary = "Contar dependencias de un servicio (turnos + funcionarios)")
    @GetMapping("/{id}/dependencias")
    public ResponseEntity<Long> contarDependencias(@PathVariable Long id) {
        return ResponseEntity.ok(servicioService.contarDependencias(id));
    }

    /**
     * Elimina (soft-delete) un servicio.
     * @return 200 con mensaje, o 404 si no existe.
     */
    @Operation(summary = "Eliminar un servicio")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Servicio eliminado"),
            @ApiResponse(responseCode = "404", description = "Servicio no encontrado")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteServicio(@PathVariable Long id) {
        boolean deleted = servicioService.deleteServicio(id);
        if (!deleted) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok().body(Map.of("message", "Servicio eliminado exitosamente"));
    }

    /** Busca servicios vigentes por nombre (parcial, sin distinción de mayúsculas), paginado. */
    @Operation(summary = "Buscar servicios por nombre (paginado)")
    @GetMapping("/buscar")
    public ResponseEntity<?> buscarServicios(
            @RequestParam(required = false) String nombre,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(servicioService.buscarServicios(nombre, pageable));
    }

    /** Lista los servicios vigentes de forma paginada. */
    @Operation(summary = "Listar servicios vigentes (paginado)")
    @GetMapping("/paginado")
    public ResponseEntity<?> listarServiciosPaginados(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(servicioService.getServiciosPaginados(pageable));
    }
}
