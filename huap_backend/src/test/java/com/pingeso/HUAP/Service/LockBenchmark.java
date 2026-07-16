package com.pingeso.HUAP.Service;

import com.pingeso.HUAP.AbstractContainerTest;
import com.pingeso.HUAP.DTO.AlterarTurnoRequest;
import com.pingeso.HUAP.Entity.FuncionarioEntity;
import com.pingeso.HUAP.Entity.RolServicioEntity;
import com.pingeso.HUAP.Entity.RolSistemaEntity;
import com.pingeso.HUAP.Entity.ServicioEntity;
import com.pingeso.HUAP.Entity.ServiciosFuncionarioEntity;
import com.pingeso.HUAP.Entity.TurnoEntity;
import com.pingeso.HUAP.Repository.FuncionarioRepository;
import com.pingeso.HUAP.Repository.RolServicioRepository;
import com.pingeso.HUAP.Repository.RolSistemaRepository;
import com.pingeso.HUAP.Repository.ServicioRepository;
import com.pingeso.HUAP.Repository.ServiciosFuncionarioRepository;
import com.pingeso.HUAP.Repository.TurnoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.AopTestUtils;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.IntFunction;

import static com.pingeso.HUAP.Deadlocks.esDeadlock;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Benchmark A/B del lock pesimista sobre las dos rutas críticas del sistema: CREAR turno
 * ({@link TurnoService#saveTurno}) y ASIGNAR turno a una persona
 * ({@link GestionTurnoService#alterarTurno} con acción ASIGNAR). Mide la misma operación con y sin el
 * lock, en el mismo JVM y contra el mismo contenedor MySQL, alternando modo ronda a ronda vía el flag
 * {@code huap.concurrencia.lock-pesimista}. Imprime la tabla de resultados por consola.
 *
 * <p><b>No corre en la suite normal</b> (el nombre no matchea los includes de Surefire: {@code *Test},
 * {@code Test*}, {@code *Tests}, {@code *TestCase}) porque tarda y su modo "sin lock" corrompe datos a
 * propósito. Se ejecuta a mano:
 * <pre>{@code .\mvnw.cmd test -Dtest=LockBenchmark}</pre>
 *
 * <p><b>Qué mide y por qué esos números.</b> El lock NO es una optimización: es un arreglo de
 * correctitud y cuesta tiempo. El argumento honesto necesita las cifras juntas:
 * <ol>
 *   <li><b>Violaciones del invariante</b> (escenario A): sin lock quedan varios turnos solapados para
 *       el mismo funcionario. Con lock, exactamente uno.</li>
 *   <li><b>Deadlocks</b> (escenario C): sin lock, las asignaciones concurrentes se matan entre sí con
 *       error 1213 (ver abajo). Con lock, cero.</li>
 *   <li><b>Costo sin contención</b> (escenarios B y D, a volumen real): casi nulo, porque
 *       {@code SELECT ... FOR UPDATE} solo serializa a quienes tocan la MISMA fila.</li>
 *   <li><b>Costo con contención</b> (A y C): el lock es más lento, y eso es correcto — es el precio de
 *       serializar. Sin lock es "rápido" solo porque está haciendo mal el trabajo.</li>
 * </ol>
 *
 * <p><b>Las dos rutas fallan distinto, y eso importa.</b> En CREAR ({@code saveTurno}) sin lock la
 * carrera produce doble-reserva silenciosa: los 8 hilos insertan y quedan 8 turnos solapados. En
 * ASIGNAR ({@code alterarTurno}) sin lock casi nunca se ve el lost update, porque antes ocurre un
 * <b>deadlock</b>: {@code BitacoraEntity} tiene FK a {@code Turnos} y PK {@code IDENTITY}, así que
 * Hibernate ejecuta su INSERT de inmediato (necesita el id generado) y ese INSERT toma un lock
 * COMPARTIDO (S) sobre la fila del turno para chequear la FK; el {@code UPDATE Turnos} recién se
 * ejecuta en el flush del commit y necesita el EXCLUSIVO (X). Los 8 hilos tienen S y los 8 piden X
 * sobre la misma fila → ciclo → MySQL mata a 7. Con el lock, {@code findByIdForUpdate} toma X en el
 * primer paso y los demás se bloquean ahí sin llegar a tomar S: no hay ciclo posible.
 *
 * <p>O sea: el lock convierte fallos caóticos de infraestructura (1213, que el usuario ve como error
 * aleatorio) en rechazos de negocio deterministas y explicables.
 */
@TestPropertySource(properties = "logging.level.org.hibernate.orm.jdbc.error=OFF")  // los 1213 se cuentan, no se gritan
class LockBenchmark extends AbstractContainerTest {

    private static final int HILOS = 8;
    private static final int RONDAS = 20;              // rondas medidas por modo (escenarios A y C)
    private static final int WARMUP = 3;               // rondas descartadas (JIT, pool Hikari, plan cache)

    /** Volumen real que maneja el sistema. Debe ser divisible por {@link #HILOS}. */
    private static final int TURNOS_MASIVOS = 2000;
    /** Funcionarios entre los que se reparten los turnos masivos. Debe ser divisible por {@link #HILOS}. */
    private static final int FUNCIONARIOS_MASIVOS = 40;

    private static final LocalDate DIA_CONTENCION = LocalDate.of(2026, 6, 8);
    private static final LocalDate DIA_MASIVO = LocalDate.of(2027, 1, 4);  // lejos de DIA_CONTENCION
    private static final LocalTime H8 = LocalTime.of(8, 0);
    private static final LocalTime H20 = LocalTime.of(20, 0);

    @Autowired private TurnoService turnoService;
    @Autowired private GestionTurnoService gestionTurnoService;
    @Autowired private TurnoRepository turnoRepository;
    @Autowired private FuncionarioRepository funcionarioRepository;
    @Autowired private ServicioRepository servicioRepository;
    @Autowired private RolSistemaRepository rolSistemaRepository;
    @Autowired private RolServicioRepository rolServicioRepository;
    @Autowired private ServiciosFuncionarioRepository serviciosFuncionarioRepository;

    private RolSistemaEntity rolSistema;
    private RolServicioEntity rolServicio;
    private ServicioEntity servicio;

    private final AtomicInteger seq = new AtomicInteger();
    private final AtomicInteger diaSeq = new AtomicInteger();

    @BeforeEach
    void setUp() {
        rolSistema = rolSistemaRepository.save(new RolSistemaEntity("MEDICO"));
        rolServicio = rolServicioRepository.save(new RolServicioEntity("MEDICO"));
        servicio = servicioRepository.save(ServicioEntity.builder().nombre("Urgencias").build());
    }

    @Test
    void compararLockPesimistaVsSinLock() throws Exception {
        Long adminId = nuevoFuncionario().getIdFuncionario();
        List<Long> candidatos = new ArrayList<>();
        for (int i = 0; i < HILOS; i++) {
            candidatos.add(nuevoFuncionarioDelServicio().getIdFuncionario());
        }

        for (int i = 0; i < WARMUP; i++) {
            contencionCreacion(new Medicion(false));
            contencionCreacion(new Medicion(true));
            contencionAsignacion(new Medicion(false), adminId, candidatos);
            contencionAsignacion(new Medicion(true), adminId, candidatos);
        }

        Medicion sinLockA = new Medicion(false), conLockA = new Medicion(true);
        Medicion sinLockC = new Medicion(false), conLockC = new Medicion(true);
        // Alternadas (A/B/A/B) y no en bloques: así cualquier deriva de la corrida (crecimiento de las
        // tablas, ruido de la máquina) afecta por igual a ambos modos y no sesga la comparación.
        for (int i = 0; i < RONDAS; i++) {
            contencionCreacion(sinLockA);
            contencionCreacion(conLockA);
            contencionAsignacion(sinLockC, adminId, candidatos);
            contencionAsignacion(conLockC, adminId, candidatos);
        }

        Medicion sinLockB = new Medicion(false), conLockB = new Medicion(true);
        masivoCreacion(sinLockB);
        masivoCreacion(conLockB);

        Medicion sinLockD = new Medicion(false), conLockD = new Medicion(true);
        masivoAsignacion(sinLockD, adminId);
        masivoAsignacion(conLockD, adminId);

        System.out.println(reporte(sinLockA, conLockA, sinLockB, conLockB,
                sinLockC, conLockC, sinLockD, conLockD));

        // Con lock: serialización limpia. Ni invariantes violados ni deadlocks; los rechazos que hay
        // son todos de negocio ("ya tiene turno" / "ya tiene funcionario"), que es lo deseable.
        assertThat(conLockA.violaciones).as("crear con lock: ninguna doble-reserva").isZero();
        assertThat(conLockC.violaciones).as("asignar con lock: ningún lost update").isZero();
        assertThat(conLockC.deadlocks.get()).as("asignar con lock: ningún deadlock").isZero();

        // Sin lock, las dos rutas fallan de forma DISTINTA (ver el javadoc de la clase). Estas
        // aserciones son probabilísticas —son carreras—, pero con 8 hilos x 20 rondas se reproducen
        // sistemáticamente. Si dieran 0, el benchmark no probaría nada y hay que saberlo.
        //
        // Crear: no hay bitácora de por medio, así que la carrera se ve como doble-reserva silenciosa.
        assertThat(sinLockA.violaciones).as("crear sin lock: la carrera debe reproducirse").isPositive();
        // Asignar: el lost update casi nunca alcanza a materializarse porque el detector de deadlocks
        // de MySQL mata a los competidores antes. Cualquiera de los dos síntomas prueba que es insegura.
        assertThat(sinLockC.deadlocks.get() + sinLockC.violaciones)
                .as("asignar sin lock: debe fallar por deadlock o por lost update").isPositive();
    }

    // ---------------------------------------------------------------- escenarios

    /** [A] {@value #HILOS} hilos crean un turno solapado para el MISMO funcionario. Debe quedar 1. */
    private void contencionCreacion(Medicion m) throws Exception {
        setLockPesimista(m.conLock);
        FuncionarioEntity funcionario = nuevoFuncionario();
        LocalDate dia = siguienteDia();
        Queue<Long> latencias = new ConcurrentLinkedQueue<>();

        long micros = enParalelo(i -> () -> {
            long t0 = System.nanoTime();
            try {
                turnoService.saveTurno(turnoAsignado(funcionario, dia));
            } catch (Exception rechazado) {
                // Con lock: esperado para todos menos uno (conflicto de horario).
                clasificar(m, rechazado);
            }
            latencias.add(microsDesde(t0));
        });

        int quedaron = turnoRepository.findConflictosByFuncionario(
                funcionario.getIdFuncionario(), dia, dia).size();
        registrarRonda(m, quedaron - 1, micros, latencias);
    }

    /**
     * [C] {@value #HILOS} "admins" asignan personas DISTINTAS al MISMO turno vacante. Debe ganar una
     * sola: sin el lock todos leen el turno como libre, pasan el guard y se pisan (lost update).
     */
    private void contencionAsignacion(Medicion m, Long adminId, List<Long> candidatos) throws Exception {
        setLockPesimista(m.conLock);
        // Día nuevo por ronda: los candidatos se reutilizan entre rondas y así no arrastran conflicto
        // con lo que ya se les asignó antes (sería un rechazo por el motivo equivocado).
        Long turnoId = turnoRepository.save(turnoVacante(siguienteDia())).getIdTurno();
        Queue<Long> latencias = new ConcurrentLinkedQueue<>();
        AtomicInteger exitos = new AtomicInteger();

        long micros = enParalelo(i -> () -> {
            AlterarTurnoRequest req = asignacion(turnoId, candidatos.get(i), adminId);
            long t0 = System.nanoTime();
            try {
                gestionTurnoService.alterarTurno(req);
                exitos.incrementAndGet();
            } catch (Exception rechazado) {
                // Con lock: esperado para todos menos uno ("ya tiene funcionario, use REASIGNAR").
                // Sin lock: aquí caen los deadlocks (1213) que se matan entre sí.
                clasificar(m, rechazado);
            }
            latencias.add(microsDesde(t0));
        });

        registrarRonda(m, exitos.get() - 1, micros, latencias);
    }

    /**
     * [B] Carga real: {@value #TURNOS_MASIVOS} turnos repartidos en {@value #FUNCIONARIOS_MASIVOS}
     * funcionarios, con los funcionarios particionados por hilo (conjuntos disjuntos) y días distintos
     * por funcionario. Cero contención posible: cada hilo bloquea filas que ningún otro toca. Es el
     * caso realista en producción y donde el lock debería costar casi nada.
     */
    private void masivoCreacion(Medicion m) throws Exception {
        setLockPesimista(m.conLock);
        int porHilo = TURNOS_MASIVOS / HILOS;
        int funcsPorHilo = FUNCIONARIOS_MASIVOS / HILOS;

        List<List<FuncionarioEntity>> funcionariosPorHilo = new ArrayList<>();
        for (int t = 0; t < HILOS; t++) {
            List<FuncionarioEntity> propios = new ArrayList<>();
            for (int j = 0; j < funcsPorHilo; j++) {
                propios.add(nuevoFuncionario());
            }
            funcionariosPorHilo.add(propios);
        }

        Queue<Long> latencias = new ConcurrentLinkedQueue<>();
        AtomicInteger fallos = new AtomicInteger();

        long micros = enParalelo(i -> () -> {
            List<FuncionarioEntity> propios = funcionariosPorHilo.get(i);
            for (int k = 0; k < porHilo; k++) {
                // k -> funcionario (k % n) en el día (k / n): cada funcionario recibe días distintos.
                FuncionarioEntity funcionario = propios.get(k % funcsPorHilo);
                LocalDate dia = DIA_MASIVO.plusDays(k / funcsPorHilo);
                long t0 = System.nanoTime();
                try {
                    turnoService.saveTurno(turnoAsignado(funcionario, dia));
                } catch (Exception e) {
                    fallos.incrementAndGet();
                }
                latencias.add(microsDesde(t0));
            }
        });

        assertThat(fallos.get()).as("sin contención ninguna creación debe fallar").isZero();
        registrarRonda(m, 0, micros, latencias);
    }

    /** [D] Carga real de la ruta de asignación: {@value #TURNOS_MASIVOS} asignaciones a turnos distintos. */
    private void masivoAsignacion(Medicion m, Long adminId) throws Exception {
        List<List<Asignacion>> trabajoPorHilo = prepararAsignaciones();
        setLockPesimista(m.conLock);   // después del fixture: solo se mide alterarTurno

        Queue<Long> latencias = new ConcurrentLinkedQueue<>();
        AtomicInteger fallos = new AtomicInteger();

        long micros = enParalelo(i -> () -> {
            for (Asignacion a : trabajoPorHilo.get(i)) {
                AlterarTurnoRequest req = asignacion(a.idTurno(), a.idFuncionario(), adminId);
                long t0 = System.nanoTime();
                try {
                    gestionTurnoService.alterarTurno(req);
                } catch (Exception e) {
                    fallos.incrementAndGet();
                }
                latencias.add(microsDesde(t0));
            }
        });

        assertThat(fallos.get()).as("sin contención ninguna asignación debe fallar").isZero();
        registrarRonda(m, 0, micros, latencias);
    }

    /**
     * Crea los turnos vacantes y funcionarios del escenario [D], ya particionados por hilo. No se mide:
     * es fixture. Cada hilo recibe sus propios funcionarios, y cada funcionario turnos en días
     * distintos, de modo que ninguna asignación pueda entrar en conflicto con otra.
     */
    private List<List<Asignacion>> prepararAsignaciones() {
        int porHilo = TURNOS_MASIVOS / HILOS;
        int funcsPorHilo = FUNCIONARIOS_MASIVOS / HILOS;
        List<List<Asignacion>> trabajoPorHilo = new ArrayList<>();

        for (int t = 0; t < HILOS; t++) {
            List<FuncionarioEntity> propios = new ArrayList<>();
            for (int j = 0; j < funcsPorHilo; j++) {
                propios.add(nuevoFuncionarioDelServicio());
            }

            List<TurnoEntity> vacantes = new ArrayList<>();
            for (int k = 0; k < porHilo; k++) {
                vacantes.add(turnoVacante(DIA_MASIVO.plusDays(k / funcsPorHilo)));
            }
            List<TurnoEntity> guardados = turnoRepository.saveAll(vacantes);

            List<Asignacion> asignaciones = new ArrayList<>();
            for (int k = 0; k < porHilo; k++) {
                asignaciones.add(new Asignacion(
                        guardados.get(k).getIdTurno(),
                        propios.get(k % funcsPorHilo).getIdFuncionario()));
            }
            trabajoPorHilo.add(asignaciones);
        }
        return trabajoPorHilo;
    }

    // ---------------------------------------------------------------- infraestructura

    /** Corre una tarea por hilo con arranque simultáneo (barrera). Devuelve el wall clock en µs. */
    private long enParalelo(IntFunction<Runnable> tareaDelHilo) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(HILOS);
        CyclicBarrier barrera = new CyclicBarrier(HILOS);
        CountDownLatch fin = new CountDownLatch(HILOS);

        long inicio = System.nanoTime();
        for (int i = 0; i < HILOS; i++) {
            Runnable tarea = tareaDelHilo.apply(i);
            pool.submit(() -> {
                try {
                    barrera.await();
                    tarea.run();
                } catch (Exception e) {
                    // fallo de la barrera
                } finally {
                    fin.countDown();
                }
            });
        }

        boolean termino = fin.await(5, TimeUnit.MINUTES);
        long micros = microsDesde(inicio);
        pool.shutdownNow();
        assertThat(termino).as("los hilos terminaron dentro del timeout").isTrue();
        return micros;
    }

    /** Separa el rechazo de negocio (deseable) del deadlock de InnoDB (fallo de infraestructura). */
    private static void clasificar(Medicion m, Throwable rechazo) {
        if (esDeadlock(rechazo)) {
            m.deadlocks.incrementAndGet();
        } else {
            m.rechazosNegocio.incrementAndGet();
        }
    }

    /** @param exceso operaciones que tuvieron éxito y no debieron: > 0 significa invariante violado. */
    private void registrarRonda(Medicion m, int exceso, long micros, Queue<Long> latencias) {
        if (exceso > 0) {
            m.violaciones++;
            m.opsInvalidas += exceso;
        }
        m.rondas++;
        m.rondasMicros.add(micros);
        m.latencias.addAll(latencias);
    }

    /**
     * Cambia el modo en los beans REALES: los services están envueltos en proxies AOP (por
     * {@code @Transactional}), y escribir el campo sobre el proxy no llegaría al objeto que de verdad
     * ejecuta el método. El tipo de las variables tampoco es opcional: {@code getUltimateTargetObject}
     * devuelve {@code <T> T} y, pasado en línea, la inferencia elegiría la sobrecarga
     * {@code setField(Class<?>, ...)} —más específica que {@code setField(Object, ...)}— y fallaría con
     * ClassCastException en runtime.
     */
    private void setLockPesimista(boolean habilitado) {
        TurnoService objetivoTurno = AopTestUtils.getUltimateTargetObject(turnoService);
        GestionTurnoService objetivoGestion = AopTestUtils.getUltimateTargetObject(gestionTurnoService);
        ReflectionTestUtils.setField(objetivoTurno, "lockPesimista", habilitado);
        ReflectionTestUtils.setField(objetivoGestion, "lockPesimista", habilitado);
    }

    private LocalDate siguienteDia() {
        return DIA_CONTENCION.plusDays(diaSeq.getAndIncrement());
    }

    private FuncionarioEntity nuevoFuncionario() {
        int n = seq.incrementAndGet();
        return funcionarioRepository.save(FuncionarioEntity.builder()
                .nombre("Bench" + n).apelPat("Apellido")
                .rut("BENCH" + n).dv("1")   // unique (Rut, DV)
                .estado(1).rolSistema(rolSistema)
                .build());
    }

    /** Funcionario vinculado al servicio: lo exige {@code validarFuncionarioAsignable}. */
    private FuncionarioEntity nuevoFuncionarioDelServicio() {
        FuncionarioEntity funcionario = nuevoFuncionario();
        serviciosFuncionarioRepository.save(
                new ServiciosFuncionarioEntity(funcionario, servicio, rolServicio));
        return funcionario;
    }

    private TurnoEntity turnoAsignado(FuncionarioEntity funcionario, LocalDate dia) {
        return turno(funcionario, dia);
    }

    private TurnoEntity turnoVacante(LocalDate dia) {
        return turno(null, dia);
    }

    private TurnoEntity turno(FuncionarioEntity funcionario, LocalDate dia) {
        return TurnoEntity.builder()
                .servicio(servicio).funcionario(funcionario)
                .diaInicioTurno(dia).horaInicio(H8)
                .diaFinalTurno(dia).horaFin(H20)
                .build();
    }

    private static AlterarTurnoRequest asignacion(Long idTurno, Long idFuncionario, Long adminId) {
        AlterarTurnoRequest req = new AlterarTurnoRequest();
        req.setIdTurno(idTurno);
        req.setAccion("ASIGNAR");
        req.setIdNuevoMedico(idFuncionario);
        req.setIdAdministrador(adminId);
        req.setMotivo("benchmark");
        return req;
    }

    private static long microsDesde(long nanos) {
        return (System.nanoTime() - nanos) / 1_000;
    }

    private record Asignacion(Long idTurno, Long idFuncionario) {}

    private static final class Medicion {
        final boolean conLock;
        int rondas;
        int violaciones;       // rondas en las que se violó el invariante
        int opsInvalidas;      // operaciones que "ganaron" y no debieron (turnos de más / asignaciones pisadas)
        // Atómicos: los incrementan los hilos del pool.
        final AtomicInteger deadlocks = new AtomicInteger();        // rechazos por error 1213 (infraestructura)
        final AtomicInteger rechazosNegocio = new AtomicInteger();  // rechazos por una regla del dominio
        final List<Long> latencias = new ArrayList<>();      // microsegundos por operación
        final List<Long> rondasMicros = new ArrayList<>();   // microsegundos de wall clock por ronda

        Medicion(boolean conLock) {
            this.conLock = conLock;
        }
    }

    // ---------------------------------------------------------------- reporte

    private static String reporte(Medicion sinA, Medicion conA, Medicion sinB, Medicion conB,
                                  Medicion sinC, Medicion conC, Medicion sinD, Medicion conD) {
        StringBuilder sb = new StringBuilder();
        sb.append("\n").append("=".repeat(78)).append("\n");
        sb.append(String.format(" BENCHMARK LOCK PESIMISTA — %d hilos, %d rondas por modo (alternadas)%n",
                HILOS, RONDAS));
        sb.append("=".repeat(78)).append("\n");

        sb.append(bloque("[A] CREAR TURNO — con contención",
                HILOS + " hilos crean un turno solapado para el MISMO funcionario (debe quedar 1)",
                sinA, conA, true));
        sb.append(bloque("[B] CREAR TURNO — volumen real, sin contención",
                TURNOS_MASIVOS + " turnos sobre " + FUNCIONARIOS_MASIVOS + " funcionarios, filas disjuntas por hilo",
                sinB, conB, false));
        sb.append(bloque("[C] ASIGNAR TURNO — con contención",
                HILOS + " admins asignan personas DISTINTAS al MISMO turno vacante (debe ganar 1)",
                sinC, conC, true));
        sb.append(bloque("[D] ASIGNAR TURNO — volumen real, sin contención",
                TURNOS_MASIVOS + " asignaciones a turnos distintos, filas disjuntas por hilo",
                sinD, conD, false));

        sb.append("=".repeat(78)).append("\n");
        return sb.toString();
    }

    private static String bloque(String titulo, String detalle, Medicion sin, Medicion con, boolean contencion) {
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("%n %s%n     %s%n%n", titulo, detalle));
        sb.append(String.format("     %-30s %16s %16s%n", "", "SIN LOCK", "CON LOCK"));
        sb.append(String.format("     %s%n", "-".repeat(63)));

        if (contencion) {
            sb.append(fila("Rondas ejecutadas", sin.rondas, con.rondas));
            sb.append(fila("Rondas con violación", sin.violaciones, con.violaciones));
            sb.append(fila("Operaciones inválidas", sin.opsInvalidas, con.opsInvalidas));
            sb.append(fila("Deadlocks (error 1213)", sin.deadlocks.get(), con.deadlocks.get()));
            sb.append(fila("Rechazos de negocio", sin.rechazosNegocio.get(), con.rechazosNegocio.get()));
        } else {
            sb.append(fila("Operaciones", sin.latencias.size(), con.latencias.size()));
        }

        sb.append(fila("Latencia p50 / op", ms(percentil(sin.latencias, 50)), ms(percentil(con.latencias, 50))));
        sb.append(fila("Latencia p95 / op", ms(percentil(sin.latencias, 95)), ms(percentil(con.latencias, 95))));

        long wallSin = percentil(sin.rondasMicros, 50);
        long wallCon = percentil(con.rondasMicros, 50);
        sb.append(fila(contencion ? "Wall clock mediano / ronda" : "Wall clock total", ms(wallSin), ms(wallCon)));
        if (!contencion && wallSin > 0) {
            sb.append(fila("Sobrecosto del lock", "—",
                    String.format("%+.1f %%", 100.0 * (wallCon - wallSin) / wallSin)));
        }
        return sb.toString();
    }

    private static String fila(String etiqueta, Object sinLock, Object conLock) {
        return String.format("     %-30s %16s %16s%n", etiqueta, sinLock, conLock);
    }

    private static String ms(long micros) {
        return String.format("%.2f ms", micros / 1000.0);
    }

    private static long percentil(List<Long> valores, int p) {
        if (valores.isEmpty()) return 0;
        List<Long> ordenados = new ArrayList<>(valores);
        Collections.sort(ordenados);
        int idx = (int) Math.ceil(p / 100.0 * ordenados.size()) - 1;
        return ordenados.get(Math.min(Math.max(idx, 0), ordenados.size() - 1));
    }
}
