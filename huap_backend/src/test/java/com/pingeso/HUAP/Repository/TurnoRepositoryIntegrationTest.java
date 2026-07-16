package com.pingeso.HUAP.Repository;

import com.pingeso.HUAP.AbstractContainerTest;
import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.RolSistemaEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests de integración de {@link TurnoRepository} contra un MySQL 8.0 real (Testcontainers), la misma
 * imagen que dev. Valida lo que Mockito no puede: que las queries JPQL apliquen bien el solape por
 * rango de fechas ({@code diaFinalTurno >= :inicio AND diaInicioTurno <= :fin}), el soft-delete
 * ({@code eliminado = false}) y el filtro de vacantes ({@code funcionario IS NULL}).
 *
 * Requiere Docker corriendo al ejecutar `mvn test`.
 */
@Transactional   // rollback por test => aislamiento (reemplaza el que daba @DataJpaTest)
class TurnoRepositoryIntegrationTest extends AbstractContainerTest {

    private static final LocalDate ENE_1 = LocalDate.of(2026, 1, 1);
    private static final LocalDate JUN_1 = LocalDate.of(2026, 6, 1);
    private static final LocalDate JUN_7 = LocalDate.of(2026, 6, 7);
    private static final LocalDate JUN_8 = LocalDate.of(2026, 6, 8);
    private static final LocalDate JUN_9 = LocalDate.of(2026, 6, 9);
    private static final LocalDate JUN_10 = LocalDate.of(2026, 6, 10);
    private static final LocalDate JUN_30 = LocalDate.of(2026, 6, 30);
    private static final LocalTime H8 = LocalTime.of(8, 0);
    private static final LocalTime H20 = LocalTime.of(20, 0);

    @Autowired private TurnoRepository turnoRepository;
    @PersistenceContext private EntityManager em;

    private RolSistemaEntity rol;
    private int seq;

    @BeforeEach
    void setUp() {
        rol = new RolSistemaEntity("MEDICO");
        em.persist(rol);
    }

    // ---------------------------------------------------------------- fixtures

    private ServicioEntity servicio(String nombre) {
        ServicioEntity s = ServicioEntity.builder().nombre(nombre).build();
        em.persist(s);
        return s;
    }

    private FuncionarioEntity funcionario() {
        seq++;
        FuncionarioEntity f = FuncionarioEntity.builder()
                .nombre("Func" + seq).apelPat("Apellido")
                .rut("RUT" + seq).dv("K")   // unique (Rut, DV): rut distinto por funcionario
                .estado(1).rolSistema(rol)
                .build();
        em.persist(f);
        return f;
    }

    private TurnoEntity turno(ServicioEntity servicio, FuncionarioEntity func,
                              LocalDate di, LocalDate df, boolean eliminado) {
        TurnoEntity t = TurnoEntity.builder()
                .servicio(servicio).funcionario(func)
                .diaInicioTurno(di).horaInicio(H8).diaFinalTurno(df).horaFin(H20)
                .eliminado(eliminado)
                .build();
        em.persist(t);
        return t;
    }

    private void flushAndClear() {
        em.flush();
        em.clear();
    }

    // ======================= findConflictosByFuncionario =======================

    @Test
    void findConflictos_soloTurnosEnRangoDelFuncionarioNoEliminados() {
        ServicioEntity servicio = servicio("Urgencias");
        FuncionarioEntity a = funcionario();
        FuncionarioEntity b = funcionario();

        TurnoEntity dentro = turno(servicio, a, JUN_8, JUN_8, false);
        turno(servicio, a, ENE_1, ENE_1, false);          // fuera de rango
        turno(servicio, a, JUN_8, JUN_8, true);           // eliminado
        turno(servicio, b, JUN_8, JUN_8, false);          // otro funcionario
        flushAndClear();

        List<TurnoEntity> res = turnoRepository.findConflictosByFuncionario(a.getIdFuncionario(), JUN_1, JUN_30);

        assertThat(res).extracting(TurnoEntity::getIdTurno).containsExactly(dentro.getIdTurno());
    }

    @Test
    void findConflictos_bordeInclusivo_diaFinalIgualAlInicioDelRango() {
        ServicioEntity servicio = servicio("Urgencias");
        FuncionarioEntity a = funcionario();

        // Turno domingo->lunes; su diaFinalTurno (JUN_8) coincide con el inicio del rango (JUN_8).
        // La condición usa >=, por lo que debe incluirse.
        TurnoEntity borde = turno(servicio, a, JUN_7, JUN_8, false);
        flushAndClear();

        List<TurnoEntity> res = turnoRepository.findConflictosByFuncionario(a.getIdFuncionario(), JUN_8, JUN_10);

        assertThat(res).extracting(TurnoEntity::getIdTurno).containsExactly(borde.getIdTurno());
    }

    // ======================= findConflictosByFuncionarios (IN) =======================

    @Test
    void findConflictosPorVariosFuncionarios_incluyeSoloLosDeLaLista() {
        ServicioEntity servicio = servicio("Urgencias");
        FuncionarioEntity a = funcionario();
        FuncionarioEntity b = funcionario();
        FuncionarioEntity c = funcionario();

        TurnoEntity ta = turno(servicio, a, JUN_8, JUN_8, false);
        TurnoEntity tb = turno(servicio, b, JUN_9, JUN_9, false);
        turno(servicio, c, JUN_8, JUN_8, false); // c no está en la lista
        flushAndClear();

        List<TurnoEntity> res = turnoRepository.findConflictosByFuncionarios(
                List.of(a.getIdFuncionario(), b.getIdFuncionario()), JUN_1, JUN_30);

        assertThat(res).extracting(TurnoEntity::getIdTurno)
                .containsExactlyInAnyOrder(ta.getIdTurno(), tb.getIdTurno());
    }

    // ======================= findByServicioIdAndDateRange =======================

    @Test
    void findByServicioIdAndDateRange_solapaRangoYExcluyeEliminadoYOtroServicio() {
        ServicioEntity urgencias = servicio("Urgencias");
        ServicioEntity cirugia = servicio("Cirugía");
        FuncionarioEntity a = funcionario();

        TurnoEntity dentro = turno(urgencias, a, JUN_8, JUN_8, false);
        turno(urgencias, a, ENE_1, ENE_1, false);   // fuera de rango
        turno(urgencias, a, JUN_8, JUN_8, true);    // eliminado
        turno(cirugia, a, JUN_8, JUN_8, false);     // otro servicio
        flushAndClear();

        List<TurnoEntity> res = turnoRepository.findByServicioIdAndDateRange(urgencias.getIdServicio(), JUN_1, JUN_30);

        assertThat(res).extracting(TurnoEntity::getIdTurno).containsExactly(dentro.getIdTurno());
    }

    // ======================= findUnassignedTurnosByServicio =======================

    @Test
    void findUnassigned_soloVacantesNoEliminadas() {
        ServicioEntity servicio = servicio("Urgencias");
        FuncionarioEntity a = funcionario();

        TurnoEntity vacante = turno(servicio, null, JUN_8, JUN_8, false);
        turno(servicio, a, JUN_8, JUN_8, false);      // asignado -> excluido
        turno(servicio, null, JUN_9, JUN_9, true);    // vacante pero eliminado -> excluido
        flushAndClear();

        List<TurnoEntity> res = turnoRepository.findUnassignedTurnosByServicio(servicio.getIdServicio());

        assertThat(res).extracting(TurnoEntity::getIdTurno).containsExactly(vacante.getIdTurno());
    }

    @Test
    void findUnassignedPorRango_ordenadoPorDiaInicioAscendente() {
        ServicioEntity servicio = servicio("Urgencias");
        FuncionarioEntity a = funcionario();

        // Insertadas fuera de orden; la query debe devolverlas por diaInicioTurno ASC.
        turno(servicio, null, JUN_10, JUN_10, false);
        turno(servicio, null, JUN_8, JUN_8, false);
        turno(servicio, null, JUN_9, JUN_9, false);
        turno(servicio, a, JUN_8, JUN_8, false);     // asignado -> excluido
        turno(servicio, null, ENE_1, ENE_1, false);  // fuera de rango -> excluido
        flushAndClear();

        List<TurnoEntity> res = turnoRepository.findUnassignedTurnosByServicioAndDateRange(
                servicio.getIdServicio(), JUN_1, JUN_30);

        assertThat(res).extracting(TurnoEntity::getDiaInicioTurno).containsExactly(JUN_8, JUN_9, JUN_10);
    }

    // ======================= countDistinctFuncionariosByServicioAndDateRange =======================

    @Test
    void countDistinctFuncionarios_mismoFuncionarioUnaVez_vacantesYEliminadosNoCuentan() {
        ServicioEntity servicio = servicio("Urgencias");
        FuncionarioEntity a = funcionario();
        FuncionarioEntity b = funcionario();
        FuncionarioEntity c = funcionario();

        turno(servicio, a, JUN_8, JUN_8, false);
        turno(servicio, a, JUN_9, JUN_9, false);   // mismo funcionario -> sigue contando 1
        turno(servicio, b, JUN_8, JUN_8, false);
        turno(servicio, null, JUN_8, JUN_8, false); // vacante -> no cuenta
        turno(servicio, c, JUN_8, JUN_8, true);     // eliminado -> no cuenta
        flushAndClear();

        Long count = turnoRepository.countDistinctFuncionariosByServicioAndDateRange(
                servicio.getIdServicio(), JUN_1, JUN_30);

        assertThat(count).isEqualTo(2L); // A y B
    }

    // ======================= findByServicio_IdServicioAndDiaInicioTurnoAndFuncionarioIsNull =======================

    @Test
    void findVacantesPorDiaInicioExacto() {
        ServicioEntity servicio = servicio("Urgencias");
        FuncionarioEntity a = funcionario();

        TurnoEntity vacanteJun8 = turno(servicio, null, JUN_8, JUN_8, false);
        turno(servicio, null, JUN_9, JUN_9, false);  // otro día -> excluido
        turno(servicio, a, JUN_8, JUN_8, false);     // mismo día pero asignado -> excluido
        flushAndClear();

        List<TurnoEntity> res = turnoRepository.findByServicio_IdServicioAndDiaInicioTurnoAndFuncionarioIsNull(
                servicio.getIdServicio(), JUN_8);

        assertThat(res).extracting(TurnoEntity::getIdTurno).containsExactly(vacanteJun8.getIdTurno());
    }
}
