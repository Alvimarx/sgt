package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.ViewPersonalSummaryDTO;
import com.pingeso.HUAP.Service.ViewPersonalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controlador REST para consultar el personal disponible en la vista hospitalaria.
 *
 * <p>Expone los datos de personal que pueden ser registrados o usados como referencia
 * en el sistema de turnos. Su finalidad principal es ofrecer un resumen del personal
 * existente para operaciones de administración y selección de funcionarios.</p>
 */
@RestController
@RequestMapping("/api/v2/Personal")
@Tag(name = "Personal", description = "Consulta de personal proveniente de la vista hospitalaria")
public class ViewPersonalController {

    private final ViewPersonalService viewPersonalService;

    @Autowired
    public ViewPersonalController(ViewPersonalService viewPersonalService) {
        this.viewPersonalService = viewPersonalService;
    }

    // ====================================================================
    // CONSULTAS DE PERSONAL
    // ====================================================================

    /**
     * Obtiene el resumen de todo el personal registrado en la vista hospitalaria.
     *
     * @return lista de resúmenes de personal disponibles para el sistema de turnos.
     */
    @Operation(summary = "Listar personal", description = "Devuelve un resumen de todo el personal disponible en la vista hospitalaria")
    @GetMapping("/summary")
    public ResponseEntity<List<ViewPersonalSummaryDTO>> getAllPersonal() {
        return ResponseEntity.ok(viewPersonalService.getAllPersonal());
    }
}

