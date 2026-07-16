package com.pingeso.HUAP;

import org.springframework.dao.PessimisticLockingFailureException;

import java.sql.SQLException;

/**
 * Clasificación de fallos de concurrencia en los tests: distingue un <b>deadlock de InnoDB</b>
 * (error 1213 / SQLState 40001 — fallo de infraestructura, la transacción murió) de un rechazo por una
 * regla de negocio (el resultado deseable cuando el lock serializa correctamente).
 *
 * <p>Vive aparte porque {@code LockBenchmark} y {@code GestionTurnoConcurrencyTest} afirman lo mismo
 * ("con el lock no hay deadlocks") y sus criterios no deben separarse.
 */
public final class Deadlocks {

    private Deadlocks() {
    }

    /**
     * Recorre la cadena de causas: el deadlock aflora en el commit, ya envuelto por Spring y por
     * Hibernate, así que la excepción de más afuera rara vez es la reconocible.
     */
    public static boolean esDeadlock(Throwable t) {
        for (Throwable c = t; c != null && c != c.getCause(); c = c.getCause()) {
            if (c instanceof PessimisticLockingFailureException) return true;
            if (c instanceof SQLException sql
                    && ("40001".equals(sql.getSQLState()) || sql.getErrorCode() == 1213)) return true;
        }
        return false;
    }
}
