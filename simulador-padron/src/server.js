'use strict';
const mysql = require('mysql2/promise');
const { leerConfig } = require('./config');
const { crearRepo } = require('./repo');
const { crearApp } = require('./app');

let config;
try {
  config = leerConfig(process.env);
} catch (e) {
  console.error('[padron] ' + e.message);
  process.exit(1);
}

const pool = mysql.createPool({
  host: config.dbHost,
  port: config.dbPort,
  user: config.dbUser,
  password: config.dbPassword,
  database: config.dbName,
  charset: 'utf8mb4',
  connectionLimit: 3,
  waitForConnections: true,
});

const app = crearApp({ repo: crearRepo(pool), config });
const servidor = app.listen(config.port, config.host, () => {
  console.log(`[padron] SOLO DEMO. Escuchando en http://${config.host}:${config.port}`);
});

for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => {
    servidor.close(() => pool.end().finally(() => process.exit(0)));
  });
}
