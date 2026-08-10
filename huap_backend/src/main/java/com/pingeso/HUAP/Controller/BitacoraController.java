package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.BitacoraResponseDTO;
import com.pingeso.HUAP.Entity.BitacoraEntity;
import com.pingeso.HUAP.Service.BitacoraService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;

/**
 * Bitácora: historial de eventos del sistema (creación/aprobación de solicitudes, generación
 * de turnos, ofertas generales, etc.), usado para auditoría y trazabilidad.
 *
 * <p>Los eventos se registran automáticamente desde otros servicios (p. ej. {@code SolicitudService})
 * al resolverse una acción; {@link #create} permite además registrar un evento manualmente.
 * Los endpoints {@code /dto} devuelven la versión enriquecida ({@link BitacoraResponseDTO}, con
 * nombres de funcionarios/turnos ya resueltos) pensada para las vistas de auditoría del frontend.
 */
@RestController
@RequestMapping("/api/v2/bitacoras")
@RequiredArgsConstructor
@Tag(name = "Bitácora", description = "Historial de eventos del sistema para auditoría.")
public class BitacoraController {

    private final BitacoraService bitacoraService;

    // SEC (M-03, Medium): la bitácora expone RUT y datos de RRHH de todo el hospital (no
    // solo el propio servicio); antes cualquier autenticado (incl. MEDICO) podía leerla
    // completa. No hay aún scoping por servicio (requeriría enriquecer la consulta con el
    // servicio del turno/solicitud de cada evento) — como mitigación inmediata se restringe
    // a roles de gestión, que es además el uso previsto (paneles de Jefatura/Administración).
    @Operation(summary = "Listar todos los eventos de bitácora")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','JEFATURA','SUBROGANTE')")
    public ResponseEntity<List<BitacoraEntity>> getAll() {
        return ResponseEntity.ok(bitacoraService.findAll());
    }

    @Operation(summary = "Obtener un evento de bitácora por ID")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','JEFATURA','SUBROGANTE')")
    public ResponseEntity<BitacoraEntity> getById(@PathVariable Long id) {
        return bitacoraService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Listar eventos por tipo",
            description = "Ej: SOLICITUD_CREADA, CAMBIO_ESTADO_APROBADA, GENERACION_TURNO, RECHAZO_AUTOMATICO, etc.")
    @GetMapping("/tipo/{tipo}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','JEFATURA','SUBROGANTE')")
    public ResponseEntity<List<BitacoraEntity>> getByTipo(@PathVariable String tipo) {
        return ResponseEntity.ok(bitacoraService.findByTipoEvento(tipo));
    }

    @Operation(summary = "Listar eventos donde el funcionario es el actor")
    @GetMapping("/funcionario/{idFuncionario}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','JEFATURA','SUBROGANTE')")
    public ResponseEntity<List<BitacoraEntity>> getByFuncionario(@PathVariable Long idFuncionario) {
        return ResponseEntity.ok(bitacoraService.findByFuncionario(idFuncionario));
    }

    @Operation(summary = "Listar eventos asociados directamente a un turno")
    @GetMapping("/turno/{idTurno}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','JEFATURA','SUBROGANTE')")
    public ResponseEntity<List<BitacoraEntity>> getByTurno(@PathVariable Long idTurno) {
        return ResponseEntity.ok(bitacoraService.findByTurno(idTurno));
    }

    @Operation(summary = "Listar eventos asociados a una solicitud")
    @GetMapping("/solicitud/{idSolicitud}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','JEFATURA','SUBROGANTE')")
    public ResponseEntity<List<BitacoraEntity>> getBySolicitud(@PathVariable Long idSolicitud) {
        return ResponseEntity.ok(bitacoraService.findBySolicitud(idSolicitud));
    }

    // SEC (H-03, High): antes cualquier autenticado podía crear eventos de bitácora, e
    // incluso SOBRESCRIBIR uno existente enviando su idEvento (merge de JPA) — borrando
    // evidencia de auditoría. Ahora exige ADMINISTRADOR y el service rechaza reescrituras.
    @Operation(summary = "Registrar un evento de bitácora manualmente")
    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<BitacoraEntity> create(@RequestBody BitacoraEntity evento) {
        return ResponseEntity.ok(bitacoraService.save(evento));
    }

    // ── Endpoints DTO (no modifican los existentes) ─────────────────────────

    @Operation(summary = "Listar todos los eventos (formato enriquecido)",
            description = "Igual que /bitacoras pero con nombres de funcionarios, turnos y solicitud "
                    + "ya resueltos, listo para mostrar en una vista de auditoría.")
    @GetMapping("/dto")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','JEFATURA','SUBROGANTE')")
    public ResponseEntity<List<BitacoraResponseDTO>> getAllDTO() {
        return ResponseEntity.ok(bitacoraService.findAllDTO());
    }

    @Operation(summary = "Obtener un evento por ID (formato enriquecido)")
    @GetMapping("/dto/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','JEFATURA','SUBROGANTE')")
    public ResponseEntity<BitacoraResponseDTO> getByIdDTO(@PathVariable Long id) {
        return bitacoraService.findByIdDTO(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}