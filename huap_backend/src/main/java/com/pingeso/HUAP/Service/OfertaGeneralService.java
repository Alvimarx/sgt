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

@Service
@RequiredArgsConstructor
public class OfertaGeneralService {

    private final OfertaGeneralRepository ofertaGeneralRepository;
    private final PostulacionRepository postulacionRepository;
    private final FuncionarioRepository funcionarioRepository;
    private final TurnoRepository turnoRepository;
    private final BitacoraService bitacoraService;

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
        turno.setFuncionario(postulacion.getPostulante());
        turnoRepository.save(turno);

        postulacion.setSeleccionado(true);
        postulacionRepository.save(postulacion);

        oferta.setEstado(OfertaGeneralEntity.EstadoOferta.CERRADA);
        OfertaGeneralEntity guardada = ofertaGeneralRepository.save(oferta);

        agendarBitacora("OFERTA_GENERAL_CERRADA", guardada.getIdOfertaGeneral(), idJefatura);
        return guardada;
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
