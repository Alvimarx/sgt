package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.Entity.PlantillaEntity;
import com.pingeso.HUAP.Service.PlantillaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v2/plantillas")
@CrossOrigin("*")
public class PlantillaController {

    private final PlantillaService plantillaService;

    public PlantillaController(
            PlantillaService plantillaService
    ) {
        this.plantillaService = plantillaService;
    }

    // Crear plantilla
    @PostMapping
    public ResponseEntity<PlantillaEntity> crearPlantilla(
            @RequestParam Long idServicio,
            @RequestParam String nombre,
            @RequestParam Byte semanas
    ) {

        PlantillaEntity plantilla =
                plantillaService.crearPlantilla(
                        idServicio,
                        nombre,
                        semanas
                );

        return ResponseEntity.ok(plantilla);
    }

    // Obtener plantilla por id
    @GetMapping("/{id}")
    public ResponseEntity<PlantillaEntity> obtenerPlantilla(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                plantillaService.obtenerPlantilla(id)
        );
    }

    // Obtener todas
    @GetMapping
    public ResponseEntity<List<PlantillaEntity>>
    obtenerPlantillas() {

        return ResponseEntity.ok(
                plantillaService.obtenerPlantillas()
        );
    }

    // Obtener por servicio
    @GetMapping("/servicio/{idServicio}")
    public ResponseEntity<List<PlantillaEntity>>
    obtenerPorServicio(
            @PathVariable Long idServicio
    ) {

        return ResponseEntity.ok(
                plantillaService.obtenerPlantillasPorServicio(
                        idServicio
                )
        );
    }

    // Actualizar plantilla
    @PutMapping("/{id}")
    public ResponseEntity<PlantillaEntity>
    actualizarPlantilla(
            @PathVariable Long id,
            @RequestParam String nombre,
            @RequestParam Byte semanas
    ) {

        return ResponseEntity.ok(
                plantillaService.actualizarPlantilla(
                        id,
                        nombre,
                        semanas
                )
        );
    }

    // Eliminar plantilla
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarPlantilla(
            @PathVariable Long id
    ) {

        plantillaService.eliminarPlantilla(id);

        return ResponseEntity.noContent().build();
    }

    // Duplicar plantilla
    @PostMapping("/{id}/duplicar")
    public ResponseEntity<PlantillaEntity>
    duplicarPlantilla(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                plantillaService.duplicarPlantilla(id)
        );
    }

    // Validar plantilla
    @GetMapping("/{id}/validar")
    public ResponseEntity<String> validarPlantilla(
            @PathVariable Long id
    ) {

        plantillaService.validarPlantilla(id);

        return ResponseEntity.ok(
                "Plantilla válida"
        );
    }
}