-- ==============================================================
-- R7 (paso OPCIONAL de datos) — renombrar el tipo de turno "Dia" a "Día"
--
-- SOLO si en la base de ESTA máquina el tipo de turno diurno quedó
-- guardado sin tilde (era un descuido del seed de prueba). Verificar
-- primero cómo están nombrados los tipos de turno de cada servicio:
--
--     SELECT id_servicio, id_tipo_turno, nombre FROM tipo_turno;
--
-- Si los nombres reales ya están bien escritos, NO ejecutar nada.
-- El UPDATE de abajo ajusta el id_servicio según corresponda.
-- ==============================================================
UPDATE tipo_turno SET nombre = 'Día' WHERE nombre = 'Dia';
SELECT id_servicio, id_tipo_turno, nombre FROM tipo_turno;
