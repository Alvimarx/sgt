package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.PlantillaTurnoEntity;
import com.pingeso.HUAP.Entity.ReglasHorariosTurnosServicioEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FeriadoRepository;
import com.pingeso.HUAP.Repository.PlantillaTurnoRepository;
import com.pingeso.HUAP.Repository.ReglasHorariosTurnosServicioRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Pruebas de la aplicación de reglas en {@link ReglaServicioService}. {@code aplicarReglas}
 * recibe las reglas ya seleccionadas; la ENTRADA se ajusta según el día de inicio y la
 * SALIDA según el día final.
 *
 * Calendario real: 2026-06-05 = viernes, 06 = sábado, 07 = domingo, 08 = lunes.
 */
class ReglaServicioServiceTest {

    private static final long SERVICIO_ID = 1L;
    private static final LocalDate VIERNES = LocalDate.of(2026, 6, 5);
    private static final LocalDate SABADO  = LocalDate.of(2026, 6, 6);
    private static final LocalDate DOMINGO = LocalDate.of(2026, 6, 7);
    private static final LocalDate LUNES   = LocalDate.of(2026, 6, 8);

    private final ReglasHorariosTurnosServicioRepository reglaRepo = mock(ReglasHorariosTurnosServicioRepository.class);
    private final ServicioRepository servicioRepo = mock(ServicioRepository.class);
    private final PlantillaTurnoRepository tipoRepo = mock(PlantillaTurnoRepository.class);
    private final FeriadoRepository feriadoRepo = mock(FeriadoRepository.class);

    private final ReglaServicioService service =
            new ReglaServicioService(reglaRepo, servicioRepo, tipoRepo, feriadoRepo);

    private static PlantillaTurnoEntity tipo(long id, String nombre) {
        PlantillaTurnoEntity t = new PlantillaTurnoEntity();
        t.setIdPlantillaTurno(id);
        t.setNombre(nombre);
        return t;
    }

    private static ReglasHorariosTurnosServicioEntity regla(Long idRegla, PlantillaTurnoEntity tipoInicio,
                                                            PlantillaTurnoEntity tipoFin,
                                                            boolean finde, boolean feriado, int tiempo) {
        return ReglasHorariosTurnosServicioEntity.builder()
                .idRegla(idRegla).nombre("regla")
                .activo(true).aplicaFinDeSemana(finde).aplicaFeriado(feriado)
                .tiempoMinutos(tiempo)
                .tipoTurnoInicio(tipoInicio).tipoTurnoFin(tipoFin)
                .build();
    }

    private TurnoEntity turno(PlantillaTurnoEntity tipo, LocalDate ini, LocalDate fin, LocalTime hi, LocalTime hf) {
        return TurnoEntity.builder()
                .servicio(ServicioEntity.builder().idServicio(SERVICIO_ID).build())
                .tipoTurno(tipo)
                .diaInicioTurno(ini).diaFinalTurno(fin)
                .horaInicio(hi).horaFin(hf)
                .build();
    }

    @Test
    void diurno_ajustaEntrada_enSabado() {
        PlantillaTurnoEntity diurno = tipo(1, "Diurno");
        when(feriadoRepo.existsByFecha(any())).thenReturn(false);

        TurnoEntity t = turno(diurno, SABADO, SABADO, LocalTime.of(8, 0), LocalTime.of(20, 0));
        service.aplicarReglas(t, List.of(regla(1L, diurno, null, true, true, 60)));

        assertEquals(LocalTime.of(9, 0), t.getHoraInicio());
        assertEquals(LocalTime.of(20, 0), t.getHoraFin());
    }

    @Test
    void nocturno_ajustaSalida_cuandoTerminaEnSabado() {
        PlantillaTurnoEntity nocturno = tipo(2, "Nocturno");
        when(feriadoRepo.existsByFecha(any())).thenReturn(false);

        TurnoEntity t = turno(nocturno, VIERNES, SABADO, LocalTime.of(20, 0), LocalTime.of(8, 0));
        service.aplicarReglas(t, List.of(regla(1L, null, nocturno, true, true, 60)));

        assertEquals(LocalTime.of(20, 0), t.getHoraInicio(), "entrada (viernes) no cambia");
        assertEquals(LocalTime.of(9, 0), t.getHoraFin(), "salida (sábado) +60");
    }

    @Test
    void nocturno_noAjustaSalida_cuandoTerminaEnDiaHabil() {
        PlantillaTurnoEntity nocturno = tipo(2, "Nocturno");
        when(feriadoRepo.existsByFecha(any())).thenReturn(false);

        TurnoEntity t = turno(nocturno, DOMINGO, LUNES, LocalTime.of(20, 0), LocalTime.of(8, 0));
        service.aplicarReglas(t, List.of(regla(1L, null, nocturno, true, true, 60)));

        assertEquals(LocalTime.of(20, 0), t.getHoraInicio());
        assertEquals(LocalTime.of(8, 0), t.getHoraFin());
    }

    @Test
    void cruce_unaReglaConAmbosTipos() {
        PlantillaTurnoEntity diurno = tipo(1, "Diurno");
        PlantillaTurnoEntity nocturno = tipo(2, "Nocturno");
        when(feriadoRepo.existsByFecha(any())).thenReturn(false);
        var reglas = List.of(regla(1L, diurno, nocturno, true, true, 60));

        TurnoEntity dia = turno(diurno, SABADO, SABADO, LocalTime.of(8, 0), LocalTime.of(20, 0));
        TurnoEntity noche = turno(nocturno, VIERNES, SABADO, LocalTime.of(20, 0), LocalTime.of(8, 0));
        service.aplicarReglas(dia, reglas);
        service.aplicarReglas(noche, reglas);

        assertEquals(LocalTime.of(9, 0), dia.getHoraInicio());
        assertEquals(LocalTime.of(20, 0), dia.getHoraFin());
        assertEquals(LocalTime.of(20, 0), noche.getHoraInicio());
        assertEquals(LocalTime.of(9, 0), noche.getHoraFin());
    }

    @Test
    void mismoTipo_dosReglas_ajustanInicioYFin() {
        PlantillaTurnoEntity diurno = tipo(1, "Diurno");
        when(feriadoRepo.existsByFecha(any())).thenReturn(false);
        var reglas = List.of(
                regla(1L, diurno, null, true, true, 30),   // inicio +30
                regla(2L, null, diurno, true, true, 60));   // fin +60

        TurnoEntity t = turno(diurno, SABADO, SABADO, LocalTime.of(8, 0), LocalTime.of(20, 0));
        service.aplicarReglas(t, reglas);

        assertEquals(LocalTime.of(8, 30), t.getHoraInicio());
        assertEquals(LocalTime.of(21, 0), t.getHoraFin());
    }

    @Test
    void feriadoEnDiaHabil_ajustaEntrada() {
        PlantillaTurnoEntity diurno = tipo(1, "Diurno");
        when(feriadoRepo.existsByFecha(LUNES)).thenReturn(true); // lunes feriado

        TurnoEntity t = turno(diurno, LUNES, LUNES, LocalTime.of(8, 0), LocalTime.of(20, 0));
        service.aplicarReglas(t, List.of(regla(1L, diurno, null, true, true, 60)));

        assertEquals(LocalTime.of(9, 0), t.getHoraInicio());
        assertEquals(LocalTime.of(20, 0), t.getHoraFin());
    }

    @Test
    void listaVacia_noModifica_niConsultaFeriados() {
        PlantillaTurnoEntity diurno = tipo(1, "Diurno");

        TurnoEntity t = turno(diurno, SABADO, SABADO, LocalTime.of(8, 0), LocalTime.of(20, 0));
        service.aplicarReglas(t, List.of());

        assertEquals(LocalTime.of(8, 0), t.getHoraInicio());
        assertEquals(LocalTime.of(20, 0), t.getHoraFin());
        verify(feriadoRepo, never()).existsByFecha(any());
    }

    @Test
    void cargarReglasSeleccionadas_filtraPorIds() {
        PlantillaTurnoEntity diurno = tipo(1, "Diurno");
        var r1 = regla(10L, diurno, null, true, true, 60);
        var r2 = regla(20L, diurno, null, true, true, 60);
        when(reglaRepo.findByServicio_IdServicioAndActivoTrueAndEliminadoFalse(SERVICIO_ID))
                .thenReturn(List.of(r1, r2));

        var sel = service.cargarReglasSeleccionadas(SERVICIO_ID, List.of(10L));
        assertEquals(1, sel.size());
        assertEquals(10L, sel.get(0).getIdRegla());

        assertTrue(service.cargarReglasSeleccionadas(SERVICIO_ID, List.of()).isEmpty());
        assertTrue(service.cargarReglasSeleccionadas(SERVICIO_ID, null).isEmpty());
    }
}
