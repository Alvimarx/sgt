package com.pingeso.HUAP.Security;

import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;

/**
 * Control simple de intentos de login (en memoria) para mitigar fuerza bruta.
 * Tras MAX_ATTEMPTS fallos consecutivos para una misma clave (RUT), se bloquea
 * durante LOCK_TIME_MS. Un login exitoso limpia el contador.
 *
 * Nota: es por instancia. En despliegues multi-nodo conviene respaldarlo en un
 * almacén compartido (Redis) o aplicar rate limiting en el reverse proxy/WAF.
 */
@Service
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 5;
    // Pruebas: 1 minuto. Producción recomendada: 15 * 60 * 1000L (15 min).
    private static final long LOCK_TIME_MS = 60 * 1000L; // 1 minuto

    private static final class Attempt {
        int count;
        long lockedUntil;
    }

    private final ConcurrentHashMap<String, Attempt> attempts = new ConcurrentHashMap<>();

    public boolean isBlocked(String key) {
        if (key == null) return false;
        Attempt a = attempts.get(key);
        if (a == null) return false;
        if (a.lockedUntil > System.currentTimeMillis()) return true;
        // Bloqueo expirado: limpiar.
        if (a.lockedUntil != 0) attempts.remove(key);
        return false;
    }

    public void loginFailed(String key) {
        if (key == null) return;
        Attempt a = attempts.computeIfAbsent(key, k -> new Attempt());
        synchronized (a) {
            a.count++;
            if (a.count >= MAX_ATTEMPTS) {
                a.lockedUntil = System.currentTimeMillis() + LOCK_TIME_MS;
                a.count = 0;
            }
        }
    }

    public void loginSucceeded(String key) {
        if (key != null) attempts.remove(key);
    }

    /** Intentos que quedan antes del bloqueo (0 si ya está bloqueado). */
    public int getRemainingAttempts(String key) {
        Attempt a = (key == null) ? null : attempts.get(key);
        if (a == null) return MAX_ATTEMPTS;
        if (a.lockedUntil > System.currentTimeMillis()) return 0;
        return Math.max(0, MAX_ATTEMPTS - a.count);
    }

    /** Segundos que faltan para que se libere el bloqueo (0 si no está bloqueado). */
    public long getSecondsToUnlock(String key) {
        Attempt a = (key == null) ? null : attempts.get(key);
        if (a == null) return 0;
        long diff = a.lockedUntil - System.currentTimeMillis();
        return diff > 0 ? (diff / 1000) + 1 : 0;
    }
}
