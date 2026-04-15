package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.BoostrHolidayDTO;
import com.pingeso.HUAP.DTO.BoostrHolidayResponseDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HolidayServiceTest {

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private HolidayService holidayService;

    // Utilidad para crear la respuesta envuelta que espera el servicio
    private BoostrHolidayResponseDTO createMockResponse(List<BoostrHolidayDTO> holidays) {
        BoostrHolidayResponseDTO response = new BoostrHolidayResponseDTO();
        response.setStatus("success");
        response.setData(holidays);
        return response;
    }

    private BoostrHolidayDTO createMockHoliday(LocalDate date, String title) {
        BoostrHolidayDTO holiday = new BoostrHolidayDTO();
        holiday.setDate(date);
        holiday.setTitle(title);
        return holiday;
    }

    @Test
    void testIsHoliday_WithMockData() {
        // Given - Ahora usamos BoostrHolidayResponseDTO.class
        List<BoostrHolidayDTO> mockList = Arrays.asList(
                createMockHoliday(LocalDate.of(2025, 12, 25), "Navidad"),
                createMockHoliday(LocalDate.of(2025, 1, 1), "Año Nuevo")
        );

        when(restTemplate.getForObject(anyString(), eq(BoostrHolidayResponseDTO.class)))
                .thenReturn(createMockResponse(mockList));

        // When
        holidayService.loadHolidaysFromAPI();

        // Then
        assertTrue(holidayService.isHoliday(LocalDate.of(2025, 12, 25)));
        assertFalse(holidayService.isHoliday(LocalDate.of(2025, 12, 24)));
    }

    @Test
    void testGetHolidayInfo() {
        // Given
        List<BoostrHolidayDTO> mockList = List.of(
                createMockHoliday(LocalDate.of(2025, 12, 25), "Navidad")
        );

        when(restTemplate.getForObject(anyString(), eq(BoostrHolidayResponseDTO.class)))
                .thenReturn(createMockResponse(mockList));

        // When
        holidayService.loadHolidaysFromAPI();
        var holidayInfo = holidayService.getHolidayInfo(LocalDate.of(2025, 12, 25));

        // Then
        assertTrue(holidayInfo.isPresent(), "Debería encontrar información del feriado");
        assertEquals("Navidad", holidayInfo.get().getTitle());
    }

    @Test
    void testGetHolidaysByYear() {
        // Given
        List<BoostrHolidayDTO> mockList = Arrays.asList(
                createMockHoliday(LocalDate.of(2025, 12, 25), "Navidad"),
                createMockHoliday(LocalDate.of(2026, 1, 1), "Año Nuevo 2026")
        );

        when(restTemplate.getForObject(anyString(), eq(BoostrHolidayResponseDTO.class)))
                .thenReturn(createMockResponse(mockList));

        // When
        holidayService.loadHolidaysFromAPI();
        List<BoostrHolidayDTO> holidays2025 = holidayService.getHolidaysByYear(2025);

        // Then
        assertEquals(1, holidays2025.size());
        assertEquals(2025, holidays2025.get(0).getDate().getYear());
    }

    @Test
    void testFallbackHolidays_WhenAPIFails() {
        // Given - Simulamos error en la API
        when(restTemplate.getForObject(anyString(), eq(BoostrHolidayResponseDTO.class)))
                .thenThrow(new org.springframework.web.client.RestClientException("API Error"));

        // When
        holidayService.loadHolidaysFromAPI();

        // Then - 25 de diciembre está en tu lista de fallback
        assertTrue(holidayService.isHoliday(LocalDate.of(2025, 12, 25)),
                "Debería usar feriados hardcodeados como fallback");
    }

    @Test
    void testRefreshHolidays() {
        // Given
        BoostrHolidayResponseDTO resp1 = createMockResponse(List.of(createMockHoliday(LocalDate.of(2025, 12, 25), "Navidad")));
        BoostrHolidayResponseDTO resp2 = createMockResponse(Arrays.asList(
                createMockHoliday(LocalDate.of(2025, 12, 25), "Navidad"),
                createMockHoliday(LocalDate.of(2025, 12, 31), "Año Nuevo")
        ));

        when(restTemplate.getForObject(anyString(), eq(BoostrHolidayResponseDTO.class)))
                .thenReturn(resp1)
                .thenReturn(resp2);

        // When
        holidayService.loadHolidaysFromAPI();
        int initialCount = holidayService.getAllHolidays().size();

        holidayService.refreshHolidays();
        int updatedCount = holidayService.getAllHolidays().size();

        // Then
        assertEquals(1, initialCount);
        assertEquals(2, updatedCount);
    }

    @Test
    @DisplayName("loadHolidays: Debería activar fallback cuando la respuesta de la API es vacía o nula")
    void testLoadHolidays_EmptyResponse() {
        // Caso 1: Respuesta es null
        when(restTemplate.getForObject(anyString(), eq(BoostrHolidayResponseDTO.class)))
                .thenReturn(null);

        holidayService.loadHolidaysFromAPI();
        // Verifica que se cargó el fallback (el 25 de diciembre está en la lista hardcodeada)
        assertTrue(holidayService.isHoliday(LocalDate.of(2025, 12, 25)));

        // Caso 2: Respuesta con lista de datos vacía
        BoostrHolidayResponseDTO emptyResponse = new BoostrHolidayResponseDTO();
        emptyResponse.setData(new ArrayList<>());

        when(restTemplate.getForObject(anyString(), eq(BoostrHolidayResponseDTO.class)))
                .thenReturn(emptyResponse);

        holidayService.loadHolidaysFromAPI();
        assertTrue(holidayService.isHoliday(LocalDate.of(2025, 12, 25)));
    }

    @Test
    @DisplayName("loadHolidays: Debería manejar excepciones inesperadas y usar fallback")
    void testLoadHolidays_UnexpectedException() {
        // Forzamos una excepción genérica (NullPointerException por ejemplo)
        when(restTemplate.getForObject(anyString(), eq(BoostrHolidayResponseDTO.class)))
                .thenThrow(new RuntimeException("Error interno inesperado"));

        holidayService.loadHolidaysFromAPI();

        // Verifica que se ejecutó el bloque catch y se cargó el fallback
        assertTrue(holidayService.isHoliday(LocalDate.of(2025, 12, 25)));
    }

    @Test
    @DisplayName("isHoliday: Debería intentar cargar desde API si el caché está vacío")
    void testIsHoliday_TriggerLoadWhenEmpty() {
        // Aseguramos que el caché esté vacío y la API devuelva algo válido
        BoostrHolidayResponseDTO response = new BoostrHolidayResponseDTO();
        BoostrHolidayDTO holiday = new BoostrHolidayDTO();
        holiday.setDate(LocalDate.of(2025, 1, 1));
        response.setData(List.of(holiday));

        when(restTemplate.getForObject(anyString(), eq(BoostrHolidayResponseDTO.class)))
                .thenReturn(response);

        // Al llamar a isHoliday con caché vacío, se ejecutará loadHolidaysFromAPI() internamente
        boolean result = holidayService.isHoliday(LocalDate.of(2025, 1, 1));

        assertTrue(result);
        verify(restTemplate, atLeastOnce()).getForObject(anyString(), eq(BoostrHolidayResponseDTO.class));
    }

    @Test
    @DisplayName("isHoliday: Debería retornar false si la fecha es null")
    void testIsHoliday_NullDate() {
        assertFalse(holidayService.isHoliday(null));
    }

    @Test
    @DisplayName("scheduledRefresh: Debe invocar la recarga de feriados")
    void testScheduledRefresh() {
        // Preparar el mock para una respuesta exitosa
        BoostrHolidayResponseDTO response = new BoostrHolidayResponseDTO();
        response.setData(new ArrayList<>());
        when(restTemplate.getForObject(anyString(), eq(BoostrHolidayResponseDTO.class)))
                .thenReturn(response);

        // Ejecutar el método programado manualmente
        holidayService.scheduledRefresh();

        // Verificar que se intentó cargar desde la API
        verify(restTemplate, times(1)).getForObject(anyString(), eq(BoostrHolidayResponseDTO.class));
    }

    @Test
    @DisplayName("getAllHolidays: Debe cargar desde API si el caché está vacío")
    void testGetAllHolidays_LazyLoading() {
        // Configurar respuesta de API
        BoostrHolidayDTO holiday = new BoostrHolidayDTO();
        holiday.setDate(LocalDate.of(2025, 5, 1));
        BoostrHolidayResponseDTO response = new BoostrHolidayResponseDTO();
        response.setData(List.of(holiday));

        when(restTemplate.getForObject(anyString(), eq(BoostrHolidayResponseDTO.class)))
                .thenReturn(response);

        // Al estar el caché vacío al inicio, esto disparará loadHolidaysFromAPI()
        List<BoostrHolidayDTO> result = holidayService.getAllHolidays();

        assertFalse(result.isEmpty());
        assertEquals(1, result.size());
        verify(restTemplate, times(1)).getForObject(anyString(), eq(BoostrHolidayResponseDTO.class));
    }

    @Test
    @DisplayName("getHolidayInfo: Debe retornar Optional vacío si la fecha es null")
    void testGetHolidayInfo_NullDate() {
        Optional<BoostrHolidayDTO> result = holidayService.getHolidayInfo(null);
        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("getHolidaysByYear: Debe cargar desde API si el caché está vacío y filtrar por año")
    void testGetHolidaysByYear_LazyLoading() {
        // Preparar datos
        BoostrHolidayDTO h1 = new BoostrHolidayDTO();
        h1.setDate(LocalDate.of(2025, 1, 1));
        BoostrHolidayDTO h2 = new BoostrHolidayDTO();
        h2.setDate(LocalDate.of(2026, 1, 1));

        BoostrHolidayResponseDTO response = new BoostrHolidayResponseDTO();
        response.setData(Arrays.asList(h1, h2));

        // Stubbing para que la primera llamada llene el caché
        when(restTemplate.getForObject(anyString(), eq(BoostrHolidayResponseDTO.class)))
                .thenReturn(response);

        // Ejecutar: Al estar vacío, entrará al IF y llamará a loadHolidaysFromAPI()
        List<BoostrHolidayDTO> result = holidayService.getHolidaysByYear(2025);

        // Verificar
        assertEquals(1, result.size(), "Debería retornar solo el feriado de 2025");
        assertEquals(2025, result.get(0).getDate().getYear());
        verify(restTemplate, times(1)).getForObject(anyString(), eq(BoostrHolidayResponseDTO.class));
    }

    @Test
    @DisplayName("scheduledRefresh: Debe ejecutar la recarga programada")
    void testScheduledRefresh_Coverage() {
        BoostrHolidayResponseDTO response = new BoostrHolidayResponseDTO();
        response.setData(new ArrayList<>());

        when(restTemplate.getForObject(anyString(), eq(BoostrHolidayResponseDTO.class)))
                .thenReturn(response);

        // Invocación manual del método programado
        holidayService.scheduledRefresh();

        // Verifica que se llamó a la carga de la API
        verify(restTemplate, atLeastOnce()).getForObject(anyString(), eq(BoostrHolidayResponseDTO.class));
    }

}