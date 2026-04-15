package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.Entity.PlantillaPisoEntity;
import com.pingeso.HUAP.Entity.PersonalEntity;
import com.pingeso.HUAP.Service.PlantillaPisoService;
import com.pingeso.HUAP.Repository.PersonalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/plantillas-piso")
@CrossOrigin(origins = "*")
public class PlantillaPisoController {

    @Autowired
    private PlantillaPisoService service;

    @Autowired
    private PersonalRepository personalRepository;

    // --- LISTAR TODAS ---
    @GetMapping("/")
    public ResponseEntity<List<PlantillaPisoEntity>> getAll() {
        return new ResponseEntity<>(service.findAll(), HttpStatus.OK);
    }

    // --- CREAR PLANTILLA (Corregido: Sin Piso) ---
    @PostMapping("/")
    public ResponseEntity<PlantillaPisoEntity> create(@RequestBody Map<String, Object> payload) {
        try {
            String nombre = (String) payload.get("nombre");

            // Extraer Creador
            Map<String, Object> creadorMap = (Map<String, Object>) payload.get("creador");
            Long idCreador = Long.parseLong(creadorMap.get("idPersonal").toString());

            Optional<PersonalEntity> creadorOpt = personalRepository.findById(idCreador);

            if (!creadorOpt.isPresent()) {
                return new ResponseEntity<>((HttpHeaders) null, HttpStatus.BAD_REQUEST);
            }

            PlantillaPisoEntity plantilla = new PlantillaPisoEntity();
            plantilla.setNombre(nombre);
            plantilla.setCreador(creadorOpt.get());

            return new ResponseEntity<>(service.save(plantilla), HttpStatus.CREATED);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>((HttpHeaders) null, HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<PlantillaPisoEntity> update(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Optional<PlantillaPisoEntity> existingOpt = service.findById(id);
        if (!existingOpt.isPresent()) return new ResponseEntity<>(HttpStatus.NOT_FOUND);

        PlantillaPisoEntity existing = existingOpt.get();
        if (payload.containsKey("nombre")) {
            existing.setNombre((String) payload.get("nombre"));
        }
        
        return new ResponseEntity<>(service.save(existing), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PlantillaPisoEntity> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(p -> new ResponseEntity<>(p, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<HttpStatus> delete(@PathVariable Long id) {
        if (service.delete(id)) return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }
}