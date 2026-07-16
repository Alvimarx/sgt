package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.PuestoRepository;
import com.pingeso.HUAP.Repository.SolicitudRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Pruebas de {@link TurnoService}. A diferencia del resto de la suite, este servicio usa inyección
 * por campo ({@code @Autowired}), por lo que se prueba con {@code @Mock}/{@code @InjectMocks}.
 * Foco: el guardado con validación de conflicto y el motor de unión de intervalos
 * ({@code computeUnionHours}) que evita el doble conteo de horas superpuestas.
 */
@ExtendWith(MockitoExtension.class)
class TurnoServiceTest {

    private static final LocalDate LUNES = LocalDate.of(2026, 6, 8);

    @Mock private TurnoRepository turnoRepository;
    @Mock private PuestoRepository puestoRepository;
    @Mock private FuncionarioRepository funcionarioRepository;
    @Mock private SolicitudRepository solicitudRepository;

    @InjectMocks private TurnoService turnoService;

    private static FuncionarioEntity func(long id) {
        return FuncionarioEntity.builder().idFuncionario(id).nombre("Juan").apelPat("Pérez").build();
    }

    private static TurnoEntity turno(FuncionarioEntity func, LocalDate di, LocalTime hi, LocalDate df, LocalTime hf) {
        return TurnoEntity.builder()
                .funcionario(func)
                .diaInicioTurno(di).horaInicio(hi).diaFinalTurno(df).horaFin(hf)
                .build();
    }

    // ============================ saveTurno ============================

    @Test
    void save_funcionarioConTurnoSolapado_lanza() {
        FuncionarioEntity funcionario = func(1L);
        TurnoEntity nuevo = turno(funcionario, LUNES, LocalTime.of(8, 0), LUNES, LocalTime.of(20, 0)); // idTurno null
        TurnoEntity existente = TurnoEntity.builder().idTurno(99L).build();
        when(turnoRepository.findConflictosByFuncionario(eq(1L), any(), any())).thenReturn(List.of(existente));

        assertThrows(Exception.class, () -> turnoService.saveTurno(nuevo));
        verify(turnoRepository, never()).save(any());
    }

    @Test
    void save_sinFuncionario_guardaSinValidarConflicto() throws Exception {
        TurnoEntity vacante = TurnoEntity.builder()
                .diaInicioTurno(LUNES).horaInicio(LocalTime.of(8, 0))
                .diaFinalTurno(LUNES).horaFin(LocalTime.of(20, 0))
                .build(); // funcionario null
        when(turnoRepository.save(vacante)).thenReturn(vacante);

        assertSame(vacante, turnoService.saveTurno(vacante));
    }

    @Test
    void save_updateMismoTurno_noSeAutoConflicta_guarda() throws Exception {
        FuncionarioEntity funcionario = func(1L);
        TurnoEntity turnoExistente = turno(funcionario, LUNES, LocalTime.of(8, 0), LUNES, LocalTime.of(20, 0));
        turnoExistente.setIdTurno(5L);
        // El único "conflicto" que devuelve la BD es el mismo turno (id 5): debe ignorarse.
        when(turnoRepository.findConflictosByFuncionario(eq(1L), any(), any()))
                .thenReturn(List.of(turnoExistente));
        when(turnoRepository.save(turnoExistente)).thenReturn(turnoExistente);

        assertSame(turnoExistente, turnoService.saveTurno(turnoExistente));
    }

    // ============================ computeUnionHours (vía getCoberturaRealByServicio) ============================

    @Test
    void cobertura_intervalosDisjuntos_sumaDirecta() {
        FuncionarioEntity f = func(1L);
        List<TurnoEntity> turnos = List.of(
                turno(f, LUNES, LocalTime.of(8, 0), LUNES, LocalTime.of(12, 0)),   // 4h
                turno(f, LUNES, LocalTime.of(14, 0), LUNES, LocalTime.of(18, 0)));  // 4h
        when(turnoRepository.findByServicioIdAndDateRange(1L, LUNES, LUNES)).thenReturn(turnos);

        Map<String, Object> cob = turnoService.getCoberturaRealByServicio(1L, LUNES, LUNES);
        assertEquals(8.0, (double) cob.get("horasRealesCubiertas"), 1e-9);
    }

    @Test
    void cobertura_intervalosSolapados_cuentaUnionSinDuplicar() {
        FuncionarioEntity f = func(1L);
        List<TurnoEntity> turnos = List.of(
                turno(f, LUNES, LocalTime.of(8, 0), LUNES, LocalTime.of(12, 0)),   // 08-12
                turno(f, LUNES, LocalTime.of(10, 0), LUNES, LocalTime.of(14, 0))); // 10-14  => unión 08-14 = 6h
        when(turnoRepository.findByServicioIdAndDateRange(1L, LUNES, LUNES)).thenReturn(turnos);

        Map<String, Object> cob = turnoService.getCoberturaRealByServicio(1L, LUNES, LUNES);
        assertEquals(6.0, (double) cob.get("horasRealesCubiertas"), 1e-9);
    }

    @Test
    void cobertura_soloCuentaTurnosAsignados() {
        FuncionarioEntity f = func(1L);
        List<TurnoEntity> turnos = List.of(
                turno(f, LUNES, LocalTime.of(8, 0), LUNES, LocalTime.of(12, 0)),        // asignado, 4h
                turno(null, LUNES, LocalTime.of(14, 0), LUNES, LocalTime.of(18, 0)));   // vacante -> ignorado
        when(turnoRepository.findByServicioIdAndDateRange(1L, LUNES, LUNES)).thenReturn(turnos);

        Map<String, Object> cob = turnoService.getCoberturaRealByServicio(1L, LUNES, LUNES);
        assertEquals(4.0, (double) cob.get("horasRealesCubiertas"), 1e-9);
    }

    @Test
    void cobertura_sinTurnos_devuelveCero() {
        when(turnoRepository.findByServicioIdAndDateRange(1L, LUNES, LUNES)).thenReturn(List.of());

        Map<String, Object> cob = turnoService.getCoberturaRealByServicio(1L, LUNES, LUNES);
        assertEquals(0.0, (double) cob.get("horasRealesCubiertas"), 1e-9);
    }

    // ============================ getTurnosStatsByServicio ============================

    @Test
    void stats_sinTurnos_porcentajeCero() {
        when(turnoRepository.findByServicioIdAndDateRange(1L, LUNES, LUNES)).thenReturn(List.of());

        Map<String, Object> stats = turnoService.getTurnosStatsByServicio(1L, LUNES, LUNES);
        assertEquals(0L, stats.get("totalTurnos"));
        assertEquals(0.0, (double) stats.get("porcentajeCobertura"), 1e-9);
    }

    @Test
    void stats_asignacionParcial_redondeaDosDecimales() {
        FuncionarioEntity f = func(1L);
        // 1 de 3 asignados -> 33.33 %
        List<TurnoEntity> turnos = List.of(
                turno(f, LUNES, LocalTime.of(8, 0), LUNES, LocalTime.of(12, 0)),
                turno(null, LUNES, LocalTime.of(8, 0), LUNES, LocalTime.of(12, 0)),
                turno(null, LUNES, LocalTime.of(8, 0), LUNES, LocalTime.of(12, 0)));
        when(turnoRepository.findByServicioIdAndDateRange(1L, LUNES, LUNES)).thenReturn(turnos);

        Map<String, Object> stats = turnoService.getTurnosStatsByServicio(1L, LUNES, LUNES);
        assertEquals(3L, stats.get("totalTurnos"));
        assertEquals(1L, stats.get("turnosAsignados"));
        assertEquals(2L, stats.get("turnosVacantes"));
        assertEquals(33.33, (double) stats.get("porcentajeCobertura"), 1e-9);
    }

    // ============================ getTurnosByMedicoAndMonthAndYear ============================

    @Test
    void turnosPorMes_consultaRangoPrimerAUltimoDiaDelMes() {
        when(turnoRepository.findByFuncionarioIdAndDateRange(anyLong(), any(), any())).thenReturn(List.of());

        turnoService.getTurnosByMedicoAndMonthAndYear(1L, 2, 2026);  // febrero (28 días, no bisiesto)
        turnoService.getTurnosByMedicoAndMonthAndYear(1L, 4, 2026);  // abril (30 días)
        turnoService.getTurnosByMedicoAndMonthAndYear(1L, 1, 2026);  // enero (31 días)

        verify(turnoRepository).findByFuncionarioIdAndDateRange(1L, LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 28));
        verify(turnoRepository).findByFuncionarioIdAndDateRange(1L, LocalDate.of(2026, 4, 1), LocalDate.of(2026, 4, 30));
        verify(turnoRepository).findByFuncionarioIdAndDateRange(1L, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31));
    }
}
