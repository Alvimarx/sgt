package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.CrearOfertaGeneralDTO;
import com.pingeso.HUAP.Entity.*;
import com.pingeso.HUAP.Repository.*;
import com.pingeso.HUAP.Security.AlcanceServicio;
import com.pingeso.HUAP.Security.SeguridadServicio;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/**
 * Ofertas generales de turno: un funcionario ofrece un turno propio para que cualquiera del
 * servicio se postule, a diferencia de la {@code SolicitudEntity} de intercambio/cobertura que
 * va dirigida a un receptor específico.
 *
 * <p>Ciclo de vida: {@link #crearOferta} (PENDIENTE_APROBACION) → {@link #aprobarOferta} o
 * {@link #rechazarOferta}, o el ofertor la retira ({@link #retirarOferta}, RETIRADA) mientras
 * nadie haya postulado, pendiente o ya abierta → si ABIERTA, {@link #postular} /
 * {@link #retirarPostulacion} → {@link #seleccionarPostulante} asigna el turno y cierra la
 * oferta (CERRADA).
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
    private final SeguridadServicio seguridadServicio;

    /** Crea la oferta en estado {@code PENDIENTE_APROBACION}; no queda visible para postular hasta aprobarse. */
    @Transactional
    public OfertaGeneralEntity crearOferta(CrearOfertaGeneralDTO dto) {
        // SEC (C-02): el ofertor siempre es quien está autenticado, nunca el idFuncionario del DTO.
        FuncionarioEntity ofertor = funcionarioRepository.findById(seguridadServicio.idUsuarioActual())
                .orElseThrow(() -> new RuntimeException("Funcionario no existe"));

        TurnoEntity turno = turnoRepository.findById(dto.getIdTurno())
                .orElseThrow(() -> new RuntimeException("Turno no existe"));

        // SEC (S-01 b): solo se ofrece un turno propio. Antes solo lo limitaba la interfaz.
        if (!esDe(turno, ofertor.getIdFuncionario())) {
            throw new AccessDeniedException("Ese turno no es tuyo: solo puedes ofrecer tus propios turnos");
        }

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

    /** Verifica que la oferta pertenezca al servicio de la sesión activa (salvo ADMINISTRADOR). */
    private void exigirMismoServicioQueOferta(OfertaGeneralEntity oferta) {
        Long servicioOferta = (oferta.getTurno() != null && oferta.getTurno().getServicio() != null)
                ? oferta.getTurno().getServicio().getIdServicio() : null;
        if (servicioOferta == null) {
            if (!seguridadServicio.esAdministrador()) {
                throw new AccessDeniedException("No se pudo determinar el servicio de la oferta");
            }
            return;
        }
        seguridadServicio.exigirMismoServicio(servicioOferta);
    }

    /** ¿El turno está asignado a ese funcionario? */
    private static boolean esDe(TurnoEntity turno, Long idFuncionario) {
        return turno != null && turno.getFuncionario() != null && idFuncionario != null
                && idFuncionario.equals(turno.getFuncionario().getIdFuncionario());
    }

    /**
     * SEC (S-01 d): la regla de las solicitudes (H-07), quien participa no decide. El ofertor no
     * abre ni rechaza su propia oferta, aunque sea jefatura, subrogante o administrador.
     */
    private void exigirQueNoSeaElOfertor(OfertaGeneralEntity oferta, Long idActor) {
        if (oferta.getOfertor() != null && Objects.equals(oferta.getOfertor().getIdFuncionario(), idActor)) {
            throw new AccessDeniedException("No puedes abrir ni rechazar tu propia oferta");
        }
    }

    /**
     * Pasa la oferta de {@code PENDIENTE_APROBACION} a {@code ABIERTA}, habilitando postulaciones.
     * Lee la oferta con lock, como {@link #retirarOferta}: si el ofertor la retira al mismo tiempo,
     * la segunda operación ve el estado que dejó la primera y no lo pisa.
     */
    @Transactional
    public OfertaGeneralEntity aprobarOferta(Long idOferta) {
        OfertaGeneralEntity oferta = ofertaGeneralRepository.findByIdForUpdate(idOferta)
                .orElseThrow(() -> new RuntimeException("Oferta no existe"));

        // SEC (H-02, High): antes cualquier autenticado podía aprobar ofertas de cualquier
        // servicio y la bitácora atribuía la acción a un idJefatura arbitrario del parámetro.
        exigirMismoServicioQueOferta(oferta);
        Long idJefatura = seguridadServicio.idUsuarioActual();
        exigirQueNoSeaElOfertor(oferta, idJefatura);

        if (oferta.getEstado() != OfertaGeneralEntity.EstadoOferta.PENDIENTE_APROBACION) {
            throw new RuntimeException("La oferta no está en estado PENDIENTE_APROBACION");
        }

        oferta.setEstado(OfertaGeneralEntity.EstadoOferta.ABIERTA);
        OfertaGeneralEntity guardada = ofertaGeneralRepository.save(oferta);
        agendarBitacora("OFERTA_GENERAL_APROBADA", guardada.getIdOfertaGeneral(), idJefatura);
        return guardada;
    }

    /** Pasa la oferta de {@code PENDIENTE_APROBACION} a {@code RECHAZADA}. Lee con lock, como {@link #aprobarOferta}. */
    @Transactional
    public OfertaGeneralEntity rechazarOferta(Long idOferta) {
        OfertaGeneralEntity oferta = ofertaGeneralRepository.findByIdForUpdate(idOferta)
                .orElseThrow(() -> new RuntimeException("Oferta no existe"));

        exigirMismoServicioQueOferta(oferta);
        Long idJefatura = seguridadServicio.idUsuarioActual();
        exigirQueNoSeaElOfertor(oferta, idJefatura);

        if (oferta.getEstado() != OfertaGeneralEntity.EstadoOferta.PENDIENTE_APROBACION) {
            throw new RuntimeException("La oferta no está en estado PENDIENTE_APROBACION");
        }

        oferta.setEstado(OfertaGeneralEntity.EstadoOferta.RECHAZADA);
        OfertaGeneralEntity guardada = ofertaGeneralRepository.save(oferta);
        agendarBitacora("OFERTA_GENERAL_RECHAZADA", guardada.getIdOfertaGeneral(), idJefatura);
        return guardada;
    }

    /**
     * C-16 (HU-OFE-01): quien publicó una oferta la retira hasta que alguien postule. La decisión
     * del 17 oct decía «mientras nadie la haya abierto»; la del 20 oct la reemplazó. Solo el ofertor
     * (cualquier otra persona, también la gestión o el ADMINISTRADOR: 403) y solo con la oferta
     * pendiente de apertura o abierta ({@link OfertaGeneralEntity.EstadoOferta#admiteRetiro}): si ya
     * está cerrada (el turno se asignó), rechazada o retirada: 409. Con al menos una postulación
     * tampoco: 409. Si la única postulación se retira, la oferta vuelve a poder retirarse. Si no
     * existe: 404. Queda {@code RETIRADA} y deja el evento {@code OFERTA_GENERAL_RETIRADA} en la
     * bitácora.
     *
     * <p>Lee la oferta con lock, como {@link #postular}: un retiro y una postulación simultáneos no
     * se pisan, la segunda operación ve lo que dejó la primera (no queda una oferta retirada con
     * una postulación).
     */
    @Transactional
    public OfertaGeneralEntity retirarOferta(Long idOferta) {
        // Con lock, igual que abrir, rechazar y postular: dos operaciones simultáneas no se pisan.
        OfertaGeneralEntity oferta = ofertaGeneralRepository.findByIdForUpdate(idOferta)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "La oferta no existe"));

        Long idUsuario = seguridadServicio.idUsuarioActual();
        if (oferta.getOfertor() == null || !Objects.equals(oferta.getOfertor().getIdFuncionario(), idUsuario)) {
            throw new AccessDeniedException("Solo quien publicó la oferta puede retirarla");
        }
        if (oferta.getEstado() == null || !oferta.getEstado().admiteRetiro()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "La oferta " + porQueNoSePuedeRetirar(oferta.getEstado()) + ": no se puede retirar");
        }
        if (oferta.getPostulaciones() != null && !oferta.getPostulaciones().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "La oferta ya tiene postulaciones: no se puede retirar");
        }

        oferta.setEstado(OfertaGeneralEntity.EstadoOferta.RETIRADA);
        OfertaGeneralEntity guardada = ofertaGeneralRepository.save(oferta);
        agendarBitacora("OFERTA_GENERAL_RETIRADA", guardada.getIdOfertaGeneral(), idUsuario);
        return guardada;
    }

    /** Qué dice el 409 de {@link #retirarOferta} de una oferta que ya no admite retiro, según su estado. */
    private static String porQueNoSePuedeRetirar(OfertaGeneralEntity.EstadoOferta estado) {
        if (estado == OfertaGeneralEntity.EstadoOferta.CERRADA) return "ya está cerrada y su turno quedó asignado";
        if (estado == OfertaGeneralEntity.EstadoOferta.RECHAZADA) return "ya está rechazada";
        if (estado == OfertaGeneralEntity.EstadoOferta.RETIRADA) return "ya está retirada";
        return "no está en un estado que lo permita";
    }

    /**
     * Postula un funcionario a una oferta {@code ABIERTA}. Rechaza si el ofertor intenta
     * postularse a su propia oferta o si ya existe una postulación suya para esta oferta.
     * Lee la oferta con lock, como {@link #retirarOferta}: si el ofertor la retira al mismo
     * tiempo, la segunda operación ve lo que dejó la primera.
     */
    @Transactional
    public PostulacionEntity postular(Long idOferta) {
        // SEC (C-02): el postulante siempre es quien está autenticado.
        Long idFuncionario = seguridadServicio.idUsuarioActual();
        // Con lock: retirarOferta exige que no haya postulaciones, y esta lectura las serializa con él.
        OfertaGeneralEntity oferta = ofertaGeneralRepository.findByIdForUpdate(idOferta)
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
    public void retirarPostulacion(Long idPostulacion) {
        // SEC (C-02): solo el propio postulante autenticado puede retirar su postulación.
        Long idFuncionario = seguridadServicio.idUsuarioActual();
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
    public OfertaGeneralEntity seleccionarPostulante(Long idOferta, Long idPostulacion) {
        // Lock pesimista: si dos jefaturas seleccionan postulantes distintos para la misma oferta
        // al mismo tiempo, la segunda espera a que la primera termine (en vez de leer el estado
        // ABIERTA en paralelo) y luego relee con datos frescos gracias al propio lock.
        OfertaGeneralEntity oferta = ofertaGeneralRepository.findByIdForUpdate(idOferta)
                .orElseThrow(() -> new RuntimeException("Oferta no existe"));

        // SEC (H-02, High): antes cualquier autenticado podía cerrar/seleccionar postulantes
        // de ofertas de cualquier servicio, auto-asignándose turnos ajenos.
        exigirMismoServicioQueOferta(oferta);
        Long idJefatura = seguridadServicio.idUsuarioActual();
        // SEC (S-01 d): quien participa en la oferta (el ofertor o un postulante) no elige.
        if ((oferta.getOfertor() != null && Objects.equals(oferta.getOfertor().getIdFuncionario(), idJefatura))
                || postulacionRepository.existsByOfertaGeneral_IdOfertaGeneralAndPostulante_IdFuncionario(idOferta, idJefatura)) {
            throw new AccessDeniedException("No puedes elegir al postulante de una oferta en la que participas");
        }

        if (oferta.getEstado() != OfertaGeneralEntity.EstadoOferta.ABIERTA) {
            throw new RuntimeException("La oferta no está abierta");
        }

        PostulacionEntity postulacion = postulacionRepository.findById(idPostulacion)
                .orElseThrow(() -> new RuntimeException("Postulación no existe"));

        if (!postulacion.getOfertaGeneral().getIdOfertaGeneral().equals(idOferta)) {
            throw new RuntimeException("La postulación no pertenece a esta oferta");
        }

        TurnoEntity turno = oferta.getTurno();
        // SEC (S-01 a): el turno debe seguir siendo del ofertor. Si cambió de dueño entre medio
        // (una asignación manual, una solicitud aprobada), se le entregaría el turno de un tercero.
        if (!esDe(turno, oferta.getOfertor() != null ? oferta.getOfertor().getIdFuncionario() : null)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El turno ya no es de quien lo ofreció: la oferta quedó obsoleta");
        }
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
        // RG-27: el aviso cita el turno que choca; con el servicio del turno nombra el del que choca si es otro.
        validadorAsignacion.validarAsignacion(nombre, nuevoInicio, nuevoFin, turno.getIdTurno(), vigentes,
                AlcanceServicio.servicioDe(turno));
    }

    /**
     * SEC (C-17): las ofertas de un servicio solo las lee ese servicio (o el ADMINISTRADOR).
     * C-16: al médico no se le entregan las ofertas rechazadas ni las retiradas de otras personas;
     * las suyas, sí, para que sepa qué pasó con ellas. La gestión y el ADMINISTRADOR ven todas.
     */
    @Transactional
    public List<OfertaGeneralEntity> findByServicio(Long idServicio) {
        seguridadServicio.exigirMismoServicio(idServicio);
        List<OfertaGeneralEntity> ofertas = ofertaGeneralRepository.findByTurno_Servicio_IdServicio(idServicio);
        if (seguridadServicio.esAdministrador() || seguridadServicio.esGestionDelServicio()) {
            return ofertas;
        }
        Long idUsuario = seguridadServicio.idUsuarioActual();
        return ofertas.stream()
                .filter(o -> o.getEstado() == null || !o.getEstado().soloLaVeSuOfertor()
                        || (o.getOfertor() != null && Objects.equals(o.getOfertor().getIdFuncionario(), idUsuario)))
                .toList();
    }

    /**
     * SEC (C-17): las ofertas propias se ven completas; las de otra persona, solo las del
     * servicio de la sesión (el ADMINISTRADOR ve todas).
     */
    @Transactional
    public List<OfertaGeneralEntity> findByOfertor(Long idFuncionario) {
        List<OfertaGeneralEntity> ofertas = ofertaGeneralRepository.findByOfertor_IdFuncionario(idFuncionario);
        if (seguridadServicio.esAdministrador()
                || Objects.equals(idFuncionario, seguridadServicio.idUsuarioActual())) {
            return ofertas;
        }
        Long servicioSesion = seguridadServicio.idServicioActual();
        return ofertas.stream()
                .filter(o -> servicioSesion != null && servicioSesion.equals(AlcanceServicio.servicioDe(o.getTurno())))
                .toList();
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
