package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.Entity.CategoriaTipoTurnoEntity;
import com.pingeso.HUAP.Entity.ServicioEntity; // Importar
import com.pingeso.HUAP.Service.CategoriaTipoTurnoService;
import com.pingeso.HUAP.Repository.ServicioRepository; // Importar
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/categorias-tipo-turno")
@CrossOrigin(origins = "*")
public class CategoriaTipoTurnoController {

    @Autowired
    private CategoriaTipoTurnoService service;

    // --- Inyectar Repositorio necesario ---
    @Autowired
    private ServicioRepository servicioRepository; // Asumiendo que existe

    @PostMapping("/reorder")
    public ResponseEntity<HttpStatus> reorderCategorias(@RequestBody List<CategoriaTipoTurnoEntity> categorias) {
        try {
            service.reorderCategorias(categorias);
            return new ResponseEntity<>(HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }


    @PostMapping("/")
    public ResponseEntity<CategoriaTipoTurnoEntity> create(@RequestBody Map<String, Object> payload) {

        try {
            String nombre = (String) payload.get("nombre");
            int prioridad = Integer.parseInt(payload.get("prioridad").toString());
            Map<String, Object> servicioMap = (Map<String, Object>) payload.get("servicio");
            Integer servicioId = Integer.parseInt(servicioMap.get("idServicio").toString());

            Optional<ServicioEntity> servicioOpt = servicioRepository.findById(servicioId);
            if (!servicioOpt.isPresent()) {
                System.out.println("Error: No se encontró el servicio con ID: " + servicioId);
                return new ResponseEntity<>((HttpHeaders) null, HttpStatus.BAD_REQUEST);
            }

            CategoriaTipoTurnoEntity categoria = new CategoriaTipoTurnoEntity();
            categoria.setNombre(nombre);
            categoria.setPrioridad(prioridad);
            categoria.setServicio(servicioOpt.get());

            CategoriaTipoTurnoEntity nuevaCategoria = service.save(categoria);
            return new ResponseEntity<>(nuevaCategoria, HttpStatus.CREATED);

        } catch (Exception e) {
            System.out.println("--- ERROR GUARDANDO CATEGORIA ---");
            e.printStackTrace();
            return new ResponseEntity<>((HttpHeaders) null, HttpStatus.BAD_REQUEST);
        }
    }



    // --- Resto de métodos sin cambios ---

    @GetMapping("/")
    public ResponseEntity<List<CategoriaTipoTurnoEntity>> getAll() {
        List<CategoriaTipoTurnoEntity> categorias = service.findAll();
        return new ResponseEntity<>(categorias, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CategoriaTipoTurnoEntity> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(categoria -> new ResponseEntity<>(categoria, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoriaTipoTurnoEntity> update(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        // Buscamos la entidad existente
        Optional<CategoriaTipoTurnoEntity> existenteOpt = service.findById(id);
        if (!existenteOpt.isPresent()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        try {
            CategoriaTipoTurnoEntity categoria = existenteOpt.get();

            // 1. Extraer los datos del Map
            String nombre = (String) payload.get("nombre");
            int prioridad = Integer.parseInt(payload.get("prioridad").toString());

            // 2. Extraer el objeto anidado 'servicio'
            Map<String, Object> servicioMap = (Map<String, Object>) payload.get("servicio");
            Integer servicioId = Integer.parseInt(servicioMap.get("idServicio").toString());

            // 3. Buscar la entidad 'Servicio'
            Optional<ServicioEntity> servicioOpt = servicioRepository.findById(servicioId);
            if (!servicioOpt.isPresent()) {
                System.out.println("Error: No se encontró el servicio con ID: " + servicioId);
                return new ResponseEntity<>((HttpHeaders) null, HttpStatus.BAD_REQUEST);
            }

            // 4. Actualizar la entidad existente
            categoria.setNombre(nombre);
            categoria.setPrioridad(prioridad);
            categoria.setServicio(servicioOpt.get());

            // 5. Guardar (JPA detecta que es un update)
            CategoriaTipoTurnoEntity actualizada = service.save(categoria);
            return new ResponseEntity<>(actualizada, HttpStatus.OK);

        } catch (Exception e) {
            System.out.println("--- ERROR ACTUALIZANDO CATEGORIA ---");
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

    @GetMapping("/by-servicio/{idServicio}")
    public ResponseEntity<List<CategoriaTipoTurnoEntity>> getByServicioOrdenado(@PathVariable Long idServicio) {
        List<CategoriaTipoTurnoEntity> categorias = service.findByServicioOrderByPrioridad(idServicio);
        return new ResponseEntity<>(categorias, HttpStatus.OK);
    }
}