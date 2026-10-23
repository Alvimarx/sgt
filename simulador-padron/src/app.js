'use strict';
const path = require('node:path');
const express = require('express');
const { basicAuth } = require('./auth');
const { ErrorNegocio, PROFESIONES, ESTADOS_BAJA, ESTADO_BAJA_POR_DEFECTO } = require('./repo');

function crearApp({ repo, config, esperaFallo }) {
  const app = express();
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    res.set({
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy':
        "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    });
    next();
  });

  // Sin autenticacion y sin tocar la BD: solo para el healthcheck del contenedor.
  app.get('/healthz', (req, res) => res.type('text/plain').send('ok'));

  app.use(basicAuth(config.adminUser, config.adminPassword, { esperaFallo }));

  // Anti-CSRF: la autenticacion basica la manda el navegador sola, asi que las
  // escrituras exigen JSON (un formulario de otro sitio no puede enviarlo) y un Origin,
  // si viene, igual al Host.
  app.use('/api', (req, res, next) => {
    if (req.method === 'GET') return next();
    const origen = req.headers.origin;
    if (origen) {
      let host;
      try { host = new URL(origen).host; } catch (_) { host = null; }
      if (host !== req.headers.host) return res.status(403).json({ error: 'Origen no permitido.' });
    }
    if (!req.is('application/json')) return res.status(415).json({ error: 'Se espera application/json.' });
    next();
  });
  app.use('/api', express.json({ limit: '10kb' }));

  app.get('/api/catalogos', (req, res) => {
    res.json({
      profesiones: PROFESIONES,
      motivosBaja: Object.entries(ESTADOS_BAJA).map(([codigo, nombre]) => ({ codigo: Number(codigo), nombre })),
      motivoBajaPorDefecto: ESTADO_BAJA_POR_DEFECTO,
    });
  });

  const asincrono = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

  app.get('/api/personal', asincrono(async (req, res) => {
    const estado = ['todos', 'activos', 'fuera'].includes(req.query.estado) ? req.query.estado : 'todos';
    res.json(await repo.listar({ q: String(req.query.q ?? ''), estado }));
  }));

  app.post('/api/personal', asincrono(async (req, res) => {
    const creada = await repo.agregar(req.body ?? {});
    console.log(`[padron] alta id=${creada.id}`);
    res.status(201).json(creada);
  }));

  app.post('/api/personal/:id/baja', asincrono(async (req, res) => {
    const r = await repo.sacar(req.params.id, req.body?.estado);
    console.log(`[padron] baja id=${r.id} estado=${r.estado}`);
    res.json(r);
  }));

  app.post('/api/personal/:id/alta', asincrono(async (req, res) => {
    const r = await repo.reactivar(req.params.id, req.body?.clave);
    console.log(`[padron] reactivacion id=${r.id}`);
    res.json(r);
  }));

  app.use(express.static(path.join(__dirname, '..', 'public'), { index: 'index.html' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ErrorNegocio) return res.status(err.status).json({ error: err.message });
    if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON invalido.' });
    console.error('[padron] error:', err && err.code ? err.code : err && err.message);
    res.status(500).json({ error: 'Error interno.' });
  });

  return app;
}

module.exports = { crearApp };
