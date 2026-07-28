package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.CrearOfertaGeneralDTO;
import com.pingeso.HUAP.Entity.OfertaGeneralEntity;
import com.pingeso.HUAP.Entity.PostulacionEntity;
import com.pingeso.HUAP.Service.OfertaGeneralService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;

/**
 * Ofertas generales: un funcionario ofrece un turno propio para que cualquiera del servicio
 * se postule (a diferencia de la solicitud de intercambio/cobertura, que va dirigida a un
 * receptor específico).
 *
 * <p>Ciclo de vida: {@link #crear} (PENDIENTE_APROBACION) → jefatura {@link #aprobar}/
 * {@link #rechazar} → si ABIERTA, otros funcionarios {@link #postular} (o
 * {@link #retirarPostulacion} mientras siga abierta) → jefatura {@link #seleccionar} un
 * postulante, lo que asigna el turno y cierra la oferta (CERRADA).
 */
@RestController
@RequestMapping("/api/v2/ofertas-generales")
@RequiredArgsConstructor
@Tag(name = "Ofertas generales", description = "Ofertas de turno abiertas a postulación dentro de un servicio.")
public class OfertaGeneralController {

    private final OfertaGeneralService ofertaGeneralService;

    @Operation(summary = "Crear una oferta general",
            description = "El funcionario ofrece un turno propio. Queda en PENDIENTE_APROBACION hasta "
                    + "que jefatura la apruebe o rechace.")
    @PostMapping
    public ResponseEntity<OfertaGeneralEntity> crear(@RequestBody CrearOfertaGeneralDTO dto) {
        return ResponseEntity.ok(ofertaGeneralService.crearOferta(dto));
    }

    @Operation(summary = "Aprobar una oferta",
            description = "Pasa de PENDIENTE_APROBACION a ABIERTA, habilitando postulaciones.")
    @PutMapping("/{id}/aprobar")
    public ResponseEntity<OfertaGeneralEntity> aprobar(@PathVariable Long id, @RequestParam Long idJefatura) {
        return ResponseEntity.ok(ofertaGeneralService.aprobarOferta(id, idJefatura));
    }

    @Operation(summary = "Rechazar una oferta",
            description = "Pasa de PENDIENTE_APROBACION a RECHAZADA.")
    @PutMapping("/{id}/rechazar")
    public ResponseEntity<OfertaGeneralEntity> rechazar(@PathVariable Long id, @RequestParam Long idJefatura) {
        return ResponseEntity.ok(ofertaGeneralService.rechazarOferta(id, idJefatura));
    }

    @Operation(summary = "Postular a una oferta abierta",
            description = "Solo si la oferta está ABIERTA. El ofertor no puede postular a su propia "
                    + "oferta, ni un funcionario postular dos veces a la misma.")
    @PostMapping("/{id}/postular")
    public ResponseEntity<PostulacionEntity> postular(@PathVariable Long id, @RequestParam Long idFuncionario) {
        return ResponseEntity.ok(ofertaGeneralService.postular(id, idFuncionario));
    }

    @Operation(summary = "Retirar una postulación",
            description = "Solo el propio postulante, y solo mientras la oferta siga ABIERTA.")
    @DeleteMapping("/{id}/postular/{idPostulacion}")
    public ResponseEntity<Void> retirarPostulacion(@PathVariable Long id, @PathVariable Long idPostulacion,
            @RequestParam Long idFuncionario) {
        ofertaGeneralService.retirarPostulacion(idPostulacion, idFuncionario);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Seleccionar un postulante",
            description = "Asigna el turno al postulante elegido y cierra la oferta (CERRADA). Requiere "
                    + "que la oferta esté ABIERTA.")
    @PutMapping("/{id}/seleccionar/{idPostulacion}")
    public ResponseEntity<OfertaGeneralEntity> seleccionar(@PathVariable Long id, @PathVariable Long idPostulacion,
            @RequestParam Long idJefatura) {
        return ResponseEntity.ok(ofertaGeneralService.seleccionarPostulante(id, idPostulacion, idJefatura));
    }

    @Operation(summary = "Listar ofertas de un servicio")
    @GetMapping("/servicio/{idServicio}")
    public ResponseEntity<List<OfertaGeneralEntity>> getByServicio(@PathVariable Long idServicio) {
        return ResponseEntity.ok(ofertaGeneralService.findByServicio(idServicio));
    }

    @Operation(summary = "Listar ofertas creadas por un funcionario")
    @GetMapping("/ofertor/{idFuncionario}")
    public ResponseEntity<List<OfertaGeneralEntity>> getByOfertor(@PathVariable Long idFuncionario) {
        return ResponseEntity.ok(ofertaGeneralService.findByOfertor(idFuncionario));
    }
}
