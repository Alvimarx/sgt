package com.pingeso.HUAP.Config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.client.RestTemplate;

/**
 * Configuración de cache, scheduling y beans comunes para la aplicación
 */
@Configuration
@EnableCaching
@EnableScheduling
public class CacheConfig {

    /**
     * Configura el administrador de cache usando ConcurrentMapCacheManager
     * que es simple y efectivo para aplicaciones pequeñas/medias
     */
    @Bean
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager("holidays");
    }

    /**
     * Configura RestTemplate para llamadas HTTP a APIs externas
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}