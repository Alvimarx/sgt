package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.Entity.PlantillaTurnoEntity;
import com.pingeso.HUAP.Service.PlantillaTurnoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/plantillas/bloques")
@CrossOrigin("*")
public class PlantillaTurnoController {

    private final PlantillaTurnoService plantillaTurnoService;

    public PlantillaTurnoController(
            PlantillaTurnoService plantillaTurnoService
    ) {
        this.plantillaTurnoService = plantillaTurnoService;
    }

    // Agregar bloque horario a plantilla
    @PostMapping
    public ResponseEntity<PlantillaTurnoEntity>
    agregarBloqueHorarioPlantilla(
            @RequestParam Long idPlantilla,
            @RequestParam LocalTime horaInicio,
            @RequestParam LocalTime horaTermino,
            @RequestParam String nombre
    ) {

        PlantillaTurnoEntity bloqueHorario =
                plantillaTurnoService
                        .agregarBloqueHorarioPlantilla(
                                idPlantilla,
                                horaInicio,
                                horaTermino,
                                nombre
                        );

        return ResponseEntity.ok(bloqueHorario);
    }

    // Obtener bloque horario
    @GetMapping("/{id}")
    public ResponseEntity<PlantillaTurnoEntity>
    obtenerBloqueHorarioPlantilla(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                plantillaTurnoService
                        .obtenerBloqueHorarioPlantilla(id)
        );
    }

    // Obtener bloques horarios de plantilla
    @GetMapping("/plantilla/{idPlantilla}")
    public ResponseEntity<List<PlantillaTurnoEntity>>
    obtenerBloquesHorarioPorPlantilla(
            @PathVariable Long idPlantilla
    ) {

        return ResponseEntity.ok(
                plantillaTurnoService
                        .obtenerBloquesHorarioPorPlantilla(
                                idPlantilla
                        )
        );
    }

    // Actualizar bloque horario
    @PutMapping("/{id}")
    public ResponseEntity<PlantillaTurnoEntity>
    actualizarBloqueHorarioPlantilla(
            @PathVariable Long id,
            @RequestParam LocalTime horaInicio,
            @RequestParam LocalTime horaTermino,
            @RequestParam String nombre
    ) {

        return ResponseEntity.ok(
                plantillaTurnoService
                        .actualizarBloqueHorarioPlantilla(
                                id,
                                horaInicio,
                                horaTermino,
                                nombre
                        )
        );
    }

    // Eliminar bloque horario
    @DeleteMapping("/{id}")
    public ResponseEntity<Void>
    eliminarBloqueHorarioPlantilla(
            @PathVariable Long id
    ) {

        plantillaTurnoService
                .eliminarBloqueHorarioPlantilla(id);

        return ResponseEntity.noContent().build();
    }

    // Validar solapamiento
    @GetMapping("/validar-solapamiento")
    public ResponseEntity<Boolean>
    validarSolapamientoHorarioPlantilla(
            @RequestParam Long idPlantilla,
            @RequestParam LocalTime horaInicio,
            @RequestParam LocalTime horaTermino
    ) {

        return ResponseEntity.ok(
                plantillaTurnoService
                        .existeSolapamientoHorarioPlantilla(
                                idPlantilla,
                                horaInicio,
                                horaTermino
                        )
        );
    }
}