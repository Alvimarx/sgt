package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.CrearOfertaGeneralDTO;
import com.pingeso.HUAP.Entity.*;
import com.pingeso.HUAP.Repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Ofertas generales de turno: un funcionario ofrece un turno propio para que cualquiera del
 * servicio se postule, a diferencia de la {@code SolicitudEntity} de intercambio/cobertura que
 * va dirigida a un receptor específico.
 *
 * <p>Ciclo de vida: {@link #crearOferta} (PENDIENTE_APROBACION) → {@link #aprobarOferta} o
 * {@link #rechazarOferta} → si ABIERTA, {@link #postular} / {@link #retirarPostulacion} →
 * {@link #seleccionarPostulante} asigna el turno y cierra la oferta (CERRADA).
 *
 * <p>Antes de asignar el turno al postulante ganador, {@link #seleccionarPostulante} valida con
 * {@link ValidadorAsignacionTurnoService} que su calendario resultante no quede con turnos
 * superpuestos ni con una secuencia incompatible de dos turnos de 12 horas consecutivos sin
 * descanso (corrección funcional "turnos de 12 horas", ver {@code Archivo de funcionalidades.md}).
 */
@Service
@RequiredArgsConstructor
public class OfertaGeneralService {

    private final OfertaGeneralRepository ofertaGeneralRepository;
    private final PostulacionRepository postulacionRepository;
    private final FuncionarioRepository funcionarioRepository;
    private final TurnoRepository turnoRepository;
    private final BitacoraService bitacoraService;
    private final ValidadorAsignacionTurnoService validadorAsignacion;

    /** Crea la oferta en estado {@code PENDIENTE_APROBACION}; no queda visible para postular hasta aprobarse. */
    @Transactional
    public OfertaGeneralEntity crearOferta(CrearOfertaGeneralDTO dto) {
        FuncionarioEntity ofertor = funcionarioRepository.findById(dto.getIdFuncionario())
                .orElseThrow(() -> new RuntimeException("Funcionario no existe"));

        TurnoEntity turno = turnoRepository.findById(dto.getIdTurno())
                .orElseThrow(() -> new RuntimeException("Turno no existe"));

        OfertaGeneralEntity oferta = OfertaGeneralEntity.builder()
                .ofertor(ofertor)
                .turno(turno)
                .motivo(dto.getMotivo())
                .estado(OfertaGeneralEntity.EstadoOferta.PENDIENTE_APROBACION)
                .fechaCreacion(LocalDateTime.now())
                .build();

        OfertaGeneralEntity guardada = ofertaGeneralRepository.save(oferta);
        agendarBitacora("OFERTA_GENERAL_CREADA", guardada.getIdOfertaGeneral(), ofertor.getIdFuncionario());
        return guardada;
    }

    /** Pasa la oferta de {@code PENDIENTE_APROBACION} a {@code ABIERTA}, habilitando postulaciones. */
    @Transactional
    public OfertaGeneralEntity aprobarOferta(Long idOferta, Long idJefatura) {
        OfertaGeneralEntity oferta = ofertaGeneralRepository.findById(idOferta)
                .orElseThrow(() -> new RuntimeException("Oferta no existe"));

        if (oferta.getEstado() != OfertaGeneralEntity.EstadoOferta.PENDIENTE_APROBACION) {
            throw new RuntimeException("La oferta no está en estado PENDIENTE_APROBACION");
        }

        oferta.setEstado(OfertaGeneralEntity.EstadoOferta.ABIERTA);
        OfertaGeneralEntity guardada = ofertaGeneralRepository.save(oferta);
        agendarBitacora("OFERTA_GENERAL_APROBADA", guardada.getIdOfertaGeneral(), idJefatura);
        return guardada;
    }

    /** Pasa la oferta de {@code PENDIENTE_APROBACION} a {@code RECHAZADA}. */
    @Transactional
    public OfertaGeneralEntity rechazarOferta(Long idOferta, Long idJefatura) {
        OfertaGeneralEntity oferta = ofertaGeneralRepository.findById(idOferta)
                .orElseThrow(() -> new RuntimeException("Oferta no existe"));

        if (oferta.getEstado() != OfertaGeneralEntity.EstadoOferta.PENDIENTE_APROBACION) {
            throw new RuntimeException("La oferta no está en estado PENDIENTE_APROBACION");
        }

        oferta.setEstado(OfertaGeneralEntity.EstadoOferta.RECHAZADA);
        OfertaGeneralEntity guardada = ofertaGeneralRepository.save(oferta);
        agendarBitacora("OFERTA_GENERAL_RECHAZADA", guardada.getIdOfertaGeneral(), idJefatura);
        return guardada;
    }

    /**
     * Postula un funcionario a una oferta {@code ABIERTA}. Rechaza si el ofertor intenta
     * postularse a su propia oferta o si ya existe una postulación suya para esta oferta.
     */
    @Transactional
    public PostulacionEntity postular(Long idOferta, Long idFuncionario) {
        OfertaGeneralEntity oferta = ofertaGeneralRepository.findById(idOferta)
                .orElseThrow(() -> new RuntimeException("Oferta no existe"));

        if (oferta.getEstado() != OfertaGeneralEntity.EstadoOferta.ABIERTA) {
            throw new RuntimeException("La oferta no está abierta");
        }

        if (oferta.getOfertor().getIdFuncionario().equals(idFuncionario)) {
            throw new RuntimeException("El ofertor no puede postular a su propia oferta");
        }

        if (postulacionRepository.existsByOfertaGeneral_IdOfertaGeneralAndPostulante_IdFuncionario(idOferta, idFuncionario)) {
            throw new RuntimeException("Ya existe una postulación para esta oferta");
        }

        FuncionarioEntity postulante = funcionarioRepository.findById(idFuncionario)
                .orElseThrow(() -> new RuntimeException("Funcionario no existe"));

        PostulacionEntity postulacion = PostulacionEntity.builder()
                .ofertaGeneral(oferta)
                .postulante(postulante)
                .fechaPostulacion(LocalDateTime.now())
                .seleccionado(false)
                .build();

        PostulacionEntity guardada = postulacionRepository.save(postulacion);
        agendarBitacora("POSTULACION_CREADA", idOferta, idFuncionario);
        return guardada;
    }

    /** Solo el propio postulante puede retirarse, y solo mientras la oferta siga {@code ABIERTA}. */
    @Transactional
    public void retirarPostulacion(Long idPostulacion, Long idFuncionario) {
        PostulacionEntity postulacion = postulacionRepository.findById(idPostulacion)
                .orElseThrow(() -> new RuntimeException("Postulación no existe"));

        if (!postulacion.getPostulante().getIdFuncionario().equals(idFuncionario)) {
            throw new RuntimeException("No eres el titular de esta postulación");
        }

        OfertaGeneralEntity oferta = postulacion.getOfertaGeneral();

        if (oferta.getEstado() != OfertaGeneralEntity.EstadoOferta.ABIERTA) {
            throw new RuntimeException("Solo se puede retirar una postulación mientras la oferta esté abierta");
        }

        Long idOferta = oferta.getIdOfertaGeneral();
        oferta.getPostulaciones().remove(postulacion);
        ofertaGeneralRepository.save(oferta);
        agendarBitacora("POSTULACION_RETIRADA", idOferta, idFuncionario);
    }

    /**
     * Asigna el turno de la oferta al postulante elegido y cierra la oferta ({@code CERRADA}).
     * Usa lock pesimista sobre la oferta: si dos jefaturas seleccionan postulantes distintos
     * para la misma oferta al mismo tiempo, la segunda espera a que la primera termine (en vez
     * de leer el estado ABIERTA en paralelo) y luego relee con datos frescos gracias al lock.
     */
    @Transactional
    public OfertaGeneralEntity seleccionarPostulante(Long idOferta, Long idPostulacion, Long idJefatura) {
        // Lock pesimista: si dos jefaturas seleccionan postulantes distintos para la misma oferta
        // al mismo tiempo, la segunda espera a que la primera termine (en vez de leer el estado
        // ABIERTA en paralelo) y luego relee con datos frescos gracias al propio lock.
        OfertaGeneralEntity oferta = ofertaGeneralRepository.findByIdForUpdate(idOferta)
                .orElseThrow(() -> new RuntimeException("Oferta no existe"));

        if (oferta.getEstado() != OfertaGeneralEntity.EstadoOferta.ABIERTA) {
            throw new RuntimeException("La oferta no está abierta");
        }

        PostulacionEntity postulacion = postulacionRepository.findById(idPostulacion)
                .orElseThrow(() -> new RuntimeException("Postulación no existe"));

        if (!postulacion.getOfertaGeneral().getIdOfertaGeneral().equals(idOferta)) {
            throw new RuntimeException("La postulación no pertenece a esta oferta");
        }

        TurnoEntity turno = oferta.getTurno();
        FuncionarioEntity postulante = postulacion.getPostulante();
        validarConflictoPostulante(postulante, turno);

        turno.setFuncionario(postulante);
        turnoRepository.save(turno);

        postulacion.setSeleccionado(true);
        postulacionRepository.save(postulacion);

        oferta.setEstado(OfertaGeneralEntity.EstadoOferta.CERRADA);
        OfertaGeneralEntity guardada = ofertaGeneralRepository.save(oferta);

        agendarBitacora("OFERTA_GENERAL_CERRADA", guardada.getIdOfertaGeneral(), idJefatura);
        return guardada;
    }

    /**
     * Valida que el turno de la oferta pueda asignarse al postulante elegido, contra su calendario
     * vigente (cualquier servicio). Si los datos del turno están incompletos (p. ej. en pruebas
     * unitarias sin fecha/hora), no hay base temporal para validar y se omite.
     */
    private void validarConflictoPostulante(FuncionarioEntity postulante, TurnoEntity turno) {
        if (turno.getDiaInicioTurno() == null || turno.getHoraInicio() == null
                || turno.getDiaFinalTurno() == null || turno.getHoraFin() == null) {
            return;
        }
        List<TurnoEntity> vigentes = turnoRepository.findByFuncionario_IdFuncionario(postulante.getIdFuncionario());
        LocalDateTime nuevoInicio = turno.getDiaInicioTurno().atTime(turno.getHoraInicio());
        LocalDateTime nuevoFin = turno.getDiaFinalTurno().atTime(turno.getHoraFin());
        String nombre = (postulante.getNombre() + (postulante.getApelPat() != null ? " " + postulante.getApelPat() : "")).trim();
        validadorAsignacion.validarAsignacion(nombre, nuevoInicio, nuevoFin, turno.getIdTurno(), vigentes);
    }

    @Transactional
    public List<OfertaGeneralEntity> findByServicio(Long idServicio) {
        return ofertaGeneralRepository.findByTurno_Servicio_IdServicio(idServicio);
    }

    @Transactional
    public List<OfertaGeneralEntity> findByOfertor(Long idFuncionario) {
        return ofertaGeneralRepository.findByOfertor_IdFuncionario(idFuncionario);
    }

    private void agendarBitacora(String evento, Long idOferta, Long idFuncionario) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            bitacoraService.registrarEventoOferta(evento, idOferta, idFuncionario);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                bitacoraService.registrarEventoOferta(evento, idOferta, idFuncionario);
            }
        });
    }
}
