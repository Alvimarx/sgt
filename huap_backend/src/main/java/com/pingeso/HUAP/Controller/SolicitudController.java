package com.pingeso.HUAP.Controller;


import com.pingeso.HUAP.DTO.CrearSolicitudDTO;
import com.pingeso.HUAP.Entity.SolicitudEntity;
import com.pingeso.HUAP.Repository.BitacoraRepository;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.TipoSolicitudRepository;
import com.pingeso.HUAP.Service.SolicitudService;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;
import java.util.Map;

/**
 * Solicitudes: permisos, botar turno, cobertura, intercambio y oferta particular.
 *
 * <p>Una {@link SolicitudEntity} nace {@code PENDIENTE} vía {@link #crear}. Si involucra a un
 * segundo funcionario (intercambio u oferta particular), ese receptor debe aceptarla primero
 * con {@link #responderIntercambio} / {@link #responderOfertaParticular} antes de que jefatura
 * pueda aprobarla con {@link #cambiarEstado}, que es donde realmente se mueven los turnos.
 */
@RestController
@RequestMapping("/api/v2/solicitudes")
@RequiredArgsConstructor
@Validated
@Tag(name = "Solicitudes",
        description = "Permisos, botar turno, cobertura, intercambio y oferta particular de turnos.")
public class SolicitudController {

    private final FuncionarioRepository funcionarioRepository;
    private final TipoSolicitudRepository tipoSolicitudRepository;
    private final SolicitudService solicitudService;
    private final BitacoraRepository bitacoraRepository;

    @Operation(summary = "Crear una solicitud",
            description = "Crea una solicitud en estado PENDIENTE. El tipo (permiso, botar turno, "
                    + "cobertura, intercambio u oferta particular) determina qué campos del DTO son "
                    + "relevantes: p. ej. en intercambio se usan idTurno (el deseado) e idTurnoIntercambio "
                    + "(el que se entrega); en permiso, fechaInicioPermiso/fechaTerminoPermiso.")
    @PostMapping
    public ResponseEntity<SolicitudEntity> crear(@RequestBody CrearSolicitudDTO dto) {
        return ResponseEntity.ok(solicitudService.crearSolicitud(dto));
    }

    @Operation(summary = "Responder una oferta particular",
            description = "El funcionario receptor de una oferta particular (solicitud dirigida a él) "
                    + "acepta o rechaza. Aceptar no aprueba la solicitud por sí solo: aún requiere que "
                    + "jefatura la apruebe con /estado para que el turno se reasigne.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Respuesta registrada"),
    })
    @PutMapping("/{id}/oferta-particular")
    public ResponseEntity<SolicitudEntity> responderOfertaParticular(@PathVariable @Positive Long id,
            @RequestParam boolean respuesta) {
        return ResponseEntity.ok(solicitudService.responderOfertaParticular(id, respuesta));
    }

    @Operation(summary = "Responder una solicitud de intercambio",
            description = "El funcionario receptor del intercambio acepta o rechaza. Igual que la oferta "
                    + "particular, aceptar no mueve los turnos: eso ocurre al aprobar con /estado.")
    @PutMapping("/{id}/intercambio")
    public ResponseEntity<SolicitudEntity> responderIntercambio(@PathVariable @Positive Long id,
            @RequestParam boolean respuesta) {
        return ResponseEntity.ok(solicitudService.responderOfertaIntercambio(id, respuesta));
    }

    @Operation(summary = "Cambiar el estado de una solicitud",
            description = "Endpoint donde efectivamente se resuelve la solicitud. Al aprobar (APROBADA) "
                    + "se bloquean y reasignan los turnos involucrados según el tipo (libera el turno en "
                    + "permiso/botar turno, asigna el funcionario en cobertura, intercambia ambos turnos "
                    + "en intercambio, o asigna el receptor en oferta particular), y cualquier otra "
                    + "solicitud PENDIENTE que compita por el mismo turno se rechaza automáticamente. "
                    + "Requiere rol JEFATURA, SUBROGANTE o MEDICO.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Estado actualizado (y turnos reasignados si corresponde)"),
            @ApiResponse(responseCode = "403", description = "Sin rol habilitado para cambiar el estado"),
    })
    @PutMapping("/{id}/estado")
    public ResponseEntity<SolicitudEntity> cambiarEstado(@PathVariable @Positive Long id,
            @RequestParam @NotNull SolicitudEntity.EstadoSolicitud nuevoEstado) {
        return ResponseEntity.ok(solicitudService.cambiarEstado(id, nuevoEstado));
    }

    @Operation(summary = "Cancelar una solicitud propia pendiente",
            description = "Solo el emisor, y solo mientras siga PENDIENTE.")
    @PutMapping("/{id}/cancelar")
    public ResponseEntity<SolicitudEntity> cancelar(@PathVariable @Positive Long id) {
        return ResponseEntity.ok(solicitudService.cancelarSolicitud(id));
    }

    @Operation(summary = "Modificar el motivo de una solicitud",
            description = "Solo permitido mientras la solicitud está PENDIENTE.")
    @PatchMapping("/{id}/motivo")
    public ResponseEntity<SolicitudEntity> modificarMotivo(@PathVariable Long id, @RequestParam String motivo) {
        return ResponseEntity.ok(
                solicitudService.modificarMotivo(id, motivo)
        );
    }

    @Operation(summary = "Listar todas las solicitudes")
    @GetMapping
    public ResponseEntity<List<SolicitudEntity>> getAllSolicitud() {
        return ResponseEntity.ok(solicitudService.findAllSolicitudes());
    }

    @Operation(summary = "Listar solicitudes emitidas por un funcionario")
    @GetMapping("/funcionario/{id}")
    public ResponseEntity<List<SolicitudEntity>> getAllSolicitudFuncionario(@PathVariable Long id) {
        return ResponseEntity.ok(solicitudService.findByFuncionario(id));
    }

    @Operation(summary = "Listar solicitudes recibidas por un funcionario",
            description = "Solicitudes donde el funcionario es el receptor (intercambio u oferta particular).")
    @GetMapping("/receptor/{id}")
    public ResponseEntity<List<SolicitudEntity>> getAllSolicitudReceptor(@PathVariable Long id) {
        return ResponseEntity.ok(solicitudService.findByFuncionarioReceptor(id));
    }

    @Operation(summary = "Listar solicitudes por tipo",
            description = "El id corresponde a Tipo_Solicitud (1=Permiso, 2=Botar turno, 3=Cobertura, "
                    + "4=Intercambio, 5=Oferta particular).")
    @GetMapping("/tipo/{id}")
    public ResponseEntity<List<SolicitudEntity>> getAllSolicitudByTipo(@PathVariable Long id) {
        return ResponseEntity.ok(solicitudService.findByTipoSolicitud(id));
    }

    @Operation(summary = "Listar solicitudes asociadas a un turno")
    @GetMapping("/turno/{id}")
    public ResponseEntity<List<SolicitudEntity>> getAllSolicitudTurno(@PathVariable Long id) {
        return ResponseEntity.ok(solicitudService.findByTurno(id));
    }
}
