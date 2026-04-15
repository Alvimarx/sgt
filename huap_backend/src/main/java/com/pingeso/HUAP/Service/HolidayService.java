package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.BoostrHolidayDTO;
import com.pingeso.HUAP.DTO.BoostrHolidayResponseDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;

import jakarta.annotation.PostConstruct;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Servicio para gestionar feriados de Chile usando la API de Boostr
 * Endpoint: https://api.boostr.cl/holidays.json
 */
@Slf4j
@Service
@Configuration
public class HolidayService {

    private static final String BOOSTR_API_URL = "https://api.boostr.cl/holidays.json";

    @Autowired
    private RestTemplate restTemplate;

    // Cache en memoria para los feriados
    private final Map<LocalDate, BoostrHolidayDTO> holidaysCache = new ConcurrentHashMap<>();

    // Cache para fechas de feriados (solo las fechas para búsqueda rápida)
    private final Set<LocalDate> holidayDatesCache = ConcurrentHashMap.newKeySet();

    /**
     * Carga los feriados desde la API de Boostr (lazy loading)
     */
    public void loadHolidaysFromAPI() {
        try {
            log.info("Cargando feriados desde API: {}", BOOSTR_API_URL);

            // La API devuelve un objeto con status y data (array)
            BoostrHolidayResponseDTO response = restTemplate.getForObject(BOOSTR_API_URL, BoostrHolidayResponseDTO.class);

            if (response != null && response.getData() != null && !response.getData().isEmpty()) {
                List<BoostrHolidayDTO> holidays = response.getData();
                holidaysCache.clear();
                holidayDatesCache.clear();

                for (BoostrHolidayDTO holiday : holidays) {
                    if (holiday.getDate() != null) {
                        holidaysCache.put(holiday.getDate(), holiday);
                        holidayDatesCache.add(holiday.getDate());
                        log.debug("Feriado cargado: {} - {}", holiday.getDate(), holiday.getTitle());
                    }
                }

                log.info("Cargados {} feriados desde la API de Boostr", holidays.size());
            } else {
                log.warn("No se pudieron cargar feriados desde la API - respuesta vacía");
                // Fallback: usar feriados hardcodeados para años actuales
                loadFallbackHolidays();
            }

        } catch (RestClientException e) {
            log.error("Error al consumir API de Boostr: {}", e.getMessage());
            // Fallback: usar feriados hardcodeados
            loadFallbackHolidays();
        } catch (Exception e) {
            log.error("Error inesperado al cargar feriados: {}", e.getMessage());
            loadFallbackHolidays();
        }
    }

    /**
     * Verifica si una fecha es feriado
     */
    public boolean isHoliday(LocalDate date) {
        if (date == null) return false;

        // Si el cache está vacío, intentar recargar
        if (holidayDatesCache.isEmpty()) {
            loadHolidaysFromAPI();
        }

        return holidayDatesCache.contains(date);
    }

    /**
     * Obtiene información detallada de un feriado
     */
    public Optional<BoostrHolidayDTO> getHolidayInfo(LocalDate date) {
        if (date == null) return Optional.empty();
        return Optional.ofNullable(holidaysCache.get(date));
    }

    /**
     * Obtiene todos los feriados cacheados
     */
    public List<BoostrHolidayDTO> getAllHolidays() {
        // Lazy loading: cargar si el cache está vacío
        if (holidaysCache.isEmpty()) {
            loadHolidaysFromAPI();
        }
        return new ArrayList<>(holidaysCache.values());
    }

    /**
     * Obtiene feriados para un año específico
     */
    public List<BoostrHolidayDTO> getHolidaysByYear(int year) {
        // Lazy loading: cargar si el cache está vacío
        if (holidaysCache.isEmpty()) {
            loadHolidaysFromAPI();
        }
        return holidaysCache.values().stream()
                .filter(h -> h.getDate() != null && h.getDate().getYear() == year)
                .sorted(Comparator.comparing(BoostrHolidayDTO::getDate))
                .toList();
    }

    /**
     * Fuerza recarga de feriados desde la API
     */
    public void refreshHolidays() {
        log.info("Forzando recarga de feriados desde API");
        loadHolidaysFromAPI();
    }

    /**
     * Recarga automática diaria a las 2 AM
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void scheduledRefresh() {
        log.info("Recarga programada de feriados");
        loadHolidaysFromAPI();
    }

    /**
     * Fallback: carga feriados hardcodeados para años actuales
     * Se usa cuando falla la API
     */
    private void loadFallbackHolidays() {
        log.warn("Usando feriados hardcodeados como fallback");

        List<LocalDate> fallbackHolidays = Arrays.asList(
            // 2025
            LocalDate.of(2025, 1, 1),   // Año Nuevo
            LocalDate.of(2025, 4, 18),  // Viernes Santo
            LocalDate.of(2025, 4, 19),  // Sábado Santo
            LocalDate.of(2025, 5, 1),   // Día del Trabajo
            LocalDate.of(2025, 5, 21),  // Día de las Glorias Navales
            LocalDate.of(2025, 6, 20),  // Día Nacional de los Pueblos Indígenas
            LocalDate.of(2025, 6, 29),  // San Pedro y San Pablo
            LocalDate.of(2025, 7, 16),  // Virgen del Carmen
            LocalDate.of(2025, 8, 15),  // Asunción de la Virgen
            LocalDate.of(2025, 9, 18),  // Fiestas Patrias
            LocalDate.of(2025, 9, 19),  // Día de las Glorias del Ejército
            LocalDate.of(2025, 10, 12), // Encuentro de Dos Mundos
            LocalDate.of(2025, 10, 31), // Día de las Iglesias Evangélicas
            LocalDate.of(2025, 11, 1),  // Todos los Santos
            LocalDate.of(2025, 12, 8),  // Inmaculada Concepción
            LocalDate.of(2025, 12, 25), // Navidad
            // 2026
            LocalDate.of(2026, 1, 1),   // Año Nuevo
            LocalDate.of(2026, 4, 3),   // Viernes Santo
            LocalDate.of(2026, 4, 4),   // Sábado Santo
            LocalDate.of(2026, 5, 1),   // Día del Trabajo
            LocalDate.of(2026, 5, 21),  // Día de las Glorias Navales
            LocalDate.of(2026, 6, 21),  // Día Nacional de los Pueblos Indígenas
            LocalDate.of(2026, 6, 29),  // San Pedro y San Pablo
            LocalDate.of(2026, 7, 16),  // Virgen del Carmen
            LocalDate.of(2026, 8, 15),  // Asunción de la Virgen
            LocalDate.of(2026, 9, 18),  // Fiestas Patrias
            LocalDate.of(2026, 9, 19),  // Día de las Glorias del Ejército
            LocalDate.of(2026, 10, 12), // Encuentro de Dos Mundos
            LocalDate.of(2026, 10, 31), // Día de las Iglesias Evangélicas
            LocalDate.of(2026, 11, 1),  // Todos los Santos
            LocalDate.of(2026, 12, 8),  // Inmaculada Concepción
            LocalDate.of(2026, 12, 25)  // Navidad
        );

        holidayDatesCache.clear();
        holidayDatesCache.addAll(fallbackHolidays);

        log.info("Cargados {} feriados desde fallback hardcodeado", fallbackHolidays.size());
    }
}