package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.PlanificacionAsignacionEntity;
import com.pingeso.HUAP.Entity.PlanificacionEjecucionEntity;
import com.pingeso.HUAP.Entity.PlanificacionEjecucionEntity.EstadoEjecucion;
import com.pingeso.HUAP.Entity.PlanificacionEntity;
import com.pingeso.HUAP.Entity.RotativaDiaEntity;
import com.pingeso.HUAP.Entity.RotativaEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.SolicitudEntity;
import com.pingeso.HUAP.Entity.TipoTurnoEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FeriadoRepository;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.PlanificacionEjecucionRepository;
import com.pingeso.HUAP.Repository.PlanificacionRepository;
import com.pingeso.HUAP.Repository.PuestoRepository;
import com.pingeso.HUAP.Repository.RotativaDiaRepository;
import com.pingeso.HUAP.Repository.RotativaRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Repository.SolicitudRepository;
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
 * Pruebas del núcleo de {@link PlanificacionService}: validación del ancla de rotativa (lunes) vs.
 * la vigencia efectiva, expansión de la secuencia de una rotativa a turnos reales sobre un rango
 * arbitrario (incluyendo rangos que cruzan más de un ciclo), el cruce de medianoche, la regla clave
 * "si el funcionario choca en horario el turno se crea igual pero VACANTE", la regla de no
 * superposición de vigencias efectivas por servicio, y las operaciones de extender/acortar/anular/
 * editar-desde-fecha. Mockito puro, sin BD.
 *
 * Fecha base 2026-06-08 = lunes (misma referencia que el resto de la suite).
 */
class PlanificacionServiceTest {

    private static final long SERVICIO_ID = 1L;
    private static final long PLAN_ID = 100L;
    private static final long ROTATIVA_ID = 10L;
    private static final long FUNC_ID = 1L;
    private static final long EJECUCION_ID = 500L;
    private static final LocalDate LUNES = LocalDate.of(2026, 6, 8);
    /** Fin de vigencia que cubre exactamente un ciclo de 1 semana (índices 0..6), como el resto de la suite espera. */
    private static final LocalDate FIN_UNA_SEMANA = LUNES.plusDays(6);

    private final PlanificacionRepository planificacionRepository = mock(PlanificacionRepository.class);
    private final PlanificacionEjecucionRepository ejecucionRepository = mock(PlanificacionEjecucionRepository.class);
    private final ServicioRepository servicioRepository = mock(ServicioRepository.class);
    private final RotativaRepository rotativaRepository = mock(RotativaRepository.class);
    private final FuncionarioRepository funcionarioRepository = mock(FuncionarioRepository.class);
    private final PuestoRepository puestoRepository = mock(PuestoRepository.class);
    private final RotativaDiaRepository rotativaDiaRepository = mock(RotativaDiaRepository.class);
    private final TurnoRepository turnoRepository = mock(TurnoRepository.class);
    private final SolicitudRepository solicitudRepository = mock(SolicitudRepository.class);
    private final BitacoraService bitacoraService = mock(BitacoraService.class);
    private final ReglaServicioService reglaServicioService = mock(ReglaServicioService.class);
    private final FeriadoRepository feriadoRepository = mock(FeriadoRepository.class);

    private final PlanificacionService service = new PlanificacionService(
            planificacionRepository, ejecucionRepository, servicioRepository, rotativaRepository, funcionarioRepository,
            puestoRepository, rotativaDiaRepository, turnoRepository, solicitudRepository, bitacoraService,
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
        return rotativa(servicio, (byte) 1);
    }

    private static RotativaEntity rotativa(ServicioEntity servicio, byte semanas) {
        RotativaEntity r = new RotativaEntity(servicio, "Rot", semanas);
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

    /** Stub común: sin ejecuciones activas previas (no hay superposición que rechazar). */
    private void sinEjecucionesActivas() {
        when(ejecucionRepository.findByServicio_IdServicioAndEstado(anyLong(), eq(EstadoEjecucion.ACTIVA)))
                .thenReturn(List.of());
    }

    /** Stub común: ejecucionRepository.save devuelve el mismo argumento, con id asignado si no tenía. */
    private void guardarEjecucionAsignaId() {
        when(ejecucionRepository.save(any(PlanificacionEjecucionEntity.class))).thenAnswer(inv -> {
            PlanificacionEjecucionEntity e = inv.getArgument(0);
            if (e.getIdEjecucion() == null) e.setIdEjecucion(EJECUCION_ID);
            return e;
        });
    }

    private void sinConflictosExistentes() {
        when(turnoRepository.findConflictosByFuncionarios(anyList(), any(), any())).thenReturn(List.of());
    }

    // ============================ validarRangoEfectivo ============================

    @Test
    void generar_anclaNull_lanza() {
        assertThrows(RuntimeException.class,
                () -> service.generarTurnos(PLAN_ID, null, LUNES, FIN_UNA_SEMANA, null, List.of()));
    }

    @Test
    void generar_anclaNoLunes_lanza() {
        LocalDate martes = LocalDate.of(2026, 6, 9);
        assertThrows(RuntimeException.class,
                () -> service.generarTurnos(PLAN_ID, martes, martes, FIN_UNA_SEMANA, null, List.of()));
    }

    @Test
    void generar_efectivaAnteriorAlAncla_lanza() {
        assertThrows(RuntimeException.class,
                () -> service.generarTurnos(PLAN_ID, LUNES, LUNES.minusDays(1), FIN_UNA_SEMANA, null, List.of()));
    }

    @Test
    void generar_finAnteriorAInicio_lanza() {
        assertThrows(RuntimeException.class,
                () -> service.generarTurnos(PLAN_ID, LUNES, LUNES, LUNES.minusDays(1), null, List.of()));
    }

    @Test
    void detectar_anclaNoLunes_lanza() {
        LocalDate martes = LocalDate.of(2026, 6, 9);
        assertThrows(RuntimeException.class,
                () -> service.detectarConflictos(PLAN_ID, martes, martes, FIN_UNA_SEMANA));
    }

    // ============================ generarTurnos ============================

    @Test
    void generar_happyPath_creaTurnosYOmiteDiaLibre() {
        ServicioEntity servicio = servicio(SERVICIO_ID, "Urgencias");
        RotativaEntity rotativa = rotativa(servicio);
        FuncionarioEntity funcionario = func(FUNC_ID, false);
        TipoTurnoEntity tipoDia = tipo(1L, servicio, LocalTime.of(8, 0), LocalTime.of(20, 0));

        when(planificacionRepository.findById(PLAN_ID)).thenReturn(Optional.of(plan(servicio, rotativa, funcionario)));
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.of(servicio));
        sinReglas();
        sinEjecucionesActivas();
        guardarEjecucionAsignaId();
        when(rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(ROTATIVA_ID)).thenReturn(List.of(
                new RotativaDiaEntity(rotativa, 0, tipoDia),
                new RotativaDiaEntity(rotativa, 1, null)   // día libre -> se omite
        ));
        sinConflictosExistentes();

        Map<String, Object> res = service.generarTurnos(PLAN_ID, LUNES, LUNES, FIN_UNA_SEMANA, null, List.of());

        assertEquals(1, res.get("generados"));
        assertEquals(0, res.get("vacantesPorConflicto"));
        assertEquals(EJECUCION_ID, res.get("idEjecucion"));

        ArgumentCaptor<TurnoEntity> cap = ArgumentCaptor.forClass(TurnoEntity.class);
        verify(turnoRepository, times(1)).save(cap.capture());
        TurnoEntity saved = cap.getValue();
        assertSame(funcionario, saved.getFuncionario());
        assertEquals(LUNES, saved.getDiaInicioTurno());
        assertEquals(LUNES, saved.getDiaFinalTurno());        // 08:00->20:00 no cruza medianoche
        assertEquals(LocalTime.of(8, 0), saved.getHoraInicio());
        assertNotNull(saved.getEjecucion(), "el turno queda ligado a su ejecución de origen");
    }

    @Test
    void generar_turnoNocturno_cruzaMedianoche_diaFinalMasUno() {
        ServicioEntity servicio = servicio(SERVICIO_ID, "Urgencias");
        RotativaEntity rotativa = rotativa(servicio);
        FuncionarioEntity funcionario = func(FUNC_ID, false);
        TipoTurnoEntity noche = tipo(2L, servicio, LocalTime.of(20, 0), LocalTime.of(8, 0));

        when(planificacionRepository.findById(PLAN_ID)).thenReturn(Optional.of(plan(servicio, rotativa, funcionario)));
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.of(servicio));
        sinReglas();
        sinEjecucionesActivas();
        guardarEjecucionAsignaId();
        when(rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(ROTATIVA_ID))
                .thenReturn(List.of(new RotativaDiaEntity(rotativa, 0, noche)));
        sinConflictosExistentes();

        service.generarTurnos(PLAN_ID, LUNES, LUNES, FIN_UNA_SEMANA, null, List.of());

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
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.of(servicio));
        sinReglas();
        sinEjecucionesActivas();
        guardarEjecucionAsignaId();
        when(rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(ROTATIVA_ID))
                .thenReturn(List.of(new RotativaDiaEntity(rotativa, 0, tipoDia)));
        // Turno ya existente (otro servicio) que solapa 10:00-12:00 con el generado 08:00-20:00.
        when(turnoRepository.findConflictosByFuncionarios(anyList(), any(), any())).thenReturn(List.of(
                turnoExistente(funcionario, otro, LUNES, LocalTime.of(10, 0), LUNES, LocalTime.of(12, 0))));

        Map<String, Object> res = service.generarTurnos(PLAN_ID, LUNES, LUNES, FIN_UNA_SEMANA, null, List.of());

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
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.of(servicio));
        sinReglas();
        sinEjecucionesActivas();
        guardarEjecucionAsignaId();
        when(rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(ROTATIVA_ID)).thenReturn(List.of(
                new RotativaDiaEntity(rotativa, 0, dia),
                new RotativaDiaEntity(rotativa, 0, solapado)));
        sinConflictosExistentes();

        Map<String, Object> res = service.generarTurnos(PLAN_ID, LUNES, LUNES, FIN_UNA_SEMANA, null, List.of());

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
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.of(servicio));
        sinReglas();
        sinEjecucionesActivas();
        guardarEjecucionAsignaId();
        when(rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(ROTATIVA_ID))
                .thenReturn(List.of(new RotativaDiaEntity(rotativa, 0, tipoDia)));
        // Existente termina EXACTO a las 08:00 (domingo 20:00 -> lunes 08:00); el nuevo empieza 08:00.
        // Intervalo medio-abierto: tocarse en el borde no cuenta como choque.
        when(turnoRepository.findConflictosByFuncionarios(anyList(), any(), any())).thenReturn(List.of(
                turnoExistente(funcionario, otro, LUNES.minusDays(1), LocalTime.of(20, 0), LUNES, LocalTime.of(8, 0))));

        Map<String, Object> res = service.generarTurnos(PLAN_ID, LUNES, LUNES, FIN_UNA_SEMANA, null, List.of());

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
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.of(servicio));
        sinReglas();
        sinEjecucionesActivas();
        guardarEjecucionAsignaId();
        when(rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(ROTATIVA_ID))
                .thenReturn(List.of(new RotativaDiaEntity(rotativa, 0, tipoDia)));

        Map<String, Object> res = service.generarTurnos(PLAN_ID, LUNES, LUNES, FIN_UNA_SEMANA, null, List.of());

        assertEquals(1, res.get("generados"));
        assertEquals(0, res.get("vacantesPorConflicto")); // vacante por eliminado, no por conflicto
        ArgumentCaptor<TurnoEntity> cap = ArgumentCaptor.forClass(TurnoEntity.class);
        verify(turnoRepository).save(cap.capture());
        assertNull(cap.getValue().getFuncionario());
    }

    @Test
    void generar_rangoMayorAUnCiclo_repiteLaSecuenciaSegunElAncla() {
        // Rotativa de 1 semana (ciclo=7): un solo turno diurno en el índice 0. Se genera un rango de
        // 3 semanas completas (21 días) -> debe repetirse 3 veces (una por cada vuelta del ciclo).
        ServicioEntity servicio = servicio(SERVICIO_ID, "Urgencias");
        RotativaEntity rotativa = rotativa(servicio);
        FuncionarioEntity funcionario = func(FUNC_ID, false);
        TipoTurnoEntity tipoDia = tipo(1L, servicio, LocalTime.of(8, 0), LocalTime.of(20, 0));

        when(planificacionRepository.findById(PLAN_ID)).thenReturn(Optional.of(plan(servicio, rotativa, funcionario)));
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.of(servicio));
        sinReglas();
        sinEjecucionesActivas();
        guardarEjecucionAsignaId();
        when(rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(ROTATIVA_ID))
                .thenReturn(List.of(new RotativaDiaEntity(rotativa, 0, tipoDia)));
        sinConflictosExistentes();

        LocalDate finTresSemanas = LUNES.plusDays(20); // 3 semanas × 7 días - 1
        Map<String, Object> res = service.generarTurnos(PLAN_ID, LUNES, LUNES, finTresSemanas, null, List.of());

        assertEquals(3, res.get("generados"), "una repetición del índice 0 por cada semana del rango");

        ArgumentCaptor<TurnoEntity> cap = ArgumentCaptor.forClass(TurnoEntity.class);
        verify(turnoRepository, times(3)).save(cap.capture());
        List<LocalDate> fechas = cap.getAllValues().stream().map(TurnoEntity::getDiaInicioTurno).sorted().toList();
        assertEquals(List.of(LUNES, LUNES.plusDays(7), LUNES.plusDays(14)), fechas);
    }

    @Test
    void generar_fechaEfectivaSemanasDespuesDelAncla_calculaFaseCorrecta() {
        // Ancla en un lunes; la vigencia efectiva empieza 2 semanas después (mismo día de ciclo,
        // índice 0) -> debe seguir generando en el índice correcto, no reiniciar la secuencia.
        ServicioEntity servicio = servicio(SERVICIO_ID, "Urgencias");
        RotativaEntity rotativa = rotativa(servicio);
        FuncionarioEntity funcionario = func(FUNC_ID, false);
        TipoTurnoEntity tipoDia = tipo(1L, servicio, LocalTime.of(8, 0), LocalTime.of(20, 0));

        when(planificacionRepository.findById(PLAN_ID)).thenReturn(Optional.of(plan(servicio, rotativa, funcionario)));
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.of(servicio));
        sinReglas();
        sinEjecucionesActivas();
        guardarEjecucionAsignaId();
        when(rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(ROTATIVA_ID))
                .thenReturn(List.of(new RotativaDiaEntity(rotativa, 0, tipoDia)));
        sinConflictosExistentes();

        LocalDate efectivaInicio = LUNES.plusDays(14); // dos semanas después, mismo índice de ciclo (0)
        LocalDate efectivaFin = efectivaInicio.plusDays(6);
        Map<String, Object> res = service.generarTurnos(PLAN_ID, LUNES, efectivaInicio, efectivaFin, null, List.of());

        assertEquals(1, res.get("generados"));
        ArgumentCaptor<TurnoEntity> cap = ArgumentCaptor.forClass(TurnoEntity.class);
        verify(turnoRepository).save(cap.capture());
        assertEquals(efectivaInicio, cap.getValue().getDiaInicioTurno(), "el turno se genera en el primer día del índice 0 dentro de la vigencia efectiva");
    }

    @Test
    void generar_seSuperponeConEjecucionActivaExistente_lanza() {
        ServicioEntity servicio = servicio(SERVICIO_ID, "Urgencias");
        RotativaEntity rotativa = rotativa(servicio);
        FuncionarioEntity funcionario = func(FUNC_ID, false);

        when(planificacionRepository.findById(PLAN_ID)).thenReturn(Optional.of(plan(servicio, rotativa, funcionario)));
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.of(servicio));
        sinReglas();
        PlanificacionEjecucionEntity existente = PlanificacionEjecucionEntity.builder()
                .idEjecucion(1L).fechaInicioRotativa(LUNES).fechaInicioEfectiva(LUNES).fechaFinEfectiva(FIN_UNA_SEMANA)
                .estado(EstadoEjecucion.ACTIVA).build();
        when(ejecucionRepository.findByServicio_IdServicioAndEstado(SERVICIO_ID, EstadoEjecucion.ACTIVA))
                .thenReturn(List.of(existente));

        assertThrows(RuntimeException.class,
                () -> service.generarTurnos(PLAN_ID, LUNES, LUNES.plusDays(3), LUNES.plusDays(10), null, List.of()));
        verify(ejecucionRepository, never()).save(any());
    }

    @Test
    void generar_contiguaSinSuperposicion_permiteGenerar() {
        ServicioEntity servicio = servicio(SERVICIO_ID, "Urgencias");
        RotativaEntity rotativa = rotativa(servicio);
        FuncionarioEntity funcionario = func(FUNC_ID, false);
        TipoTurnoEntity tipoDia = tipo(1L, servicio, LocalTime.of(8, 0), LocalTime.of(20, 0));

        when(planificacionRepository.findById(PLAN_ID)).thenReturn(Optional.of(plan(servicio, rotativa, funcionario)));
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.of(servicio));
        sinReglas();
        guardarEjecucionAsignaId();
        when(rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(ROTATIVA_ID))
                .thenReturn(List.of(new RotativaDiaEntity(rotativa, 0, tipoDia)));
        sinConflictosExistentes();
        PlanificacionEjecucionEntity existente = PlanificacionEjecucionEntity.builder()
                .idEjecucion(1L).fechaInicioRotativa(LUNES).fechaInicioEfectiva(LUNES).fechaFinEfectiva(FIN_UNA_SEMANA)
                .estado(EstadoEjecucion.ACTIVA).build();
        when(ejecucionRepository.findByServicio_IdServicioAndEstado(SERVICIO_ID, EstadoEjecucion.ACTIVA))
                .thenReturn(List.of(existente));

        // La existente termina en FIN_UNA_SEMANA; la nueva empieza al día siguiente -> sin solape.
        assertDoesNotThrow(() -> service.generarTurnos(
                PLAN_ID, LUNES, FIN_UNA_SEMANA.plusDays(1), FIN_UNA_SEMANA.plusDays(7), null, List.of()));
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

        List<Map<String, Object>> conflictos = service.detectarConflictos(PLAN_ID, LUNES, LUNES, FIN_UNA_SEMANA);

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
        sinConflictosExistentes();

        assertTrue(service.detectarConflictos(PLAN_ID, LUNES, LUNES, FIN_UNA_SEMANA).isEmpty());
    }

    // ============================ eliminarTurnosGenerados (legado) ============================

    @Test
    void eliminarTurnosGenerados_delegaEnRepositorioConRotativasDeLaPlanificacion() {
        ServicioEntity servicio = servicio(SERVICIO_ID, "Urgencias");
        RotativaEntity rotativa = rotativa(servicio);
        FuncionarioEntity funcionario = func(FUNC_ID, false);
        LocalDate fin = LUNES.plusDays(6);

        when(planificacionRepository.findById(PLAN_ID)).thenReturn(Optional.of(plan(servicio, rotativa, funcionario)));
        when(turnoRepository.softDeleteByRotativasAndRango(List.of(ROTATIVA_ID), LUNES, fin)).thenReturn(14);

        int eliminados = service.eliminarTurnosGenerados(PLAN_ID, LUNES, fin);

        assertEquals(14, eliminados);
        verify(turnoRepository).softDeleteByRotativasAndRango(List.of(ROTATIVA_ID), LUNES, fin);
    }

    @Test
    void eliminarTurnosGenerados_finAntesDeInicio_lanza() {
        ServicioEntity servicio = servicio(SERVICIO_ID, "Urgencias");
        RotativaEntity rotativa = rotativa(servicio);
        FuncionarioEntity funcionario = func(FUNC_ID, false);

        when(planificacionRepository.findById(PLAN_ID)).thenReturn(Optional.of(plan(servicio, rotativa, funcionario)));

        assertThrows(RuntimeException.class,
                () -> service.eliminarTurnosGenerados(PLAN_ID, LUNES, LUNES.minusDays(1)));
        verifyNoInteractions(turnoRepository);
    }

    @Test
    void eliminarTurnosGenerados_sinAsignaciones_noConsultaRepositorioYDevuelveCero() {
        ServicioEntity servicio = servicio(SERVICIO_ID, "Urgencias");
        PlanificacionEntity planSinAsignaciones = new PlanificacionEntity(servicio, "Plan vacío");
        planSinAsignaciones.setIdPlanificacion(PLAN_ID);

        when(planificacionRepository.findById(PLAN_ID)).thenReturn(Optional.of(planSinAsignaciones));

        int eliminados = service.eliminarTurnosGenerados(PLAN_ID, LUNES, LUNES.plusDays(6));

        assertEquals(0, eliminados);
        verifyNoInteractions(turnoRepository);
    }

    // ============================ extenderPlanificacion ============================

    @Test
    void extender_sinEjecucionActiva_lanza() {
        ServicioEntity servicio = servicio(SERVICIO_ID, "Urgencias");
        RotativaEntity rotativa = rotativa(servicio);
        FuncionarioEntity funcionario = func(FUNC_ID, false);
        when(planificacionRepository.findById(PLAN_ID)).thenReturn(Optional.of(plan(servicio, rotativa, funcionario)));
        when(ejecucionRepository.findByServicio_IdServicioAndEstadoOrderByFechaFinEfectivaDesc(SERVICIO_ID, EstadoEjecucion.ACTIVA))
                .thenReturn(List.of());

        assertThrows(RuntimeException.class,
                () -> service.extenderPlanificacion(PLAN_ID, LUNES.plusDays(30), null, List.of()));
    }

    @Test
    void extender_generaDesdeElDiaSiguienteAlFinActual_mismaAncla() {
        ServicioEntity servicio = servicio(SERVICIO_ID, "Urgencias");
        RotativaEntity rotativa = rotativa(servicio);
        FuncionarioEntity funcionario = func(FUNC_ID, false);
        TipoTurnoEntity tipoDia = tipo(1L, servicio, LocalTime.of(8, 0), LocalTime.of(20, 0));

        when(planificacionRepository.findById(PLAN_ID)).thenReturn(Optional.of(plan(servicio, rotativa, funcionario)));
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.of(servicio));
        PlanificacionEjecucionEntity vigente = PlanificacionEjecucionEntity.builder()
                .idEjecucion(1L).fechaInicioRotativa(LUNES).fechaInicioEfectiva(LUNES).fechaFinEfectiva(FIN_UNA_SEMANA)
                .estado(EstadoEjecucion.ACTIVA).build();
        when(ejecucionRepository.findByServicio_IdServicioAndEstadoOrderByFechaFinEfectivaDesc(SERVICIO_ID, EstadoEjecucion.ACTIVA))
                .thenReturn(List.of(vigente));
        when(ejecucionRepository.findByServicio_IdServicioAndEstado(SERVICIO_ID, EstadoEjecucion.ACTIVA))
                .thenReturn(List.of(vigente));
        sinReglas();
        guardarEjecucionAsignaId();
        when(rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(ROTATIVA_ID))
                .thenReturn(List.of(new RotativaDiaEntity(rotativa, 0, tipoDia)));
        sinConflictosExistentes();

        LocalDate nuevoFin = FIN_UNA_SEMANA.plusDays(7);
        Map<String, Object> res = service.extenderPlanificacion(PLAN_ID, nuevoFin, null, List.of());

        assertEquals(1, res.get("generados"));
        ArgumentCaptor<TurnoEntity> cap = ArgumentCaptor.forClass(TurnoEntity.class);
        verify(turnoRepository).save(cap.capture());
        assertEquals(FIN_UNA_SEMANA.plusDays(1), cap.getValue().getDiaInicioTurno());
    }

    // ============================ acortarPlanificacion ============================

    @Test
    void acortar_fechaAnteriorAHoy_lanza() {
        PlanificacionEjecucionEntity ejecucion = PlanificacionEjecucionEntity.builder()
                .idEjecucion(EJECUCION_ID).fechaInicioRotativa(LUNES).fechaInicioEfectiva(LUNES)
                .fechaFinEfectiva(LUNES.plusDays(60)).estado(EstadoEjecucion.ACTIVA).build();
        when(ejecucionRepository.findById(EJECUCION_ID)).thenReturn(Optional.of(ejecucion));

        assertThrows(RuntimeException.class,
                () -> service.acortarPlanificacion(EJECUCION_ID, LocalDate.now().minusDays(1), null));
    }

    @Test
    void acortar_fechaNoPosteriorAlInicioEfectivo_lanza() {
        LocalDate inicio = LocalDate.now().plusDays(5);
        PlanificacionEjecucionEntity ejecucion = PlanificacionEjecucionEntity.builder()
                .idEjecucion(EJECUCION_ID).fechaInicioRotativa(inicio).fechaInicioEfectiva(inicio)
                .fechaFinEfectiva(inicio.plusDays(60)).estado(EstadoEjecucion.ACTIVA).build();
        when(ejecucionRepository.findById(EJECUCION_ID)).thenReturn(Optional.of(ejecucion));

        assertThrows(RuntimeException.class,
                () -> service.acortarPlanificacion(EJECUCION_ID, inicio, null));
    }

    @Test
    void acortar_happyPath_desactivaTurnosFuturosYActualizaFin() {
        LocalDate inicio = LocalDate.now().plusDays(1);
        LocalDate finOriginal = inicio.plusDays(60);
        LocalDate fechaDesdeEliminar = inicio.plusDays(11); // primer día que se elimina
        LocalDate nuevoFinEsperado = fechaDesdeEliminar.minusDays(1); // último día que se conserva
        PlanificacionEjecucionEntity ejecucion = PlanificacionEjecucionEntity.builder()
                .idEjecucion(EJECUCION_ID).fechaInicioRotativa(inicio).fechaInicioEfectiva(inicio)
                .fechaFinEfectiva(finOriginal).estado(EstadoEjecucion.ACTIVA).build();
        when(ejecucionRepository.findById(EJECUCION_ID)).thenReturn(Optional.of(ejecucion));
        when(turnoRepository.findByEjecucion_IdEjecucion(EJECUCION_ID)).thenReturn(List.of());
        when(turnoRepository.softDeleteByEjecucionDesde(EJECUCION_ID, fechaDesdeEliminar)).thenReturn(5);
        when(ejecucionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> res = service.acortarPlanificacion(EJECUCION_ID, fechaDesdeEliminar, null);

        assertEquals(5, res.get("turnosDesactivados"));
        assertEquals(nuevoFinEsperado, ejecucion.getFechaFinEfectiva());
        verify(turnoRepository).softDeleteByEjecucionDesde(EJECUCION_ID, fechaDesdeEliminar);
    }

    // ============================ anularEjecucion ============================

    @Test
    void anularEjecucion_marcaAnuladaYEliminaSoloSusTurnos() {
        PlanificacionEjecucionEntity ejecucion = PlanificacionEjecucionEntity.builder()
                .idEjecucion(EJECUCION_ID).fechaInicioRotativa(LUNES).fechaInicioEfectiva(LUNES)
                .fechaFinEfectiva(FIN_UNA_SEMANA).estado(EstadoEjecucion.ACTIVA).build();
        when(ejecucionRepository.findById(EJECUCION_ID)).thenReturn(Optional.of(ejecucion));
        when(turnoRepository.softDeleteByEjecucionDesde(EJECUCION_ID, LUNES)).thenReturn(7);
        when(ejecucionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        int eliminados = service.anularEjecucion(EJECUCION_ID, null);

        assertEquals(7, eliminados);
        assertEquals(EstadoEjecucion.ANULADA, ejecucion.getEstado());
        verify(turnoRepository).softDeleteByEjecucionDesde(EJECUCION_ID, LUNES);
    }

    @Test
    void anularEjecucion_yaAnulada_lanza() {
        PlanificacionEjecucionEntity ejecucion = PlanificacionEjecucionEntity.builder()
                .idEjecucion(EJECUCION_ID).estado(EstadoEjecucion.ANULADA).build();
        when(ejecucionRepository.findById(EJECUCION_ID)).thenReturn(Optional.of(ejecucion));

        assertThrows(RuntimeException.class, () -> service.anularEjecucion(EJECUCION_ID, null));
        verify(turnoRepository, never()).softDeleteByEjecucionDesde(anyLong(), any());
    }

    // ============================ editarPlanificacionDesde ============================

    @Test
    void editarDesde_fechaRetroactiva_lanza() {
        assertThrows(RuntimeException.class,
                () -> service.editarPlanificacionDesde(PLAN_ID, LocalDate.now().minusDays(1),
                        LocalDate.now().plusDays(30), null, null, List.of()));
    }

    @Test
    void editarDesde_truncaEjecucionVigenteYGeneraNuevaConMismaAncla() {
        ServicioEntity servicio = servicio(SERVICIO_ID, "Urgencias");
        RotativaEntity rotativa = rotativa(servicio);
        FuncionarioEntity funcionario = func(FUNC_ID, false);
        TipoTurnoEntity tipoDia = tipo(1L, servicio, LocalTime.of(8, 0), LocalTime.of(20, 0));

        LocalDate ancla = LocalDate.now().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        LocalDate fechaDesde = LocalDate.now().plusDays(10);
        LocalDate nuevoFin = fechaDesde.plusDays(6);

        when(planificacionRepository.findById(PLAN_ID)).thenReturn(Optional.of(plan(servicio, rotativa, funcionario)));
        when(servicioRepository.findById(SERVICIO_ID)).thenReturn(Optional.of(servicio));

        PlanificacionEjecucionEntity vigente = PlanificacionEjecucionEntity.builder()
                .idEjecucion(1L).fechaInicioRotativa(ancla).fechaInicioEfectiva(ancla)
                .fechaFinEfectiva(fechaDesde.plusDays(60)).estado(EstadoEjecucion.ACTIVA).build();
        when(ejecucionRepository.findVigenteEnFecha(SERVICIO_ID, fechaDesde, EstadoEjecucion.ACTIVA))
                .thenReturn(Optional.of(vigente));
        when(ejecucionRepository.findByServicio_IdServicioAndEstado(SERVICIO_ID, EstadoEjecucion.ACTIVA))
                .thenReturn(List.of(vigente));
        when(ejecucionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(turnoRepository.softDeleteByEjecucionDesde(1L, fechaDesde)).thenReturn(9);

        sinReglas();
        guardarEjecucionAsignaId();
        when(rotativaDiaRepository.findByRotativa_IdRotativaOrderByDiaIndexAsc(ROTATIVA_ID))
                .thenReturn(List.of(new RotativaDiaEntity(rotativa, 0, tipoDia)));
        sinConflictosExistentes();

        service.editarPlanificacionDesde(PLAN_ID, fechaDesde, nuevoFin, null, null, List.of());

        // La ejecución previa queda truncada el día anterior a fechaDesde, no anulada.
        assertEquals(fechaDesde.minusDays(1), vigente.getFechaFinEfectiva());
        assertEquals(EstadoEjecucion.ACTIVA, vigente.getEstado());
        verify(turnoRepository).softDeleteByEjecucionDesde(1L, fechaDesde);

        // La nueva ejecución conserva el mismo ancla de rotativa que la truncada.
        ArgumentCaptor<PlanificacionEjecucionEntity> cap = ArgumentCaptor.forClass(PlanificacionEjecucionEntity.class);
        verify(ejecucionRepository, atLeastOnce()).save(cap.capture());
        boolean algunaConAnclaOriginal = cap.getAllValues().stream()
                .anyMatch(e -> ancla.equals(e.getFechaInicioRotativa()) && fechaDesde.equals(e.getFechaInicioEfectiva()));
        assertTrue(algunaConAnclaOriginal, "la nueva ejecución debe preservar el ancla de rotativa de la anterior");
    }
}
