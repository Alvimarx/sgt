-- ============================================================================
-- Migración V2: vigencia efectiva de planificaciones + origen inequívoco de turnos
-- ============================================================================
-- Contexto: corrección funcional "Planificación y Solicitudes" (ver
-- docs/qa/PLAN_CORRECCION_PLANIFICACION_SOLICITUDES.md). Separa el "ancla" de
-- una rotativa (lunes que fija la fase del ciclo) de su "vigencia efectiva"
-- (rango real de fechas con turnos), permite generar rangos mayores a un mes,
-- impide vigencias efectivas superpuestas por servicio, y da a cada turno
-- generado un origen (ejecución) inequívoco para poder deshacer una
-- generación sin afectar turnos de otra planificación.
--
-- Naturaleza: ADITIVA e INCREMENTAL. No modifica ni elimina ninguna columna,
-- tabla ni restricción existente. Segura sobre datos históricos: los turnos
-- ya existentes quedan con id_ejecucion = NULL (origen "legado"), sin que
-- ninguna operación nueva los toque automáticamente.
--
-- Aplicar UNA sola vez por base de datos. Es idempotente en la práctica
-- gracias a los "IF NOT EXISTS" / verificación previa recomendada abajo.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Nueva tabla: una fila por cada "puesta en vigencia" (generación) de un
--    molde de planificación.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `planificacion_ejecucion` (
  `id_ejecucion`           bigint NOT NULL AUTO_INCREMENT,
  `id_planificacion`       bigint NOT NULL,
  `id_servicio`            bigint NOT NULL,
  `fecha_inicio_rotativa`  date NOT NULL,
  `fecha_inicio_efectiva`  date NOT NULL,
  `fecha_fin_efectiva`     date NOT NULL,
  `fecha_generacion`       datetime NOT NULL,
  `id_funcionario_actor`   bigint DEFAULT NULL,
  `estado`                 varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVA',
  `ids_reglas_aplicadas`   varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_ejecucion`),
  KEY `idx_ejecucion_servicio_vigencia` (`id_servicio`, `estado`, `fecha_inicio_efectiva`, `fecha_fin_efectiva`),
  KEY `idx_ejecucion_planificacion` (`id_planificacion`),
  CONSTRAINT `FK_ejecucion_planificacion` FOREIGN KEY (`id_planificacion`) REFERENCES `planificacion` (`id_planificacion`),
  CONSTRAINT `FK_ejecucion_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `servicios` (`id_servicio`),
  CONSTRAINT `FK_ejecucion_actor` FOREIGN KEY (`id_funcionario_actor`) REFERENCES `Funcionario` (`ID_FUNCIONARIO`),
  CONSTRAINT `CK_ejecucion_estado` CHECK (`estado` IN ('ACTIVA', 'ANULADA')),
  CONSTRAINT `CK_ejecucion_fechas` CHECK (`fecha_fin_efectiva` >= `fecha_inicio_efectiva`
                                       AND `fecha_inicio_efectiva` >= `fecha_inicio_rotativa`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cada fila = una generación (puesta en vigencia) de un molde de planificación, con su rango efectivo y su ancla de rotativa.';

-- ----------------------------------------------------------------------------
-- 2) Nueva columna en Turnos: a qué ejecución pertenece el turno (NULL = turno
--    manual o generado antes de esta migración; se trata como origen legado).
-- ----------------------------------------------------------------------------
-- Nota: se emite como 3 sentencias ALTER TABLE separadas (en vez de una sola
-- combinando "ADD COLUMN IF NOT EXISTS" con "ADD KEY"/"ADD CONSTRAINT"),
-- porque esa combinación no es aceptada por el parser de MySQL 8.0.x aunque
-- cada cláusula sí lo sea por separado. Antes de aplicar, verificar si la
-- columna ya existe (script pensado para aplicarse una sola vez):
--   SELECT COUNT(*) FROM information_schema.COLUMNS
--   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Turnos' AND COLUMN_NAME = 'id_ejecucion';
ALTER TABLE `Turnos`
  ADD COLUMN `id_ejecucion` bigint DEFAULT NULL AFTER `id_tipo_turno`;
ALTER TABLE `Turnos`
  ADD KEY `idx_turno_ejecucion` (`id_ejecucion`);
ALTER TABLE `Turnos`
  ADD CONSTRAINT `FK_turno_ejecucion` FOREIGN KEY (`id_ejecucion`)
    REFERENCES `planificacion_ejecucion` (`id_ejecucion`);

-- ============================================================================
-- REVERSIÓN (ejecutar en orden inverso; no destruye turnos ni planificaciones
-- existentes, solo retira las estructuras agregadas por esta migración)
-- ============================================================================
-- ALTER TABLE `Turnos` DROP FOREIGN KEY `FK_turno_ejecucion`;
-- ALTER TABLE `Turnos` DROP INDEX `idx_turno_ejecucion`;
-- ALTER TABLE `Turnos` DROP COLUMN `id_ejecucion`;
-- DROP TABLE IF EXISTS `planificacion_ejecucion`;
