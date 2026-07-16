package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.RotativaDiaEntity;
import com.pingeso.HUAP.Entity.RotativaEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.TipoTurnoEntity;
import com.pingeso.HUAP.Repository.PlanificacionAsignacionRepository;
import com.pingeso.HUAP.Repository.RotativaDiaRepository;
import com.pingeso.HUAP.Repository.RotativaRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Repository.TipoTurnoRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Pruebas de {@link RotativaService}: creación con validaciones, coherencia de la secuencia de días
 * ({@code validarRotativa}, semanas×7), reemplazo de secuencia y duplicado. Mockito puro, sin Spring.
 */
class RotativaServiceTest {

    private static final long SERVICIO_ID = 1L;

    private final RotativaRepository rotativaRepository = mock(RotativaRepository.class);
    private final ServicioRepository servicioRepository = mock(ServicioRepository.class);
    private final TipoTurnoRepository tipoTurnoRepository = mock(TipoTurnoRepository.class);
    private final RotativaDiaRepository rotativaDiaRepository = mock(RotativaDiaRepository.class);
    private final PlanificacionAsignacionRepository planificacionAsignacionRepository =
            mock(PlanificacionAsignacionRepository.class);

    private final RotativaService service = new RotativaService(
            rotativaRepository, servicioRepository, tipoTurnoRepository,
            rotativaDiaRepository, planificacionAsignacionRepository);

    private static ServicioEntity servicio(long id) {
        return ServicioEntity.builder().idServicio(id).nombre("Urgencias").build();
    }

    private static TipoTurnoEntity tipo(long id, ServicioEntity servicio, boolean eliminado) {
        TipoTurnoEntity t = new TipoTurnoEntity("Día", servicio, LocalTime.of(8, 0), LocalTime.of(20, 0));
        t.setIdTipoTurno(id);
        t.setEliminado(eliminado);
        return t;
    }

    private static RotativaEntity rotativa(ServicioEntity servicio, byte semanas) {
        return new RotativaEntity(servicio, "Rotativa 12x12", semanas);
    }

    // ============================ crearRotativa ============================

    @Test
    void crear_servicioInexistente_lanza() {
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () ->
                service.crearRotativa(SERVICIO_ID, "R", (byte) 1, null));
    }

    @Test
    void crear_nombreDuplicado_lanza() {
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.of(servicio(SERVICIO_ID)));
        when(rotativaRepository.existsByServicio_IdServicioAndNombreAndEliminadoFalse(SERVICIO_ID, "R"))
                .thenReturn(true);
        assertThrows(RuntimeException.class, () ->
                service.crearRotativa(SERVICIO_ID, "R", (byte) 1, null));
    }

    @Test
    void crear_semanasCero_lanza() {
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.of(servicio(SERVICIO_ID)));
        when(rotativaRepository.existsByServicio_IdServicioAndNombreAndEliminadoFalse(SERVICIO_ID, "R"))
                .thenReturn(false);
        assertThrows(RuntimeException.class, () ->
                service.crearRotativa(SERVICIO_ID, "R", (byte) 0, null));
    }

    @Test
    void crear_tipoTurnoEliminado_lanza() {
        ServicioEntity servicio = servicio(SERVICIO_ID);
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.of(servicio));
        when(rotativaRepository.existsByServicio_IdServicioAndNombreAndEliminadoFalse(SERVICIO_ID, "R"))
                .thenReturn(false);
        when(tipoTurnoRepository.findById(5L)).thenReturn(Optional.of(tipo(5L, servicio, true)));

        assertThrows(RuntimeException.class, () ->
                service.crearRotativa(SERVICIO_ID, "R", (byte) 1, List.of(5L)));
    }

    @Test
    void crear_tipoTurnoDeOtroServicio_lanza() {
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.of(servicio(SERVICIO_ID)));
        when(rotativaRepository.existsByServicio_IdServicioAndNombreAndEliminadoFalse(SERVICIO_ID, "R"))
                .thenReturn(false);
        // El tipo pertenece al servicio 2, no al 1.
        when(tipoTurnoRepository.findById(5L)).thenReturn(Optional.of(tipo(5L, servicio(2L), false)));

        assertThrows(RuntimeException.class, () ->
                service.crearRotativa(SERVICIO_ID, "R", (byte) 1, List.of(5L)));
    }

    @Test
    void crear_happyPath_asignaDiaIndexCorrelativo() {
        ServicioEntity servicio = servicio(SERVICIO_ID);
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.of(servicio));
        when(rotativaRepository.existsByServicio_IdServicioAndNombreAndEliminadoFalse(SERVICIO_ID, "R"))
                .thenReturn(false);
        when(tipoTurnoRepository.findById(1L)).thenReturn(Optional.of(tipo(1L, servicio, false)));

        // save asigna un id y guarda la referencia para que validarRotativa (que hace findById) la encuentre.
        RotativaEntity[] holder = new RotativaEntity[1];
        when(rotativaRepository.save(any(RotativaEntity.class))).thenAnswer(inv -> {
            RotativaEntity r = inv.getArgument(0);
            r.setIdRotativa(100L);
            holder[0] = r;
            return r;
        });
        when(rotativaRepository.findById(100L)).thenAnswer(inv -> Optional.of(holder[0]));

        // 7 días (1 semana) para que validarRotativa (7 == 1*7) pase.
        service.crearRotativa(SERVICIO_ID, "R", (byte) 1, List.of(1L, 1L, 1L, 1L, 1L, 1L, 1L));

        List<RotativaDiaEntity> secuencia = holder[0].getSecuenciaDias();
        assertEquals(7, secuencia.size());
        for (int i = 0; i < 7; i++) {
            assertEquals(i, secuencia.get(i).getDiaIndex());
            assertNotNull(secuencia.get(i).getTipoTurno());
        }
    }

    // ============================ validarRotativa ============================

    @Test
    void validar_semanasCero_lanza() {
        RotativaEntity r = rotativa(servicio(SERVICIO_ID), (byte) 0);
        r.setIdRotativa(10L);
        when(rotativaRepository.findById(10L)).thenReturn(Optional.of(r));
        assertThrows(RuntimeException.class, () -> service.validarRotativa(10L));
    }

    @Test
    void validar_secuenciaVacia_lanza() {
        RotativaEntity r = rotativa(servicio(SERVICIO_ID), (byte) 1);
        r.setIdRotativa(10L);
        when(rotativaRepository.findById(10L)).thenReturn(Optional.of(r));
        assertThrows(RuntimeException.class, () -> service.validarRotativa(10L));
    }

    @Test
    void validar_diasIncompletos_lanza() {
        RotativaEntity r = rotativa(servicio(SERVICIO_ID), (byte) 1); // espera 7 días
        r.setIdRotativa(10L);
        for (int i = 0; i < 6; i++) { // solo 6 días
            r.getSecuenciaDias().add(new RotativaDiaEntity(r, i, null));
        }
        when(rotativaRepository.findById(10L)).thenReturn(Optional.of(r));
        assertThrows(RuntimeException.class, () -> service.validarRotativa(10L));
    }

    @Test
    void validar_sieteDiasDistintos_noLanza() {
        RotativaEntity r = rotativa(servicio(SERVICIO_ID), (byte) 1); // espera 7 días
        r.setIdRotativa(10L);
        for (int i = 0; i < 7; i++) {
            r.getSecuenciaDias().add(new RotativaDiaEntity(r, i, null));
        }
        // Un día con dos filas (día + noche) comparte diaIndex y sigue contando como 1 día distinto.
        r.getSecuenciaDias().add(new RotativaDiaEntity(r, 0, null));
        when(rotativaRepository.findById(10L)).thenReturn(Optional.of(r));

        assertDoesNotThrow(() -> service.validarRotativa(10L));
    }

    // ============================ establecerSecuencia ============================

    @Test
    void establecer_listaVaciaONull_creaDiaLibreConservandoDiaIndex() {
        ServicioEntity servicio = servicio(SERVICIO_ID);
        RotativaEntity r = rotativa(servicio, (byte) 1);
        r.setIdRotativa(10L);
        when(rotativaRepository.findById(10L)).thenReturn(Optional.of(r));
        when(tipoTurnoRepository.findById(1L)).thenReturn(Optional.of(tipo(1L, servicio, false)));
        when(rotativaRepository.save(any(RotativaEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        // día 0 = libre (lista vacía), día 1 = libre (null), día 2 = tipo 1
        List<List<Long>> dias = Arrays.asList(List.of(), null, List.of(1L));
        RotativaEntity resultado = service.establecerSecuencia(10L, dias);

        List<RotativaDiaEntity> sec = resultado.getSecuenciaDias();
        assertEquals(3, sec.size());
        assertEquals(0, sec.get(0).getDiaIndex());
        assertNull(sec.get(0).getTipoTurno());
        assertEquals(1, sec.get(1).getDiaIndex());
        assertNull(sec.get(1).getTipoTurno());
        assertEquals(2, sec.get(2).getDiaIndex());
        assertNotNull(sec.get(2).getTipoTurno());
    }

    @Test
    void establecer_tipoEliminado_lanza() {
        ServicioEntity servicio = servicio(SERVICIO_ID);
        RotativaEntity r = rotativa(servicio, (byte) 1);
        r.setIdRotativa(10L);
        when(rotativaRepository.findById(10L)).thenReturn(Optional.of(r));
        when(tipoTurnoRepository.findById(5L)).thenReturn(Optional.of(tipo(5L, servicio, true)));

        assertThrows(RuntimeException.class, () ->
                service.establecerSecuencia(10L, List.of(List.of(5L))));
    }

    @Test
    void establecer_tipoDeOtroServicio_lanza() {
        RotativaEntity r = rotativa(servicio(SERVICIO_ID), (byte) 1);
        r.setIdRotativa(10L);
        when(rotativaRepository.findById(10L)).thenReturn(Optional.of(r));
        when(tipoTurnoRepository.findById(5L)).thenReturn(Optional.of(tipo(5L, servicio(2L), false)));

        assertThrows(RuntimeException.class, () ->
                service.establecerSecuencia(10L, List.of(List.of(5L))));
    }

    // ============================ actualizarRotativa ============================

    @Test
    void actualizar_semanasCero_lanza() {
        RotativaEntity r = rotativa(servicio(SERVICIO_ID), (byte) 1);
        r.setIdRotativa(10L);
        when(rotativaRepository.findById(10L)).thenReturn(Optional.of(r));
        assertThrows(RuntimeException.class, () ->
                service.actualizarRotativa(10L, "Nuevo", (byte) 0));
    }

    @Test
    void actualizar_happyPath_seteaNombreYSemanas() {
        RotativaEntity r = rotativa(servicio(SERVICIO_ID), (byte) 1);
        r.setIdRotativa(10L);
        when(rotativaRepository.findById(10L)).thenReturn(Optional.of(r));
        when(rotativaRepository.save(any(RotativaEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        RotativaEntity actualizada = service.actualizarRotativa(10L, "Nuevo nombre", (byte) 2);

        assertEquals("Nuevo nombre", actualizada.getNombre());
        assertEquals((byte) 2, actualizada.getSemanas());
    }

    // ============================ duplicarRotativa ============================

    @Test
    void duplicar_preservaDiasLibresYRenombra() {
        ServicioEntity servicio = servicio(SERVICIO_ID);
        RotativaEntity original = rotativa(servicio, (byte) 1);
        original.setIdRotativa(10L);
        original.getSecuenciaDias().add(new RotativaDiaEntity(original, 0, tipo(1L, servicio, false)));
        original.getSecuenciaDias().add(new RotativaDiaEntity(original, 1, null)); // día libre
        original.getSecuenciaDias().add(new RotativaDiaEntity(original, 2, tipo(1L, servicio, false)));

        when(rotativaRepository.findById(10L)).thenReturn(Optional.of(original));
        when(rotativaRepository.save(any(RotativaEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        RotativaEntity copia = service.duplicarRotativa(10L);

        assertTrue(copia.getNombre().endsWith("- copia"));
        List<RotativaDiaEntity> sec = copia.getSecuenciaDias();
        assertEquals(3, sec.size());
        assertNotNull(sec.get(0).getTipoTurno());
        assertNull(sec.get(1).getTipoTurno());   // el día libre se preserva
        assertNotNull(sec.get(2).getTipoTurno());
    }
}
