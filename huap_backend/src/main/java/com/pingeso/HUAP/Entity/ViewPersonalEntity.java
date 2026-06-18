package com.pingeso.HUAP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import org.hibernate.annotations.Immutable;

import java.util.Date;

@Entity
@Table(name = "viewPersonal")
@Immutable
@Getter
public class ViewPersonalEntity {
    @Id
    @Column(name = "id_personal", nullable = false)
    private long id_personal;

    //@Column(name = "rol")
    //private String rol;

    @Column(name = "rut")
    private String rut;

    @Column(name = "dv")
    private String dv;

    @Column(name = "nombre")
    private String nombre;

    @Column(name = "apel_pat")
    private String apel_pat;

    @Column(name = "apel_mat")
    private String apel_mat;

    //@Column(name = "rrhh", nullable = false)
    //private int rrhh;

    @Column(name = "telefono")
    private String telefono;

    @Column(name = "emailProfesional")
    private String emailPro;

    //@Column(name = "emailPersonal")
    //private String emailPersonal;

    @Column(name = "profesion")
    private Integer profesion;

    @Column(name = "id_estamento")
    private Integer id_estamento;

    @Column(name = "estamento")
    private String estamento;

    @Column(name = "clave")
    @JsonIgnore
    private byte[] clave;

    @Column(name = "estado")
    private Integer estado;

    //@Column(name = "date_added")
    //private Date date_added;

    protected ViewPersonalEntity () {}

}
