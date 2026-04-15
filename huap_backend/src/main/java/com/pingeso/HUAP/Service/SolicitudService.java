package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.DTO.*;
import com.pingeso.HUAP.Entity.SolicitudEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Entity.PersonalEntity;
import com.pingeso.HUAP.Repository.SolicitudRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import com.pingeso.HUAP.Repository.PersonalRepository;
import com.pingeso.HUAP.Repository.PisoRepository;
import jakarta.transaction.Transactional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

import com.pingeso.HUAP.Entity.EventLogEntity;
import java.time.LocalDate;

@Service
public class SolicitudService {

    private final SolicitudRepository solicitudRepository;
    private final TurnoRepository turnoRepository;
    private final PersonalRepository personalRepository;
    private final PisoRepository pisoRepository;
    private final EventLogService eventLogService;

    @Autowired
    public SolicitudService(SolicitudRepository solicitudRepository, TurnoRepository turnoRepository, PersonalRepository personalRepository, PisoRepository pisoRepository, EventLogService eventLogService) {
        this.solicitudRepository = solicitudRepository;
        this.turnoRepository = turnoRepository;
        this.personalRepository = personalRepository;
        this.pisoRepository = pisoRepository;
        this.eventLogService = eventLogService;
    }

    // Definir los tipos de solicitud que son PERMISOS
    private static final List<String> TIPOS_PERMISO_POR_RANGO = List.of(
            "Permiso",
            "Motivos personales",
            "Feriado legal",
            "Licencia médica",
            "Permiso administrativo"
    );

    // Helper para registrar un evento en la bitácora
    private void registrarEvento(String tipoEvento,
                                 String descripcion,
                                 PersonalEntity actor,
                                 SolicitudEntity solicitud,
                                 TurnoEntity turno,
                                 String estadoAnterior,
                                 String estadoNuevo,
                                 String motivo,
                                 LocalDate fechaInicioAfectada,
                                 LocalDate fechaFinAfectada) {
        try {
            EventLogEntity evt = new EventLogEntity();
            evt.setTipoEvento(tipoEvento);
            evt.setDescripcion(descripcion);
            evt.setFechaEvento(LocalDateTime.now());
            if (actor != null) evt.setUsuario(actor);
            if (solicitud != null) evt.setIdSolicitud(solicitud.getId());
            if (turno != null) evt.setIdTurno(turno.getId());
            evt.setEstadoAnterior(estadoAnterior);
            evt.setEstadoNuevo(estadoNuevo);
            evt.setMotivo(motivo);
            evt.setFechaInicioAfectada(fechaInicioAfectada);
            evt.setFechaFinAfectada(fechaFinAfectada);
            evt.setActivo(true);
            eventLogService.save(evt);
        } catch (Exception ex) {
            // No queremos que falle la acción principal por un fallo en logging
            System.err.println("No se pudo registrar evento de bitácora: " + ex.getMessage());
        }
    }

    private PersonalEntity obtenerMedicoSolicitanteActual(Long medicoId) {
        return personalRepository.findById(medicoId)
                .orElseThrow(() -> new RuntimeException("Médico solicitante no encontrado con ID: " + medicoId));
    }

    private TurnoEntity obtenerTurno(Long turnoId) {
        return turnoRepository.findById(turnoId)
                .orElseThrow(() -> new RuntimeException("Turno no encontrado con ID: " + turnoId));
    }

    // Obtener el usuario actual desde el contexto de seguridad (si está disponible)
    private PersonalEntity obtenerUsuarioDesdeContexto() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null) {
                Object principal = auth.getPrincipal();
                Long usuarioId = null;
                if (principal instanceof Long) {
                    usuarioId = (Long) principal;
                } else if (principal instanceof Integer) {
                    usuarioId = ((Integer) principal).longValue();
                } else if (principal instanceof String) {
                    try {
                        usuarioId = Long.parseLong((String) principal);
                    } catch (NumberFormatException ignored) {
                    }
                }
                if (usuarioId != null) {
                    return personalRepository.findById(usuarioId).orElse(null);
                }
            }
        } catch (Exception ex) {
            System.err.println("No se pudo resolver usuario desde contexto: " + ex.getMessage());
        }
        return null;
    }

    private SolicitudResponseDTO mapToResponseDTO(SolicitudEntity entity) {
        SolicitudResponseDTO dto = new SolicitudResponseDTO();

        // Mapeo básico de todas las propiedades de la SolicitudEntity
        dto.setId(entity.getId());
        dto.setTipo(entity.getTipo());
        dto.setEstado(entity.getEstado());
        dto.setMotivo(entity.getMotivo());
        dto.setFechaCreacion(entity.getFechaCreacion());
        dto.setAceptadoMedico(entity.getAceptadoMedico());

        // Mapeo de Médicos (Solicitante y Receptor)
        if (entity.getMedicoSolicitante() != null) {
            dto.setMedicoSolicitante(mapPersonalToMedicoDTO(entity.getMedicoSolicitante()));
        }
        if (entity.getMedicoReceptor() != null) {
            dto.setMedicoReceptor(mapPersonalToMedicoDTO(entity.getMedicoReceptor()));
        }

        // Lógica para mapeo de turnos (Intercambio, Oferta, Cobertura, Botar Turno)
        if ("Cambio de turno".equals(entity.getTipo()) || "Oferta de turno".equals(entity.getTipo())) {

            if (entity.getTurnoDeSolicitanteId() != null) {
                // Se asume que aquí se busca el TurnoEntity basado en el ID y se mapea
                turnoRepository.findById(entity.getTurnoDeSolicitanteId())
                        .ifPresent(turnoEntity -> dto.setTurnoPropio(mapTurnoToDetailDTO(turnoEntity)));
            }

            if (entity.getTurno() != null) {
                dto.setTurnoDeseado(mapTurnoToDetailDTO(entity.getTurno()));
            }

            dto.setTurno(null); // Limpieza para otros tipos
        } else if ("Botar turno".equals(entity.getTipo())) {
            // Para "Botar turno", el turno a botar está en turnoDeSolicitanteId
            if (entity.getTurnoDeSolicitanteId() != null) {
                turnoRepository.findById(entity.getTurnoDeSolicitanteId())
                        .ifPresent(turnoEntity -> dto.setTurno(mapTurnoToDetailDTO(turnoEntity)));
            }
            dto.setTurnoPropio(null);
            dto.setTurnoDeseado(null);
        } else if (entity.getTurno() != null) {
            // Solicitud de cobertura, Devolución (cuando el TurnoEntity está en el campo 'turno')
            dto.setTurno(mapTurnoToDetailDTO(entity.getTurno()));
            dto.setTurnoPropio(null);
            dto.setTurnoDeseado(null);
        }

        // Mapeo de fechas de Permiso
        dto.setFechaInicioPermiso(entity.getFechaInicioPermiso());
        dto.setFechaTerminoPermiso(entity.getFechaTerminoPermiso());

        dto.setTipoAutorizacion(entity.getTipoAutorizacion());

        return dto;
    }

    //metodo auxiliar para convertir de turno entity a turnodetaildto
    private TurnoDetailDTO mapTurnoToDetailDTO(TurnoEntity turnoEntity) {
        TurnoDetailDTO dto = new TurnoDetailDTO();
        if (turnoEntity == null) return null;

        dto.setId(turnoEntity.getId());
        // Resolver idPiso a nombre de piso cuando sea posible para no exponer solo un identificador
        String idPisoRaw = turnoEntity.getIdPiso();
        String pisoNombre = idPisoRaw;
        if (idPisoRaw != null) {
            try {
                // intentar parsear como id numérico
                Long pisoId = Long.parseLong(idPisoRaw.trim());
                java.util.Optional<com.pingeso.HUAP.Entity.PisoEntity> opt = pisoRepository.findById(pisoId);
                if (opt.isPresent()) {
                    pisoNombre = opt.get().getNombre();
                }
            } catch (NumberFormatException nfe) {
                // si no es numérico, intentar buscar por nombre (alguna integracion antigua puede guardar nombre)
                try {
                    java.util.Optional<com.pingeso.HUAP.Entity.PisoEntity> opt2 = pisoRepository.findByNombre(idPisoRaw);
                    if (opt2.isPresent()) pisoNombre = opt2.get().getNombre();
                } catch (Exception ignore) {
                    // ignore
                }
            } catch (Exception ex) {
                // no interrumpir por error en resolución de piso
                System.err.println("No se pudo resolver nombre de piso desde idPiso: " + ex.getMessage());
            }
        }
        dto.setIdPiso(pisoNombre);
        dto.setDiaSemana(turnoEntity.getDiaSemana());
        dto.setTipoTurno(turnoEntity.getTipoTurno());

        if (turnoEntity.getDiaInicioTurno() != null) {
            dto.setDiaInicioTurno(turnoEntity.getDiaInicioTurno().atStartOfDay());
        }

        if (turnoEntity.getHoraInicio() != null) {
            dto.setHoraInicio(turnoEntity.getHoraInicio().toString());
        }
        if (turnoEntity.getHoraFin() != null) {
            dto.setHoraFin(turnoEntity.getHoraFin().toString());
        }

        return dto;
    }

    //metodo para convertir de personal entity a medicodto
    private MedicoDTO mapPersonalToMedicoDTO(PersonalEntity personalEntity) {
        MedicoDTO dto = new MedicoDTO();
        if (personalEntity == null) return null;

        dto.setId(personalEntity.getIdPersonal());

        dto.setPrimerNombre(personalEntity.getNombre());
        dto.setPrimerApellido(personalEntity.getApellidoPaterno());

        return dto;
    }

    //metodo que busca solicitudes donde el médico es solicitante o receptor
    public List<SolicitudResponseDTO> obtenerSolicitudesPorMedicoYFiltro(Long medicoId, String filtro) {
        List<SolicitudEntity> solicitudes;

        if (filtro.equalsIgnoreCase("todas")) {
            solicitudes = solicitudRepository.findAllByMedicoSolicitante_IdPersonalOrMedicoReceptor_IdPersonalOrderByFechaCreacionDesc(medicoId, medicoId);
        } else {
            String estadoBuscado = filtro.substring(0, 1).toUpperCase(Locale.ROOT) + filtro.substring(1).toLowerCase(Locale.ROOT);

            solicitudes = solicitudRepository.findAllByMedicoIdAndEstado(medicoId, estadoBuscado);
        }

        return solicitudes.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }


    //metodo que obtiene todas las solicitudes, sin filtros
    public List<SolicitudResponseDTO> obtenerTodasLasSolicitudesGlobal() {
        return solicitudRepository.findAllByOrderByFechaCreacionDesc().stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Obtener solicitudes por servicio (medicoSolicitante.idServicio) mapeadas a DTO
    public List<SolicitudResponseDTO> obtenerSolicitudesPorServicio(Long servicioId) {
        return solicitudRepository.findAllByMedicoSolicitanteServicioId(servicioId).stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }


    //metodo que obtiene todas las solicitudes filtradas por un estado
    public List<SolicitudResponseDTO> obtenerSolicitudesPorEstadoGlobal(String filtro) {
        String estadoBuscado = filtro.substring(0, 1).toUpperCase(Locale.ROOT) + filtro.substring(1).toLowerCase(Locale.ROOT);

        return solicitudRepository.findAllByEstadoOrderByFechaCreacionDesc(estadoBuscado).stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public SolicitudEntity crearSolicitudCobertura(SolicitudTurnoDTO dto, Long medicoSolicitanteId) {
        SolicitudEntity solicitud = new SolicitudEntity();
        PersonalEntity medicoSolicitante = obtenerMedicoSolicitanteActual(medicoSolicitanteId);
        TurnoEntity turnoSolicitado = obtenerTurno(dto.getTurnoSolicitadoId());
        solicitud.setMedicoSolicitante(medicoSolicitante);
        solicitud.setTurno(turnoSolicitado);
        solicitud.setTipo(dto.getTipo());
        solicitud.setMotivo(dto.getMotivo());
        solicitud.setFechaCreacion(LocalDateTime.now());
        solicitud.setEstado("Pendiente");
        solicitud.setAceptadoMedico(null);
        SolicitudEntity saved = solicitudRepository.save(solicitud);
        // Registrar en bitácora: creación de solicitud de cobertura
        registrarEvento("SOLICITUD_CREADA",
                "Solicitud de cobertura creada",
                medicoSolicitante,
                saved,
                turnoSolicitado,
                null,
                "Pendiente",
                dto.getMotivo(),
                null,
                null);
        return saved;
    }

    @Transactional
    public SolicitudEntity crearSolicitudPermiso(SolicitudPermisoDTO dto, Long medicoSolicitanteId) {
        SolicitudEntity solicitud = new SolicitudEntity();
        PersonalEntity medicoSolicitante = obtenerMedicoSolicitanteActual(medicoSolicitanteId);

        solicitud.setMedicoSolicitante(medicoSolicitante);
        solicitud.setTipo("Permiso");
        solicitud.setTipoAutorizacion(dto.getTipoPermiso());
        solicitud.setMotivo(dto.getDescripcion());
        solicitud.setFechaInicioPermiso(dto.getFechaInicioPermiso());
        solicitud.setFechaTerminoPermiso(dto.getFechaTerminoPermiso());
        solicitud.setFechaCreacion(LocalDateTime.now());
        solicitud.setEstado("Pendiente");

        // === NUEVA LÓGICA: Vincular turnos por ID ===
        if (dto.getTurnosAfectadosIds() != null && !dto.getTurnosAfectadosIds().isEmpty()) {
            // Buscamos los turnos reales en la BD usando los IDs enviados por el frontend
            List<TurnoEntity> turnos = turnoRepository.findAllById(dto.getTurnosAfectadosIds());
            // Los guardamos en la nueva relación de la entidad
            solicitud.setTurnosAfectados(turnos);
        }
        // ===========================================

        SolicitudEntity saved = solicitudRepository.save(solicitud);

        // Registro en bitácora
        registrarEvento("SOLICITUD_CREADA",
                "Solicitud de permiso creada",
                medicoSolicitante,
                saved,
                null,
                null,
                "Pendiente",
                dto.getDescripcion(),
                dto.getFechaInicioPermiso() != null ? dto.getFechaInicioPermiso().toLocalDate() : null,
                dto.getFechaTerminoPermiso() != null ? dto.getFechaTerminoPermiso().toLocalDate() : null);

        return saved;
    }

    @Transactional
    public SolicitudEntity crearSolicitudIntercambio(SolicitudIntercambioDTO dto, Long medicoSolicitanteId) {
        SolicitudEntity solicitud = new SolicitudEntity();
        PersonalEntity medicoSolicitante = obtenerMedicoSolicitanteActual(medicoSolicitanteId);
        TurnoEntity turnoDeseado = obtenerTurno(dto.getTurnoDeseadoId());
        PersonalEntity medicoReceptor = personalRepository.findById(dto.getMedicoReceptorId())
                .orElseThrow(() -> new RuntimeException("Médico receptor no encontrado con ID: " + dto.getMedicoReceptorId()));

        solicitud.setMedicoSolicitante(medicoSolicitante);
        solicitud.setTurno(turnoDeseado);
        solicitud.setMedicoReceptor(medicoReceptor);
        solicitud.setTurnoDeSolicitanteId(dto.getTurnoPropioId());
        solicitud.setTipo(dto.getTipo());
        solicitud.setMotivo(dto.getMotivo());
        solicitud.setFechaCreacion(LocalDateTime.now());
        solicitud.setEstado("Pendiente");
        solicitud.setAceptadoMedico(null);
        SolicitudEntity saved = solicitudRepository.save(solicitud);
        registrarEvento("SOLICITUD_CREADA",
            "Solicitud de intercambio creada",
            medicoSolicitante,
            saved,
            turnoDeseado,
            null,
            "Pendiente",
            dto.getMotivo(),
            null,
            null);
        return saved;
    }

    @Transactional
    public SolicitudEntity crearSolicitudOferta(SolicitudOfertaDTO dto, Long medicoSolicitanteId) {

        PersonalEntity medicoSolicitante = obtenerMedicoSolicitanteActual(medicoSolicitanteId);

        // Si viene un receptor específico → funciona como siempre
        if (dto.getMedicoReceptorId() != null) {
            PersonalEntity receptor = personalRepository.findById(dto.getMedicoReceptorId())
                    .orElseThrow(() -> new RuntimeException("Médico receptor no encontrado"));

            SolicitudEntity solicitud = new SolicitudEntity();
            solicitud.setMedicoSolicitante(medicoSolicitante);
            solicitud.setMedicoReceptor(receptor);
            solicitud.setTurnoDeSolicitanteId(dto.getTurnoOfrecidoId());
            solicitud.setTipo(dto.getTipo());
            solicitud.setMotivo(dto.getCondiciones());
            solicitud.setFechaCreacion(LocalDateTime.now());
            solicitud.setEstado("Pendiente");

            SolicitudEntity saved = solicitudRepository.save(solicitud);
            registrarEvento("SOLICITUD_CREADA",
                    "Solicitud de oferta creada",
                    medicoSolicitante,
                    saved,
                    null,
                    null,
                    "Pendiente",
                    dto.getCondiciones(),
                    null,
                    null);

            return saved;
        }

        //si es para TODOS LOS DOCTORES
        List<PersonalEntity> doctores = personalRepository.findAll()
                .stream()
                .filter(p -> p.getRol().equalsIgnoreCase("MEDICO") && !p.getIdPersonal().equals(medicoSolicitanteId)) // <-- CAMBIO
                .collect(Collectors.toList());

        if (doctores.isEmpty()) {
            // Podrías considerar un mensaje diferente si solo queda el solicitante
            throw new RuntimeException("No existen médicos disponibles para enviar la oferta (o solo queda el solicitante).");
        }

        SolicitudEntity solicitudPadre = null;

        for (PersonalEntity doctor : doctores) {
            SolicitudEntity solicitud = new SolicitudEntity();
            solicitud.setMedicoSolicitante(medicoSolicitante);
            solicitud.setMedicoReceptor(doctor);
            solicitud.setTurnoDeSolicitanteId(dto.getTurnoOfrecidoId());
            solicitud.setTipo(dto.getTipo());
            solicitud.setMotivo(dto.getCondiciones());
            solicitud.setFechaCreacion(LocalDateTime.now());
            solicitud.setEstado("Pendiente");

            SolicitudEntity saved = solicitudRepository.save(solicitud);

            if (solicitudPadre == null) {
                solicitudPadre = saved;
            }

            registrarEvento(
                    "SOLICITUD_CREADA",
                    "Oferta enviada a todos los médicos",
                    medicoSolicitante,
                    saved,
                    null,
                    null,
                    "Pendiente",
                    dto.getCondiciones(),
                    null,
                    null
            );
        }

        return solicitudPadre;
    }


    @Transactional
    public void eliminarSolicitudPorId(Long solicitudId) {
        SolicitudEntity solicitud = solicitudRepository.findById(solicitudId).orElseThrow(
                () -> new RuntimeException("Solicitud con ID " + solicitudId + " no encontrada.")
        );
        // Registrar evento antes de eliminar para conservar trazabilidad
        PersonalEntity actor = obtenerUsuarioDesdeContexto();
        registrarEvento("SOLICITUD_ELIMINADA",
            "Solicitud eliminada",
            actor,
            solicitud,
            solicitud.getTurno(),
            solicitud.getEstado(),
            null,
            solicitud.getMotivo(),
            solicitud.getFechaInicioPermiso() != null ? solicitud.getFechaInicioPermiso().toLocalDate() : null,
            solicitud.getFechaTerminoPermiso() != null ? solicitud.getFechaTerminoPermiso().toLocalDate() : null);

        solicitudRepository.delete(solicitud);
    }

    @Transactional
    public SolicitudEntity actualizarEstadoSolicitud(Long solicitudId, String nuevoEstado) {
        // 1. Obtener la solicitud actual
        SolicitudEntity solicitud = solicitudRepository.findById(solicitudId).orElseThrow(
                () -> new RuntimeException("Solicitud con ID " + solicitudId + " no encontrada.")
        );
        // 2. Normalizar el estado (Ej: "aprobado" -> "Aprobado")
        String estadoNormalizado = nuevoEstado.substring(0, 1).toUpperCase(Locale.ROOT) +
                nuevoEstado.substring(1).toLowerCase(Locale.ROOT);

        String estadoAnterior = solicitud.getEstado();

        // Resolver actor (quién realiza la acción)
        PersonalEntity aprobador = obtenerUsuarioDesdeContexto();

        solicitud.setEstado(estadoNormalizado);

        // Lista de tipos de permiso que requieren liberación de turnos (se usa el parsing del motivo)
        final List<String> TIPOS_PERMISO_LIBERACION = List.of(
                "Motivos personales", "Feriado legal", "Licencia médica", "Licencia medica", "Botar turno"
        );


        // 3. Si la solicitud fue aprobada, ejecutamos lógica de negocio
        if ("Aprobado".equalsIgnoreCase(estadoNormalizado) || "Aprobada".equalsIgnoreCase(estadoNormalizado)) {
            // Si esta solicitud está vinculada a un turno específico, rechazamos todas las demás
            // solicitudes PENDIENTES que apunten a ese MISMO turno.
            if (solicitud.getTurno() != null) {
                Long turnoId = solicitud.getTurno().getId();

                List<SolicitudEntity> conflictos = solicitudRepository.findAllByTurno_IdAndEstadoAndIdNot(
                        turnoId,
                        "Pendiente",
                        solicitudId
                );

                if (!conflictos.isEmpty()) {
                    for (SolicitudEntity conflico : conflictos) {
                        String estadoPrevioConf = conflico.getEstado();
                        conflico.setEstado("Rechazado");
                        conflico.setAceptadoMedico(false);
                        conflico.setMotivo("La solicitud ya fue aceptada por un médico");
                        // Registrar cada rechazo automático en la bitácora
                        registrarEvento("SOLICITUD_RECHAZADA",
                                "Solicitud rechazada automáticamente por aprobación de otra solicitud",
                                aprobador,
                                conflico,
                                conflico.getTurno(),
                                estadoPrevioConf,
                                "Rechazado",
                                conflico.getMotivo(),
                                conflico.getFechaInicioPermiso() != null ? conflico.getFechaInicioPermiso().toLocalDate() : null,
                                conflico.getFechaTerminoPermiso() != null ? conflico.getFechaTerminoPermiso().toLocalDate() : null);
                    }
                    solicitudRepository.saveAll(conflictos);
                    System.out.println("Se rechazaron automáticamente " + conflictos.size() +
                            " solicitudes competidoras para el turno ID: " + turnoId);
                }
            }

            // LÓGICA PARA PERMISOS
            // Verificamos el tipo general de la solicitud
            if ("Permiso".equalsIgnoreCase(solicitud.getTipo())) {

                // Verificamos si el SUBTIPO (tipoAutorizacion) requiere liberar turnos
                if (TIPOS_PERMISO_LIBERACION.contains(solicitud.getTipoAutorizacion())) {
                    try {
                        // Obtenemos los turnos vinculados por la tabla intermedia
                        List<TurnoEntity> turnosParaLiberar = solicitud.getTurnosAfectados();

                        if (turnosParaLiberar != null && !turnosParaLiberar.isEmpty()) {
                            for (TurnoEntity turno : turnosParaLiberar) {
                                // Acción de liberación directa
                                turno.setIdMedico(null);
                                turno.setEstado("Sin asignar");
                                turno.setAsignador(aprobador);

                                System.out.println("SGT-LOG: Liberando turno ID " + turno.getId() + " por permiso aprobado.");
                            }
                            // Guardamos los cambios de los turnos en la base de datos
                            turnoRepository.saveAll(turnosParaLiberar);
                        }
                    } catch (Exception ex) {
                        System.err.println("SGT-ERROR al liberar turnos de permiso: " + ex.getMessage());
                    }
                }
            }
            //BOTAR TURNO
            if ("Botar turno".equalsIgnoreCase(solicitud.getTipo())) {
                try {
                    //Intentamos obtener el ID del turno de las dos posibles fuentes
                    Long turnoId = null;
                    if (solicitud.getTurnoDeSolicitanteId() != null) {
                        //Es el ID del turno que el solicitante quiere botar
                        turnoId = solicitud.getTurnoDeSolicitanteId();
                    } else if (solicitud.getTurno() != null) {
                        //Si no está, tomamos la relación principal
                        turnoId = solicitud.getTurno().getId();
                    }

                    System.out.println("DEBUG BOTAR TURNO: Intentando liberar turno con ID: " + turnoId);

                    if (turnoId != null) {
                        TurnoEntity turno = turnoRepository.findById(turnoId).orElse(null);
                        Long idMedicoSolicitante = solicitud.getMedicoSolicitante().getIdPersonal();

                        if (turno != null) {
                            // 2. Verificación de propiedad
                            if (turno.getIdMedico() != null && turno.getIdMedico().equals(idMedicoSolicitante)) {

                                // 3. Liberamos el turno
                                turno.setIdMedico(null);
                                turno.setEstado("Disponible");
                                turno.setAsignador(null);
                                turnoRepository.save(turno);

                                System.out.println("ÉXITO: Turno ID " + turnoId + " liberado exitosamente por Botar Turno.");
                            } else {
                                System.err.println("FALLO: Turno ID " + turnoId + " no pertenece al médico ID " + idMedicoSolicitante +
                                        ". Propietario actual: " + turno.getIdMedico());
                            }
                        } else {
                            System.err.println("FALLO: Turno ID " + turnoId + " no encontrado en la base de datos.");
                        }
                    } else {
                        System.err.println("FALLO: No se encontró ningún ID de turno asociado a la solicitud para Botar turno.");
                    }
                } catch (Exception ex) {
                    System.err.println("Error al intentar liberar el turno de Botar turno: " + ex.getMessage());
                    ex.printStackTrace();
                }
            }


            // LÓGICA PARA "SOLICITUD DE TURNO" (ASIGNAR EL TURNO AL MÉDICO)
            // Si el tipo es "Solicitud de turno"
            if ("Solicitud de turno".equalsIgnoreCase(solicitud.getTipo()) &&
                    solicitud.getTurno() != null) {

                try {
                    //Buscamos el turno específico por ID (ya viene vinculado en la solicitud)
                    TurnoEntity turno = turnoRepository.findById(solicitud.getTurno().getId())
                            .orElse(null);

                    if (turno != null) {
                        //Asignamos el turno al médico que hizo la solicitud
                        turno.setIdMedico(solicitud.getMedicoSolicitante().getIdPersonal());

                        //Cambiamos el estado a "Asignado"
                        turno.setEstado("Asignado");

                        //Guardamos quién lo aprobó (Jefatura)
                        if (aprobador != null) {
                            turno.setAsignador(aprobador);
                        }

                        turnoRepository.save(turno);
                        System.out.println("Turno ID " + turno.getId() + " asignado exitosamente al médico ID " + solicitud.getMedicoSolicitante().getIdPersonal());
                    }
                } catch (Exception ex) {
                    System.err.println("Error al asignar el turno: " + ex.getMessage());
                }
            }
            // =========================================================================
            // LÓGICA PARA "CAMBIO DE TURNO" (INTERCAMBIO / SWAP)
            // =========================================================================
            if ("Cambio de turno".equalsIgnoreCase(solicitud.getTipo()) &&
                    solicitud.getTurno() != null &&
                    solicitud.getTurnoDeSolicitanteId() != null) {

                try {
                    // 1. Buscamos los dos turnos en la base de datos
                    // 'turnoPropio' es el turno que tenía el solicitante originalmente
                    TurnoEntity turnoPropio = turnoRepository.findById(solicitud.getTurnoDeSolicitanteId())
                            .orElse(null);

                    // 'turnoDeseado' es el turno que tenía el receptor (colega)
                    TurnoEntity turnoDeseado = turnoRepository.findById(solicitud.getTurno().getId())
                            .orElse(null);

                    // 2. Verificamos que existan y que haya un médico receptor definido
                    if (turnoPropio != null && turnoDeseado != null && solicitud.getMedicoReceptor() != null) {

                        Long idSolicitante = solicitud.getMedicoSolicitante().getIdPersonal();
                        Long idReceptor = solicitud.getMedicoReceptor().getIdPersonal();

                        // 3. HACEMOS EL INTERCAMBIO (SWAP)

                        // El turno del solicitante ahora pertenece al receptor
                        turnoPropio.setIdMedico(idReceptor);
                        turnoPropio.setAsignador(aprobador); // Jefatura aprueba el cambio

                        // El turno del receptor ahora pertenece al solicitante
                        turnoDeseado.setIdMedico(idSolicitante);
                        turnoDeseado.setAsignador(aprobador);

                        // 4. Guardamos ambos turnos
                        turnoRepository.save(turnoPropio);
                        turnoRepository.save(turnoDeseado);

                        System.out.println("Intercambio exitoso: Turno " + turnoPropio.getId() + " -> Receptor, Turno " + turnoDeseado.getId() + " -> Solicitante.");
                    }
                } catch (Exception ex) {
                    System.err.println("Error al procesar el intercambio de turnos: " + ex.getMessage());
                }
            }
            // LÓGICA PARA "OFERTA DE TURNO"
            // Requiere que exista el turno original y un médico receptor aceptado
            if ("Oferta de turno".equalsIgnoreCase(solicitud.getTipo()) &&
                    solicitud.getTurnoDeSolicitanteId() != null &&
                    solicitud.getMedicoReceptor() != null) {

                try {
                    //Buscamos el turno que se está ofreciendo
                    TurnoEntity turno = turnoRepository.findById(solicitud.getTurnoDeSolicitanteId())
                            .orElse(null);

                    if (turno != null) {
                        //Transferimos la propiedad del turno al Médico Receptor
                        turno.setIdMedico(solicitud.getMedicoReceptor().getIdPersonal());

                        //Actualizamos metadatos
                        turno.setEstado("Asignado");
                        if (aprobador != null) {
                            turno.setAsignador(aprobador);
                        }

                        turnoRepository.save(turno);

                        //Log con NOMBRES (para que salga el nombre del médico)
                        String nombreOferente = solicitud.getMedicoSolicitante().getNombre() + " " + solicitud.getMedicoSolicitante().getApellidoPaterno();
                        String nombreReceptor = solicitud.getMedicoReceptor().getNombre() + " " + solicitud.getMedicoReceptor().getApellidoPaterno();

                        System.out.println("Oferta Aprobada: El turno ID " + turno.getId() +
                                " fue transferido de " + nombreOferente +
                                " a " + nombreReceptor + ".");
                    }
                } catch (Exception ex) {
                    System.err.println("Error al procesar la oferta de turno: " + ex.getMessage());
                }
            }
            try {
                if ("Solicitud de cobertura".equalsIgnoreCase(solicitud.getTipo()) &&
                        solicitud.getTurno() != null &&
                        solicitud.getMedicoSolicitante() != null) {

                    TurnoEntity turno = turnoRepository.findById(solicitud.getTurno().getId())
                            .orElse(null);

                    if (turno != null) {
                        // Asignar el turno al médico solicitante
                        turno.setIdMedico(solicitud.getMedicoSolicitante().getIdPersonal());
                        // Marcar el estado del turno como ASIGNADO
                        turno.setEstado("Asignado");

                        // Establecer el asignador (Usuario logueado / Jefatura)
                        try {
                            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                            if (auth != null) {
                                Object principal = auth.getPrincipal();
                                Long aprobadorId = null;
                                if (principal instanceof Long) {
                                    aprobadorId = (Long) principal;
                                } else if (principal instanceof Integer) {
                                    aprobadorId = ((Integer) principal).longValue();
                                } else if (principal instanceof String) {
                                    try {
                                        aprobadorId = Long.parseLong((String) principal);
                                    } catch (NumberFormatException nfe) {
                                        // Ignorar si no se puede parsear
                                    }
                                }

                                if (aprobadorId != null) {
                                    PersonalEntity aprobadorFromContext = personalRepository.findById(aprobadorId).orElse(null);
                                    if (aprobadorFromContext != null) {
                                        turno.setAsignador(aprobadorFromContext);
                                    }
                                }
                            }
                        } catch (Exception ex2) {
                            System.err.println("No se pudo resolver aprobador desde el contexto de seguridad: " + ex2.getMessage());
                        }
                        // Persistir el cambio del turno
                        turnoRepository.save(turno);
                    }
                }
            } catch (Exception ex) {
                System.err.println("Error al asignar turno tras aprobación de solicitud: " + ex.getMessage());
            }
        }

        // 4. Guardar la solicitud principal y registrar evento de cambio de estado
        SolicitudEntity saved = solicitudRepository.save(solicitud);

        try {
            if ("Aprobado".equalsIgnoreCase(estadoNormalizado) || "Aprobada".equalsIgnoreCase(estadoNormalizado)) {
                registrarEvento("SOLICITUD_ACEPTADA",
                        "Solicitud aprobada",
                        aprobador,
                        saved,
                        saved.getTurno(),
                        estadoAnterior,
                        estadoNormalizado,
                        saved.getMotivo(),
                        saved.getFechaInicioPermiso() != null ? saved.getFechaInicioPermiso().toLocalDate() : null,
                        saved.getFechaTerminoPermiso() != null ? saved.getFechaTerminoPermiso().toLocalDate() : null);
            } else if ("Rechazado".equalsIgnoreCase(estadoNormalizado) || "Rechazada".equalsIgnoreCase(estadoNormalizado)) {
                registrarEvento("SOLICITUD_RECHAZADA",
                        "Solicitud rechazada",
                        aprobador,
                        saved,
                        saved.getTurno(),
                        estadoAnterior,
                        estadoNormalizado,
                        saved.getMotivo(),
                        saved.getFechaInicioPermiso() != null ? saved.getFechaInicioPermiso().toLocalDate() : null,
                        saved.getFechaTerminoPermiso() != null ? saved.getFechaTerminoPermiso().toLocalDate() : null);
            }
        } catch (Exception ex) {
            System.err.println("No se pudo registrar evento de estado de solicitud: " + ex.getMessage());
        }

        return saved;
    }

    //metodo para actualizar la respuesta en las solicitudes de intercambio entre medicos
    @Transactional
    public SolicitudEntity actualizarRespuestaIntercambioMedico(Long solicitudId, Boolean aceptado) {
        // 1. Obtener la solicitud
        SolicitudEntity solicitud = solicitudRepository.findById(solicitudId)
                .orElseThrow(() -> new RuntimeException("Solicitud de intercambio no encontrada con ID: " + solicitudId));

        // 2. Validación de tipo
        if (!"Cambio de turno".equals(solicitud.getTipo())) {
            throw new RuntimeException("Solo se puede responder a solicitudes de Cambio de turno.");
        }

        // 3. Validación de estado (solo si está pendiente)
        if (!"Pendiente".equals(solicitud.getEstado())) {
            throw new RuntimeException("La solicitud ya fue procesada.");
        }

        String estadoAnterior = solicitud.getEstado();
        PersonalEntity actor = obtenerUsuarioDesdeContexto();

        if (aceptado) {
            solicitud.setAceptadoMedico(true);
            // La solicitud se mantiene en "Pendiente" hasta que Jefatura apruebe la finalización del intercambio.
            SolicitudEntity saved = solicitudRepository.save(solicitud);
            registrarEvento("INTERCAMBIO_ACEPTADO",
                    "Médico receptor aceptó el intercambio",
                    actor,
                    saved,
                    saved.getTurno(),
                    estadoAnterior,
                    saved.getEstado(),
                    saved.getMotivo(),
                    null,
                    null);
            return saved;
        } else {
            solicitud.setAceptadoMedico(null);
            // Si el médico rechaza, la solicitud se rechaza automáticamente (no requiere aprobación de Jefatura).
            solicitud.setEstado("Rechazado");
            SolicitudEntity saved = solicitudRepository.save(solicitud);
            registrarEvento("INTERCAMBIO_RECHAZADO",
                    "Médico receptor rechazó el intercambio",
                    actor,
                    saved,
                    saved.getTurno(),
                    estadoAnterior,
                    saved.getEstado(),
                    saved.getMotivo(),
                    null,
                    null);
            return saved;
        }
    }

    @Transactional
    public SolicitudEntity actualizarAceptacionMedico(Long solicitudId, boolean acepta, Long medicoReceptorId) {
        SolicitudEntity solicitud = solicitudRepository.findById(solicitudId)
                .orElseThrow(() -> new RuntimeException("Solicitud de intercambio no encontrada con ID: " + solicitudId));

        if (!"Cambio de turno".equals(solicitud.getTipo())) {
            throw new RuntimeException("Solo se puede responder a solicitudes de Cambio de turno.");
        }

        if (solicitud.getMedicoReceptor() == null || !solicitud.getMedicoReceptor().getIdPersonal().equals(medicoReceptorId)) {
            throw new RuntimeException("Acceso no autorizado: El usuario no es el médico receptor de esta solicitud.");
        }

        String estadoAnterior = solicitud.getEstado();
        PersonalEntity actor = personalRepository.findById(medicoReceptorId).orElse(null);

        if (acepta) {
            solicitud.setAceptadoMedico(true);
            SolicitudEntity saved = solicitudRepository.save(solicitud);
            registrarEvento("INTERCAMBIO_ACEPTADO",
                    "Médico receptor aceptó el intercambio",
                    actor,
                    saved,
                    saved.getTurno(),
                    estadoAnterior,
                    saved.getEstado(),
                    saved.getMotivo(),
                    null,
                    null);
            return saved;
        } else {
            solicitud.setAceptadoMedico(null);
            solicitud.setEstado("Rechazado");
            SolicitudEntity saved = solicitudRepository.save(solicitud);
            registrarEvento("INTERCAMBIO_RECHAZADO",
                    "Médico receptor rechazó el intercambio",
                    actor,
                    saved,
                    saved.getTurno(),
                    estadoAnterior,
                    saved.getEstado(),
                    saved.getMotivo(),
                    null,
                    null);
            return saved;
        }
    }

    //metodo para actualizar la respuesta en las solicitudes de oferta de turno
    @Transactional
    public SolicitudEntity actualizarRespuestaOfertaMedico(Long solicitudId, Boolean aceptado) {
        // 1. Obtener la solicitud
        SolicitudEntity solicitud = solicitudRepository.findById(solicitudId)
                .orElseThrow(() -> new RuntimeException("Solicitud de oferta no encontrada con ID: " + solicitudId));

        // 2. Validación de tipo
        if (!"Oferta de turno".equalsIgnoreCase(solicitud.getTipo())) {
            throw new RuntimeException("Este método solo procesa solicitudes de tipo 'Oferta de turno'.");
        }

        // 3. Validación de estado (solo si está pendiente)
        if (!"Pendiente".equalsIgnoreCase(solicitud.getEstado())) {
            throw new RuntimeException("La solicitud ya fue procesada (Estado actual: " + solicitud.getEstado() + ").");
        }

        String estadoAnterior = solicitud.getEstado();
        PersonalEntity actor = obtenerUsuarioDesdeContexto();

        if (aceptado) {
            // El médico acepta la oferta.
            solicitud.setAceptadoMedico(true);
            SolicitudEntity saved = solicitudRepository.save(solicitud);
            registrarEvento("OFERTA_ACEPTADA",
                    "Médico aceptó la oferta de turno",
                    actor,
                    saved,
                    saved.getTurno(),
                    estadoAnterior,
                    saved.getEstado(),
                    saved.getMotivo(),
                    null,
                    null);
            return saved;

        } else {
            // El médico rechaza la oferta.
            solicitud.setAceptadoMedico(false);

            // Si el receptor rechaza, la solicitud se cierra automáticamente como Rechazada.
            solicitud.setEstado("Rechazado");
            SolicitudEntity saved = solicitudRepository.save(solicitud);
            registrarEvento("OFERTA_RECHAZADA",
                    "Médico rechazó la oferta de turno",
                    actor,
                    saved,
                    saved.getTurno(),
                    estadoAnterior,
                    saved.getEstado(),
                    saved.getMotivo(),
                    null,
                    null);
            return saved;
        }
    }

    @Transactional
    public SolicitudEntity crearSolicitudBotarTurno(SolicitudBotarTurnoDTO dto, Long medicoSolicitanteId) {
        SolicitudEntity solicitud = new SolicitudEntity();

        // Obtener el médico
        PersonalEntity medicoSolicitante = obtenerMedicoSolicitanteActual(medicoSolicitanteId);
        solicitud.setMedicoSolicitante(medicoSolicitante);

        // Mapear datos del DTO a la Entidad
        // El tipo principal sigue siendo "Botar turno"
        solicitud.setTipo("Botar turno");
        solicitud.setMotivo(dto.getMotivo());

        // 🌟🌟 CAMBIO CLAVE: GUARDAR EL TIPO DE PERMISO SELECCIONADO 🌟🌟
        // Esto es necesario para que se muestre correctamente en la tarjeta de solicitudes
        // y diferencia la causa (Licencia, Feriado, etc.)
        if (dto.getTipoAutorizacion() != null) {
            solicitud.setTipoAutorizacion(dto.getTipoAutorizacion());
        } else {
            // En caso de que el DTO sea antiguo o el campo esté vacío:
            solicitud.setTipoAutorizacion("Devolución de Turno");
        }
        // -----------------------------------------------------------------

        // Reutilizamos los campos de fecha de permiso para el rango
        solicitud.setFechaInicioPermiso(dto.getFechaInicio());
        solicitud.setFechaTerminoPermiso(dto.getFechaFin());

        // Guardar el ID del turno unico a botar (¡CRUCIAL para la liberación!)
        if (dto.getTurnoId() != null) {
            solicitud.setTurnoDeSolicitanteId(dto.getTurnoId());
        }

        // Datos de auditoría y estado
        solicitud.setFechaCreacion(LocalDateTime.now());
        solicitud.setEstado("Pendiente");

        // Guardar
        SolicitudEntity saved = solicitudRepository.save(solicitud);

        // Registrar en bitácora
        registrarEvento("SOLICITUD_CREADA",
                "Solicitud de 'Botar turno' creada",
                medicoSolicitante,
                saved,
                null,
                null,
                "Pendiente",
                dto.getMotivo(),
                solicitud.getFechaInicioPermiso() != null ? solicitud.getFechaInicioPermiso().toLocalDate() : null,
                solicitud.getFechaTerminoPermiso() != null ? solicitud.getFechaTerminoPermiso().toLocalDate() : null);

        return saved;
    }

    private List<String> extractTurnoInfoLines(String motivo) {
        if (motivo == null || !motivo.contains("Turnos Afectados:")) return List.of();

        // Separamos por el encabezado y tomamos la segunda parte
        String[] partes = motivo.split("Turnos Afectados:");
        if (partes.length < 2) return List.of();

        String rawTurnos = partes[1].trim();

        // Dividimos por saltos de línea y filtramos solo las que tienen datos de turno
        return java.util.Arrays.stream(rawTurnos.split("\\n"))
                .map(String::trim)
                .filter(line -> line.contains("/") && line.contains("|"))
                .collect(Collectors.toList());
    }
}