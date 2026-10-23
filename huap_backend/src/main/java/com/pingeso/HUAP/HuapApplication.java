package com.pingeso.HUAP;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling // tarea de vencimiento de solicitudes y ofertas (VencimientoProgramado)
public class HuapApplication {

	public static void main(String[] args) {
		SpringApplication.run(HuapApplication.class, args);
	}
}
