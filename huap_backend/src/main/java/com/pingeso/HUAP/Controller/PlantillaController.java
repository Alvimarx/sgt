package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.PlantillaDTO;
import com.pingeso.HUAP.DTO.PlantillaDiaDTO;
import com.pingeso.HUAP.DTO.PlantillaTurnoDTO;
import com.pingeso.HUAP.Entity.PlantillaDiaEntity;
import com.pingeso.HUAP.Entity.PlantillaEntity;
import com.pingeso.HUAP.Entity.PlantillaTurnoEntity;
import com.pingeso.HUAP.Service.PlantillaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v2/plantillas")
@CrossOrigin("*")
public class PlantillaController {

    private final PlantillaService plantillaService;

    public PlantillaController(PlantillaService plantillaService) {
        this.plantillaService = plantillaService;
    }

    @PostMapping
    public ResponseEntity<PlantillaDTO> crearPlantilla(@RequestBody PlantillaDTO dto) {
        List<Long> idsDias = dto.getSecuenciaDias() == null ? null :
                dto.getSecuenciaDias().stream()
                        .map(d -> d.getTurno() != null ? d.getTurno().getIdPlantillaTurno() : null)
                        .toList();
        PlantillaEntity entidad = plantillaService.crearPlantilla(
                dto.getIdServicio(),
                dto.getNombre(),
                dto.getSemanas(),
                idsDias
        );
        return ResponseEntity.ok(convertToDTO(entidad));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PlantillaDTO> obtenerPlantilla(@PathVariable Long id) {
        return ResponseEntity.ok(convertToDTO(plantillaService.obtenerPlantilla(id)));
    }

    @GetMapping
    public ResponseEntity<List<PlantillaDTO>> obtenerPlantillas() {
        List<PlantillaDTO> respuesta = plantillaService.obtenerPlantillas().stream()
                .map(this::convertToDTO)
                .toList();
        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/servicio/{idServicio}")
    public ResponseEntity<List<PlantillaDTO>> obtenerPorServicio(@PathVariable Long idServicio) {
        List<PlantillaDTO> respuesta = plantillaService.obtenerPlantillasPorServicio(idServicio).stream()
                .map(this::convertToDTO)
                .toList();
        return ResponseEntity.ok(respuesta);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PlantillaDTO> actualizarPlantilla(@PathVariable Long id, @RequestBody PlantillaDTO dto) {
        PlantillaEntity entidad = plantillaService.actualizarPlantilla(
                id,
                dto.getNombre(),
                dto.getSemanas()
        );
        return ResponseEntity.ok(convertToDTO(entidad));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarPlantilla(@PathVariable Long id) {
        plantillaService.eliminarPlantilla(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/duplicar")
    public ResponseEntity<PlantillaDTO> duplicarPlantilla(@PathVariable Long id) {
        return ResponseEntity.ok(convertToDTO(plantillaService.duplicarPlantilla(id)));
    }

    @GetMapping("/{id}/validar")
    public ResponseEntity<String> validarPlantilla(@PathVariable Long id) {
        plantillaService.validarPlantilla(id);
        return ResponseEntity.ok("Plantilla válida");
    }

    @PutMapping("/{id}/secuencia")
    public ResponseEntity<PlantillaDTO> establecerSecuencia(
            @PathVariable Long id,
            @RequestBody List<List<Long>> dias
    ) {
        PlantillaEntity entidad = plantillaService.establecerSecuencia(id, dias);
        return ResponseEntity.ok(convertToDTO(entidad));
    }

    @GetMapping("/{id}/secuencia")
    public ResponseEntity<List<PlantillaDiaDTO>> obtenerSecuencia(@PathVariable Long id) {
        List<PlantillaDiaEntity> entidades = plantillaService.obtenerSecuencia(id);
        List<PlantillaDiaDTO> respuesta = entidades.stream()
                .map(this::convertDiaToDTO)
                .toList();
        return ResponseEntity.ok(respuesta);
    }

    // =========================================================================
    // MÉTODOS DE MAPEO AUXILIARES (Entity -> DTO)
    // =========================================================================
    
    private PlantillaDTO convertToDTO(PlantillaEntity entidad) {
        if (entidad == null) return null;
        PlantillaDTO dto = new PlantillaDTO();
        dto.setIdPlantilla(entidad.getIdPlantilla());
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

    private PlantillaDiaDTO convertDiaToDTO(PlantillaDiaEntity entidad) {
        if (entidad == null) return null;
        PlantillaDiaDTO dto = new PlantillaDiaDTO();
        dto.setDiaIndex(entidad.getDiaIndex());
        
        if (entidad.getPlantillaTurno() != null) {
            PlantillaTurnoEntity turno = entidad.getPlantillaTurno();
            PlantillaTurnoDTO turnoDTO = new PlantillaTurnoDTO(
                turno.getIdPlantillaTurno(),
                turno.getNombre(),
                turno.getHoraInicio(),
                turno.getHoraTermino(),
                turno.getServicio() != null ? turno.getServicio().getIdServicio() : null
            );
            dto.setTurno(turnoDTO);
        } else {
            dto.setTurno(null); // Día Libre
        }
        return dto;
    }
}