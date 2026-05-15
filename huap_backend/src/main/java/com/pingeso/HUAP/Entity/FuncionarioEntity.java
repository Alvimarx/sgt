package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "Funcionario",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_funcionario_rut_dv",
                        columnNames = {"Rut", "DV"}
                )
        }
)
public class FuncionarioEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_FUNCIONARIO", unique = true, nullable = false)
    private Long idFuncionario;

    @Column(name = "Nombre", nullable = false)
    private String nombre;

    @Column(name = "Apel_pat", nullable = false)
    private String apelPat;

    @Column(name = "Apel_mat")
    private String apelMat;

    @Column(name = "Rut", nullable = false)
    private String rut;

    @Column(name = "DV", nullable = false, length = 1)
    private String dv;

    @Column(name = "Clave", nullable = false)
    private String clave;

    @Column(name = "Estado", nullable = false)
    private int estado;

    @Column(name = "Profesion")
    private String profesion;

    // --- Relaciones --- MANTENERLOS

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_ROL_SISTEMA", nullable = false)
    private RolSistemaEntity rolSistema;

    @Builder.Default
    @OneToMany(mappedBy = "funcionario")
    private List<TurnoEntity> turnos = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "Funcionario", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ServiciosFuncionarioEntity> serviciosFuncionario = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "funcionario")
    private List<Solicitud2Entity> solicitudesEmitidas = new ArrayList<>();
    
    @Builder.Default
    @OneToMany(mappedBy = "funcionarioReceptor")
    private List<Solicitud2Entity> solicitudesRecibidas = new ArrayList<>();

    // --- Constructor útil sin ID ---

    public FuncionarioEntity(
            String nombre,
            String apelPat,
            String apelMat,
            String rut,
            String dv,
            String clave,
            int estado,
            String profesion,
            RolSistemaEntity rolSistema
    ) {
        this.nombre = nombre;
        this.apelPat = apelPat;
        this.apelMat = apelMat;
        this.rut = rut;
        this.dv = dv;
        this.clave = clave;
        this.estado = estado;
        this.profesion = profesion;
        this.rolSistema = rolSistema;
    }
}