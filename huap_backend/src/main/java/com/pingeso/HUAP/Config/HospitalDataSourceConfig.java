package com.pingeso.HUAP.Config;

import java.util.HashMap;
import java.util.Map;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.jdbc.autoconfigure.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jpa.EntityManagerFactoryBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.transaction.PlatformTransactionManager;

import jakarta.persistence.EntityManagerFactory;

/**
 * Datasource del HOSPITAL: conexión de <b>solo lectura</b> a la vista {@code viewPersonal}.
 *
 * <p>Cubre únicamente el paquete {@code com.pingeso.HUAP.hospital} (la entidad {@code @Immutable}
 * {@link com.pingeso.HUAP.hospital.ViewPersonalEntity} y su repositorio). El usuario de BD solo
 * tiene permiso {@code SELECT} sobre la vista, por lo que Hibernate se configura con
 * {@code hbm2ddl.auto=none} y el pool en modo read-only. Se configura desde {@code hospital.datasource.*}.
 */
@Configuration
@EnableJpaRepositories(
        basePackages = "com.pingeso.HUAP.hospital",
        entityManagerFactoryRef = "hospitalEntityManagerFactory",
        transactionManagerRef = "hospitalTransactionManager"
)
public class HospitalDataSourceConfig {

    @Bean
    @ConfigurationProperties("hospital.datasource")
    public DataSourceProperties hospitalDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    @ConfigurationProperties("hospital.datasource.hikari")
    public DataSource hospitalDataSource(
            @Qualifier("hospitalDataSourceProperties") DataSourceProperties properties) {
        return properties.initializeDataSourceBuilder().build();
    }

    @Bean
    public LocalContainerEntityManagerFactoryBean hospitalEntityManagerFactory(
            EntityManagerFactoryBuilder builder,
            @Qualifier("hospitalDataSource") DataSource dataSource) {
        Map<String, Object> props = new HashMap<>();
        // El SGT nunca modifica el esquema del hospital.
        props.put("hibernate.hbm2ddl.auto", "none");
        return builder
                .dataSource(dataSource)
                .packages("com.pingeso.HUAP.hospital")
                .persistenceUnit("hospital")
                .properties(props)
                .build();
    }

    @Bean
    public PlatformTransactionManager hospitalTransactionManager(
            @Qualifier("hospitalEntityManagerFactory") EntityManagerFactory emf) {
        return new JpaTransactionManager(emf);
    }
}
