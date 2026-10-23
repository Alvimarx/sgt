'use strict';
// Lee y valida la configuracion desde variables de entorno.
// Si falta alguna variable obligatoria el servicio NO arranca (lanza un Error que
// nombra las variables, nunca sus valores). No hay valores por defecto para claves.

const MIN_CLAVE_ACCESO = 12;

function leerConfig(env) {
  const faltan = [];
  const obligatoria = (nombre) => {
    const valor = (env[nombre] ?? '').trim();
    if (!valor) faltan.push(nombre);
    return valor;
  };

  const cfg = {
    adminUser: obligatoria('PADRON_ADMIN_USER'),
    adminPassword: obligatoria('PADRON_ADMIN_PASSWORD'),
    dbHost: obligatoria('PADRON_DB_HOST'),
    dbUser: obligatoria('PADRON_DB_USER'),
    dbPassword: obligatoria('PADRON_DB_PASSWORD'),
    dbName: (env.PADRON_DB_NAME ?? '').trim() || 'innhosp',
    dbPort: Number(env.PADRON_DB_PORT || 3306),
    // 127.0.0.1 por defecto: dentro del contenedor el compose fija 0.0.0.0 y es el
    // puerto publicado (PADRON_BIND, 127.0.0.1 por defecto) el que limita el acceso.
    host: (env.PADRON_HOST ?? '').trim() || '127.0.0.1',
    port: Number(env.PADRON_PORT || 8091),
  };

  if (faltan.length) {
    throw new Error(
      'Faltan variables de entorno obligatorias: ' + faltan.join(', ') + '. El servicio no arranca.'
    );
  }
  if (cfg.adminPassword.length < MIN_CLAVE_ACCESO) {
    throw new Error(
      `PADRON_ADMIN_PASSWORD debe tener al menos ${MIN_CLAVE_ACCESO} caracteres. El servicio no arranca.`
    );
  }
  if (!Number.isInteger(cfg.port) || cfg.port < 1 || cfg.port > 65535) {
    throw new Error('PADRON_PORT no es un puerto valido. El servicio no arranca.');
  }
  if (!Number.isInteger(cfg.dbPort) || cfg.dbPort < 1 || cfg.dbPort > 65535) {
    throw new Error('PADRON_DB_PORT no es un puerto valido. El servicio no arranca.');
  }
  return cfg;
}

module.exports = { leerConfig, MIN_CLAVE_ACCESO };
