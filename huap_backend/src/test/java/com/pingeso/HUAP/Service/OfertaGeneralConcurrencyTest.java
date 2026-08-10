package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.AbstractContainerTest;
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
import java.util.stream.Collectors;

import static com.pingeso.HUAP.Entity.OfertaGeneralEntity.EstadoOferta.ABIERTA;
import static com.pingeso.HUAP.Entity.OfertaGeneralEntity.EstadoOferta.PENDIENTE_APROBACION;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Prueba de CONCURRENCIA sobre {@link OfertaGeneralService#seleccionarPostulante}. A diferencia de
 * {@code SolicitudService#cambiarEstado} (que sí bloquea los turnos involucrados y releé el
 * estado antes de mutar), este método no toma ningún lock pesimista sobre la oferta ni sobre el
 * turno: lee {@code oferta.getEstado()}, y si está ABIERTA, muta el turno y cierra la oferta sin
 * volver a verificar nada.
 *
 * <p>Esta prueba simula dos jefaturas seleccionando, AL MISMO TIEMPO, dos postulantes distintos
 * para la MISMA oferta. El invariante de seguridad es que la oferta debe cerrarse con exactamente
 * UN postulante seleccionado, y ese debe ser el mismo que terminó asignado al turno. Requiere
 * Docker corriendo.
 */
class OfertaGeneralConcurrencyTest extends AbstractContainerTest {

    private static final LocalDate DIA = LocalDate.of(2026, 9, 20);
    private static final AtomicInteger SEQ = new AtomicInteger();

    @Autowired private OfertaGeneralService ofertaGeneralService;
    @Autowired private OfertaGeneralRepository ofertaGeneralRepository;
    @Autowired private PostulacionRepository postulacionRepository;
    @Autowired private TurnoRepository turnoRepository;
    @Autowired private FuncionarioRepository funcionarioRepository;
    @Autowired private RolSistemaRepository rolSistemaRepository;
    @Autowired private ServicioRepository servicioRepository;
    @Autowired private PlatformTransactionManager txManager;

    private ServicioEntity servicio;

    @BeforeEach
    void setUp() {
        servicio = servicioRepository.save(ServicioEntity.builder().nombre("Urgencias").build());
    }

    private FuncionarioEntity funcionario() {
        int n = SEQ.incrementAndGet();
        return new TransactionTemplate(txManager).execute(status -> {
            RolSistemaEntity rol = rolSistemaRepository.save(new RolSistemaEntity("MEDICO"));
            return funcionarioRepository.save(FuncionarioEntity.builder()
                    .nombre("Func" + n).apelPat("Apellido")
                    .rut("OFECONC" + n).dv("K")
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

    @Test
    void dosPostulantesSeleccionadosConcurrentemente_soloUnoDebeQuedarSeleccionado() throws Exception {
        FuncionarioEntity ofertor = funcionario();
        FuncionarioEntity postulanteA = funcionario();
        FuncionarioEntity postulanteB = funcionario();
        FuncionarioEntity jefeA = funcionario();
        FuncionarioEntity jefeB = funcionario();
        TurnoEntity turno = turnoVacante();

        OfertaGeneralEntity oferta = ofertaGeneralRepository.save(OfertaGeneralEntity.builder()
                .ofertor(ofertor).turno(turno).estado(PENDIENTE_APROBACION).build());
        oferta.setEstado(ABIERTA);
        oferta = ofertaGeneralRepository.save(oferta);

        autenticarComo(postulanteA.getIdFuncionario(), "MEDICO", "USUARIO", servicio.getIdServicio());
        PostulacionEntity postA = ofertaGeneralService.postular(oferta.getIdOfertaGeneral());
        autenticarComo(postulanteB.getIdFuncionario(), "MEDICO", "USUARIO", servicio.getIdServicio());
        PostulacionEntity postB = ofertaGeneralService.postular(oferta.getIdOfertaGeneral());

        Long idOferta = oferta.getIdOfertaGeneral();
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CyclicBarrier barrera = new CyclicBarrier(2); // arranque simultáneo de ambos hilos
        CountDownLatch fin = new CountDownLatch(2);

        // SecurityContextHolder es ThreadLocal: autenticar dentro de cada hilo del pool.
        pool.submit(() -> {
            try {
                autenticarComo(jefeA.getIdFuncionario(), "JEFATURA", "USUARIO", servicio.getIdServicio());
                barrera.await();
                ofertaGeneralService.seleccionarPostulante(idOferta, postA.getIdPostulacion());
            } catch (Exception ignored) {
            } finally {
                SecurityContextHolder.clearContext();
                fin.countDown();
            }
        });
        pool.submit(() -> {
            try {
                autenticarComo(jefeB.getIdFuncionario(), "JEFATURA", "USUARIO", servicio.getIdServicio());
                barrera.await();
                ofertaGeneralService.seleccionarPostulante(idOferta, postB.getIdPostulacion());
            } catch (Exception ignored) {
            } finally {
                SecurityContextHolder.clearContext();
                fin.countDown();
            }
        });

        assertThat(fin.await(30, TimeUnit.SECONDS)).as("los hilos terminaron a tiempo").isTrue();
        pool.shutdownNow();

        List<PostulacionEntity> postulacionesFinales = postulacionRepository.findByOfertaGeneral_IdOfertaGeneral(idOferta);
        long seleccionadas = postulacionesFinales.stream().filter(PostulacionEntity::getSeleccionado).count();
        TurnoEntity turnoFinal = turnoRepository.findById(turno.getIdTurno()).orElseThrow();

        // Invariante de seguridad: no puede haber dos postulantes "ganadores" para la misma oferta,
        // y el que quede marcado seleccionado debe ser el mismo que terminó con el turno asignado.
        assertThat(seleccionadas)
                .as("postulaciones: %s -- turno terminó asignado a funcionario=%s",
                        postulacionesFinales.stream()
                                .map(p -> p.getIdPostulacion() + "=" + p.getSeleccionado())
                                .collect(Collectors.joining(", ")),
                        turnoFinal.getFuncionario() == null ? null : turnoFinal.getFuncionario().getIdFuncionario())
                .isEqualTo(1);

        PostulacionEntity ganadora = postulacionesFinales.stream()
                .filter(PostulacionEntity::getSeleccionado).findFirst().orElseThrow();
        assertThat(turnoFinal.getFuncionario().getIdFuncionario())
                .as("el postulante marcado como seleccionado debe ser quien realmente quedó con el turno")
                .isEqualTo(ganadora.getPostulante().getIdFuncionario());
    }
}
