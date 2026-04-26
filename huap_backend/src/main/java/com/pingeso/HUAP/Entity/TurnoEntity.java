/*package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "turnos")
public class TurnoEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(unique = true, nullable = false)
    private Long id;

    // CAMBIO 1: Añadido
    @Column(name = "nombre")
    private String nombre;

    @Column(name = "id_medico")
    private Long idMedico;

    @Column(name = "id_piso", nullable = false)
    private String idPiso;

    @Column(name = "dia_semana", length = 20)
    private String diaSemana;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "hora_fin", nullable = false)
    private LocalTime horaFin;

    @Column(name = "dia_inicio_turno", nullable = false)
    private LocalDate diaInicioTurno;

    @Column(name = "dia_final_turno", nullable = false)
    private LocalDate diaFinalTurno;

    @Column(name = "tipo_turno", length = 20, nullable = false)
    private String tipoTurno;

    @Column(name = "estado", length = 20, nullable = false)
    private String estado;

    @Column(name = "tipo_de_turno_cantidad", length = 50)
    private String tipoDeTurnoCantidad;

    // CAMBIO 2: Renombrado (de usuario_id y personalEntity)
    @ManyToOne
    @JoinColumn(name = "id_creador")
    private PersonalEntity creador;

    // CAMBIO 3: Añadido
    @ManyToOne
    @JoinColumn(name = "id_asignador")
    private PersonalEntity asignador;

    public TurnoEntity() {
    }

    public TurnoEntity(String nombre, Long idMedico, String idPiso, String diaSemana, LocalTime horaInicio, LocalTime horaFin, LocalDate diaInicioTurno, LocalDate diaFinalTurno, String tipoTurno, String estado, String tipoDeTurnoCantidad, PersonalEntity creador, PersonalEntity asignador) {
        this.nombre = nombre;
        this.idMedico = idMedico;
        this.idPiso = idPiso;
        this.diaSemana = diaSemana;
        this.horaInicio = horaInicio;
        this.horaFin = horaFin;
        this.diaInicioTurno = diaInicioTurno;
        this.diaFinalTurno = diaFinalTurno;
        this.tipoTurno = tipoTurno;
        this.estado = estado;
        this.tipoDeTurnoCantidad = tipoDeTurnoCantidad;
        this.creador = creador;
        this.asignador = asignador;
    }
    

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public Long getIdMedico() {
        return idMedico;
    }

    public void setIdMedico(Long idMedico) {
        this.idMedico = idMedico;
    }

    public String getIdPiso() {
        return idPiso;
    }

    public void setIdPiso(String idPiso) {
        this.idPiso = idPiso;
    }

    public String getDiaSemana() {
        return diaSemana;
    }

    public void setDiaSemana(String diaSemana) {
        this.diaSemana = diaSemana;
    }

    public LocalTime getHoraInicio() {
        return horaInicio;
    }

    public void setHoraInicio(LocalTime horaInicio) {
        this.horaInicio = horaInicio;
    }

    public LocalTime getHoraFin() {
        return horaFin;
    }

    public void setHoraFin(LocalTime horaFin) {
        this.horaFin = horaFin;
    }

    public LocalDate getDiaInicioTurno() {
        return diaInicioTurno;
    }

    public void setDiaInicioTurno(LocalDate diaInicioTurno) {
        this.diaInicioTurno = diaInicioTurno;
    }

    public LocalDate getDiaFinalTurno() {
        return diaFinalTurno;
    }

    public void setDiaFinalTurno(LocalDate diaFinalTurno) {
        this.diaFinalTurno = diaFinalTurno;
    }

    public String getTipoTurno() {
        return tipoTurno;
    }

    public void setTipoTurno(String tipoTurno) {
        this.tipoTurno = tipoTurno;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public String getTipoDeTurnoCantidad() {
        return tipoDeTurnoCantidad;
    }

    public void setTipoDeTurnoCantidad(String tipoDeTurnoCantidad) {
        this.tipoDeTurnoCantidad = tipoDeTurnoCantidad;
    }

    public PersonalEntity getCreador() {
        return creador;
    }

    public void setCreador(PersonalEntity creador) {
        this.creador = creador;
    }

    public PersonalEntity getAsignador() {
        return asignador;
    }

    public void setAsignador(PersonalEntity asignador) {
        this.asignador = asignador;
    }*/

package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "Turnos")
public class TurnoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_turno", unique = true, nullable = false)
    private Long id;

    @Column(name = "nombre")
    private String nombre;

    @Column(name = "dia_inicio_turno", nullable = false)
    private LocalDate diaInicioTurno;

    @Column(name = "dia_final_turno", nullable = false)
    private LocalDate diaFinalTurno;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "hora_fin", nullable = false)
    private LocalTime horaFin;

    // FetchType.LAZY le indica que solo se cargue la información del funcionario, servicio y piso cuando sea necesario (cuando se acceda a esos campos), 
    // lo que mejora el rendimiento al evitar cargar datos innecesarios, por ejemplo turno.getFuncionario().getNombre() ahi si se cargaria la informacion del funcionario, 
    // pero si solo se accede a turno.getNombre() no se cargaria la informacion del funcionario, servicio y piso

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_servicio_funcionario") // FK en la base de datos
    private ServicioFuncionarioEntity funcionario; 

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_piso", nullable = false)
    private PisoEntity piso;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_plantilla_turno", nullable = false)
    private PlantillaTurnoEntity plantillaTurno;

    // --- Constructores ---

    public TurnoEntity() {
    }

    public TurnoEntity(String nombre, LocalDate diaInicioTurno, LocalDate diaFinalTurno, 
                       LocalTime horaInicio, LocalTime horaFin, 
                       ServicioFuncionarioEntity funcionario, PisoEntity piso, PlantillaTurnoEntity plantillaTurno) {
        this.nombre = nombre;
        this.diaInicioTurno = diaInicioTurno;
        this.diaFinalTurno = diaFinalTurno;
        this.horaInicio = horaInicio;
        this.horaFin = horaFin;
        this.funcionario = funcionario;
        this.piso = piso;
        this.plantillaTurno = plantillaTurno;
    }

    // --- Getters y Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public LocalDate getDiaInicioTurno() { return diaInicioTurno; }
    public void setDiaInicioTurno(LocalDate diaInicioTurno) { this.diaInicioTurno = diaInicioTurno; }

    public LocalDate getDiaFinalTurno() { return diaFinalTurno; }
    public void setDiaFinalTurno(LocalDate diaFinalTurno) { this.diaFinalTurno = diaFinalTurno; }

    public LocalTime getHoraInicio() { return horaInicio; }
    public void setHoraInicio(LocalTime horaInicio) { this.horaInicio = horaInicio; }

    public LocalTime getHoraFin() { return horaFin; }
    public void setHoraFin(LocalTime horaFin) { this.horaFin = horaFin; }

    // Getters y Setters de los Objetos
    public ServicioFuncionarioEntity getFuncionario() { return funcionario; }
    public void setFuncionario(ServicioFuncionarioEntity funcionario) { this.funcionario = funcionario; }

    public PisoEntity getPiso() { return piso; }
    public void setPiso(PisoEntity piso) { this.piso = piso; }

    public PlantillaTurnoEntity getPlantillaTurno() { return plantillaTurno; }
    public void setPlantillaTurno(PlantillaTurnoEntity plantillaTurno) { this.plantillaTurno = plantillaTurno; }
}
