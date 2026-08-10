package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.AbstractContainerTest;
import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.RolSistemaEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.RolSistemaRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Prueba de CONCURRENCIA (doble-reserva) sobre {@link TurnoService#saveTurno}. Levanta el contexto
 * completo ({@code @SpringBootTest}) contra un MySQL real (Testcontainers) — a diferencia de
 * {@code @DataJpaTest}, aquí cada llamada al service COMMITEA de verdad, condición necesaria para
 * que los hilos se vean entre sí.
 *
 * <p><b>Qué valida:</b> el invariante de seguridad de que un mismo funcionario no puede terminar con
 * dos turnos solapados. {@code saveTurno} valida el conflicto y recién después inserta
 * (<i>check-then-act</i>): si varios hilos pasan la validación a la vez (ninguno ve todavía el turno
 * de los otros), todos insertan y se produce la doble-reserva.
 *
 * <p><b>Estado:</b> con el fix aplicado (lock pesimista <i>SELECT ... FOR UPDATE</i> sobre el
 * funcionario en {@code saveTurno}, vía {@code FuncionarioRepository.lockFuncionario}) este test
 * PASA: solo 1 inserción gana y el resto se rechaza. Queda como guardia anti-regresión. Requiere Docker.
 */
class TurnoConcurrencyTest extends AbstractContainerTest {

    private static final LocalDate DIA = LocalDate.of(2026, 6, 8);

    @Autowired private TurnoService turnoService;
    @Autowired private TurnoRepository turnoRepository;
    @Autowired private FuncionarioRepository funcionarioRepository;
    @Autowired private ServicioRepository servicioRepository;
    @Autowired private RolSistemaRepository rolSistemaRepository;

    private ServicioEntity servicio;
    private FuncionarioEntity funcionario;

    @BeforeEach
    void setUp() {
        RolSistemaEntity rol = rolSistemaRepository.save(new RolSistemaEntity("MEDICO"));
        servicio = servicioRepository.save(ServicioEntity.builder().nombre("Urgencias").build());
        funcionario = funcionarioRepository.save(FuncionarioEntity.builder()
                .nombre("Juan").apelPat("Pérez").rut("CONCURRENCIA").dv("1")
                .estado(1).rolSistema(rol)
                .build());
    }

    // Sin @AfterEach: con el contenedor compartido, un deleteAll() global chocaría con FKs de otras
    // clases (p. ej. Bitacora_eventos -> Turnos). El test es auto-aislado: usa un RUT único y asserta
    // solo sobre su propio funcionario por id, así que los datos residuales no le afectan.
    @Test
    void insercionesConcurrentes_delMismoFuncionario_noDebenProducirDobleReserva() throws Exception {
        int hilos = 8;
        ExecutorService pool = Executors.newFixedThreadPool(hilos);
        CyclicBarrier barrera = new CyclicBarrier(hilos);   // arranque simultáneo de todos los hilos
        CountDownLatch fin = new CountDownLatch(hilos);
        AtomicInteger exitos = new AtomicInteger();
        AtomicInteger rechazos = new AtomicInteger();

        for (int i = 0; i < hilos; i++) {
            pool.submit(() -> {
                try {
                    // SeguridadServicio.exigirMismoServicio (en TurnoService.saveTurno) exige un
                    // SecurityContext autenticado; es ThreadLocal, así que se configura DENTRO de
                    // cada hilo del pool, no en el hilo principal antes del submit.
                    autenticarComo(funcionario.getIdFuncionario(), "JEFATURA", "USUARIO", servicio.getIdServicio());
                    barrera.await(); // todos cruzan el chequeo casi al mismo tiempo
                    TurnoEntity t = TurnoEntity.builder()
                            .servicio(servicio).funcionario(funcionario)
                            .diaInicioTurno(DIA).horaInicio(LocalTime.of(8, 0))
                            .diaFinalTurno(DIA).horaFin(LocalTime.of(20, 0))
                            .build();
                    turnoService.saveTurno(t); // mismo funcionario, mismo horario para todos
                    exitos.incrementAndGet();
                } catch (Exception e) {
                    rechazos.incrementAndGet(); // conflicto detectado (lo deseable para todos menos uno)
                } finally {
                    SecurityContextHolder.clearContext();
                    fin.countDown();
                }
            });
        }

        assertThat(fin.await(30, TimeUnit.SECONDS)).as("los hilos terminaron a tiempo").isTrue();
        pool.shutdownNow();

        long turnosEnBD = turnoRepository.findConflictosByFuncionario(
                funcionario.getIdFuncionario(), DIA, DIA).size();

        // Invariante de seguridad: exactamente 1 turno debió quedar; los otros 7 debieron rechazarse.
        // Con el check-then-act actual (sin lock/constraint), varios hilos insertan y turnosEnBD > 1.
        assertThat(turnosEnBD)
                .as("turnos solapados del funcionario tras %d inserciones concurrentes (éxitos=%d, rechazos=%d)",
                        hilos, exitos.get(), rechazos.get())
                .isEqualTo(1);
    }
}
