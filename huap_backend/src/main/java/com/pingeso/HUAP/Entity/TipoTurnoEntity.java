package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;

@Entity
@Table(name = "tipo_turno")
public class TipoTurnoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_tipo_turno", unique = true, nullable = false)
    private Long idTipoTurno;

    @Column(name = "nombre", nullable = false)
    private String nombre;

    @Column(name = "prioridad_interna", nullable = false)
    private int prioridadInterna;

    // Mapeamos la columna JSON a un String.
    // Spring/Jackson se encargará de (de)serializar
    // el JSON string <-> objeto en el @RequestBody
    @Column(name = "matriz_patron", columnDefinition = "json")
    private String matrizPatron;

    @ManyToOne
    @JoinColumn(name = "id_categoria_tipo_turno", nullable = false)
    private CategoriaTipoTurnoEntity categoria;

    @ManyToOne
    @JoinColumn(name = "id_creador")
    private PersonalEntity creador;

    // --- Constructor Vacío ---
    public TipoTurnoEntity() {
    }

    public TipoTurnoEntity(String nombre, int prioridadInterna, String matrizPatron, CategoriaTipoTurnoEntity categoria, PersonalEntity creador) {
        this.nombre = nombre;
        this.prioridadInterna = prioridadInterna;
        this.matrizPatron = matrizPatron;
        this.categoria = categoria;
        this.creador = creador;
    }

    public Long getIdTipoTurno() {
        return idTipoTurno;
    }

    public void setIdTipoTurno(Long idTipoTurno) {
        this.idTipoTurno = idTipoTurno;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public int getPrioridadInterna() {
        return prioridadInterna;
    }

    public void setPrioridadInterna(int prioridadInterna) {
        this.prioridadInterna = prioridadInterna;
    }

    public String getMatrizPatron() {
        return matrizPatron;
    }

    public void setMatrizPatron(String matrizPatron) {
        this.matrizPatron = matrizPatron;
    }

    public CategoriaTipoTurnoEntity getCategoria() {
        return categoria;
    }

    public void setCategoria(CategoriaTipoTurnoEntity categoria) {
        this.categoria = categoria;
    }

    public PersonalEntity getCreador() {
        return creador;
    }

    public void setCreador(PersonalEntity creador) {
        this.creador = creador;
    }
}