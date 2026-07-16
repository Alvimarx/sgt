package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.PlanificacionAsignacionEntity;
import com.pingeso.HUAP.Entity.PlanificacionEntity;
import com.pingeso.HUAP.Entity.RotativaDiaEntity;
import com.pingeso.HUAP.Entity.RotativaEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.TipoTurnoEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FeriadoRepository;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.PlanificacionRepository;
import com.pingeso.HUAP.Repository.PuestoRepository;
import com.pingeso.HUAP.Repository.RotativaDiaRepository;
import com.pingeso.HUAP.Repository.RotativaRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Pruebas del núcleo de {@link PlanificacionService}: validación del lunes de inicio, expansión de
 * la secuencia de una rotativa a turnos reales, el cruce de medianoche, y la regla clave "si el
 * funcionario choca en horario el turno se crea igual pero VACANTE". Mockito puro, sin BD.
 *
 * Fecha base 2026-06-08 = lunes (misma referencia que el resto de la suite).
 */
class PlanificacionServiceTest {

    private static final long SERVICIO_ID = 1L;
    private static final long PLAN_ID = 100L;
    private static final long ROTATIVA_ID = 10L;
    private static final long FUNC_ID = 1L;
    private static final LocalDate LUNES = LocalDate.of(2026, 6, 8);

    private final PlanificacionRepository planificacionRepository = mock(PlanificacionRepository.class);
    private final ServicioRepository servicioRepository = mock(ServicioRepository.class);
    private final RotativaRepository rotativaRepository = mock(RotativaRepository.class);
    private final FuncionarioRepository funcionarioRepository = mock(FuncionarioRepository.class);
    private final PuestoRepository puestoRepository = mock(PuestoRepository.class);
    private final RotativaDiaRepository rotativaDiaRepository = mock(RotativaDiaRepository.class);
    private final TurnoRepository turnoRepository = mock(TurnoRepository.class);
    private final BitacoraService bitacoraService = mock(BitacoraService.class);
    private final ReglaServicioService reglaServicioService = mock(ReglaServicioService.class);
    private final FeriadoRepository feriadoRepository = mock(FeriadoRepository.class);

    private final PlanificacionService service = new PlanificacionService(
            planificacionRepository, servicioRepository, rotativaRepository, funcionarioRepository,
            puestoRepository, rotativaDiaRepository, turnoRepository, bitacoraService,
            reglaServicioService, feriadoRepository);

    // ---------------------------------------------------------------- helpers

    private static ServicioEntity servicio(long id, String nombre) {
        return ServicioEntity.builder().idServicio(id).nombre(nombre).build();
    }

    private static TipoTurnoEntity tipo(long id, ServicioEntity servicio, LocalTime hi, LocalTime hf) {
        TipoTurnoEntity t = new TipoTurnoEntity("Turno", servicio, hi, hf);
        t.setIdTipoTurno(id);
        return t;
    }

    private static FuncionarioEntity func(long id, boolean eliminado) {
        return FuncionarioEntity.builder().idFuncionario(id).nombre("Juan").eliminado(eliminado).build();
    }

    private static RotativaEntity rotativa(ServicioEntity servicio) {
        RotativaEntity r = new RotativaEntity(servicio, "Rot", (byte) 1);
        r.setIdRotativa(ROTATIVA_ID);
        return r;
    }

    private static PlanificacionEntity plan(ServicioEntity servicio, RotativaEntity rotativa, FuncionarioEntity func) {
        PlanificacionEntity plan = new PlanificacionEntity(servicio, "Plan");
        plan.setIdPlanificacion(PLAN_ID);
        plan.getAsignaciones().add(new PlanificacionAsignacionEntity(plan, rotativa, func, null));
        return plan;
    }

    private static TurnoEntity turnoExistente(FuncionarioEntity func, ServicioEntity servicio,
                                              LocalDate di, LocalTime hi, LocalDate df, LocalTime hf) {
        return TurnoEntity.builder()
                .idTurno(999L).funcionario(func).servicio(servicio)
                .diaInicioTurno(di).horaInicio(hi).diaFinalTurno(df).horaFin(hf)
                .build();
    }

    /** Stub común: reglas vacías (sin ajuste horario), para volver el resultado determinista. */
    private void sinReglas() {
        when(reglaServicioService.cargarReglasSeleccionadas(anyLong(), any())).thenReturn(List.of());
    }

    // ============================ validarLunes ============================

    @Test
    void generar_fechaNull_lanza() {
        assertThrows(RuntimeException.class, () -> service.generarTurnos(PLAN_ID, null, null, List.of()));
    }

    @Test
    void generar_fechaNoLunes_lanza() {
        LocalDate martes = LocalDate.of(2026, 6, 9);
        assertThrows(RuntimeException.class, () -> service.generarTurnos(PLAN_ID, martes, null, List.of()));
    }

    @Test
    void detectar_fechaNoLunes_lanza() {
        LocalDate martes = LocalDate.of(2026, 6, 9);
        assertThrows(RuntimeException.class, () -> service.detectarConflictos(PLAN_ID, martes));
    }

    // ============================ generarTurnos ============================

    @Test
    void generar_happyPath_creaTurnosYOmiteDiaLibre() {
        ServicioEntity servicio = servicio(SERVICIO_ID, "Urgencias");
        RotativaEntity rotativa = rotativa(servicio);
        FuncionarioEntity funcionario = func(FUNC_ID, false);
        TipoTurnoEntity tipoDia = tipo(1L, servicio, LocalTime.of(8, 0), LocalTime.of(20, 0));

        when(planificacionRepository.findById(PLAN_ID)).thenReturn(Optional.of(plan(servicio, rotativa, funcionario)));
        sinReglas();
        when(rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(ROTATIVA_ID)).thenReturn(List.of(
                new RotativaDiaEntity(rotativa, 0, tipoDia),
                new RotativaDiaEntity(rotativa, 1, null)   // día libre -> se omite
        ));
        when(turnoRepository.findConflictosByFuncionarios(anyList(), any(), any())).thenReturn(List.of());

        Map<String, Object> res = service.generarTurnos(PLAN_ID, LUNES, null, List.of());

        assertEquals(1, res.get("generados"));
        assertEquals(0, res.get("vacantesPorConflicto"));

        ArgumentCaptor<TurnoEntity> cap = ArgumentCaptor.forClass(TurnoEntity.class);
        verify(turnoRepository, times(1)).save(cap.capture());
        TurnoEntity saved = cap.getValue();
        assertSame(funcionario, saved.getFuncionario());
        assertEquals(LUNES, saved.getDiaInicioTurno());
        assertEquals(LUNES, saved.getDiaFinalTurno());        // 08:00->20:00 no cruza medianoche
        assertEquals(LocalTime.of(8, 0), saved.getHoraInicio());
    }

    @Test
    void generar_turnoNocturno_cruzaMedianoche_diaFinalMasUno() {
        ServicioEntity servicio = servicio(SERVICIO_ID, "Urgencias");
        RotativaEntity rotativa = rotativa(servicio);
        FuncionarioEntity funcionario = func(FUNC_ID, false);
        TipoTurnoEntity noche = tipo(2L, servicio, LocalTime.of(20, 0), LocalTime.of(8, 0));

        when(planificacionRepository.findById(PLAN_ID)).thenReturn(Optional.of(plan(servicio, rotativa, funcionario)));
        sinReglas();
        when(rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(ROTATIVA_ID))
                .thenReturn(List.of(new RotativaDiaEntity(rotativa, 0, noche)));
        when(turnoRepository.findConflictosByFuncionarios(anyList(), any(), any())).thenReturn(List.of());

        service.generarTurnos(PLAN_ID, LUNES, null, List.of());

        ArgumentCaptor<TurnoEntity> cap = ArgumentCaptor.forClass(TurnoEntity.class);
        verify(turnoRepository).save(cap.capture());
        assertEquals(LUNES, cap.getValue().getDiaInicioTurno());
        assertEquals(LUNES.plusDays(1), cap.getValue().getDiaFinalTurno());
    }

    @Test
    void generar_conflictoConTurnoExistente_dejaVacante() {
        ServicioEntity servicio = servicio(SERVICIO_ID, "Urgencias");
        ServicioEntity otro = servicio(2L, "Cirugía");
        RotativaEntity rotativa = rotativa(servicio);
        FuncionarioEntity funcionario = func(FUNC_ID, false);
        TipoTurnoEntity tipoDia = tipo(1L, servicio, LocalTime.of(8, 0), LocalTime.of(20, 0));

        when(planificacionRepository.findById(PLAN_ID)).thenReturn(Optional.of(plan(servicio, rotativa, funcionario)));
        sinReglas();
        when(rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(ROTATIVA_ID))
                .thenReturn(List.of(new RotativaDiaEntity(rotativa, 0, tipoDia)));
        // Turno ya existente (otro servicio) que solapa 10:00-12:00 con el generado 08:00-20:00.
        when(turnoRepository.findConflictosByFuncionarios(anyList(), any(), any())).thenReturn(List.of(
                turnoExistente(funcionario, otro, LUNES, LocalTime.of(10, 0), LUNES, LocalTime.of(12, 0))));

        Map<String, Object> res = service.generarTurnos(PLAN_ID, LUNES, null, List.of());

        assertEquals(1, res.get("generados"));
        assertEquals(1, res.get("vacantesPorConflicto"));

        ArgumentCaptor<TurnoEntity> cap = ArgumentCaptor.forClass(TurnoEntity.class);
        verify(turnoRepository).save(cap.capture());
        assertNull(cap.getValue().getFuncionario(), "el turno en conflicto se crea VACANTE");
    }

    @Test
    void generar_conflictoIntraLote_segundoTurnoVacante() {
        ServicioEntity servicio = servicio(SERVICIO_ID, "Urgencias");
        RotativaEntity rotativa = rotativa(servicio);
        FuncionarioEntity funcionario = func(FUNC_ID, false);
        // Dos filas en el mismo diaIndex con horarios solapados (08-20 y 10-18) para el mismo funcionario.
        TipoTurnoEntity dia = tipo(1L, servicio, LocalTime.of(8, 0), LocalTime.of(20, 0));
        TipoTurnoEntity solapado = tipo(2L, servicio, LocalTime.of(10, 0), LocalTime.of(18, 0));

        when(planificacionRepository.findById(PLAN_ID)).thenReturn(Optional.of(plan(servicio, rotativa, funcionario)));
        sinReglas();
        when(rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(ROTATIVA_ID)).thenReturn(List.of(
                new RotativaDiaEntity(rotativa, 0, dia),
                new RotativaDiaEntity(rotativa, 0, solapado)));
        when(turnoRepository.findConflictosByFuncionarios(anyList(), any(), any())).thenReturn(List.of());

        Map<String, Object> res = service.generarTurnos(PLAN_ID, LUNES, null, List.of());

        assertEquals(2, res.get("generados"));
        assertEquals(1, res.get("vacantesPorConflicto"));

        ArgumentCaptor<TurnoEntity> cap = ArgumentCaptor.forClass(TurnoEntity.class);
        verify(turnoRepository, times(2)).save(cap.capture());
        assertNotNull(cap.getAllValues().get(0).getFuncionario(), "primer turno se asigna");
        assertNull(cap.getAllValues().get(1).getFuncionario(), "segundo turno (solapa) queda vacante");
    }

    @Test
    void generar_bordeExacto_noEsConflicto_seAsigna() {
        ServicioEntity servicio = servicio(SERVICIO_ID, "Urgencias");
        ServicioEntity otro = servicio(2L, "Cirugía");
        RotativaEntity rotativa = rotativa(servicio);
        FuncionarioEntity funcionario = func(FUNC_ID, false);
        TipoTurnoEntity tipoDia = tipo(1L, servicio, LocalTime.of(8, 0), LocalTime.of(20, 0));

        when(planificacionRepository.findById(PLAN_ID)).thenReturn(Optional.of(plan(servicio, rotativa, funcionario)));
        sinReglas();
        when(rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(ROTATIVA_ID))
                .thenReturn(List.of(new RotativaDiaEntity(rotativa, 0, tipoDia)));
        // Existente termina EXACTO a las 08:00 (domingo 20:00 -> lunes 08:00); el nuevo empieza 08:00.
        // Intervalo medio-abierto: tocarse en el borde no cuenta como choque.
        when(turnoRepository.findConflictosByFuncionarios(anyList(), any(), any())).thenReturn(List.of(
                turnoExistente(funcionario, otro, LUNES.minusDays(1), LocalTime.of(20, 0), LUNES, LocalTime.of(8, 0))));

        Map<String, Object> res = service.generarTurnos(PLAN_ID, LUNES, null, List.of());

        assertEquals(0, res.get("vacantesPorConflicto"));
        ArgumentCaptor<TurnoEntity> cap = ArgumentCaptor.forClass(TurnoEntity.class);
        verify(turnoRepository).save(cap.capture());
        assertSame(funcionario, cap.getValue().getFuncionario());
    }

    @Test
    void generar_funcionarioEliminado_dejaVacanteSinContarConflicto() {
        ServicioEntity servicio = servicio(SERVICIO_ID, "Urgencias");
        RotativaEntity rotativa = rotativa(servicio);
        FuncionarioEntity eliminado = func(FUNC_ID, true);
        TipoTurnoEntity tipoDia = tipo(1L, servicio, LocalTime.of(8, 0), LocalTime.of(20, 0));

        when(planificacionRepository.findById(PLAN_ID)).thenReturn(Optional.of(plan(servicio, rotativa, eliminado)));
        sinReglas();
        when(rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(ROTATIVA_ID))
                .thenReturn(List.of(new RotativaDiaEntity(rotativa, 0, tipoDia)));

        Map<String, Object> res = service.generarTurnos(PLAN_ID, LUNES, null, List.of());

        assertEquals(1, res.get("generados"));
        assertEquals(0, res.get("vacantesPorConflicto")); // vacante por eliminado, no por conflicto
        ArgumentCaptor<TurnoEntity> cap = ArgumentCaptor.forClass(TurnoEntity.class);
        verify(turnoRepository).save(cap.capture());
        assertNull(cap.getValue().getFuncionario());
    }

    // ============================ detectarConflictos ============================

    @Test
    void detectar_conSolape_devuelveConflictoConServicio() {
        ServicioEntity servicio = servicio(SERVICIO_ID, "Urgencias");
        ServicioEntity otro = servicio(2L, "Cirugía");
        RotativaEntity rotativa = rotativa(servicio);
        FuncionarioEntity funcionario = func(FUNC_ID, false);
        TipoTurnoEntity tipoDia = tipo(1L, servicio, LocalTime.of(8, 0), LocalTime.of(20, 0));

        when(planificacionRepository.findById(PLAN_ID)).thenReturn(Optional.of(plan(servicio, rotativa, funcionario)));
        when(rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(ROTATIVA_ID))
                .thenReturn(List.of(new RotativaDiaEntity(rotativa, 0, tipoDia)));
        when(turnoRepository.findConflictosByFuncionarios(anyList(), any(), any())).thenReturn(List.of(
                turnoExistente(funcionario, otro, LUNES, LocalTime.of(9, 0), LUNES, LocalTime.of(11, 0))));

        List<Map<String, Object>> conflictos = service.detectarConflictos(PLAN_ID, LUNES);

        assertEquals(1, conflictos.size());
        Map<String, Object> c = conflictos.get(0);
        assertEquals(FUNC_ID, c.get("idFuncionario"));
        assertEquals("Cirugía", c.get("servicioEnConflicto"));
        assertEquals("Rot", c.get("nombreRotativa"));
    }

    @Test
    void detectar_sinSolape_devuelveListaVacia() {
        ServicioEntity servicio = servicio(SERVICIO_ID, "Urgencias");
        RotativaEntity rotativa = rotativa(servicio);
        FuncionarioEntity funcionario = func(FUNC_ID, false);
        TipoTurnoEntity tipoDia = tipo(1L, servicio, LocalTime.of(8, 0), LocalTime.of(20, 0));

        when(planificacionRepository.findById(PLAN_ID)).thenReturn(Optional.of(plan(servicio, rotativa, funcionario)));
        when(rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(ROTATIVA_ID))
                .thenReturn(List.of(new RotativaDiaEntity(rotativa, 0, tipoDia)));
        when(turnoRepository.findConflictosByFuncionarios(anyList(), any(), any())).thenReturn(List.of());

        assertTrue(service.detectarConflictos(PLAN_ID, LUNES).isEmpty());
    }
}
