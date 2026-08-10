package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.AbstractContainerTest;
import com.pingeso.HUAP.DTO.CrearSolicitudDTO;
import com.pingeso.HUAP.Entity.*;
import com.pingeso.HUAP.Repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

import static com.pingeso.HUAP.Entity.SolicitudEntity.EstadoSolicitud.APROBADA;
import static com.pingeso.HUAP.Entity.SolicitudEntity.EstadoSolicitud.PENDIENTE;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pruebas de CONCURRENCIA sobre {@link SolicitudService#cambiarEstado}, que bloquea (con
 * {@code TurnoRepository.findByIdForUpdate}, ordenado por id en el caso de intercambio) el/los
 * turno(s) involucrados antes de releer la solicitud con lock propio y validar que siga
 * {@code PENDIENTE} — mismo patrón que ya usa {@code TurnoService#saveTurno} vía
 * {@code FuncionarioRepository.lockFuncionario}.
 *
 * <p>Estas pruebas confirman que dos jefaturas aprobando, al mismo tiempo, dos solicitudes
 * distintas que compiten por el mismo turno terminan en un resultado consistente (exactamente
 * una aprobada) sin deadlock. Requiere Docker corriendo.
 */
class SolicitudConcurrencyTest extends AbstractContainerTest {

    private static final LocalDate DIA = LocalDate.of(2026, 8, 8);
    private static final AtomicInteger SEQ = new AtomicInteger();

    @Autowired private SolicitudService solicitudService;
    @Autowired private SolicitudRepository solicitudRepository;
    @Autowired private TurnoRepository turnoRepository;
    @Autowired private FuncionarioRepository funcionarioRepository;
    @Autowired private RolSistemaRepository rolSistemaRepository;
    @Autowired private ServicioRepository servicioRepository;
    @Autowired private TipoSolicitudRepository tipoSolicitudRepository;
    @Autowired private PlatformTransactionManager txManager;

    private ServicioEntity servicio;

    @BeforeEach
    void setUp() {
        servicio = servicioRepository.save(ServicioEntity.builder().nombre("Urgencias").build());
    }

    // ---------------------------------------------------------------- fixtures

    // Rol + funcionario en una sola transacción: el rol es nullable=false en FuncionarioEntity,
    // y reusar un rol guardado en una transacción previa (ya detached) hace que Hibernate lo
    // trate como "unsaved transient" al hacer flush en una transacción distinta.
    private FuncionarioEntity funcionario() {
        int n = SEQ.incrementAndGet();
        return new TransactionTemplate(txManager).execute(status -> {
            RolSistemaEntity rol = rolSistemaRepository.save(new RolSistemaEntity("MEDICO"));
            return funcionarioRepository.save(FuncionarioEntity.builder()
                    .nombre("Func" + n).apelPat("Apellido")
                    .rut("SOLCONC" + n).dv("K")
                    .estado(1).rolSistema(rol)
                    .build());
        });
    }

    private TurnoEntity turnoVacante() {
        return turnoRepository.save(TurnoEntity.builder()
                .servicio(servicio)
                .diaInicioTurno(DIA).horaInicio(LocalTime.of(8, 0))
                .diaFinalTurno(DIA).horaFin(LocalTime.of(20, 0))
                .build());
    }

    private TipoSolicitudEntity tipoSolicitud(int tipo) {
        return tipoSolicitudRepository.save(TipoSolicitudEntity.builder().tipo(tipo).build());
    }

    private SolicitudEntity solicitudCobertura(FuncionarioEntity emisor, TurnoEntity turno, TipoSolicitudEntity tipo) {
        CrearSolicitudDTO dto = new CrearSolicitudDTO();
        dto.setIdFuncionario(emisor.getIdFuncionario());
        dto.setIdTipoSolicitud(tipo.getIdTipoSolicitud());
        dto.setIdTurno(turno.getIdTurno());
        // El emisor se deriva del SecurityContext (C-02): autenticar como él antes de crear.
        autenticarComo(emisor.getIdFuncionario(), "MEDICO", "USUARIO", servicio.getIdServicio());
        return solicitudService.crearSolicitud(dto);
    }

    // ======================= el caso importante =======================

    @Test
    void dosSolicitudesDeCoberturaParaElMismoTurno_aprobadasConcurrentemente_soloUnaDebeQuedarAprobada() throws Exception {
        TurnoEntity turno = turnoVacante();
        TipoSolicitudEntity tipoCobertura = tipoSolicitud(3);
        FuncionarioEntity emisorA = funcionario();
        FuncionarioEntity emisorB = funcionario();
        FuncionarioEntity jefeA = funcionario();
        FuncionarioEntity jefeB = funcionario();

        SolicitudEntity solicitudA = solicitudCobertura(emisorA, turno, tipoCobertura);
        SolicitudEntity solicitudB = solicitudCobertura(emisorB, turno, tipoCobertura);

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CyclicBarrier barrera = new CyclicBarrier(2); // arranque simultáneo de ambos hilos
        CountDownLatch fin = new CountDownLatch(2);

        // SecurityContextHolder es ThreadLocal por defecto: autenticar dentro de cada hilo, no
        // en el hilo principal antes del submit (ahí no se propagaría a los workers del pool).
        pool.submit(() -> {
            try {
                autenticarComo(jefeA.getIdFuncionario(), "JEFATURA", "USUARIO", servicio.getIdServicio());
                barrera.await();
                solicitudService.cambiarEstado(solicitudA.getIdSolicitud(), APROBADA);
            } catch (Exception ignored) {
                // Una excepción de negocio es un resultado aceptable para el hilo perdedor.
            } finally {
                SecurityContextHolder.clearContext();
                fin.countDown();
            }
        });
        pool.submit(() -> {
            try {
                autenticarComo(jefeB.getIdFuncionario(), "JEFATURA", "USUARIO", servicio.getIdServicio());
                barrera.await();
                solicitudService.cambiarEstado(solicitudB.getIdSolicitud(), APROBADA);
            } catch (Exception ignored) {
            } finally {
                SecurityContextHolder.clearContext();
                fin.countDown();
            }
        });

        assertThat(fin.await(30, TimeUnit.SECONDS)).as("los hilos terminaron a tiempo").isTrue();
        pool.shutdownNow();

        SolicitudEntity finalA = solicitudRepository.findById(solicitudA.getIdSolicitud()).orElseThrow();
        SolicitudEntity finalB = solicitudRepository.findById(solicitudB.getIdSolicitud()).orElseThrow();
        TurnoEntity turnoFinal = turnoRepository.findById(turno.getIdTurno()).orElseThrow();

        long aprobadas = Stream.of(finalA, finalB).filter(s -> s.getEstado() == APROBADA).count();

        // Invariante de seguridad: dos solicitudes de cobertura para el MISMO turno no pueden
        // quedar ambas APROBADA (asignarían el turno a dos funcionarios distintos a la vez).
        // Sin lock pesimista en cambiarEstado, ambos hilos pueden leer "pendiente" al mismo
        // tiempo en rechazarSolicitudesCompetitivas antes de que el otro commitee, y las dos
        // terminan escribiendo su propio estado=APROBADA (lost update sobre el rechazo cruzado).
        assertThat(aprobadas)
                .as("solicitudA=%s (turno final funcionario=%s), solicitudB=%s -- turno terminó con funcionario=%s",
                        finalA.getEstado(), emisorA.getIdFuncionario(), finalB.getEstado(),
                        turnoFinal.getFuncionario() == null ? null : turnoFinal.getFuncionario().getIdFuncionario())
                .isEqualTo(1);
    }

    // ======================= caso secundario: doble aprobación de la MISMA solicitud =======================

    @Test
    void mismaSolicitud_aprobadaConcurrentementePorDosHilos_elTurnoNoQuedaEnEstadoInconsistente() throws Exception {
        TurnoEntity turno = turnoVacante();
        TipoSolicitudEntity tipoCobertura = tipoSolicitud(3);
        FuncionarioEntity emisor = funcionario();
        FuncionarioEntity jefe1 = funcionario();
        FuncionarioEntity jefe2 = funcionario();

        SolicitudEntity solicitud = solicitudCobertura(emisor, turno, tipoCobertura);

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CyclicBarrier barrera = new CyclicBarrier(2);
        CountDownLatch fin = new CountDownLatch(2);

        Runnable aprobar = () -> {
            try {
                autenticarComo(jefe1.getIdFuncionario(), "JEFATURA", "USUARIO", servicio.getIdServicio());
                barrera.await();
                solicitudService.cambiarEstado(solicitud.getIdSolicitud(), APROBADA);
            } catch (Exception ignored) {
            } finally {
                SecurityContextHolder.clearContext();
                fin.countDown();
            }
        };
        Runnable aprobarOtroJefe = () -> {
            try {
                autenticarComo(jefe2.getIdFuncionario(), "JEFATURA", "USUARIO", servicio.getIdServicio());
                barrera.await();
                solicitudService.cambiarEstado(solicitud.getIdSolicitud(), APROBADA);
            } catch (Exception ignored) {
            } finally {
                SecurityContextHolder.clearContext();
                fin.countDown();
            }
        };

        pool.submit(aprobar);
        pool.submit(aprobarOtroJefe);

        assertThat(fin.await(30, TimeUnit.SECONDS)).isTrue();
        pool.shutdownNow();

        TurnoEntity turnoFinal = turnoRepository.findById(turno.getIdTurno()).orElseThrow();
        SolicitudEntity solicitudFinal = solicitudRepository.findById(solicitud.getIdSolicitud()).orElseThrow();

        assertThat(solicitudFinal.getEstado()).isEqualTo(APROBADA);
        assertThat(turnoFinal.getFuncionario()).isNotNull();
        assertThat(turnoFinal.getFuncionario().getIdFuncionario()).isEqualTo(emisor.getIdFuncionario());
    }
}
