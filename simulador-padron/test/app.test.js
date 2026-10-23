'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { crearApp } = require('../src/app');
const { ErrorNegocio } = require('../src/repo');

const usuario = 'operador';
const clave = crypto.randomBytes(12).toString('hex');
const basic = 'Basic ' + Buffer.from(`${usuario}:${clave}`).toString('base64');

function repoFalso() {
  const llamadas = [];
  return {
    llamadas,
    listar: async (o) => { llamadas.push(['listar', o]); return { total: 0, activos: 0, personas: [] }; },
    agregar: async (o) => { llamadas.push(['agregar', o]); return { id: 1, rut: '1-9' }; },
    sacar: async (id, e) => {
      llamadas.push(['sacar', id, e]);
      if (id === '99') throw new ErrorNegocio(409, 'ya esta fuera');
      return { id: Number(id), estado: 6 };
    },
    reactivar: async (id, c) => { llamadas.push(['reactivar', id, c]); return { id: Number(id), estado: 1 }; },
  };
}

async function levantar(repo) {
  const app = crearApp({ repo, config: { adminUser: usuario, adminPassword: clave }, esperaFallo: 0 });
  const servidor = await new Promise((ok) => { const s = app.listen(0, '127.0.0.1', () => ok(s)); });
  const base = `http://127.0.0.1:${servidor.address().port}`;
  return { base, cerrar: () => new Promise((ok) => servidor.close(ok)) };
}

test('sin credenciales o con clave mala responde 401, y no toca el repo', async () => {
  const repo = repoFalso();
  const { base, cerrar } = await levantar(repo);
  try {
    assert.equal((await fetch(`${base}/api/personal`)).status, 401);
    const mala = 'Basic ' + Buffer.from(`${usuario}:${clave}x`).toString('base64');
    assert.equal((await fetch(`${base}/api/personal`, { headers: { Authorization: mala } })).status, 401);
    assert.equal((await fetch(`${base}/`)).status, 401);
    assert.equal(repo.llamadas.length, 0);
  } finally { await cerrar(); }
});

test('healthz responde sin credenciales', async () => {
  const { base, cerrar } = await levantar(repoFalso());
  try { assert.equal((await fetch(`${base}/healthz`)).status, 200); } finally { await cerrar(); }
});

test('con credenciales lista, agrega, saca y reactiva', async () => {
  const repo = repoFalso();
  const { base, cerrar } = await levantar(repo);
  const h = { Authorization: basic, 'Content-Type': 'application/json' };
  try {
    assert.equal((await fetch(`${base}/api/personal?q=ab&estado=activos`, { headers: h })).status, 200);
    assert.deepEqual(repo.llamadas[0], ['listar', { q: 'ab', estado: 'activos' }]);
    let r = await fetch(`${base}/api/personal`, { method: 'POST', headers: h, body: JSON.stringify({ rut: '1' }) });
    assert.equal(r.status, 201);
    r = await fetch(`${base}/api/personal/5/baja`, { method: 'POST', headers: h, body: '{}' });
    assert.equal(r.status, 200);
    r = await fetch(`${base}/api/personal/99/baja`, { method: 'POST', headers: h, body: '{}' });
    assert.equal(r.status, 409);
    assert.equal((await r.json()).error, 'ya esta fuera');
    r = await fetch(`${base}/api/personal/5/alta`, { method: 'POST', headers: h, body: '{}' });
    assert.equal(r.status, 200);
    // la pagina se sirve
    const pagina = await fetch(`${base}/`, { headers: { Authorization: basic } });
    assert.equal(pagina.status, 200);
    assert.match(await pagina.text(), /Simulador del padr/);
  } finally { await cerrar(); }
});

test('anti-CSRF: rechaza escrituras que no son JSON o vienen de otro origen', async () => {
  const repo = repoFalso();
  const { base, cerrar } = await levantar(repo);
  try {
    let r = await fetch(`${base}/api/personal/5/baja`, {
      method: 'POST', headers: { Authorization: basic, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'a=b',
    });
    assert.equal(r.status, 415);
    r = await fetch(`${base}/api/personal/5/baja`, {
      method: 'POST',
      headers: { Authorization: basic, 'Content-Type': 'application/json', Origin: 'http://otro.example' },
      body: '{}',
    });
    assert.equal(r.status, 403);
    assert.equal(repo.llamadas.length, 0);
  } finally { await cerrar(); }
});

test('un error inesperado responde 500 sin detalles', async () => {
  const repo = repoFalso();
  repo.listar = async () => { throw new Error('secreto interno'); };
  const { base, cerrar } = await levantar(repo);
  try {
    const r = await fetch(`${base}/api/personal`, { headers: { Authorization: basic } });
    assert.equal(r.status, 500);
    assert.doesNotMatch(await r.text(), /secreto interno/);
  } finally { await cerrar(); }
});
