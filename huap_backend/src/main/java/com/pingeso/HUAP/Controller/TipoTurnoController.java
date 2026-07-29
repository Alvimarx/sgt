package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.TipoTurnoDTO;
import com.pingeso.HUAP.Entity.TipoTurnoEntity;
import com.pingeso.HUAP.Service.TipoTurnoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * API REST del catálogo de tipos de turno (horarios nombrados de un servicio).
 *
 * <p>Un tipo de turno define un horario reutilizable (nombre + hora de inicio y término) dentro de un
 * servicio y sirve de base para armar las rotativas y generar los turnos. Expone el CRUD del catálogo
 * y la consulta de las rotativas que se verían afectadas al eliminar uno. Ruta base
 * {@code /api/v2/tipos-turno}. Las entidades se exponen como {@link TipoTurnoDTO} para evitar
 * serializar proxies de Hibernate.
 */
@RestController
@RequestMapping("/api/v2/tipos-turno")
@Tag(name = "Tipos de turno", description = "Catálogo de horarios nombrados (tipos de turno) por servicio")
public class TipoTurnoController {

    private final TipoTurnoService tipoTurnoService;

    public TipoTurnoController(TipoTurnoService tipoTurnoService) {
        this.tipoTurnoService = tipoTurnoService;
    }

    /**
     * Crea un tipo de turno en un servicio.
     *
     * @param dto nombre, hora de inicio, hora de término e id del servicio.
     * @return el tipo de turno creado.
     */
    @Operation(summary = "Crear tipo de turno",
            description = "Registra un nuevo horario nombrado en un servicio. El nombre debe ser único dentro del servicio.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Tipo de turno creado"),
            @ApiResponse(responseCode = "500", description = "Servicio no encontrado, nombre duplicado u horario inválido")
    })
    @PostMapping
    public ResponseEntity<TipoTurnoDTO> crearTipoDeTurno(@RequestBody TipoTurnoDTO dto) {
        TipoTurnoEntity entidad = tipoTurnoService.crearTipoDeTurno(
                dto.getNombre(),
                dto.getHoraInicio(),
                dto.getHoraTermino(),
                dto.getIdServicio()
        );
        return ResponseEntity.ok(convertToDTO(entidad));
    }

    /**
     * Lista los tipos de turno vigentes de un servicio.
     *
     * @param servicioId id del servicio.
     * @return tipos de turno no eliminados del servicio.
     */
    @Operation(summary = "Listar tipos de turno por servicio",
            description = "Devuelve los tipos de turno vigentes (no eliminados) de un servicio.")
    @ApiResponse(responseCode = "200", description = "Listado obtenido")
    @GetMapping("/servicio/{servicioId}")
    public ResponseEntity<List<TipoTurnoDTO>> obtenerTiposDeTurnoPorServicio(@PathVariable Long servicioId) {
        List<TipoTurnoEntity> entidades = tipoTurnoService.obtenerTiposDeTurnoPorServicio(servicioId);
        List<TipoTurnoDTO> respuesta = entidades.stream()
                .map(this::convertToDTO)
                .toList();
        return ResponseEntity.ok(respuesta);
    }

    /**
     * Lista todo el catálogo de tipos de turno vigentes.
     *
     * @return tipos de turno no eliminados de todos los servicios.
     */
    @Operation(summary = "Listar catálogo completo",
            description = "Devuelve todos los tipos de turno vigentes (no eliminados) de todos los servicios.")
    @ApiResponse(responseCode = "200", description = "Catálogo obtenido")
    @GetMapping
    public ResponseEntity<List<TipoTurnoDTO>> obtenerCatalogo() {
        List<TipoTurnoEntity> entidades = tipoTurnoService.obtenerCatalogo();
        List<TipoTurnoDTO> respuesta = entidades.stream()
                .map(this::convertToDTO)
                .toList();
        return ResponseEntity.ok(respuesta);
    }

    /**
     * Obtiene un tipo de turno por su id.
     *
     * @param id id del tipo de turno.
     * @return el tipo de turno solicitado.
     */
    @Operation(summary = "Obtener tipo de turno", description = "Devuelve un tipo de turno por su id.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Tipo de turno encontrado"),
            @ApiResponse(responseCode = "500", description = "Tipo de turno no encontrado")
    })
    @GetMapping("/{id}")
    public ResponseEntity<TipoTurnoDTO> obtenerTipoDeTurno(@PathVariable Long id) {
        TipoTurnoEntity entidad = tipoTurnoService.obtenerTipoDeTurno(id);
        return ResponseEntity.ok(convertToDTO(entidad));
    }

    /**
     * Actualiza el nombre y el horario de un tipo de turno (no cambia su servicio).
     *
     * @param id  id del tipo de turno.
     * @param dto nuevos nombre, hora de inicio y hora de término.
     * @return el tipo de turno actualizado.
     */
    @Operation(summary = "Actualizar tipo de turno",
            description = "Modifica el nombre y el horario de un tipo de turno. El servicio no cambia.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Tipo de turno actualizado"),
            @ApiResponse(responseCode = "500", description = "Tipo de turno no encontrado, nombre duplicado u horario inválido")
    })
    @PutMapping("/{id}")
    public ResponseEntity<TipoTurnoDTO> actualizarTipoDeTurno(
            @PathVariable Long id,
            @RequestBody TipoTurnoDTO dto
    ) {
        TipoTurnoEntity entidad = tipoTurnoService.actualizarTipoDeTurno(
                id,
                dto.getNombre(),
                dto.getHoraInicio(),
                dto.getHoraTermino()
        );
        return ResponseEntity.ok(convertToDTO(entidad));
    }

    /**
     * Nombres de las rotativas que se verían afectadas al eliminar el tipo de turno.
     * Una lista vacía indica que el tipo no está en uso.
     *
     * @param id id del tipo de turno.
     * @return nombres de las rotativas que lo usan (vacío si no está en uso).
     */
    @Operation(summary = "Rotativas afectadas por la eliminación",
            description = "Devuelve los nombres de las rotativas cuyos días quedarían libres si se elimina el tipo de turno. Lista vacía = no está en uso.")
    @ApiResponse(responseCode = "200", description = "Consulta realizada")
    @GetMapping("/{id}/rotativas-afectadas")
    public ResponseEntity<List<String>> obtenerRotativasAfectadas(@PathVariable Long id) {
        return ResponseEntity.ok(tipoTurnoService.obtenerRotativasAfectadas(id));
    }

    /**
     * Elimina un tipo de turno del catálogo (soft-delete) y libera sus referencias en las rotativas.
     *
     * @param id id del tipo de turno.
     * @return {@code 204} si se eliminó; {@code 409} con el mensaje de conflicto si está bloqueado.
     */
    @Operation(summary = "Eliminar tipo de turno",
            description = "Marca el tipo de turno como eliminado (soft-delete) y libera sus referencias en las rotativas (esos días quedan libres).")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Tipo de turno eliminado"),
            @ApiResponse(responseCode = "409", description = "No se puede eliminar (p. ej. turnos asociados); el cuerpo contiene el motivo")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarTipoDeTurno(@PathVariable Long id) {
        try {
            tipoTurnoService.eliminarTipoDeTurno(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            // p. ej. bloqueo por turnos asociados: devolvemos el mensaje como texto plano
            // para que el frontend lo muestre directo (lee e.response.data).
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        }
    }

    // =========================================================================
    // MÉTODO AUXILIAR DE MAPEO (Entity -> DTO)
    // =========================================================================
    /**
     * Convierte la entidad de la base de datos a un JSON plano (DTO). Esto elimina los objetos
     * proxy de Hibernate, evitando el error "hibernateLazyInitializer" al serializar.
     */
    private TipoTurnoDTO convertToDTO(TipoTurnoEntity entidad) {
        if (entidad == null) return null;

        TipoTurnoDTO dto = new TipoTurnoDTO();
        dto.setIdTipoTurno(entidad.getIdTipoTurno());
        dto.setNombre(entidad.getNombre());
        dto.setHoraInicio(entidad.getHoraInicio());
        dto.setHoraTermino(entidad.getHoraTermino());

        if (entidad.getServicio() != null) {
            dto.setIdServicio(entidad.getServicio().getIdServicio());
        }

        return dto;
    }
}
