package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Pruebas unitarias de {@link ServicioService}.
 * Estilo Mockito puro, utilizando @ExtendWith(MockitoExtension.class) para
 * manejar la inyección mixta (constructor y @Autowired en campos).
 */
@ExtendWith(MockitoExtension.class)
class ServicioServiceTest {

    @Mock
    private ServicioRepository servicioRepository;

    @Mock
    private TurnoRepository turnoRepository;

    @Mock
    private FuncionarioRepository funcionarioRepository;

    @InjectMocks
    private ServicioService service;

    @BeforeEach
    void setUp() {
        // Como Mockito usó el constructor y omitió el @Autowired del campo,
        // inyectamos manualmente el mock de FuncionarioRepository usando Reflection.
        ReflectionTestUtils.setField(service, "funcionarioRepository", funcionarioRepository);
    }

    // ============================ Búsquedas Básicas ============================

    @Test
    void getAllServiciosInactivos_retornaListaDeEliminados() {
        ServicioEntity servicio = new ServicioEntity();
        when(servicioRepository.findByEliminadoTrue()).thenReturn(List.of(servicio));

        List<ServicioEntity> resultado = service.getAllServiciosInactivos();

        assertEquals(1, resultado.size());
        verify(servicioRepository).findByEliminadoTrue();
    }

    @Test
    void getAllServiciosSummary_mapeaServiciosAMap() {
        ServicioEntity servicio = new ServicioEntity();
        servicio.setIdServicio(1L);
        servicio.setNombre("Urgencias");
        when(servicioRepository.findByEliminadoFalse()).thenReturn(List.of(servicio));

        List<Map<String, Object>> resultado = service.getAllServiciosSummary();

        assertEquals(1, resultado.size());
        assertEquals(1L, resultado.get(0).get("id"));
        assertEquals("Urgencias", resultado.get(0).get("nombre"));
    }

    @Test
    void getServicioById_idNulo_retornaNull() {
        assertNull(service.getServicioById(null));
        verifyNoInteractions(servicioRepository);
    }

    @Test
    void getServicioById_idValido_retornaServicio() {
        ServicioEntity servicio = new ServicioEntity();
        when(servicioRepository.findById(1L)).thenReturn(Optional.of(servicio));

        assertEquals(servicio, service.getServicioById(1L));
    }

    @Test
    void getServicioByNombre_nombreNulo_retornaNull() {
        assertNull(service.getServicioByNombre(null));
        verifyNoInteractions(servicioRepository);
    }

    @Test
    void getServicioByNombre_nombreValido_retornaServicio() {
        ServicioEntity servicio = new ServicioEntity();
        when(servicioRepository.findByNombreAndEliminadoFalse("UCI")).thenReturn(Optional.of(servicio));

        assertEquals(servicio, service.getServicioByNombre("UCI"));
    }

    // ============================ createServicio ============================

    @Test
    void createServicio_payloadSinNombre_lanzaExcepcion() {
        Map<String, Object> payload = new HashMap<>(); // Falta 'nombre'

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> service.createServicio(payload));

        assertEquals("Falta campo requerido: nombre", exception.getMessage());
        verifyNoInteractions(servicioRepository);
    }

    @Test
    void createServicio_payloadValido_guardaYRetornaServicio() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("nombre", "Pediatría");

        ServicioEntity servicioGuardado = new ServicioEntity();
        servicioGuardado.setIdServicio(10L);
        servicioGuardado.setNombre("Pediatría");

        when(servicioRepository.save(any(ServicioEntity.class))).thenReturn(servicioGuardado);

        ServicioEntity resultado = service.createServicio(payload);

        assertEquals(10L, resultado.getIdServicio());
        assertEquals("Pediatría", resultado.getNombre());
        verify(servicioRepository).save(any(ServicioEntity.class));
    }

    // ============================ updateServicio ============================

    @Test
    void updateServicio_idNulo_retornaNull() {
        assertNull(service.updateServicio(null, new HashMap<>()));
        verifyNoInteractions(servicioRepository);
    }

    @Test
    void updateServicio_servicioNoEncontrado_lanzaExcepcion() {
        when(servicioRepository.findById(1L)).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> service.updateServicio(1L, new HashMap<>()));

        assertEquals("Servicio no encontrado con ID: 1", exception.getMessage());
    }

    @Test
    void updateServicio_payloadValido_actualizaYRetornaSummary() {
        ServicioEntity servicioExistente = new ServicioEntity();
        servicioExistente.setIdServicio(1L);
        servicioExistente.setNombre("Nombre Viejo");

        Map<String, Object> payload = new HashMap<>();
        payload.put("nombre", "Nombre Nuevo");

        when(servicioRepository.findById(1L)).thenReturn(Optional.of(servicioExistente));
        when(servicioRepository.save(any(ServicioEntity.class))).thenReturn(servicioExistente);
        // getServicioSummary llamará a findById de nuevo
        when(servicioRepository.findById(1L)).thenReturn(Optional.of(servicioExistente));

        Map<String, Object> resultado = service.updateServicio(1L, payload);

        assertEquals(1L, resultado.get("id"));
        assertEquals("Nombre Nuevo", resultado.get("nombre"));
        verify(servicioRepository, times(2)).findById(1L);
        verify(servicioRepository).save(servicioExistente);
    }

    // ============================ Contadores ============================

    @Test
    void contarTurnosAsociados_retornaCantidad() {
        when(servicioRepository.findById(1L)).thenReturn(Optional.of(new ServicioEntity()));
        when(turnoRepository.countByServicio_IdServicio(1L)).thenReturn(5L);

        assertEquals(5L, service.contarTurnosAsociados(1L));
    }

    @Test
    void contarFuncionariosAsociados_retornaCantidad() {
        when(funcionarioRepository.contarFuncionariosPorServicio(1L)).thenReturn(10L);

        assertEquals(10L, service.contarFuncionariosAsociados(1L));
    }

    @Test
    void contarDependencias_sumaTurnosYFuncionarios() {
        when(servicioRepository.findById(1L)).thenReturn(Optional.of(new ServicioEntity()));
        when(turnoRepository.countByServicio_IdServicio(1L)).thenReturn(5L);
        when(funcionarioRepository.contarFuncionariosPorServicio(1L)).thenReturn(10L);

        assertEquals(15L, service.contarDependencias(1L));
    }

    // ============================ deleteServicio ============================

    @Test
    void deleteServicio_idNulo_retornaFalse() {
        assertFalse(service.deleteServicio(null));
        verifyNoInteractions(servicioRepository);
    }

    @Test
    void deleteServicio_noExiste_retornaFalse() {
        when(servicioRepository.findById(1L)).thenReturn(Optional.empty());

        assertFalse(service.deleteServicio(1L));
        verify(servicioRepository, never()).save(any());
    }

    @Test
    void deleteServicio_existe_marcaEliminadoYRetornaTrue() {
        ServicioEntity servicio = new ServicioEntity();
        servicio.setEliminado(false);
        when(servicioRepository.findById(1L)).thenReturn(Optional.of(servicio));

        assertTrue(service.deleteServicio(1L));
        assertTrue(servicio.isEliminado());
        verify(servicioRepository).save(servicio);
    }

    // ============================ Paginación y Búsqueda ============================

    @Test
    void getServiciosPaginados_retornaPageMapeado() {
        ServicioEntity servicio = new ServicioEntity();
        servicio.setIdServicio(1L);
        servicio.setNombre("Cirugía");
        Page<ServicioEntity> page = new PageImpl<>(List.of(servicio));
        Pageable pageable = PageRequest.of(0, 10);

        when(servicioRepository.findByEliminadoFalse(pageable)).thenReturn(page);

        Page<Map<String, Object>> resultado = service.getServiciosPaginados(pageable);

        assertEquals(1, resultado.getContent().size());
        assertEquals("Cirugía", resultado.getContent().get(0).get("nombre"));
    }

    @Test
    void buscarServicios_nombreNuloOVacio_delegaAPaginacionGeneral() {
        Pageable pageable = PageRequest.of(0, 10);
        when(servicioRepository.findByEliminadoFalse(pageable)).thenReturn(Page.empty());

        service.buscarServicios(null, pageable);
        service.buscarServicios("   ", pageable);

        verify(servicioRepository, times(2)).findByEliminadoFalse(pageable);
        verify(servicioRepository, never()).findByNombreContainingIgnoreCaseAndEliminadoFalse(anyString(), any());
    }

    @Test
    void buscarServicios_nombreValido_filtraYMapea() {
        ServicioEntity servicio = new ServicioEntity();
        servicio.setIdServicio(1L);
        servicio.setNombre("Neurología");
        Page<ServicioEntity> page = new PageImpl<>(List.of(servicio));
        Pageable pageable = PageRequest.of(0, 10);

        when(servicioRepository.findByNombreContainingIgnoreCaseAndEliminadoFalse("Neuro", pageable)).thenReturn(page);

        Page<Map<String, Object>> resultado = service.buscarServicios(" Neuro ", pageable);

        assertEquals(1, resultado.getContent().size());
        assertEquals("Neurología", resultado.getContent().get(0).get("nombre"));
        verify(servicioRepository).findByNombreContainingIgnoreCaseAndEliminadoFalse("Neuro", pageable);
    }
}