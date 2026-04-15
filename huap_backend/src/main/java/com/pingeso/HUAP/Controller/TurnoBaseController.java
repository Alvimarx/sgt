package com.pingeso.HUAP.Controller;

import com.pingeso.HUAP.Entity.PersonalEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.TipoTurnoEntity;
import com.pingeso.HUAP.Entity.TurnoBaseEntity;
import com.pingeso.HUAP.Repository.PersonalRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Repository.TipoTurnoRepository;
import com.pingeso.HUAP.Service.TurnoBaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/turnos-base")
@CrossOrigin(origins = "*")
public class TurnoBaseController {

    @Autowired
    private TurnoBaseService turnoBaseService;

    @Autowired
    private TipoTurnoRepository tipoTurnoRepository;

    @Autowired
    private PersonalRepository personalRepository;

    @Autowired
    private ServicioRepository servicioRepository;

    // --- Endpoints CRUD ---

    // 1. Crear
    @PostMapping("/")
    public ResponseEntity<TurnoBaseEntity> createTurnoBase(@RequestBody Map<String, Object> payload) {

        // DEBUG: Imprimir lo que llega
        System.out.println("--- DEBUG CREATE TURNO BASE ---");
        System.out.println("Payload recibido: " + payload);

        try {
            String nombre = (String) payload.get("nombre");
            LocalTime horaInicio = LocalTime.parse((String) payload.get("horaInicio"));
            LocalTime horaFin = LocalTime.parse((String) payload.get("horaFin"));

            // Tipo Turno
            Map<String, Object> tipoTurnoMap = (Map<String, Object>) payload.get("tipoTurno");
            Long tipoTurnoId = Long.parseLong(tipoTurnoMap.get("idTipoTurno").toString());
            Optional<TipoTurnoEntity> tipoTurnoOpt = tipoTurnoRepository.findById(tipoTurnoId);

            // Creador
            Map<String, Object> creadorMap = (Map<String, Object>) payload.get("creador");
            Long creadorId = Long.parseLong(creadorMap.get("idPersonal").toString());
            Optional<PersonalEntity> creadorOpt = personalRepository.findById(creadorId);

            if (!tipoTurnoOpt.isPresent() || !creadorOpt.isPresent()) {
                System.out.println("Error: Faltan datos (Tipo o Creador)");
                return new ResponseEntity<>((HttpHeaders) null, HttpStatus.BAD_REQUEST);
            }

            TurnoBaseEntity turnoBase = new TurnoBaseEntity();
            turnoBase.setNombre(nombre);
            turnoBase.setHoraInicio(horaInicio);
            turnoBase.setHoraFin(horaFin);
            turnoBase.setTipoTurno(tipoTurnoOpt.get());
            turnoBase.setCreador(creadorOpt.get());

            // --- SERVICIO (Integer) ---
            if (payload.get("servicio") != null) {
                try {
                    Map<String, Object> servicioMap = (Map<String, Object>) payload.get("servicio");
                    // Usamos Integer.parseInt
                    Integer servicioId = Integer.parseInt(servicioMap.get("idServicio").toString());

                    System.out.println("Buscando Servicio ID: " + servicioId);

                    // Asumiendo que tu repositorio busca por Integer
                    Optional<ServicioEntity> servicioOpt = servicioRepository.findById(servicioId);

                    if (servicioOpt.isPresent()) {
                        turnoBase.setServicio(servicioOpt.get());
                        System.out.println("Servicio asignado correctamente: " + servicioOpt.get().getNombre()); // O getNombreServicio
                    } else {
                        System.out.println("Advertencia: Servicio con ID " + servicioId + " no encontrado en BD.");
                    }
                } catch (Exception ex) {
                    System.out.println("Error procesando servicio del payload: " + ex.getMessage());
                    ex.printStackTrace();
                }
            } else {
                System.out.println("Advertencia: El objeto 'servicio' vino nulo en el payload.");
            }

            TurnoBaseEntity nuevoTurno = turnoBaseService.save(turnoBase);
            System.out.println("Turno guardado con ID: " + nuevoTurno.getIdTurnoBase());
            return new ResponseEntity<>(nuevoTurno, HttpStatus.CREATED);

        } catch (Exception e) {
            System.out.println("--- EXCEPCIÓN CRÍTICA EN CREATE ---");
            e.printStackTrace();
            return new ResponseEntity<>((HttpHeaders) null, HttpStatus.BAD_REQUEST);
        }
    }

    // 2. Obtener Todos
    @GetMapping("/")
    public ResponseEntity<List<TurnoBaseEntity>> getAllTurnosBase() {
        List<TurnoBaseEntity> turnos = turnoBaseService.findAll();
        return turnos.isEmpty() ? new ResponseEntity<>(HttpStatus.NO_CONTENT) : new ResponseEntity<>(turnos, HttpStatus.OK);
    }

    // 3. Obtener por ID
    @GetMapping("/{id}")
    public ResponseEntity<TurnoBaseEntity> getTurnoBaseById(@PathVariable Long id) {
        return turnoBaseService.findById(id)
                .map(value -> new ResponseEntity<>(value, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    // 4. Actualizar
    @PutMapping("/{id}")
    public ResponseEntity<TurnoBaseEntity> updateTurnoBase(@PathVariable Long id, @RequestBody Map<String, Object> payload) {

        System.out.println("--- DEBUG UPDATE TURNO BASE ID: " + id + " ---");
        System.out.println("Payload: " + payload);

        Optional<TurnoBaseEntity> existenteOpt = turnoBaseService.findById(id);
        if (!existenteOpt.isPresent()) return new ResponseEntity<>(HttpStatus.NOT_FOUND);

        try {
            TurnoBaseEntity turnoBase = existenteOpt.get();

            String nombre = (String) payload.get("nombre");
            LocalTime horaInicio = LocalTime.parse((String) payload.get("horaInicio"));
            LocalTime horaFin = LocalTime.parse((String) payload.get("horaFin"));

            Map<String, Object> tipoTurnoMap = (Map<String, Object>) payload.get("tipoTurno");
            Long tipoTurnoId = Long.parseLong(tipoTurnoMap.get("idTipoTurno").toString());
            Optional<TipoTurnoEntity> tipoTurnoOpt = tipoTurnoRepository.findById(tipoTurnoId);

            Map<String, Object> creadorMap = (Map<String, Object>) payload.get("creador");
            Long creadorId = Long.parseLong(creadorMap.get("idPersonal").toString());
            Optional<PersonalEntity> creadorOpt = personalRepository.findById(creadorId);

            if (!tipoTurnoOpt.isPresent() || !creadorOpt.isPresent()) {
                return new ResponseEntity<>((HttpHeaders) null, HttpStatus.BAD_REQUEST);
            }

            turnoBase.setNombre(nombre);
            turnoBase.setHoraInicio(horaInicio);
            turnoBase.setHoraFin(horaFin);
            turnoBase.setTipoTurno(tipoTurnoOpt.get());
            turnoBase.setCreador(creadorOpt.get());

            // --- SERVICIO (Integer) ---
            if (payload.get("servicio") != null) {
                try {
                    Map<String, Object> servicioMap = (Map<String, Object>) payload.get("servicio");
                    Integer servicioId = Integer.parseInt(servicioMap.get("idServicio").toString());
                    Optional<ServicioEntity> servicioOpt = servicioRepository.findById(servicioId);
                    servicioOpt.ifPresent(turnoBase::setServicio);
                } catch (Exception ex) {
                    System.out.println("Error procesando servicio en update: " + ex.getMessage());
                }
            }

            TurnoBaseEntity turnoActualizado = turnoBaseService.save(turnoBase);
            return new ResponseEntity<>(turnoActualizado, HttpStatus.OK);

        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>((HttpHeaders) null, HttpStatus.BAD_REQUEST);
        }
    }

    // 5. Eliminar
    @DeleteMapping("/{id}")
    public ResponseEntity<HttpStatus> deleteTurnoBase(@PathVariable Long id) {
        return turnoBaseService.delete(id) ? new ResponseEntity<>(HttpStatus.NO_CONTENT) : new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    // 6. Buscar por ID de Servicio (Ahora recibe Integer si lo necesitas, pero Long es compatible si el servicio espera Long. Si no, cámbialo a Integer)
    @GetMapping("/by-servicio/{idServicio}")
    public ResponseEntity<List<TurnoBaseEntity>> getByServicio(@PathVariable Long idServicio) {
        // Nota: Si tu servicio espera Integer en findByServicio, cambia el tipo de @PathVariable a Integer
        List<TurnoBaseEntity> turnos = turnoBaseService.findByServicio(idServicio);
        return new ResponseEntity<>(turnos, HttpStatus.OK);
    }

    // ... otros endpoints ...
    @GetMapping("/by-nombre")
    public ResponseEntity<List<TurnoBaseEntity>> getByNombre(@RequestParam String nombre) {
        return new ResponseEntity<>(turnoBaseService.findByNombre(nombre), HttpStatus.OK);
    }

    @GetMapping("/by-tipo-turno")
    public ResponseEntity<List<TurnoBaseEntity>> getByTipoTurno(@RequestParam Long tipoTurno) {
        return new ResponseEntity<>(turnoBaseService.findByTipoTurno(tipoTurno), HttpStatus.OK);
    }

    @GetMapping("/by-creador/{idCreador}")
    public ResponseEntity<List<TurnoBaseEntity>> getByCreador(@PathVariable Long idCreador) {
        return new ResponseEntity<>(turnoBaseService.findByCreador(idCreador), HttpStatus.OK);
    }
}