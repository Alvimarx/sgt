package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.PuestoEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Repository.PlanificacionAsignacionRepository;
import com.pingeso.HUAP.Repository.PuestoRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Pruebas unitarias de {@link PuestoService}. Estilo Mockito puro, sin contexto Spring.
 * Foco en la validación de excepciones para entidades no encontradas o nombres nulos,
 * y en el correcto flujo de eliminación lógica.
 */
class PuestoServiceTest {

    private final PuestoRepository puestoRepository = mock(PuestoRepository.class);
    private final ServicioRepository servicioRepository = mock(ServicioRepository.class);
    private final TurnoRepository turnoRepository = mock(TurnoRepository.class);
    private final PlanificacionAsignacionRepository planificacionAsignacionRepository = mock(PlanificacionAsignacionRepository.class);

    private final PuestoService service = new PuestoService(
            puestoRepository, servicioRepository, turnoRepository, planificacionAsignacionRepository);

    // ============================ crearPuesto ============================

    @Test
    void crearPuesto_happyPath_guardaYRetornaPuesto() {
        Long idServicio = 1L;
        String nombrePuesto = "Puesto A";
        ServicioEntity servicio = new ServicioEntity();

        when(servicioRepository.findById(idServicio)).thenReturn(Optional.of(servicio));
        when(puestoRepository.save(any(PuestoEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        PuestoEntity resultado = service.crearPuesto(idServicio, nombrePuesto);

        assertNotNull(resultado);
        assertEquals(nombrePuesto, resultado.getNombre());
        assertEquals(servicio, resultado.getServicio());
        verify(puestoRepository).save(any(PuestoEntity.class));
    }

    @Test
    void crearPuesto_servicioNoEncontrado_lanzaExcepcion() {
        when(servicioRepository.findById(1L)).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> service.crearPuesto(1L, "Puesto A"));

        assertEquals("Servicio no encontrado", exception.getMessage());
        verifyNoInteractions(puestoRepository);
    }

    @Test
    void crearPuesto_nombreNuloOVacio_lanzaExcepcion() {
        when(servicioRepository.findById(1L)).thenReturn(Optional.of(new ServicioEntity()));

        assertThrows(RuntimeException.class, () -> service.crearPuesto(1L, null));
        assertThrows(RuntimeException.class, () -> service.crearPuesto(1L, "   "));
        verifyNoInteractions(puestoRepository);
    }

    // ============================ obtenerPuesto ============================

    @Test
    void obtenerPuesto_existente_retornaPuesto() {
        PuestoEntity puesto = new PuestoEntity();
        when(puestoRepository.findById(5L)).thenReturn(Optional.of(puesto));

        PuestoEntity resultado = service.obtenerPuesto(5L);

        assertEquals(puesto, resultado);
    }

    @Test
    void obtenerPuesto_inexistente_lanzaExcepcion() {
        when(puestoRepository.findById(5L)).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> service.obtenerPuesto(5L));

        assertEquals("Puesto no encontrado", exception.getMessage());
    }

    // ============================ obtenerTodosPuestos / PorServicio ============================

    @Test
    void obtenerTodosPuestos_retornaListaDeNoEliminados() {
        List<PuestoEntity> puestos = List.of(new PuestoEntity(), new PuestoEntity());
        when(puestoRepository.findByEliminadoFalse()).thenReturn(puestos);

        List<PuestoEntity> resultado = service.obtenerTodosPuestos();

        assertEquals(2, resultado.size());
        verify(puestoRepository).findByEliminadoFalse();
    }

    @Test
    void obtenerPuestosPorServicio_retornaListaFiltrada() {
        List<PuestoEntity> puestos = List.of(new PuestoEntity());
        when(puestoRepository.findByServicio_IdServicioAndEliminadoFalse(1L)).thenReturn(puestos);

        List<PuestoEntity> resultado = service.obtenerPuestosPorServicio(1L);

        assertEquals(1, resultado.size());
        verify(puestoRepository).findByServicio_IdServicioAndEliminadoFalse(1L);
    }

    // ============================ actualizarPuesto ============================

    @Test
    void actualizarPuesto_happyPath_actualizaYGuarda() {
        PuestoEntity puestoExistente = new PuestoEntity();
        puestoExistente.setNombre("Viejo Nombre");

        when(puestoRepository.findById(1L)).thenReturn(Optional.of(puestoExistente));
        when(puestoRepository.save(any(PuestoEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        PuestoEntity resultado = service.actualizarPuesto(1L, "Nuevo Nombre");

        assertEquals("Nuevo Nombre", resultado.getNombre());
        verify(puestoRepository).save(puestoExistente);
    }

    @Test
    void actualizarPuesto_nombreNuloOVacio_lanzaExcepcion() {
        PuestoEntity puestoExistente = new PuestoEntity();
        when(puestoRepository.findById(1L)).thenReturn(Optional.of(puestoExistente));

        assertThrows(RuntimeException.class, () -> service.actualizarPuesto(1L, null));
        assertThrows(RuntimeException.class, () -> service.actualizarPuesto(1L, "   "));

        verify(puestoRepository, never()).save(any());
    }

    // ============================ contarTurnosAsociados ============================

    @Test
    void contarTurnosAsociados_puestoExistente_retornaConteo() {
        when(puestoRepository.findById(1L)).thenReturn(Optional.of(new PuestoEntity()));
        when(turnoRepository.countByPuesto_IdPuesto(1L)).thenReturn(10L);

        long count = service.contarTurnosAsociados(1L);

        assertEquals(10L, count);
        verify(turnoRepository).countByPuesto_IdPuesto(1L);
    }

    // ============================ eliminarPuesto ============================

    @Test
    void eliminarPuesto_happyPath_eliminaDependenciasYMarcaComoEliminado() {
        PuestoEntity puesto = new PuestoEntity();
        puesto.setEliminado(false);
        when(puestoRepository.findById(2L)).thenReturn(Optional.of(puesto));

        service.eliminarPuesto(2L);

        // Verifica que se eliminen las asignaciones previas
        verify(planificacionAsignacionRepository).deleteByPuesto(2L);
        // Verifica que se haga el borrado lógico (eliminado = true)
        assertTrue(puesto.isEliminado());
        verify(puestoRepository).save(puesto);
    }

    // ============================ obtenerPuestosPorNombre ============================

    @Test
    void obtenerPuestosPorNombre_existente_retornaPuesto() {
        PuestoEntity puesto = new PuestoEntity();
        when(puestoRepository.findByNombreAndEliminadoFalse("Puesto Especial")).thenReturn(Optional.of(puesto));

        PuestoEntity resultado = service.obtenerPuestosPorNombre("Puesto Especial");

        assertEquals(puesto, resultado);
    }

    @Test
    void obtenerPuestosPorNombre_inexistente_lanzaExcepcion() {
        when(puestoRepository.findByNombreAndEliminadoFalse("Puesto Inexistente")).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> service.obtenerPuestosPorNombre("Puesto Inexistente"));

        assertEquals("Puesto no encontrado", exception.getMessage());
    }
}
