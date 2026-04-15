package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.Service.PisoService;
import com.pingeso.HUAP.Entity.PisoEntity;
import com.pingeso.HUAP.Entity.PlantillaPisoEntity; // Importar
import com.pingeso.HUAP.Repository.PisoRepository; // Importar
import com.pingeso.HUAP.Repository.PlantillaPisoRepository; // Importar
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/pisos")
@CrossOrigin("*")
public class PisoController {

    @Autowired
    private PisoService pisoService;

    // Inyectamos repositorios para manejar la relación manualmente
    @Autowired
    private PisoRepository pisoRepository;
    @Autowired
    private PlantillaPisoRepository plantillaPisoRepository;

    // Obtener todos los pisos
    @GetMapping("")
    public ResponseEntity<?> listPisos(@RequestParam(required = false) Long servicioId) {
        return ResponseEntity.ok().body(pisoService.getAllPisosSummary(servicioId));
    }

    // Obtener un piso por ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getPisoById(@PathVariable Long id) {
        Map<String, Object> piso = pisoService.getPisoSummary(id);
        if (piso == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().body(piso);
    }

    // Buscar piso por nombre
    @GetMapping("/nombre/{nombre}")
    public ResponseEntity<?> getPisoByNombre(@PathVariable String nombre) {
        PisoEntity piso = pisoService.getPisoByNombre(nombre);
        if (piso == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().body(piso);
    }

    // Crear nuevo piso
    @PostMapping("")
    public ResponseEntity<?> createPiso(@RequestBody Map<String, Object> payload) {
        try {
            PisoEntity nuevoPiso = pisoService.createPiso(payload);
            Map<String, Object> summary = pisoService.getPisoSummary(nuevoPiso.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(summary);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new java.util.HashMap<String, Object>() {{
                put("error", e.getMessage());
            }});
        }
    }

    // Actualizar piso existente (MODIFICADO)
    @PutMapping("/{id}")
    public ResponseEntity<?> updatePiso(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            // 1. Lógica especial: Asignar Plantilla si viene en el payload
            if (payload.containsKey("plantillaPiso")) {
                Optional<PisoEntity> pisoOpt = pisoRepository.findById(id);
                if (!pisoOpt.isPresent()) return ResponseEntity.notFound().build();

                PisoEntity piso = pisoOpt.get();

                Map<String, Object> plantillaMap = (Map<String, Object>) payload.get("plantillaPiso");

                // Si viene null o vacío, desasignamos la plantilla
                if (plantillaMap == null) {
                    piso.setPlantillaPiso(null);
                }
                else if (plantillaMap.containsKey("idPlantillaPiso")) {
                    Long idPlantilla = Long.parseLong(plantillaMap.get("idPlantillaPiso").toString());
                    Optional<PlantillaPisoEntity> plantillaOpt = plantillaPisoRepository.findById(idPlantilla);

                    if (plantillaOpt.isPresent()) {
                        piso.setPlantillaPiso(plantillaOpt.get());
                    }
                }

                pisoRepository.save(piso);
                return ResponseEntity.ok().body(new java.util.HashMap<String, Object>() {{
                    put("message", "Plantilla asignada correctamente");
                }});
            }

            // 2. Lógica estándar del servicio para otros campos
            Map<String, Object> updated = pisoService.updatePiso(id, payload);
            if (updated == null) return ResponseEntity.notFound().build();
            return ResponseEntity.ok().body(updated);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new java.util.HashMap<String, Object>() {{
                put("error", e.getMessage());
            }});
        }
    }

    // Eliminar piso
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePiso(@PathVariable Long id) {
        boolean deleted = pisoService.deletePiso(id);
        if (!deleted) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok().body(new java.util.HashMap<String, Object>() {{
            put("message", "Piso eliminado exitosamente");
        }});
    }

    // Obtener pisos por servicio (IMPORTANTE: Esta es la ruta que usa el front)
    @GetMapping("/servicio/{servicioId}")
    public ResponseEntity<?> getPisosByServicio(@PathVariable Long servicioId) {
        List<PisoEntity> pisos = pisoService.getPisosByServicioId(servicioId);
        return ResponseEntity.ok().body(pisos);
    }
}