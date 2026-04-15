package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.Entity.PlantillaPisoLineaEntity;
import com.pingeso.HUAP.Entity.PlantillaPisoEntity;
import com.pingeso.HUAP.Service.PlantillaPisoLineaService;
import com.pingeso.HUAP.Service.PlantillaPisoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/plantillas-piso-linea")
@CrossOrigin(origins = "*")
public class PlantillaPisoLineaController {

    @Autowired
    private PlantillaPisoLineaService service;
    @Autowired
    private PlantillaPisoService plantillaService;

    @PostMapping("/")
    public ResponseEntity<PlantillaPisoLineaEntity> create(@RequestBody Map<String, Object> payload) {
        try {
            String nombreLinea = (String) payload.get("nombreLinea");
            int orden = Integer.parseInt(payload.get("orden").toString());
            String matrizSemana = (String) payload.get("matrizSemana");

            Map<String, Object> plantillaMap = (Map<String, Object>) payload.get("plantillaPiso");
            Long idPlantilla = Long.parseLong(plantillaMap.get("idPlantillaPiso").toString());

            Optional<PlantillaPisoEntity> plantillaOpt = plantillaService.findById(idPlantilla);
            if (!plantillaOpt.isPresent()) {
                return new ResponseEntity<>((HttpHeaders) null, HttpStatus.BAD_REQUEST);
            }

            PlantillaPisoLineaEntity linea = new PlantillaPisoLineaEntity();
            linea.setNombreLinea(nombreLinea);
            linea.setOrden(orden);
            linea.setMatrizSemana(matrizSemana);
            linea.setPlantillaPiso(plantillaOpt.get());

            return new ResponseEntity<>(service.save(linea), HttpStatus.CREATED);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>((HttpHeaders) null, HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/by-plantilla/{idPlantilla}")
    public ResponseEntity<List<PlantillaPisoLineaEntity>> getByPlantilla(@PathVariable Long idPlantilla) {
        return new ResponseEntity<>(service.findByPlantilla(idPlantilla), HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<HttpStatus> delete(@PathVariable Long id) {
        if (service.delete(id)) return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @DeleteMapping("/by-plantilla/{idPlantilla}")
    public ResponseEntity<HttpStatus> deleteByPlantilla(@PathVariable Long idPlantilla) {
        try {
            service.deleteByPlantilla(idPlantilla);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}