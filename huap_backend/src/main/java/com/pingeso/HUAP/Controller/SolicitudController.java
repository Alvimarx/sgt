package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.*;
import com.pingeso.HUAP.Entity.SolicitudEntity;
import com.pingeso.HUAP.Service.SolicitudService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/solicitudes")
@CrossOrigin(origins = "*")
public class SolicitudController {

    @Autowired
    private SolicitudService solicitudService;

    @PostMapping("/cobertura/{medicoSolicitanteId}")
    public ResponseEntity<SolicitudEntity> crearCobertura(
            @PathVariable Long medicoSolicitanteId,
            @Valid @RequestBody SolicitudTurnoDTO dto) {
        try {
            SolicitudEntity nuevaSolicitud = solicitudService.crearSolicitudCobertura(dto, medicoSolicitanteId);
            return new ResponseEntity<>(nuevaSolicitud, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }

    @PostMapping("/permiso/{medicoSolicitanteId}")
    public ResponseEntity<SolicitudEntity> crearPermiso(
            @PathVariable Long medicoSolicitanteId,
            @Valid @RequestBody SolicitudPermisoDTO dto) {
        try {
            SolicitudEntity nuevaSolicitud = solicitudService.crearSolicitudPermiso(dto, medicoSolicitanteId);
            return new ResponseEntity<>(nuevaSolicitud, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }

    @PostMapping("/intercambio/{medicoSolicitanteId}")
    public ResponseEntity<SolicitudEntity> crearIntercambio(
            @PathVariable Long medicoSolicitanteId,
            @Valid @RequestBody SolicitudIntercambioDTO dto) {
        try {
            SolicitudEntity nuevaSolicitud = solicitudService.crearSolicitudIntercambio(dto, medicoSolicitanteId);
            return new ResponseEntity<>(nuevaSolicitud, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }

    @PostMapping("/oferta/{medicoSolicitanteId}")
    public ResponseEntity<SolicitudEntity> crearOferta(
            @PathVariable Long medicoSolicitanteId,
            @Valid @RequestBody SolicitudOfertaDTO dto) {
        try {
            SolicitudEntity nuevaSolicitud = solicitudService.crearSolicitudOferta(dto, medicoSolicitanteId);
            return new ResponseEntity<>(nuevaSolicitud, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }

    //endpoint para obtener todas las solicitudes (Global)
    @GetMapping("/todas")
    public ResponseEntity<List<SolicitudResponseDTO>> obtenerTodasLasSolicitudesGlobal() {

        List<SolicitudResponseDTO> solicitudes = solicitudService.obtenerTodasLasSolicitudesGlobal();

        //manejo de respuesta vacia
        if (solicitudes.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(solicitudes);
    }

    //endpoint para obtener todas las solicitudes de un medico
    @GetMapping("/usuario/{medicoId}")
    public ResponseEntity<List<SolicitudResponseDTO>> obtenerTodasSolicitudesPorMedico(
                                                                                        @PathVariable Long medicoId) {

        List<SolicitudResponseDTO> solicitudes = solicitudService.obtenerSolicitudesPorMedicoYFiltro(medicoId, "todas");
        return ResponseEntity.ok(solicitudes);
    }

    //endpoint para obtener las solicitudes de un medico segun un filtro
    @GetMapping("/usuario/{filtro}/{medicoId}")
    public ResponseEntity<List<SolicitudResponseDTO>> obtenerSolicitudesFiltradas(
                                                                                   @PathVariable String filtro,
                                                                                   @PathVariable Long medicoId) {

        List<SolicitudResponseDTO> solicitudes = solicitudService.obtenerSolicitudesPorMedicoYFiltro(medicoId, filtro);
        return ResponseEntity.ok(solicitudes);
    }

    //endpoint para obtener todas las solicitudes segun un filtro (Global con filtro)
    @GetMapping("/todas/{filtro}")
    public ResponseEntity<List<SolicitudResponseDTO>> obtenerSolicitudesPorEstadoGlobal( // CAMBIO
                                                                                         @PathVariable String filtro) {

        List<SolicitudResponseDTO> solicitudes = solicitudService.obtenerSolicitudesPorEstadoGlobal(filtro);

        if (solicitudes.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(solicitudes);
    }

    //endpoint para obtener todas las solicitudes segun un filtro
    @GetMapping("/{filtro}")
    public ResponseEntity<List<SolicitudResponseDTO>> obtenerSolicitudesPorEstadoGlobalSinTodas(
                                                                                                 @PathVariable String filtro) {

        List<SolicitudResponseDTO> solicitudes = solicitudService.obtenerSolicitudesPorEstadoGlobal(filtro);

        if (solicitudes.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(solicitudes);
    }

    @DeleteMapping("/{solicitudId}")
    public ResponseEntity<String> eliminarSolicitud(@PathVariable Long solicitudId) {
        try {
            solicitudService.eliminarSolicitudPorId(solicitudId);
            //eliminacion exitosa
            return ResponseEntity.status(HttpStatus.NO_CONTENT).body("Solicitud eliminada exitosamente.");
        } catch (RuntimeException e) {
            //retorna un error
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @PutMapping("/{solicitudId}/estado")
    public ResponseEntity<?> actualizarEstadoSolicitud(
            @PathVariable Long solicitudId,
            @RequestBody Map<String, String> body) {
        try {
            String nuevoEstado = body.get("estado");
            if (nuevoEstado == null || nuevoEstado.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("El campo 'estado' es requerido");
            }
            SolicitudEntity solicitud = solicitudService.actualizarEstadoSolicitud(solicitudId, nuevoEstado);
            return ResponseEntity.ok(solicitud);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @PutMapping("/intercambio/respuesta/{solicitudId}")
    public ResponseEntity<?> actualizarRespuestaIntercambioMedico(
            @PathVariable Long solicitudId,
            @RequestBody Map<String, Boolean> body) {
        try {
            Boolean aceptado = body.get("aceptado");
            if (aceptado == null) {
                return ResponseEntity.badRequest().body("El campo 'aceptado' es requerido (true/false)");
            }
            // Llama al metodo en el servicio
            SolicitudEntity solicitud = solicitudService.actualizarRespuestaIntercambioMedico(solicitudId, aceptado);
            return ResponseEntity.ok(solicitud);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @PutMapping("/oferta/respuesta/{solicitudId}")
    public ResponseEntity<?> actualizarRespuestaOfertaMedico(
            @PathVariable Long solicitudId,
            @RequestBody Map<String, Boolean> body) {
        try {
            Boolean aceptado = body.get("aceptado");
            if (aceptado == null) {
                return ResponseEntity.badRequest().body("El campo 'aceptado' es requerido (true/false)");
            }

            // Llama al servicio específico para ofertas
            SolicitudEntity solicitud = solicitudService.actualizarRespuestaOfertaMedico(solicitudId, aceptado);

            return ResponseEntity.ok(solicitud);
        } catch (RuntimeException e) {
            // Manejo de excepciones de negocio (ej. solicitud no encontrada, médico no autorizado)
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error interno al procesar la oferta.");
        }
    }

    @PostMapping("/botar-turno/{medicoSolicitanteId}")
    public ResponseEntity<SolicitudEntity> crearBotarTurno(
            @PathVariable Long medicoSolicitanteId,
            @Valid @RequestBody SolicitudBotarTurnoDTO dto) {
        try {
            SolicitudEntity nuevaSolicitud = solicitudService.crearSolicitudBotarTurno(dto, medicoSolicitanteId);
            return new ResponseEntity<>(nuevaSolicitud, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            // Manejo básico de errores
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }
}