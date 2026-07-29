package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.RotativaDTO;
import com.pingeso.HUAP.DTO.RotativaDiaDTO;
import com.pingeso.HUAP.DTO.TipoTurnoDTO;
import com.pingeso.HUAP.Entity.RotativaDiaEntity;
import com.pingeso.HUAP.Entity.RotativaEntity;
import com.pingeso.HUAP.Entity.TipoTurnoEntity;
import com.pingeso.HUAP.Service.RotativaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;

/**
 * Controlador REST de rotativas.
 *
 * <p>Una {@link RotativaEntity} es un <b>patrón cíclico de turnos</b> de un servicio, definido por
 * una secuencia de días ({@link RotativaDiaEntity}) a lo largo de una o varias semanas, que sirve
 * de plantilla para generar turnos en una planificación. Expone el CRUD, la gestión de la
 * secuencia de días, el duplicado y la validación del patrón. Ruta base: {@code /api/v2/rotativas}.
 */
@RestController
@RequestMapping("/api/v2/rotativas")
@Tag(name = "Rotativas",
        description = "Rotativas (patrones cíclicos de turnos) de un servicio: CRUD, secuencia de "
                + "días, duplicado y validación del patrón.")
public class RotativaController {

    private final RotativaService rotativaService;

    public RotativaController(RotativaService rotativaService) {
        this.rotativaService = rotativaService;
    }

    /**
     * Crea una rotativa (opcionalmente con su secuencia de días).
     * @param dto servicio, nombre, semanas y (opcional) secuencia de días.
     */
    @Operation(summary = "Crear una rotativa",
            description = "Crea la rotativa validando el servicio, el nombre único y las semanas; "
                    + "si se envía la secuencia de días, la valida contra las semanas.")
    @PostMapping
    public ResponseEntity<RotativaDTO> crearRotativa(@RequestBody RotativaDTO dto) {
        List<Long> idsDias = dto.getSecuenciaDias() == null ? null :
                dto.getSecuenciaDias().stream()
                        .map(d -> d.getTurno() != null ? d.getTurno().getIdTipoTurno() : null)
                        .toList();
        RotativaEntity entidad = rotativaService.crearRotativa(
                dto.getIdServicio(),
                dto.getNombre(),
                dto.getSemanas(),
                idsDias
        );
        return ResponseEntity.ok(convertToDTO(entidad));
    }

    /** Obtiene una rotativa por su id. */
    @Operation(summary = "Obtener una rotativa por id")
    @GetMapping("/{id}")
    public ResponseEntity<RotativaDTO> obtenerRotativa(@PathVariable Long id) {
        return ResponseEntity.ok(convertToDTO(rotativaService.obtenerRotativa(id)));
    }

    /** Lista todas las rotativas vigentes. */
    @Operation(summary = "Listar rotativas vigentes")
    @GetMapping
    public ResponseEntity<List<RotativaDTO>> obtenerRotativas() {
        List<RotativaDTO> respuesta = rotativaService.obtenerRotativas().stream()
                .map(this::convertToDTO)
                .toList();
        return ResponseEntity.ok(respuesta);
    }

    /** Lista las rotativas vigentes de un servicio. */
    @Operation(summary = "Rotativas de un servicio")
    @GetMapping("/servicio/{idServicio}")
    public ResponseEntity<List<RotativaDTO>> obtenerPorServicio(@PathVariable Long idServicio) {
        List<RotativaDTO> respuesta = rotativaService.obtenerRotativasPorServicio(idServicio).stream()
                .map(this::convertToDTO)
                .toList();
        return ResponseEntity.ok(respuesta);
    }

    /** Actualiza el nombre y las semanas de una rotativa. */
    @Operation(summary = "Actualizar una rotativa (nombre y semanas)")
    @PutMapping("/{id}")
    public ResponseEntity<RotativaDTO> actualizarRotativa(@PathVariable Long id, @RequestBody RotativaDTO dto) {
        RotativaEntity entidad = rotativaService.actualizarRotativa(
                id,
                dto.getNombre(),
                dto.getSemanas()
        );
        return ResponseEntity.ok(convertToDTO(entidad));
    }

    /** Elimina (soft-delete) una rotativa y la quita de las planificaciones que la usen. */
    @Operation(summary = "Eliminar una rotativa")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Rotativa eliminada")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarRotativa(@PathVariable Long id) {
        rotativaService.eliminarRotativa(id);
        return ResponseEntity.noContent().build();
    }

    /** Duplica una rotativa preservando su secuencia de días. */
    @Operation(summary = "Duplicar una rotativa")
    @PostMapping("/{id}/duplicar")
    public ResponseEntity<RotativaDTO> duplicarRotativa(@PathVariable Long id) {
        return ResponseEntity.ok(convertToDTO(rotativaService.duplicarRotativa(id)));
    }

    /** Valida que el patrón de la rotativa sea coherente (semanas × 7 días). */
    @Operation(summary = "Validar el patrón de una rotativa",
            description = "Comprueba que la secuencia cubra exactamente semanas × 7 días; "
                    + "lanza error con el detalle si no cuadra.")
    @GetMapping("/{id}/validar")
    public ResponseEntity<String> validarRotativa(@PathVariable Long id) {
        rotativaService.validarRotativa(id);
        return ResponseEntity.ok("Rotativa válida");
    }

    /**
     * Reemplaza la secuencia de días de una rotativa.
     * @param dias lista de días; cada día es la lista de ids de tipo de turno (vacía = día libre).
     */
    @Operation(summary = "Definir la secuencia de días de una rotativa",
            description = "Cada posición es un día; su lista son los tipos de turno de ese día "
                    + "(varios = p. ej. día+noche; vacía = día libre).")
    @PutMapping("/{id}/secuencia")
    public ResponseEntity<RotativaDTO> establecerSecuencia(
            @PathVariable Long id,
            @RequestBody List<List<Long>> dias
    ) {
        RotativaEntity entidad = rotativaService.establecerSecuencia(id, dias);
        return ResponseEntity.ok(convertToDTO(entidad));
    }

    /** Devuelve la secuencia de días de una rotativa (los días libres van con turno nulo). */
    @Operation(summary = "Obtener la secuencia de días de una rotativa")
    @GetMapping("/{id}/secuencia")
    public ResponseEntity<List<RotativaDiaDTO>> obtenerSecuencia(@PathVariable Long id) {
        List<RotativaDiaEntity> entidades = rotativaService.obtenerSecuencia(id);
        List<RotativaDiaDTO> respuesta = entidades.stream()
                .map(this::convertDiaToDTO)
                .toList();
        return ResponseEntity.ok(respuesta);
    }

    // =========================================================================
    // MÉTODOS DE MAPEO AUXILIARES (Entity -> DTO)
    // =========================================================================

    /** Mapea una rotativa a su DTO, incluyendo servicio y secuencia de días. */
    private RotativaDTO convertToDTO(RotativaEntity entidad) {
        if (entidad == null) return null;
        RotativaDTO dto = new RotativaDTO();
        dto.setIdRotativa(entidad.getIdRotativa());
        dto.setNombre(entidad.getNombre());
        dto.setSemanas(entidad.getSemanas());

        if (entidad.getServicio() != null) {
            dto.setIdServicio(entidad.getServicio().getIdServicio());
            dto.setNombreServicio(entidad.getServicio().getNombre());
        }

        if (entidad.getSecuenciaDias() != null) {
            dto.setSecuenciaDias(entidad.getSecuenciaDias().stream().map(this::convertDiaToDTO).toList());
        }
        return dto;
    }

    /** Mapea un día de la rotativa a su DTO; si no tiene tipo de turno, es un día libre (turno nulo). */
    private RotativaDiaDTO convertDiaToDTO(RotativaDiaEntity entidad) {
        if (entidad == null) return null;
        RotativaDiaDTO dto = new RotativaDiaDTO();
        dto.setDiaIndex(entidad.getDiaIndex());

        if (entidad.getTipoTurno() != null) {
            TipoTurnoEntity turno = entidad.getTipoTurno();
            TipoTurnoDTO turnoDTO = new TipoTurnoDTO(
                turno.getIdTipoTurno(),
                turno.getNombre(),
                turno.getHoraInicio(),
                turno.getHoraTermino(),
                turno.getServicio() != null ? turno.getServicio().getIdServicio() : null
            );
            dto.setTurno(turnoDTO);
        } else {
            dto.setTurno(null); // Día libre
        }
        return dto;
    }
}
