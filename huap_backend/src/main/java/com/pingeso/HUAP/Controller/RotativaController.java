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

import java.util.List;

@RestController
@RequestMapping("/api/v2/rotativas")
public class RotativaController {

    private final RotativaService rotativaService;

    public RotativaController(RotativaService rotativaService) {
        this.rotativaService = rotativaService;
    }

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

    @GetMapping("/{id}")
    public ResponseEntity<RotativaDTO> obtenerRotativa(@PathVariable Long id) {
        return ResponseEntity.ok(convertToDTO(rotativaService.obtenerRotativa(id)));
    }

    @GetMapping
    public ResponseEntity<List<RotativaDTO>> obtenerRotativas() {
        List<RotativaDTO> respuesta = rotativaService.obtenerRotativas().stream()
                .map(this::convertToDTO)
                .toList();
        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/servicio/{idServicio}")
    public ResponseEntity<List<RotativaDTO>> obtenerPorServicio(@PathVariable Long idServicio) {
        List<RotativaDTO> respuesta = rotativaService.obtenerRotativasPorServicio(idServicio).stream()
                .map(this::convertToDTO)
                .toList();
        return ResponseEntity.ok(respuesta);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RotativaDTO> actualizarRotativa(@PathVariable Long id, @RequestBody RotativaDTO dto) {
        RotativaEntity entidad = rotativaService.actualizarRotativa(
                id,
                dto.getNombre(),
                dto.getSemanas()
        );
        return ResponseEntity.ok(convertToDTO(entidad));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarRotativa(@PathVariable Long id) {
        rotativaService.eliminarRotativa(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/duplicar")
    public ResponseEntity<RotativaDTO> duplicarRotativa(@PathVariable Long id) {
        return ResponseEntity.ok(convertToDTO(rotativaService.duplicarRotativa(id)));
    }

    @GetMapping("/{id}/validar")
    public ResponseEntity<String> validarRotativa(@PathVariable Long id) {
        rotativaService.validarRotativa(id);
        return ResponseEntity.ok("Rotativa válida");
    }

    @PutMapping("/{id}/secuencia")
    public ResponseEntity<RotativaDTO> establecerSecuencia(
            @PathVariable Long id,
            @RequestBody List<List<Long>> dias
    ) {
        RotativaEntity entidad = rotativaService.establecerSecuencia(id, dias);
        return ResponseEntity.ok(convertToDTO(entidad));
    }

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
            dto.setTurno(null); // Día Libre
        }
        return dto;
    }
}