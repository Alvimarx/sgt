-- ============================================================================
-- Migración V3: estado RETIRADA en las ofertas generales
-- ============================================================================
-- Contexto: C-16 (decisión de Álvaro, 17 oct 2026). Quien publica una oferta
-- general puede retirarla mientras nadie la haya abierto
-- (PUT /api/v2/ofertas-generales/{id}/retirar). La oferta queda en el estado
-- nuevo RETIRADA, que la columna Oferta_General.Estado (un enum de MySQL) no
-- admitía.
--
-- Naturaleza: ADITIVA. Agrega 'RETIRADA' al final de la lista del enum; los
-- valores existentes no cambian ni se reordenan y ninguna fila se modifica.
-- MySQL 8 puede hacerlo sin reconstruir la tabla (agregar al final no cambia
-- el tamaño del dato).
--
-- IDEMPOTENTE: MODIFY deja la columna con la lista completa. Aplicarla dos
-- veces da el mismo resultado y no falla. Los esquemas de instalación nueva
-- (desarrollo/gestionturnos/01_esquema.sql y despliegue/schema_gestionturnos.sql)
-- ya traen RETIRADA: sobre ellos, esta migración no cambia nada.
--
-- Aplicarla ANTES de desplegar el backend que la usa. Hibernate
-- (DDL_AUTO=validate) solo comprueba que la columna sea un enum, no sus
-- valores: sin esta migración el backend arranca igual y retirar una oferta
-- falla con 500 («Data truncated for column 'Estado'»).
--
-- Igual que V2, no trae "USE": se aplica sobre la base de la app, p. ej.
--   mysql gestionturnos < V3__oferta_retirada.sql
-- La debe aplicar un usuario con permiso de ALTER (root): el usuario de la
-- aplicación solo tiene SELECT, INSERT, UPDATE y DELETE.
-- ============================================================================

ALTER TABLE `Oferta_General`
  MODIFY COLUMN `Estado` enum('ABIERTA','CERRADA','PENDIENTE_APROBACION','RECHAZADA','RETIRADA')
    COLLATE utf8mb4_unicode_ci DEFAULT NULL;

-- Comprobación (debe listar los 5 valores):
--   SELECT COLUMN_TYPE FROM information_schema.COLUMNS
--   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Oferta_General' AND COLUMN_NAME = 'Estado';

-- ============================================================================
-- REVERSIÓN (las ofertas RETIRADAS pasan antes a RECHAZADA, el estado más
-- cercano que ya existía; sin eso el MODIFY falla o las deja vacías):
-- ============================================================================
-- UPDATE `Oferta_General` SET `Estado` = 'RECHAZADA' WHERE `Estado` = 'RETIRADA';
-- ALTER TABLE `Oferta_General`
--   MODIFY COLUMN `Estado` enum('ABIERTA','CERRADA','PENDIENTE_APROBACION','RECHAZADA')
--     COLLATE utf8mb4_unicode_ci DEFAULT NULL;
