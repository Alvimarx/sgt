package com.pingeso.HUAP.Entity;

import jakarta.persistence.*;

@Entity
@Table(name = "vinculo_turno_rotativa")
public class VinculoTurnoRotativaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "id_turno")
    private Long idTurno;

    @Column(name = "id_tipo_turno")
    private Long idTipoTurno;

    public VinculoTurnoRotativaEntity() {}

    public VinculoTurnoRotativaEntity(Long idTurno, Long idTipoTurno) {
        this.idTurno = idTurno;
        this.idTipoTurno = idTipoTurno;
    }

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getIdTurno() { return idTurno; }
    public void setIdTurno(Long idTurno) { this.idTurno = idTurno; }
    public Long getIdTipoTurno() { return idTipoTurno; }
    public void setIdTipoTurno(Long idTipoTurno) { this.idTipoTurno = idTipoTurno; }
}