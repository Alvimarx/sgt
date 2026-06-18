package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.Service.ExportacionService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v2/exportaciones")
public class ExportacionController {

    private final ExportacionService exportacionService;

    public ExportacionController(ExportacionService exportacionService) {
        this.exportacionService = exportacionService;
    }

    @GetMapping("/servicios/{idServicio}/funcionarios/csv")
    public ResponseEntity<byte[]> exportarFuncionariosPorServicioCsv(
            @PathVariable Long idServicio
    ) {
        byte[] archivo = exportacionService.exportarFuncionariosPorServicioCsv(idServicio);

        String nombreArchivo = "funcionarios_servicio_" + idServicio + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nombreArchivo + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(archivo);
    }

    @GetMapping("/turnos/csv")
    public ResponseEntity<byte[]> exportarTurnosCsv(
            @RequestParam Integer anio,
            @RequestParam Integer mes,
            @RequestParam(required = false) Long idFuncionario,
            @RequestParam(required = false) Long idServicio
    ) {
        byte[] archivo = exportacionService.exportarTurnosCsv(
                anio,
                mes,
                idFuncionario,
                idServicio
        );

        String nombreArchivo = "turnos_" + anio + "_" + mes;

        if (idServicio != null) {
            nombreArchivo += "_servicio_" + idServicio;
        }

        if (idFuncionario != null) {
            nombreArchivo += "_funcionario_" + idFuncionario;
        }

        nombreArchivo += ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nombreArchivo + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(archivo);
    }
}