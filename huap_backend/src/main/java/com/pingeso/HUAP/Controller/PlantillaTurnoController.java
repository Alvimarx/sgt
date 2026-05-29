package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.PlantillaTurnoDTO;
import com.pingeso.HUAP.Entity.PlantillaTurnoEntity;
import com.pingeso.HUAP.Service.PlantillaTurnoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v2/tipos-turno")
@CrossOrigin("*")
public class PlantillaTurnoController {

    private final PlantillaTurnoService plantillaTurnoService;

    public PlantillaTurnoController(PlantillaTurnoService plantillaTurnoService) {
        this.plantillaTurnoService = plantillaTurnoService;
    }

    @PostMapping
    public ResponseEntity<PlantillaTurnoDTO> crearTipoDeTurno(@RequestBody PlantillaTurnoDTO dto) {
        PlantillaTurnoEntity entidad = plantillaTurnoService.crearTipoDeTurno(
                dto.getNombre(),
                dto.getHoraInicio(),
                dto.getHoraTermino(),
                dto.getIdServicio()
        );
        return ResponseEntity.ok(convertToDTO(entidad));
    }


    @GetMapping("/servicio/{servicioId}")
    public ResponseEntity<List<PlantillaTurnoDTO>> obtenerTiposDeTurnoPorServicio(@PathVariable Long servicioId) {
        List<PlantillaTurnoEntity> entidades = plantillaTurnoService.obtenerTiposDeTurnoPorServicio(servicioId);
        List<PlantillaTurnoDTO> respuesta = entidades.stream()
                .map(this::convertToDTO)
                .toList();
        return ResponseEntity.ok(respuesta);
    }

    @GetMapping
    public ResponseEntity<List<PlantillaTurnoDTO>> obtenerCatalogo() {
        List<PlantillaTurnoEntity> entidades = plantillaTurnoService.obtenerCatalogo();
        List<PlantillaTurnoDTO> respuesta = entidades.stream()
                .map(this::convertToDTO)
                .toList();
        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PlantillaTurnoDTO> obtenerTipoDeTurno(@PathVariable Long id) {
        PlantillaTurnoEntity entidad = plantillaTurnoService.obtenerTipoDeTurno(id);
        return ResponseEntity.ok(convertToDTO(entidad));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PlantillaTurnoDTO> actualizarTipoDeTurno(
            @PathVariable Long id,
            @RequestBody PlantillaTurnoDTO dto
    ) {
        PlantillaTurnoEntity entidad = plantillaTurnoService.actualizarTipoDeTurno(
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
        return ResponseEntity.ok(plantillaTurnoService.obtenerRotativasAfectadas(id));
    }

    /**
     * 6. Elimina un tipo de turno del catálogo.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarTipoDeTurno(@PathVariable Long id) {
        plantillaTurnoService.eliminarTipoDeTurno(id);
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // MÉTODO AUXILIAR DE MAPEO (Entity -> DTO)
    // =========================================================================
    /**
     * Convierte la entidad de la Base de Datos a un JSON plano (DTO).
     * Esto elimina los objetos Proxy de Hibernate evitando el "hibernateLazyInitializer".
     */
    private PlantillaTurnoDTO convertToDTO(PlantillaTurnoEntity entidad) {
        if (entidad == null) return null;

        PlantillaTurnoDTO dto = new PlantillaTurnoDTO();
        dto.setIdPlantillaTurno(entidad.getIdPlantillaTurno());
        dto.setNombre(entidad.getNombre());
        dto.setHoraInicio(entidad.getHoraInicio());
        dto.setHoraTermino(entidad.getHoraTermino());
    
        if (entidad.getServicio() != null) {
            dto.setIdServicio(entidad.getServicio().getIdServicio());
        }

        return dto;
    }
}