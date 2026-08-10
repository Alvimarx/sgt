package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.AbstractContainerTest;
import com.pingeso.HUAP.DTO.CrearOfertaGeneralDTO;
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

import static com.pingeso.HUAP.Entity.OfertaGeneralEntity.EstadoOferta.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Tests de integración de {@link OfertaGeneralService} contra un MySQL 8.0 real (Testcontainers).
 * Requiere Docker corriendo.
 */
class OfertaGeneralIntegrationTest extends AbstractContainerTest {

    private static final LocalDate DIA = LocalDate.of(2026, 9, 10);
    private static final AtomicInteger SEQ = new AtomicInteger();

    @Autowired private OfertaGeneralService ofertaGeneralService;
    @Autowired private OfertaGeneralRepository ofertaGeneralRepository;
    @Autowired private PostulacionRepository postulacionRepository;
    @Autowired private TurnoRepository turnoRepository;
    @Autowired private FuncionarioRepository funcionarioRepository;
    @Autowired private RolSistemaRepository rolSistemaRepository;
    @Autowired private ServicioRepository servicioRepository;
    @Autowired private BitacoraRepository bitacoraRepository;
    @Autowired private PlatformTransactionManager txManager;

    private ServicioEntity servicio;

    @BeforeEach
    void setUp() {
        servicio = servicioRepository.save(ServicioEntity.builder().nombre("Urgencias").build());
    }

    // ---------------------------------------------------------------- fixtures

    // Rol + funcionario en una transacción (mismo motivo que en SolicitudIntegrationTest: rolSistema
    // es nullable=false y reusar un rol detached de otra transacción rompe el flush).
    private FuncionarioEntity funcionario() {
        int n = SEQ.incrementAndGet();
        return new TransactionTemplate(txManager).execute(status -> {
            RolSistemaEntity rol = rolSistemaRepository.save(new RolSistemaEntity("MEDICO"));
            return funcionarioRepository.save(FuncionarioEntity.builder()
                    .nombre("Func" + n).apelPat("Apellido")
                    .rut("OFEINT" + n).dv("K")
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

    private OfertaGeneralEntity ofertaAbierta(FuncionarioEntity ofertor, TurnoEntity turno) {
        OfertaGeneralEntity oferta = ofertaGeneralRepository.save(OfertaGeneralEntity.builder()
                .ofertor(ofertor).turno(turno).estado(PENDIENTE_APROBACION).build());
        oferta.setEstado(ABIERTA);
        return ofertaGeneralRepository.save(oferta);
    }

    // ======================= crearOferta / aprobarOferta / rechazarOferta =======================

    @Test
    void crearOferta_persisteEnPendienteAprobacionYRegistraBitacora() {
        FuncionarioEntity ofertor = funcionario();
        TurnoEntity turno = turnoVacante();
        CrearOfertaGeneralDTO dto = new CrearOfertaGeneralDTO();
        dto.setIdFuncionario(ofertor.getIdFuncionario());
        dto.setIdTurno(turno.getIdTurno());
        dto.setMotivo("No puedo cubrir");

        // El ofertor se deriva del SecurityContext (C-02), ya no del DTO.
        autenticarComo(ofertor.getIdFuncionario(), "MEDICO", "USUARIO", servicio.getIdServicio());
        OfertaGeneralEntity creada = ofertaGeneralService.crearOferta(dto);

        OfertaGeneralEntity recargada = ofertaGeneralRepository.findById(creada.getIdOfertaGeneral()).orElseThrow();
        assertThat(recargada.getEstado()).isEqualTo(PENDIENTE_APROBACION);
        assertThat(bitacoraRepository.findByTipoEvento("OFERTA_GENERAL_CREADA"))
                .extracting(BitacoraEntity::getMotivo)
                .contains("idOferta=" + creada.getIdOfertaGeneral());
    }

    @Test
    void aprobarOferta_pasaAAbiertaYPermitePostular() {
        FuncionarioEntity ofertor = funcionario();
        FuncionarioEntity postulante = funcionario();
        FuncionarioEntity jefe = funcionario();
        TurnoEntity turno = turnoVacante();
        OfertaGeneralEntity oferta = ofertaGeneralRepository.save(OfertaGeneralEntity.builder()
                .ofertor(ofertor).turno(turno).estado(PENDIENTE_APROBACION).build());

        autenticarComoAdministrador(jefe.getIdFuncionario());
        ofertaGeneralService.aprobarOferta(oferta.getIdOfertaGeneral());

        autenticarComo(postulante.getIdFuncionario(), "MEDICO", "USUARIO", servicio.getIdServicio());
        PostulacionEntity postulacion = ofertaGeneralService.postular(oferta.getIdOfertaGeneral());

        assertThat(ofertaGeneralRepository.findById(oferta.getIdOfertaGeneral()).orElseThrow().getEstado()).isEqualTo(ABIERTA);
        assertThat(postulacion.getSeleccionado()).isFalse();
    }

    // ======================= postular =======================

    @Test
    void postular_ofertorNoPuedePostularASuPropiaOferta() {
        FuncionarioEntity ofertor = funcionario();
        TurnoEntity turno = turnoVacante();
        OfertaGeneralEntity oferta = ofertaAbierta(ofertor, turno);

        autenticarComo(ofertor.getIdFuncionario(), "MEDICO", "USUARIO", servicio.getIdServicio());
        assertThrows(RuntimeException.class,
                () -> ofertaGeneralService.postular(oferta.getIdOfertaGeneral()));
    }

    @Test
    void postular_duplicada_lanza() {
        FuncionarioEntity ofertor = funcionario();
        FuncionarioEntity postulante = funcionario();
        TurnoEntity turno = turnoVacante();
        OfertaGeneralEntity oferta = ofertaAbierta(ofertor, turno);

        autenticarComo(postulante.getIdFuncionario(), "MEDICO", "USUARIO", servicio.getIdServicio());
        ofertaGeneralService.postular(oferta.getIdOfertaGeneral());

        assertThrows(RuntimeException.class,
                () -> ofertaGeneralService.postular(oferta.getIdOfertaGeneral()));
    }

    // ======================= seleccionarPostulante =======================

    @Test
    void seleccionarPostulante_asignaTurnoMarcaSeleccionadoYCierraOfertaEnBD() {
        FuncionarioEntity ofertor = funcionario();
        FuncionarioEntity postulante = funcionario();
        FuncionarioEntity jefe = funcionario();
        TurnoEntity turno = turnoVacante();
        OfertaGeneralEntity oferta = ofertaAbierta(ofertor, turno);
        autenticarComo(postulante.getIdFuncionario(), "MEDICO", "USUARIO", servicio.getIdServicio());
        PostulacionEntity postulacion = ofertaGeneralService.postular(oferta.getIdOfertaGeneral());

        autenticarComoAdministrador(jefe.getIdFuncionario());
        ofertaGeneralService.seleccionarPostulante(oferta.getIdOfertaGeneral(), postulacion.getIdPostulacion());

        TurnoEntity turnoRecargado = turnoRepository.findById(turno.getIdTurno()).orElseThrow();
        assertThat(turnoRecargado.getFuncionario().getIdFuncionario()).isEqualTo(postulante.getIdFuncionario());
        assertThat(ofertaGeneralRepository.findById(oferta.getIdOfertaGeneral()).orElseThrow().getEstado()).isEqualTo(CERRADA);
        assertThat(postulacionRepository.findById(postulacion.getIdPostulacion()).orElseThrow().getSeleccionado()).isTrue();
    }

    @Test
    void seleccionarPostulante_conPostulacionDeOtraOferta_lanzaYNoMutaNada() {
        FuncionarioEntity ofertor1 = funcionario();
        FuncionarioEntity ofertor2 = funcionario();
        FuncionarioEntity postulante = funcionario();
        FuncionarioEntity jefe = funcionario();
        TurnoEntity turno1 = turnoVacante();
        TurnoEntity turno2 = turnoVacante();
        OfertaGeneralEntity oferta1 = ofertaAbierta(ofertor1, turno1);
        OfertaGeneralEntity oferta2 = ofertaAbierta(ofertor2, turno2);
        autenticarComo(postulante.getIdFuncionario(), "MEDICO", "USUARIO", servicio.getIdServicio());
        PostulacionEntity postulacionDeOferta2 = ofertaGeneralService.postular(oferta2.getIdOfertaGeneral());

        autenticarComoAdministrador(jefe.getIdFuncionario());
        assertThrows(RuntimeException.class, () -> ofertaGeneralService.seleccionarPostulante(
                oferta1.getIdOfertaGeneral(), postulacionDeOferta2.getIdPostulacion()));

        assertThat(turnoRepository.findById(turno1.getIdTurno()).orElseThrow().getFuncionario()).isNull();
        assertThat(ofertaGeneralRepository.findById(oferta1.getIdOfertaGeneral()).orElseThrow().getEstado()).isEqualTo(ABIERTA);
    }
}
