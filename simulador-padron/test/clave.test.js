'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { hashClave, validarClave } = require('../src/clave');

test('la clave se guarda como SHA-512 sin sal en hexadecimal (128 bytes ASCII)', () => {
  const clave = crypto.randomBytes(12).toString('hex');
  const almacenado = hashClave(clave);
  assert.equal(almacenado.length, 128); // largo que acepta FuncionarioService.normalizeEncodedPassword
  assert.equal(
    almacenado.toString('ascii'),
    crypto.createHash('sha512').update(clave).digest('hex') // igual a SHA2(clave, 512) del seed
  );
});

test('no es un hash BCrypt (el login del SGT lo rechazaria por largo)', () => {
  assert.doesNotMatch(hashClave('x'.repeat(10)).toString('ascii'), /^\{?(bcrypt\}|\$2)/);
});

test('valida el largo de la clave', () => {
  assert.ok(validarClave('corta'));
  assert.ok(validarClave('x'.repeat(73)));
  assert.equal(validarClave('x'.repeat(8)), null);
  assert.ok(validarClave(undefined));
});
