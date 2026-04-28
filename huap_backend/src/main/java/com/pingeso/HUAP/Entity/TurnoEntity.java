package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;

// Creamos indices, para optimizar las consultas por servicio y fechas, que son las más comunes en el calendario
@Entity
@Table(name = "Turnos", indexes = {
    @Index(name = "idx_servicio_fechas", columnList = "id_servicio, dia_inicio_turno, dia_final_turno")
})

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

    // --- Relaciones ---

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_funcionario")
    private FuncionarioEntity funcionario; 

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_servicio") 
    private ServicioEntity servicio;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_piso")
    private PisoEntity piso;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_plantilla")
    private PlantillaEntity plantilla;



    // --- Constructores ---

    public TurnoEntity() {
    }

    public TurnoEntity(String nombre, LocalDate diaInicioTurno, LocalDate diaFinalTurno, 
                       LocalTime horaInicio, LocalTime horaFin, 
                       FuncionarioEntity funcionario, ServicioEntity servicio, PisoEntity piso, PlantillaEntity plantilla) {
        this.nombre = nombre;
        this.diaInicioTurno = diaInicioTurno;
        this.diaFinalTurno = diaFinalTurno;
        this.horaInicio = horaInicio;
        this.horaFin = horaFin;
        this.funcionario = funcionario;
        this.servicio = servicio;
        this.piso = piso;
        this.plantilla = plantilla;
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
    public FuncionarioEntity getFuncionario() { return funcionario; }
    public void setFuncionario(FuncionarioEntity funcionario) { this.funcionario = funcionario; }

    public ServicioEntity getServicio() { return servicio; }
    public void setServicio(ServicioEntity servicio) { this.servicio = servicio; }

    public PisoEntity getPiso() { return piso; }
    public void setPiso(PisoEntity piso) { this.piso = piso; }

    public PlantillaEntity getPlantilla() { return plantilla; }
    public void setPlantilla(PlantillaEntity plantilla) { this.plantilla = plantilla; }

}