package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.Security.SeguridadServicio;
import com.pingeso.HUAP.Service.ExportacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v2/exportaciones")
public class ExportacionController {

    private final ExportacionService exportacionService;

    @Autowired
    private SeguridadServicio seguridadServicio;

    public ExportacionController(ExportacionService exportacionService) {
        this.exportacionService = exportacionService;
    }

    // SEC (H-01, High): antes cualquier autenticado (incl. MEDICO) podía exportar la
    // nómina completa de cualquier servicio, o (en /turnos/csv) de todo el hospital sin
    // filtrar. Ahora exige rol de gestión y que el servicio coincida con la sesión activa.
    @GetMapping("/servicios/{idServicio}/funcionarios/csv")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','JEFATURA','SUBROGANTE')")
    public ResponseEntity<byte[]> exportarFuncionariosPorServicioCsv(
            @PathVariable Long idServicio
    ) {
        seguridadServicio.exigirMismoServicio(idServicio);
        byte[] archivo = exportacionService.exportarFuncionariosPorServicioCsv(idServicio);

        String nombreArchivo = "funcionarios_servicio_" + idServicio + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nombreArchivo + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(archivo);
    }

    // SEC (C-08, HU-CAL-07): el médico también exporta, pero el backend fuerza que salgan solo
    // sus turnos del servicio de la sesión, sea cual sea el idFuncionario que pida. La gestión
    // exporta su servicio completo o los turnos de una persona; el ADMINISTRADOR, lo que pida.
    @GetMapping("/turnos/csv")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','JEFATURA','SUBROGANTE','MEDICO')")
    public ResponseEntity<byte[]> exportarTurnosCsv(
            @RequestParam Integer anio,
            @RequestParam Integer mes,
            @RequestParam(required = false) Long idFuncionario,
            @RequestParam(required = false) Long idServicio
    ) {
        // Sin idServicio, antes se exportaban los turnos de TODO el hospital. Ahora, quien
        // no es ADMINISTRADOR debe acotar a su propio servicio (por defecto, el de su sesión).
        Long idServicioAlcance = idServicio;
        Long idFuncionarioAlcance = idFuncionario;
        if (!seguridadServicio.esAdministrador()) {
            idServicioAlcance = (idServicio != null) ? idServicio : seguridadServicio.idServicioActual();
            seguridadServicio.exigirMismoServicio(idServicioAlcance);
            if (!seguridadServicio.esGestionDelServicio()) {
                idFuncionarioAlcance = seguridadServicio.idUsuarioActual();
            }
        }
        byte[] archivo = exportacionService.exportarTurnosCsv(
                anio,
                mes,
                idFuncionarioAlcance,
                idServicioAlcance
        );

        String nombreArchivo = "turnos_" + anio + "_" + mes;

        if (idServicioAlcance != null) {
            nombreArchivo += "_servicio_" + idServicioAlcance;
        }

        if (idFuncionarioAlcance != null) {
            nombreArchivo += "_funcionario_" + idFuncionarioAlcance;
        }

        nombreArchivo += ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nombreArchivo + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(archivo);
    }
}