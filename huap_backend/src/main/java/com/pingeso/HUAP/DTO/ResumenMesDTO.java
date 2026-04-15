package com.pingeso.HUAP.DTO;

public class ResumenMesDTO {
	private String fecha; // 'YYYY-MM-DD'
	private Long total;

	public ResumenMesDTO() {}

	public ResumenMesDTO(String fecha, Long total) {
		this.fecha = fecha;
		this.total = total;
	}

	public String getFecha() {
		return fecha;
	}

	public void setFecha(String fecha) {
		this.fecha = fecha;
	}

	public Long getTotal() {
		return total;
	}

	public void setTotal(Long total) {
		this.total = total;
	}
}
