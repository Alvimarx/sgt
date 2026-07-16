package com.pingeso.HUAP;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.mysql.MySQLContainer;

/**
 * Base para los tests que necesitan una BD real. Levanta UN único MySQL (Testcontainers) para toda
 * la suite (patrón <i>singleton container</i>): se arranca a mano en el bloque {@code static} una sola
 * vez y Ryuk lo cierra al salir la JVM. Al compartir el mismo contenedor (misma URL), las subclases
 * comparten además el contexto de Spring (cacheado), evitando re-levantar contenedor y contexto por
 * cada clase de test. Requiere Docker corriendo.
 */
@SpringBootTest
public abstract class AbstractContainerTest {

    static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.0");

    static {
        MYSQL.start();
    }

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.datasource.driver-class-name", MYSQL::getDriverClassName);
    }
}
