package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.DTO.BoostrHolidayDTO;
import com.pingeso.HUAP.Service.HolidayService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Controlador para gestionar feriados usando la API de Boostr
 */
@RestController
@RequestMapping("/api/v1/holidays")
public class HolidayController {

    @Autowired
    private HolidayService holidayService;

    /**
     * Verifica si una fecha específica es feriado
     */
    @GetMapping("/check/{year}/{month}/{day}")
    public ResponseEntity<Map<String, Object>> checkHoliday(
            @PathVariable int year,
            @PathVariable int month,
            @PathVariable int day) {

        LocalDate date = LocalDate.of(year, month, day);
        boolean isHoliday = holidayService.isHoliday(date);

        Map<String, Object> response = Map.of(
            "date", date.toString(),
            "isHoliday", isHoliday,
            "holidayInfo", holidayService.getHolidayInfo(date).orElse(null)
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Obtiene todos los feriados cacheados
     */
    @GetMapping("/all")
    public ResponseEntity<List<BoostrHolidayDTO>> getAllHolidays() {
        List<BoostrHolidayDTO> holidays = holidayService.getAllHolidays();
        return ResponseEntity.ok(holidays);
    }

    /**
     * Obtiene feriados para un año específico
     */
    @GetMapping("/year/{year}")
    public ResponseEntity<List<BoostrHolidayDTO>> getHolidaysByYear(@PathVariable int year) {
        List<BoostrHolidayDTO> holidays = holidayService.getHolidaysByYear(year);
        return ResponseEntity.ok(holidays);
    }

    /**
     * Fuerza recarga de feriados desde la API
     */
    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> refreshHolidays() {
        holidayService.refreshHolidays();
        Map<String, String> response = Map.of(
            "message", "Feriados recargados exitosamente desde la API de Boostr",
            "timestamp", java.time.LocalDateTime.now().toString()
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Obtiene estadísticas de feriados
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getHolidayStats() {
        List<BoostrHolidayDTO> allHolidays = holidayService.getAllHolidays();

        Map<String, Object> stats = Map.of(
            "totalHolidays", allHolidays.size(),
            "holidaysByYear", allHolidays.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                    h -> h.getDate().getYear(),
                    java.util.stream.Collectors.counting()
                )),
            "lastUpdated", java.time.LocalDateTime.now().toString(),
            "apiSource", "Boostr API (https://api.boostr.cl/holidays.json)"
        );

        return ResponseEntity.ok(stats);
    }
}