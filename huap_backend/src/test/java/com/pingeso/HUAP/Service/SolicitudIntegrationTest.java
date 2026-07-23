package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.AbstractContainerTest;
import com.pingeso.HUAP.DTO.CrearSolicitudDTO;
import com.pingeso.HUAP.Entity.*;
import com.pingeso.HUAP.Repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.concurrent.atomic.AtomicInteger;

import static com.pingeso.HUAP.Entity.SolicitudEntity.EstadoSolicitud.APROBADA;
import static com.pingeso.HUAP.Entity.SolicitudEntity.EstadoSolicitud.PENDIENTE;
import static com.pingeso.HUAP.Entity.SolicitudEntity.EstadoSolicitud.RECHAZADA;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests de integración de {@link SolicitudService} contra un MySQL 8.0 real (Testcontainers).
 * A diferencia de los unitarios (mocks), acá se persiste de verdad: valida que el flujo
 * crear -> aprobar mute el {@link TurnoEntity} correcto en BD y que la bitácora (que se agenda
 * vía {@code TransactionSynchronization.afterCommit}) efectivamente quede escrita tras el commit
 * real de cada llamada al service.
 *
 * <p>Sin {@code @Transactional} de test (a propósito): si el test envolviera todo en una única
 * transacción que hace rollback, el hook {@code afterCommit} de {@code agendarBitacora} nunca
 * dispararía y no podríamos verificar la bitácora. Requiere Docker corriendo.
 */
class SolicitudIntegrationTest extends AbstractContainerTest {

    private static final LocalDate DIA = LocalDate.of(2026, 8, 1);

    @Autowired private SolicitudService solicitudService;
    @Autowired private SolicitudRepository solicitudRepository;
    @Autowired private TurnoRepository turnoRepository;
    @Autowired private FuncionarioRepository funcionarioRepository;
    @Autowired private RolSistemaRepository rolSistemaRepository;
    @Autowired private ServicioRepository servicioRepository;
    @Autowired private TipoSolicitudRepository tipoSolicitudRepository;
    @Autowired private BitacoraRepository bitacoraRepository;
    @Autowired private PlatformTransactionManager txManager;

    // Compartido entre tests (no hay rollback entre ellos, a propósito): un contador estático
    // garantiza RUTs únicos aunque la BD del contenedor acumule filas de tests anteriores.
    private static final AtomicInteger SEQ = new AtomicInteger();

    private ServicioEntity servicio;

    @BeforeEach
    void setUp() {
        servicio = servicioRepository.save(ServicioEntity.builder().nombre("Urgencias").build());
    }

    // ---------------------------------------------------------------- fixtures

    /**
     * Crea rol + funcionario dentro de UNA sola transacción (misma sesión de Hibernate): el rol
     * es {@code @ManyToOne(nullable = false)} en {@link FuncionarioEntity}, y guardarlo en una
     * transacción previa y reusarlo detached en otra hace que Hibernate lo trate como "unsaved
     * transient" al hacer flush. Creándolos juntos evitamos ese problema por completo.
     */
    private FuncionarioEntity funcionario() {
        int n = SEQ.incrementAndGet();
        return new TransactionTemplate(txManager).execute(status -> {
            RolSistemaEntity rol = rolSistemaRepository.save(new RolSistemaEntity("MEDICO"));
            return funcionarioRepository.save(FuncionarioEntity.builder()
                    .nombre("Func" + n).apelPat("Apellido")
                    .rut("SOLINT" + n).dv("K")
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

    private CrearSolicitudDTO dtoCobertura(FuncionarioEntity emisor, TurnoEntity turno, TipoSolicitudEntity tipo) {
        CrearSolicitudDTO dto = new CrearSolicitudDTO();
        dto.setIdFuncionario(emisor.getIdFuncionario());
        dto.setIdTipoSolicitud(tipo.getIdTipoSolicitud());
        dto.setIdTurno(turno.getIdTurno());
        return dto;
    }

    // ======================= crearSolicitud =======================

    @Test
    void crearSolicitud_persisteEnEstadoPendienteYRegistraBitacora() {
        FuncionarioEntity emisor = funcionario();
        TurnoEntity turno = turnoVacante();
        TipoSolicitudEntity tipoCobertura = tipoSolicitud(3);

        SolicitudEntity creada = solicitudService.crearSolicitud(dtoCobertura(emisor, turno, tipoCobertura));

        SolicitudEntity recargada = solicitudRepository.findById(creada.getIdSolicitud()).orElseThrow();
        assertThat(recargada.getEstado()).isEqualTo(PENDIENTE);
        assertThat(recargada.getFuncionario().getIdFuncionario()).isEqualTo(emisor.getIdFuncionario());

        assertThat(bitacoraRepository.findBySolicitud_IdSolicitud(creada.getIdSolicitud()))
                .as("agendarBitacora corre en afterCommit; si esto está vacío, el hook no disparó")
                .extracting(BitacoraEntity::getTipoEvento)
                .contains("SOLICITUD_CREADA");
    }

    // ======================= cambiarEstado =======================

    @Test
    void cambiarEstado_tipoCobertura_aprobar_asignaFuncionarioAlTurnoEnBD() {
        FuncionarioEntity emisor = funcionario();
        FuncionarioEntity jefe = funcionario();
        TurnoEntity turno = turnoVacante();
        TipoSolicitudEntity tipoCobertura = tipoSolicitud(3);

        SolicitudEntity creada = solicitudService.crearSolicitud(dtoCobertura(emisor, turno, tipoCobertura));
        solicitudService.cambiarEstado(creada.getIdSolicitud(), APROBADA, jefe.getIdFuncionario());

        TurnoEntity turnoRecargado = turnoRepository.findById(turno.getIdTurno()).orElseThrow();
        assertThat(turnoRecargado.getFuncionario()).isNotNull();
        assertThat(turnoRecargado.getFuncionario().getIdFuncionario()).isEqualTo(emisor.getIdFuncionario());

        SolicitudEntity solicitudRecargada = solicitudRepository.findById(creada.getIdSolicitud()).orElseThrow();
        assertThat(solicitudRecargada.getEstado()).isEqualTo(APROBADA);

        assertThat(bitacoraRepository.findBySolicitud_IdSolicitud(creada.getIdSolicitud()))
                .extracting(BitacoraEntity::getTipoEvento)
                .contains("CAMBIO_ESTADO_APROBADA");
    }

    @Test
    void cambiarEstado_aprobarUnaCobertura_rechazaAutomaticamenteLasOtrasPendientesDelMismoTurnoEnBD() {
        TurnoEntity turno = turnoVacante();
        TipoSolicitudEntity tipoCobertura = tipoSolicitud(3);
        FuncionarioEntity jefe = funcionario();

        SolicitudEntity ganadora = solicitudService.crearSolicitud(dtoCobertura(funcionario(), turno, tipoCobertura));
        SolicitudEntity competidoraB = solicitudService.crearSolicitud(dtoCobertura(funcionario(), turno, tipoCobertura));
        SolicitudEntity competidoraC = solicitudService.crearSolicitud(dtoCobertura(funcionario(), turno, tipoCobertura));

        solicitudService.cambiarEstado(ganadora.getIdSolicitud(), APROBADA, jefe.getIdFuncionario());

        SolicitudEntity ganadoraRecargada = solicitudRepository.findById(ganadora.getIdSolicitud()).orElseThrow();
        SolicitudEntity bRecargada = solicitudRepository.findById(competidoraB.getIdSolicitud()).orElseThrow();
        SolicitudEntity cRecargada = solicitudRepository.findById(competidoraC.getIdSolicitud()).orElseThrow();

        assertThat(ganadoraRecargada.getEstado()).isEqualTo(APROBADA);
        assertThat(bRecargada.getEstado()).isEqualTo(RECHAZADA);
        assertThat(cRecargada.getEstado()).isEqualTo(RECHAZADA);
        assertThat(bRecargada.getMotivo()).contains("Rechazo automático");
        assertThat(cRecargada.getMotivo()).contains("Rechazo automático");

        assertThat(bitacoraRepository.findBySolicitud_IdSolicitud(competidoraB.getIdSolicitud()))
                .extracting(BitacoraEntity::getTipoEvento)
                .contains("RECHAZO_AUTOMATICO");
    }
}
