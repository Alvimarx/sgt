package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Service.ServicioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/servicios")
@CrossOrigin("*")
public class ServicioController {

    private final ServicioService servicioService;

    public ServicioController(ServicioService servicioService) {
        this.servicioService = servicioService;
    }

    @GetMapping
    public ResponseEntity<List<ServicioResponseDTO>> obtenerTodos() {
        List<ServicioResponseDTO> servicios = servicioService.obtenerTodos()
                .stream()
                .map(this::convertirAResponseDTO)
                .toList();

        return ResponseEntity.ok(servicios);
    }

    @GetMapping("/{idServicio}")
    public ResponseEntity<ServicioResponseDTO> obtenerPorId(@PathVariable Long idServicio) {
        ServicioEntity servicio = servicioService.obtenerPorId(idServicio)
                .orElseThrow(() -> new IllegalArgumentException("No existe un servicio con el ID indicado."));

        return ResponseEntity.ok(convertirAResponseDTO(servicio));
    }

    @PostMapping
    public ResponseEntity<ServicioResponseDTO> crearServicio(@RequestBody ServicioRequestDTO request) {
        ServicioEntity servicio = new ServicioEntity();
        servicio.setNombre(request.getNombre());

        ServicioEntity servicioCreado = servicioService.crearServicio(servicio);

        return ResponseEntity.ok(convertirAResponseDTO(servicioCreado));
    }

    @PutMapping("/{idServicio}")
    public ResponseEntity<ServicioResponseDTO> actualizarServicio(
            @PathVariable Long idServicio,
            @RequestBody ServicioRequestDTO request
    ) {
        ServicioEntity servicioActualizado = new ServicioEntity();
        servicioActualizado.setNombre(request.getNombre());

        ServicioEntity servicio = servicioService.actualizarServicio(idServicio, servicioActualizado);

        return ResponseEntity.ok(convertirAResponseDTO(servicio));
    }

    @DeleteMapping("/{idServicio}")
    public ResponseEntity<Void> eliminarServicio(@PathVariable Long idServicio) {
        servicioService.eliminarServicio(idServicio);
        return ResponseEntity.noContent().build();
    }

    private ServicioResponseDTO convertirAResponseDTO(ServicioEntity servicio) {
        return new ServicioResponseDTO(
                servicio.getIdServicio(),
                servicio.getNombre()
        );
    }

    // DTO para recibir datos desde el frontend
    public static class ServicioRequestDTO {

        private String nombre;

        public ServicioRequestDTO() {
        }

        public ServicioRequestDTO(String nombre) {
            this.nombre = nombre;
        }

        public String getNombre() {
            return nombre;
        }

        public void setNombre(String nombre) {
            this.nombre = nombre;
        }
    }

    // DTO para responder al frontend
    public static class ServicioResponseDTO {

        private Long idServicio;
        private String nombre;

        public ServicioResponseDTO() {
        }

        public ServicioResponseDTO(Long idServicio, String nombre) {
            this.idServicio = idServicio;
            this.nombre = nombre;
        }

        public Long getIdServicio() {
            return idServicio;
        }

        public void setIdServicio(Long idServicio) {
            this.idServicio = idServicio;
        }

        public String getNombre() {
            return nombre;
        }

        public void setNombre(String nombre) {
            this.nombre = nombre;
        }
    }
}