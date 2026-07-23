package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.AbstractContainerTest;
import com.pingeso.HUAP.Entity.*;
import com.pingeso.HUAP.Repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests de integración de {@link BitacoraService} y {@link BitacoraRepository} contra un MySQL
 * 8.0 real (Testcontainers). El foco es lo que un mock no puede probar: que
 * {@code registrarEvento} (anotado {@code @Transactional(propagation = REQUIRES_NEW)}) realmente
 * commitea en su propia transacción incluso si la transacción que lo invoca termina en rollback,
 * y que la query multi-join de {@code findEventosOrigenByTurnos} trae los eventos correctos sin
 * duplicarlos. Requiere Docker corriendo.
 */
class BitacoraIntegrationTest extends AbstractContainerTest {

    private static final LocalDate DIA = LocalDate.of(2026, 9, 1);
    private static final AtomicInteger SEQ = new AtomicInteger();

    @Autowired private BitacoraService bitacoraService;
    @Autowired private BitacoraRepository bitacoraRepository;
    @Autowired private SolicitudRepository solicitudRepository;
    @Autowired private TipoSolicitudRepository tipoSolicitudRepository;
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

    // ---------------------------------------------------------------- fixtures

    // Rol + funcionario en una sola transacción (mismo motivo que en SolicitudIntegrationTest:
    // rolSistema es nullable=false, y reusar un rol detached de otra transacción rompe el flush).
    private FuncionarioEntity funcionario() {
        int n = SEQ.incrementAndGet();
        return new TransactionTemplate(txManager).execute(status -> {
            RolSistemaEntity rol = rolSistemaRepository.save(new RolSistemaEntity("MEDICO"));
            return funcionarioRepository.save(FuncionarioEntity.builder()
                    .nombre("Func" + n).apelPat("Apellido")
                    .rut("BITINT" + n).dv("K")
                    .estado(1).rolSistema(rol)
                    .build());
        });
    }

    private TurnoEntity turno() {
        return turnoRepository.save(TurnoEntity.builder()
                .servicio(servicio)
                .diaInicioTurno(DIA).horaInicio(LocalTime.of(8, 0))
                .diaFinalTurno(DIA).horaFin(LocalTime.of(20, 0))
                .build());
    }

    private SolicitudEntity solicitud(FuncionarioEntity emisor, TurnoEntity turno) {
        TipoSolicitudEntity tipo = tipoSolicitudRepository.save(TipoSolicitudEntity.builder().tipo(3).build());
        return solicitudRepository.save(SolicitudEntity.builder()
                .funcionario(emisor).turno(turno).tipoSolicitud(tipo)
                .estado(SolicitudEntity.EstadoSolicitud.PENDIENTE)
                .build());
    }

    // ======================= registrarEvento: persistencia básica =======================

    @Test
    void registrarEvento_persisteFilaConSolicitudYActor() {
        FuncionarioEntity emisor = funcionario();
        FuncionarioEntity jefe = funcionario();
        TurnoEntity turno = turno();
        SolicitudEntity solicitud = solicitud(emisor, turno);

        bitacoraService.registrarEvento("CAMBIO_ESTADO_APROBADA", solicitud.getIdSolicitud(), jefe.getIdFuncionario());

        List<BitacoraEntity> eventos = bitacoraRepository.findBySolicitud_IdSolicitud(solicitud.getIdSolicitud());
        assertThat(eventos).hasSize(1);
        BitacoraEntity evento = eventos.get(0);
        assertThat(evento.getTipoEvento()).isEqualTo("CAMBIO_ESTADO_APROBADA");
        assertThat(evento.getFuncionario().getIdFuncionario()).isEqualTo(jefe.getIdFuncionario());
        assertThat(evento.getActivo()).isTrue();
    }

    // ======================= el caso importante: REQUIRES_NEW sobrevive al rollback externo =======================

    @Test
    void registrarEvento_sobreviveAlRollbackDeLaTransaccionQueLoInvoca() {
        FuncionarioEntity emisor = funcionario();
        TurnoEntity turno = turno();
        SolicitudEntity solicitud = solicitud(emisor, turno);

        // Simula el caso real: una transacción de negocio llama a registrarEvento y LUEGO falla
        // (rollback). Gracias a REQUIRES_NEW, el evento de bitácora ya quedó commiteado en su
        // propia transacción independiente y no debe desaparecer.
        new TransactionTemplate(txManager).execute(status -> {
            bitacoraService.registrarEvento("CAMBIO_ESTADO_APROBADA", solicitud.getIdSolicitud(), null);
            status.setRollbackOnly();
            return null;
        });

        List<BitacoraEntity> eventos = bitacoraRepository.findBySolicitud_IdSolicitud(solicitud.getIdSolicitud());
        assertThat(eventos)
                .as("el evento debe sobrevivir aunque la transacción externa haya hecho rollback")
                .hasSize(1);
    }

    @Test
    void registrarEventoOferta_sobreviveAlRollbackDeLaTransaccionQueLoInvoca() {
        new TransactionTemplate(txManager).execute(status -> {
            bitacoraService.registrarEventoOferta("OFERTA_GENERAL_APROBADA", 123L, null);
            status.setRollbackOnly();
            return null;
        });

        List<BitacoraEntity> eventos = bitacoraRepository.findByTipoEvento("OFERTA_GENERAL_APROBADA");
        assertThat(eventos).extracting(BitacoraEntity::getMotivo).contains("idOferta=123");
    }

    // ======================= findEventosOrigenByTurnos =======================

    @Test
    void findEventosOrigenByTurnos_traeEventosPorTurnoDirectoSolicitudYTurnoReceptorSinDuplicar() {
        FuncionarioEntity emisor = funcionario();
        FuncionarioEntity receptor = funcionario();
        TurnoEntity turnoDirecto = turno();
        TurnoEntity turnoDeSolicitud = turno();
        TurnoEntity turnoReceptorDeSolicitud = turno();

        TipoSolicitudEntity tipo = tipoSolicitudRepository.save(TipoSolicitudEntity.builder().tipo(4).build());
        SolicitudEntity solicitudConAmbosTurnos = solicitudRepository.save(SolicitudEntity.builder()
                .funcionario(emisor).funcionarioReceptor(receptor)
                .turno(turnoDeSolicitud).turnoReceptor(turnoReceptorDeSolicitud)
                .tipoSolicitud(tipo).estado(SolicitudEntity.EstadoSolicitud.PENDIENTE)
                .build());

        // Evento con turno DIRECTO (BitacoraEntity.turno), sin solicitud.
        bitacoraRepository.save(BitacoraEntity.builder()
                .tipoEvento("GENERACION_TURNO").turno(turnoDirecto).activo(true).build());
        // Evento asociado a una solicitud cuyo turno principal es turnoDeSolicitud.
        bitacoraRepository.save(BitacoraEntity.builder()
                .tipoEvento("SOLICITUD_CREADA").solicitud(solicitudConAmbosTurnos).activo(true).build());
        // Turno que no debería aparecer en absoluto.
        TurnoEntity turnoAjeno = turno();
        bitacoraRepository.save(BitacoraEntity.builder()
                .tipoEvento("GENERACION_TURNO").turno(turnoAjeno).activo(true).build());

        List<BitacoraEntity> resultado = bitacoraRepository.findEventosOrigenByTurnos(
                List.of(turnoDirecto.getIdTurno(), turnoDeSolicitud.getIdTurno(), turnoReceptorDeSolicitud.getIdTurno()));

        assertThat(resultado)
                .extracting(BitacoraEntity::getTipoEvento)
                .containsExactlyInAnyOrder("GENERACION_TURNO", "SOLICITUD_CREADA");
        assertThat(resultado)
                .extracting(e -> e.getTurno() != null ? e.getTurno().getIdTurno() : null)
                .doesNotContain(turnoAjeno.getIdTurno());
    }
}