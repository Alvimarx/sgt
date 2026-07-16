package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.TipoTurnoEntity;
import com.pingeso.HUAP.Repository.RotativaDiaRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Repository.TipoTurnoRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Pruebas del CRUD del catálogo de tipos de turno ({@link TipoTurnoService}). Estilo Mockito puro:
 * repositorios simulados con {@code mock(...)} e inyección por constructor, sin contexto Spring.
 */
class TipoTurnoServiceTest {

    private static final long SERVICIO_ID = 1L;

    private final TipoTurnoRepository tipoTurnoRepository = mock(TipoTurnoRepository.class);
    private final RotativaDiaRepository rotativaDiaRepository = mock(RotativaDiaRepository.class);
    private final ServicioRepository servicioRepository = mock(ServicioRepository.class);
    private final TurnoRepository turnoRepository = mock(TurnoRepository.class);

    private final TipoTurnoService service =
            new TipoTurnoService(tipoTurnoRepository, rotativaDiaRepository, servicioRepository, turnoRepository);

    private static ServicioEntity servicio(long id) {
        return ServicioEntity.builder().idServicio(id).nombre("Urgencias").build();
    }

    /** Devuelve el mismo TipoTurnoEntity que se le pasa a save (permite afirmar sobre lo persistido). */
    private void saveDevuelveArgumento() {
        when(tipoTurnoRepository.save(any(TipoTurnoEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    // ============================ crearTipoDeTurno ============================

    @Test
    void crear_horasIguales_lanza() {
        // validarHorario se ejecuta antes de tocar repositorios: no hace falta stub.
        assertThrows(RuntimeException.class, () ->
                service.crearTipoDeTurno("Día", LocalTime.of(8, 0), LocalTime.of(8, 0), SERVICIO_ID));
        verify(tipoTurnoRepository, never()).save(any());
    }

    @Test
    void crear_turnoNocturno_terminoAntesDeInicio_esValido() {
        // Un turno de noche (20:00 -> 08:00) cruza medianoche: término < inicio está permitido,
        // solo se prohíbe que sean iguales.
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.of(servicio(SERVICIO_ID)));
        when(tipoTurnoRepository.existsByServicio_IdServicioAndNombreAndEliminadoFalse(SERVICIO_ID, "Noche"))
                .thenReturn(false);
        saveDevuelveArgumento();

        TipoTurnoEntity creado = service.crearTipoDeTurno("Noche", LocalTime.of(20, 0), LocalTime.of(8, 0), SERVICIO_ID);

        assertEquals("Noche", creado.getNombre());
        assertEquals(LocalTime.of(20, 0), creado.getHoraInicio());
        assertEquals(LocalTime.of(8, 0), creado.getHoraTermino());
    }

    @Test
    void crear_servicioInexistente_lanza() {
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () ->
                service.crearTipoDeTurno("Día", LocalTime.of(8, 0), LocalTime.of(20, 0), SERVICIO_ID));
        verify(tipoTurnoRepository, never()).save(any());
    }

    @Test
    void crear_nombreDuplicado_lanza() {
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.of(servicio(SERVICIO_ID)));
        when(tipoTurnoRepository.existsByServicio_IdServicioAndNombreAndEliminadoFalse(SERVICIO_ID, "Día"))
                .thenReturn(true);

        assertThrows(RuntimeException.class, () ->
                service.crearTipoDeTurno("Día", LocalTime.of(8, 0), LocalTime.of(20, 0), SERVICIO_ID));
        verify(tipoTurnoRepository, never()).save(any());
    }

    @Test
    void crear_happyPath_guardaConDatosCorrectos() {
        ServicioEntity servicio = servicio(SERVICIO_ID);
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.of(servicio));
        when(tipoTurnoRepository.existsByServicio_IdServicioAndNombreAndEliminadoFalse(SERVICIO_ID, "Día"))
                .thenReturn(false);
        saveDevuelveArgumento();

        TipoTurnoEntity creado = service.crearTipoDeTurno("Día", LocalTime.of(8, 0), LocalTime.of(20, 0), SERVICIO_ID);

        assertEquals("Día", creado.getNombre());
        assertEquals(LocalTime.of(8, 0), creado.getHoraInicio());
        assertEquals(LocalTime.of(20, 0), creado.getHoraTermino());
        assertSame(servicio, creado.getServicio());
        assertFalse(creado.isEliminado());
        verify(tipoTurnoRepository).save(any(TipoTurnoEntity.class));
    }

    // ============================ actualizarTipoDeTurno ============================

    @Test
    void actualizar_nombreDuplicado_lanza() {
        TipoTurnoEntity tipo = new TipoTurnoEntity("Día", servicio(SERVICIO_ID), LocalTime.of(8, 0), LocalTime.of(20, 0));
        tipo.setIdTipoTurno(5L);
        when(tipoTurnoRepository.findById(5L)).thenReturn(Optional.of(tipo));
        when(tipoTurnoRepository.existsByServicio_IdServicioAndNombreAndIdTipoTurnoNotAndEliminadoFalse(SERVICIO_ID, "Noche", 5L))
                .thenReturn(true);

        assertThrows(RuntimeException.class, () ->
                service.actualizarTipoDeTurno(5L, "Noche", LocalTime.of(20, 0), LocalTime.of(8, 0)));
    }

    @Test
    void actualizar_happyPath_actualizaNombreYHoras() {
        TipoTurnoEntity tipo = new TipoTurnoEntity("Día", servicio(SERVICIO_ID), LocalTime.of(8, 0), LocalTime.of(20, 0));
        tipo.setIdTipoTurno(5L);
        when(tipoTurnoRepository.findById(5L)).thenReturn(Optional.of(tipo));
        when(tipoTurnoRepository.existsByServicio_IdServicioAndNombreAndIdTipoTurnoNotAndEliminadoFalse(SERVICIO_ID, "Diurno", 5L))
                .thenReturn(false);
        saveDevuelveArgumento();

        TipoTurnoEntity actualizado = service.actualizarTipoDeTurno(5L, "Diurno", LocalTime.of(9, 0), LocalTime.of(21, 0));

        assertEquals("Diurno", actualizado.getNombre());
        assertEquals(LocalTime.of(9, 0), actualizado.getHoraInicio());
        assertEquals(LocalTime.of(21, 0), actualizado.getHoraTermino());
    }

    // ============================ eliminarTipoDeTurno ============================

    @Test
    void eliminar_liberaReferenciasYMarcaEliminado() {
        TipoTurnoEntity tipo = new TipoTurnoEntity("Día", servicio(SERVICIO_ID), LocalTime.of(8, 0), LocalTime.of(20, 0));
        tipo.setIdTipoTurno(7L);
        when(tipoTurnoRepository.findById(7L)).thenReturn(Optional.of(tipo));

        service.eliminarTipoDeTurno(7L);

        verify(rotativaDiaRepository).liberarReferenciasAlTipoTurno(7L);
        assertTrue(tipo.isEliminado());
        verify(tipoTurnoRepository).save(tipo);
    }

    // ============================ lecturas con validación ============================

    @Test
    void obtenerTipoDeTurno_inexistente_lanza() {
        when(tipoTurnoRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> service.obtenerTipoDeTurno(99L));
    }

    @Test
    void obtenerRotativasAfectadas_inexistente_lanza() {
        when(tipoTurnoRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> service.obtenerRotativasAfectadas(99L));
    }
}
