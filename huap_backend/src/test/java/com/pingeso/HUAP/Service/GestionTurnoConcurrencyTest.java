package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.AbstractContainerTest;
import com.pingeso.HUAP.DTO.AlterarTurnoRequest;
import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.RolServicioEntity;
import com.pingeso.HUAP.Entity.RolSistemaEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.ServiciosFuncionarioEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.RolServicioRepository;
import com.pingeso.HUAP.Repository.RolSistemaRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Repository.ServiciosFuncionarioRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static com.pingeso.HUAP.Deadlocks.esDeadlock;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Prueba de CONCURRENCIA del "lost update": varios admins asignando funcionarios DISTINTOS al MISMO
 * turno vacante a la vez (vía {@link GestionTurnoService#alterarTurno} con acción ASIGNAR). Contexto
 * completo ({@code @SpringBootTest}) contra MySQL real (Testcontainers), commits reales.
 *
 * <p><b>Qué valida:</b> que el lock pesimista de la fila del turno serialice las operaciones sobre el
 * mismo turno, de modo que <b>exactamente una</b> asignación tenga éxito y el resto sea rechazado por
 * el guard de negocio ("ya tiene funcionario, use REASIGNAR"), <b>sin ningún deadlock</b>.
 *
 * <p><b>Por qué se cuentan los deadlocks:</b> sin ellos el test sería vacuo — pasaría igual sin el
 * lock. Sin el lock los 8 hilos no alcanzan a pisarse: se matan entre sí con error 1213 y sobrevive
 * uno, así que {@code exitos == 1} se cumple igual, por la razón equivocada. El deadlock viene de que
 * {@link com.pingeso.HUAP.Entity.BitacoraEntity} tiene FK a {@code Turnos} y PK {@code IDENTITY}: su
 * INSERT se ejecuta de inmediato y toma un lock COMPARTIDO sobre la fila del turno, mientras que el
 * {@code UPDATE Turnos} llega en el flush del commit y necesita el EXCLUSIVO. Todos tienen S y todos
 * piden X → ciclo. Con el lock, {@code findByIdForUpdate} toma X primero y nadie más llega a tomar S.
 *
 * <p>Es decir: la aserción {@code deadlocks == 0} es la que de verdad falla al correr con
 * {@code -Dhuap.concurrencia.lock-pesimista=false}. Requiere Docker.
 */
class GestionTurnoConcurrencyTest extends AbstractContainerTest {

    private static final LocalDate DIA = LocalDate.of(2026, 6, 8);
    private static final int CANDIDATOS = 6;

    @Autowired private GestionTurnoService gestionTurnoService;
    @Autowired private TurnoRepository turnoRepository;
    @Autowired private FuncionarioRepository funcionarioRepository;
    @Autowired private ServicioRepository servicioRepository;
    @Autowired private RolSistemaRepository rolSistemaRepository;
    @Autowired private RolServicioRepository rolServicioRepository;
    @Autowired private ServiciosFuncionarioRepository serviciosFuncionarioRepository;

    private Long turnoId;
    private Long adminId;
    private final List<Long> candidatoIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        RolSistemaEntity rolSistema = rolSistemaRepository.save(new RolSistemaEntity("MEDICO"));
        RolServicioEntity rolServicio = rolServicioRepository.save(new RolServicioEntity("MEDICO"));
        ServicioEntity servicio = servicioRepository.save(ServicioEntity.builder().nombre("Urgencias").build());

        adminId = funcionarioRepository.save(nuevoFuncionario("ADMIN", rolSistema)).getIdFuncionario();

        // N candidatos, cada uno vinculado al servicio (lo exige validarFuncionarioAsignable).
        for (int i = 0; i < CANDIDATOS; i++) {
            FuncionarioEntity cand = funcionarioRepository.save(nuevoFuncionario("CAND" + i, rolSistema));
            serviciosFuncionarioRepository.save(new ServiciosFuncionarioEntity(cand, servicio, rolServicio));
            candidatoIds.add(cand.getIdFuncionario());
        }

        // Turno vacante (funcionario == null) del servicio.
        TurnoEntity turno = TurnoEntity.builder()
                .servicio(servicio).funcionario(null)
                .diaInicioTurno(DIA).horaInicio(LocalTime.of(8, 0))
                .diaFinalTurno(DIA).horaFin(LocalTime.of(20, 0))
                .build();
        turnoId = turnoRepository.save(turno).getIdTurno();
    }

    private FuncionarioEntity nuevoFuncionario(String rut, RolSistemaEntity rol) {
        return FuncionarioEntity.builder()
                .nombre(rut).apelPat("Apellido").rut(rut).dv("1")
                .estado(1).rolSistema(rol)
                .build();
    }

    @Test
    void asignacionesConcurrentes_alMismoTurno_soloUnaDebeGanar() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(CANDIDATOS);
        CyclicBarrier barrera = new CyclicBarrier(CANDIDATOS);
        CountDownLatch fin = new CountDownLatch(CANDIDATOS);
        AtomicInteger exitos = new AtomicInteger();
        AtomicInteger rechazos = new AtomicInteger();
        AtomicInteger deadlocks = new AtomicInteger();

        for (int i = 0; i < CANDIDATOS; i++) {
            Long idCandidato = candidatoIds.get(i);
            pool.submit(() -> {
                try {
                    AlterarTurnoRequest req = new AlterarTurnoRequest();
                    req.setIdTurno(turnoId);
                    req.setAccion("ASIGNAR");
                    req.setIdNuevoMedico(idCandidato);   // cada hilo asigna una persona DISTINTA
                    req.setIdAdministrador(adminId);
                    req.setMotivo("test concurrencia");

                    barrera.await(); // todos entran a alterarTurno casi al mismo tiempo
                    gestionTurnoService.alterarTurno(req);
                    exitos.incrementAndGet();
                } catch (Exception e) {
                    // El 2º+ debe caer acá por el guard "ya tiene funcionario" (rechazo de negocio).
                    // Sin el lock caen acá también, pero por deadlock: son cosas distintas.
                    if (esDeadlock(e)) {
                        deadlocks.incrementAndGet();
                    } else {
                        rechazos.incrementAndGet();
                    }
                } finally {
                    fin.countDown();
                }
            });
        }

        assertThat(fin.await(30, TimeUnit.SECONDS)).as("los hilos terminaron a tiempo").isTrue();
        pool.shutdownNow();

        TurnoEntity turnoFinal = turnoRepository.findById(turnoId).orElseThrow();

        // Invariante: una sola asignación gana; el turno queda asignado a exactamente un funcionario.
        assertThat(exitos.get())
                .as("asignaciones exitosas al mismo turno (rechazos=%d, deadlocks=%d)",
                        rechazos.get(), deadlocks.get())
                .isEqualTo(1);
        assertThat(turnoFinal.getFuncionario()).as("el turno quedó asignado").isNotNull();
        assertThat(candidatoIds).contains(turnoFinal.getFuncionario().getIdFuncionario());

        // La aserción que hace que este test pruebe algo: con el lock la serialización es limpia, así
        // que los CANDIDATOS-1 rechazos deben ser TODOS de negocio. Sin el lock aparecen deadlocks.
        assertThat(deadlocks.get())
                .as("el lock debe serializar sin deadlocks: los rechazos son de negocio, no error 1213")
                .isZero();
        assertThat(rechazos.get())
                .as("los demás candidatos fueron rechazados por el guard de negocio")
                .isEqualTo(CANDIDATOS - 1);
    }
}
