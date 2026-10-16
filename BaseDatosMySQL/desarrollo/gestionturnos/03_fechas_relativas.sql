-- ==============================================================
-- FECHAS RELATIVAS A HOY — datos de prueba siempre vigentes
-- ==============================================================
-- El seed de desarrollo (02_datos.sql) trae turnos, solicitudes, ofertas,
-- notificaciones y bitácora con fechas fijas de abril–junio de 2026. Pasado
-- ese período todo queda en el pasado y no se pueden probar los flujos que
-- exigen turnos futuros (solicitar un cupo, intercambios, ofertas vigentes,
-- agenda sin días pasados).
--
-- Este script corre DESPUÉS del seed y de la migración V2, y desplaza todas
-- esas fechas en un múltiplo exacto de 7 días: la primera semana con turnos
-- del seed pasa a ser la semana ANTERIOR a la actual, y el resto queda en la
-- semana actual y las siguientes. Al mover semanas completas, cada turno
-- conserva su día de la semana (las rotativas se anclan en lunes).
--
-- NO se mueven: feriados (son los reales de Chile) ni catálogos.
--
-- "Hoy" se calcula como la fecha de Chile continental aproximada (UTC−3):
-- la imagen de MySQL no trae las tablas de zonas horarias. Solo importa en
-- la noche del domingo, cuando el lunes UTC llega 3 horas antes.
--
-- En docker-compose.local.yml se monta como 40_*.sql (los scripts de init
-- corren una sola vez, en orden alfabético, al crear el volumen). Para volver
-- a centrar las fechas en otra semana: `down -v` y levantar de nuevo.
-- ==============================================================

USE gestionturnos;

SET @hoy_chile   = DATE(UTC_TIMESTAMP() - INTERVAL 3 HOUR);
SET @lunes_hoy   = DATE_SUB(@hoy_chile, INTERVAL WEEKDAY(@hoy_chile) DAY);
SET @min_turno   = (SELECT MIN(dia_inicio_turno) FROM Turnos);
SET @lunes_seed  = DATE_SUB(@min_turno, INTERVAL WEEKDAY(@min_turno) DAY);
-- Lunes contra lunes: la diferencia siempre es múltiplo de 7. Sin turnos en
-- el seed no hay nada que mover (0).
SET @dias = COALESCE(DATEDIFF(DATE_SUB(@lunes_hoy, INTERVAL 7 DAY), @lunes_seed), 0);

-- Turnos: se recorren en el sentido del desplazamiento para no chocar con
-- índices únicos mientras la tabla está a medio mover.
UPDATE Turnos
   SET dia_inicio_turno = DATE_ADD(dia_inicio_turno, INTERVAL @dias DAY),
       dia_final_turno  = DATE_ADD(dia_final_turno,  INTERVAL @dias DAY)
 WHERE @dias > 0
 ORDER BY dia_inicio_turno DESC;
UPDATE Turnos
   SET dia_inicio_turno = DATE_ADD(dia_inicio_turno, INTERVAL @dias DAY),
       dia_final_turno  = DATE_ADD(dia_final_turno,  INTERVAL @dias DAY)
 WHERE @dias < 0
 ORDER BY dia_inicio_turno ASC;

UPDATE Solicitudes
   SET Fecha_creacion        = DATE_ADD(Fecha_creacion,        INTERVAL @dias DAY),
       Fecha_inicio_permiso  = DATE_ADD(Fecha_inicio_permiso,  INTERVAL @dias DAY),
       Fecha_termino_permiso = DATE_ADD(Fecha_termino_permiso, INTERVAL @dias DAY)
 WHERE @dias <> 0;

UPDATE Oferta_General
   SET Fecha_creacion = DATE_ADD(Fecha_creacion, INTERVAL @dias DAY)
 WHERE @dias <> 0;

UPDATE Postulacion_Oferta
   SET Fecha_postulacion = DATE_ADD(Fecha_postulacion, INTERVAL @dias DAY)
 WHERE @dias <> 0;

UPDATE Notificacion
   SET Fecha_envio = DATE_ADD(Fecha_envio, INTERVAL @dias DAY)
 WHERE @dias <> 0;

UPDATE Bitacora_eventos
   SET Fecha_modificacion    = DATE_ADD(Fecha_modificacion,    INTERVAL @dias DAY),
       Fecha_inicio_afectada = DATE_ADD(Fecha_inicio_afectada, INTERVAL @dias DAY),
       Fecha_fin_afectada    = DATE_ADD(Fecha_fin_afectada,    INTERVAL @dias DAY)
 WHERE @dias <> 0;

-- planificacion_ejecucion (migración V2) nace vacía en este ambiente; si
-- alguna vez trae filas, se mueven igual para que la vigencia calce.
UPDATE planificacion_ejecucion
   SET fecha_inicio_rotativa = DATE_ADD(fecha_inicio_rotativa, INTERVAL @dias DAY),
       fecha_inicio_efectiva = DATE_ADD(fecha_inicio_efectiva, INTERVAL @dias DAY),
       fecha_fin_efectiva    = DATE_ADD(fecha_fin_efectiva,    INTERVAL @dias DAY),
       fecha_generacion      = DATE_ADD(fecha_generacion,      INTERVAL @dias DAY)
 WHERE @dias <> 0;

SELECT @hoy_chile AS hoy_chile, @lunes_seed AS lunes_seed_original, @dias AS dias_desplazados,
       (SELECT MIN(dia_inicio_turno) FROM Turnos) AS primer_turno,
       (SELECT MAX(dia_inicio_turno) FROM Turnos) AS ultimo_turno;
