package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.TipoTurnoDTO;
import com.pingeso.HUAP.Entity.TipoTurnoEntity;
import com.pingeso.HUAP.Service.TipoTurnoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v2/tipos-turno")
public class TipoTurnoController {

    private final TipoTurnoService tipoTurnoService;

    public TipoTurnoController(TipoTurnoService tipoTurnoService) {
        this.tipoTurnoService = tipoTurnoService;
    }

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


    @GetMapping("/servicio/{servicioId}")
    public ResponseEntity<List<TipoTurnoDTO>> obtenerTiposDeTurnoPorServicio(@PathVariable Long servicioId) {
        List<TipoTurnoEntity> entidades = tipoTurnoService.obtenerTiposDeTurnoPorServicio(servicioId);
        List<TipoTurnoDTO> respuesta = entidades.stream()
                .map(this::convertToDTO)
                .toList();
        return ResponseEntity.ok(respuesta);
    }

    @GetMapping
    public ResponseEntity<List<TipoTurnoDTO>> obtenerCatalogo() {
        List<TipoTurnoEntity> entidades = tipoTurnoService.obtenerCatalogo();
        List<TipoTurnoDTO> respuesta = entidades.stream()
                .map(this::convertToDTO)
                .toList();
        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TipoTurnoDTO> obtenerTipoDeTurno(@PathVariable Long id) {
        TipoTurnoEntity entidad = tipoTurnoService.obtenerTipoDeTurno(id);
        return ResponseEntity.ok(convertToDTO(entidad));
    }

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
     * Nombres de las rotativas que se verán afectadas al eliminar el tipo de turno.
     * Lista vacía = el tipo no está en uso.
     */
    @GetMapping("/{id}/rotativas-afectadas")
    public ResponseEntity<List<String>> obtenerRotativasAfectadas(@PathVariable Long id) {
        return ResponseEntity.ok(tipoTurnoService.obtenerRotativasAfectadas(id));
    }

    /**
     * 6. Elimina un tipo de turno del catálogo.
     */
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
     * Convierte la entidad de la Base de Datos a un JSON plano (DTO).
     * Esto elimina los objetos Proxy de Hibernate evitando el "hibernateLazyInitializer".
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