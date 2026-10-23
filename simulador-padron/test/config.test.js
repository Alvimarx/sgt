'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { leerConfig } = require('../src/config');

function envValido() {
  return {
    PADRON_ADMIN_USER: 'operador',
    PADRON_ADMIN_PASSWORD: crypto.randomBytes(12).toString('hex'),
    PADRON_DB_HOST: 'mysql',
    PADRON_DB_USER: 'padron_demo',
    PADRON_DB_PASSWORD: crypto.randomBytes(12).toString('hex'),
  };
}

test('con todas las variables arranca, escucha en 127.0.0.1 y usa innhosp', () => {
  const c = leerConfig(envValido());
  assert.equal(c.host, '127.0.0.1');
  assert.equal(c.port, 8091);
  assert.equal(c.dbName, 'innhosp');
});

for (const falta of [
  'PADRON_ADMIN_USER', 'PADRON_ADMIN_PASSWORD', 'PADRON_DB_HOST', 'PADRON_DB_USER', 'PADRON_DB_PASSWORD',
]) {
  test(`si falta ${falta} no arranca y no filtra valores`, () => {
    const env = envValido();
    const secreto = env.PADRON_ADMIN_PASSWORD;
    delete env[falta];
    assert.throws(() => leerConfig(env), (e) => e.message.includes(falta) && !e.message.includes(secreto));
  });
  test(`si ${falta} esta vacia tampoco arranca`, () => {
    const env = envValido();
    env[falta] = '   ';
    assert.throws(() => leerConfig(env), new RegExp(falta));
  });
}

test('rechaza una clave de acceso corta', () => {
  const env = envValido();
  env.PADRON_ADMIN_PASSWORD = 'corta';
  assert.throws(() => leerConfig(env), /PADRON_ADMIN_PASSWORD/);
});

test('rechaza puertos invalidos', () => {
  assert.throws(() => leerConfig({ ...envValido(), PADRON_PORT: '99999' }), /PADRON_PORT/);
});
