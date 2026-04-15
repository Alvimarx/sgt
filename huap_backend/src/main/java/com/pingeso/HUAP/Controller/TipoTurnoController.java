package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.Entity.TipoTurnoEntity;
import com.pingeso.HUAP.Entity.CategoriaTipoTurnoEntity; // Importar
import com.pingeso.HUAP.Entity.PersonalEntity; // Importar
import com.pingeso.HUAP.Service.TipoTurnoService;
import com.pingeso.HUAP.Repository.CategoriaTipoTurnoRepository; // Importar
import com.pingeso.HUAP.Repository.PersonalRepository; // Importar
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/tipos-turno")
@CrossOrigin(origins = "*")
public class TipoTurnoController {

    @Autowired
    private TipoTurnoService service;

    // --- Inyectar Repositorios necesarios ---
    @Autowired
    private CategoriaTipoTurnoRepository categoriaRepository;

    @Autowired
    private PersonalRepository personalRepository;


    @PostMapping("/reorder")
    public ResponseEntity<HttpStatus> reorderTiposTurno(@RequestBody List<TipoTurnoEntity> tiposTurno) {
        try {
            service.reorderTiposTurno(tiposTurno);
            return new ResponseEntity<>(HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }


    @PostMapping("/")
    public ResponseEntity<TipoTurnoEntity> create(@RequestBody Map<String, Object> payload) {

        try {
            String nombre = (String) payload.get("nombre");
            int prioridadInterna = Integer.parseInt(payload.get("prioridadInterna").toString());
            String matrizPatron = (String) payload.get("matrizPatron");

            Map<String, Object> categoriaMap = (Map<String, Object>) payload.get("categoria");
            Long categoriaId = Long.parseLong(categoriaMap.get("idCategoriaTipoTurno").toString());
            Optional<CategoriaTipoTurnoEntity> categoriaOpt = categoriaRepository.findById(categoriaId);

            Map<String, Object> creadorMap = (Map<String, Object>) payload.get("creador");
            Long creadorId = Long.parseLong(creadorMap.get("idPersonal").toString());
            Optional<PersonalEntity> creadorOpt = personalRepository.findById(creadorId);

            if (!categoriaOpt.isPresent()) {
                System.out.println("Error: No se encontró la categoría con ID: " + categoriaId);
                return new ResponseEntity<>((HttpHeaders) null, HttpStatus.BAD_REQUEST);
            }
            if (!creadorOpt.isPresent()) {
                System.out.println("Error: No se encontró el personal (creador) con ID: " + creadorId);
                return new ResponseEntity<>((HttpHeaders) null, HttpStatus.BAD_REQUEST);
            }

            TipoTurnoEntity tipoTurno = new TipoTurnoEntity();
            tipoTurno.setNombre(nombre);
            tipoTurno.setPrioridadInterna(prioridadInterna);
            tipoTurno.setMatrizPatron(matrizPatron);
            tipoTurno.setCategoria(categoriaOpt.get());
            tipoTurno.setCreador(creadorOpt.get());

            TipoTurnoEntity nuevoTipoTurno = service.save(tipoTurno);
            return new ResponseEntity<>(nuevoTipoTurno, HttpStatus.CREATED);

        } catch (Exception e) {
            System.out.println("--- ERROR GUARDANDO TIPO TURNO ---");
            e.printStackTrace();
            return new ResponseEntity<>((HttpHeaders) null, HttpStatus.BAD_REQUEST);
        }
    }

    // --- Resto de métodos sin cambios ---

    @GetMapping("/")
    public ResponseEntity<List<TipoTurnoEntity>> getAll() {
        List<TipoTurnoEntity> tiposTurno = service.findAll();
        return new ResponseEntity<>(tiposTurno, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TipoTurnoEntity> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(tipoTurno -> new ResponseEntity<>(tipoTurno, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TipoTurnoEntity> update(@PathVariable Long id, @RequestBody Map<String, Object> payload) {

        // Buscamos la entidad existente
        Optional<TipoTurnoEntity> existenteOpt = service.findById(id);
        if (!existenteOpt.isPresent()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        try {
            TipoTurnoEntity tipoTurno = existenteOpt.get();

            // 1. Extraer datos simples
            String nombre = (String) payload.get("nombre");
            int prioridadInterna = Integer.parseInt(payload.get("prioridadInterna").toString());
            String matrizPatron = (String) payload.get("matrizPatron");

            // 2. Extraer y buscar Categoria
            Map<String, Object> categoriaMap = (Map<String, Object>) payload.get("categoria");
            Long categoriaId = Long.parseLong(categoriaMap.get("idCategoriaTipoTurno").toString());
            Optional<CategoriaTipoTurnoEntity> categoriaOpt = categoriaRepository.findById(categoriaId);

            // 3. Extraer y buscar Creador
            Map<String, Object> creadorMap = (Map<String, Object>) payload.get("creador");
            Long creadorId = Long.parseLong(creadorMap.get("idPersonal").toString());
            Optional<PersonalEntity> creadorOpt = personalRepository.findById(creadorId);

            // Validar que las entidades anidadas existan
            if (!categoriaOpt.isPresent()) {
                System.out.println("Error: No se encontró la categoría con ID: " + categoriaId);
                return new ResponseEntity<>((HttpHeaders) null, HttpStatus.BAD_REQUEST);
            }
            if (!creadorOpt.isPresent()) {
                System.out.println("Error: No se encontró el personal (creador) con ID: " + creadorId);
                return new ResponseEntity<>((HttpHeaders) null, HttpStatus.BAD_REQUEST);
            }

            // 4. Actualizar la entidad existente
            tipoTurno.setNombre(nombre);
            tipoTurno.setPrioridadInterna(prioridadInterna);
            tipoTurno.setMatrizPatron(matrizPatron);
            tipoTurno.setCategoria(categoriaOpt.get());
            tipoTurno.setCreador(creadorOpt.get());

            // 5. Guardar (JPA detecta que es un update)
            TipoTurnoEntity actualizado = service.save(tipoTurno);
            return new ResponseEntity<>(actualizado, HttpStatus.OK);

        } catch (Exception e) {
            System.out.println("--- ERROR ACTUALIZANDO TIPO TURNO ---");
            e.printStackTrace();
            return new ResponseEntity<>((HttpHeaders) null, HttpStatus.BAD_REQUEST);
        }
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<HttpStatus> delete(@PathVariable Long id) {
        if (service.delete(id)) {
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @GetMapping("/by-categoria/{idCategoria}")
    public ResponseEntity<List<TipoTurnoEntity>> getByCategoria(@PathVariable Long idCategoria) {
        List<TipoTurnoEntity> tiposTurno = service.findByCategoria(idCategoria);
        return new ResponseEntity<>(tiposTurno, HttpStatus.OK);
    }

    @GetMapping("/by-servicio-ordenado/{idServicio}")
    public ResponseEntity<List<TipoTurnoEntity>> getByServicioOrdenado(@PathVariable Long idServicio) {
        List<TipoTurnoEntity> tiposTurno = service.findAllByServicioOrdenado(idServicio);
        return new ResponseEntity<>(tiposTurno, HttpStatus.OK);
    }
}