-- ==============================================================
-- CORRECCIÓN: RUTs duplicados en innhosp.personalAux
--
-- Problema: la semilla de personalAux repetía dos RUTs en personas distintas:
--   - '11111111' -> id_personal 11 (Admin Bootstrap) y 200 (Ricardo Morales)
--   - '12345678' -> id_personal 1  (Álvaro López)    y 101 (Ana María González)
-- ViewPersonalRepository.findByRut() devuelve un Optional<ViewPersonalEntity>:
-- con dos filas coincidentes Spring Data lanza NonUniqueResultException y el
-- LOGIN DE ESOS DOS USUARIOS FALLA (incluido el administrador de arranque).
--
-- Corrección: se conservan los RUTs originales en las personas "canónicas"
-- (ids 1 y 11, las que tienen contraparte en gestionturnos) y se reasignan
-- RUTs ficticios libres —con dígito verificador válido— a los duplicados.
--
-- Idempotente: si ya se aplicó, no hace nada.
--
-- Ejecución:
--   docker compose ... exec -T mysql mysql -uroot -p innhosp < este_archivo.sql
-- ==============================================================

USE innhosp;

UPDATE personalAux SET rut = '20000101', dv = '8'
 WHERE id_personal = 101 AND rut = '12345678';

UPDATE personalAux SET rut = '20000200', dv = '6'
 WHERE id_personal = 200 AND rut = '11111111';

-- Verificación: no debe quedar ningún RUT repetido.
SELECT rut, COUNT(*) AS veces
  FROM personalAux
 GROUP BY rut HAVING COUNT(*) > 1;
