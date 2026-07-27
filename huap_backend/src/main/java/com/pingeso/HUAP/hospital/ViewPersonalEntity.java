package com.pingeso.HUAP.hospital;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import org.hibernate.annotations.Immutable;

/**
 * Vista de personal del hospital (fuente de verdad de RRHH).
 *
 * <p>Mapea la vista <b>de solo lectura</b> {@code viewPersonal} de la base de datos del
 * <b>hospital</b> (no del SGT). Contiene los datos del personal y las credenciales
 * ({@code clave}, {@code estado}) usados por el login. Es {@code @Immutable}: el SGT
 * nunca escribe en el hospital; solo consulta a través del datasource de solo lectura
 * (ver {@code Config/HospitalDataSourceConfig}).
 */
@Entity
@Table(name = "viewPersonal")
@Immutable
@Getter
public class ViewPersonalEntity {
    @Id
    @Column(name = "id_personal", nullable = false)
    private long id_personal;

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

    @Column(name = "telefono")
    private String telefono;

    @Column(name = "emailProfesional")
    private String emailPro;

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

    protected ViewPersonalEntity () {}

}
