package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.Entity.FeriadoEntity;
import com.pingeso.HUAP.Repository.FeriadoRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Lectura de los días feriados (tabla poblada por SQL). El front la usa para
 * marcar/colorear los días feriados en la previsualización de la planificación.
 */
@RestController
@RequestMapping("/api/v2/feriados")
public class FeriadoController {

    private final FeriadoRepository feriadoRepository;

    public FeriadoController(FeriadoRepository feriadoRepository) {
        this.feriadoRepository = feriadoRepository;
    }

    @GetMapping
    public ResponseEntity<List<FeriadoEntity>> obtener(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        if (desde != null && hasta != null) {
            return ResponseEntity.ok(feriadoRepository.findByFechaBetweenOrderByFechaAsc(desde, hasta));
        }
        return ResponseEntity.ok(feriadoRepository.findAllByOrderByFechaAsc());
    }
}
