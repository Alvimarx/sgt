'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularDv, parsearRut, formatearRut } = require('../src/rut');

test('calcula el digito verificador por modulo 11', () => {
  assert.equal(calcularDv('40000001'), '8');
  assert.equal(calcularDv('40000008'), '5');
  // casos limite: resto 11 -> 0 y resto 10 -> K
  assert.equal(calcularDv('40000005'), '0');
  assert.equal(calcularDv('40000014'), 'K');
});

test('acepta distintos formatos con DV correcto', () => {
  assert.deepEqual(parsearRut('40.000.001-8'), { cuerpo: '40000001', dv: '8' });
  assert.deepEqual(parsearRut('400000018'), { cuerpo: '40000001', dv: '8' });
  assert.deepEqual(parsearRut('40000014-k'), { cuerpo: '40000014', dv: 'K' });
});

test('rechaza DV incorrecto, formato invalido y no-texto', () => {
  assert.equal(parsearRut('40.000.001-9'), null);
  assert.equal(parsearRut('abc'), null);
  assert.equal(parsearRut(''), null);
  assert.equal(parsearRut(null), null);
  assert.equal(parsearRut('1-9'), null);
});

test('formatea con puntos y guion', () => {
  assert.equal(formatearRut('40000001', '8'), '40.000.001-8');
  assert.equal(formatearRut('9123456', 'k'), '9.123.456-K');
});
