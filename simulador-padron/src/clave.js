'use strict';
const crypto = require('node:crypto');

// FORMATO DE LA CLAVE EN innhosp.viewPersonal.clave (leido de FuncionarioService del SGT):
//   normalizeEncodedPassword() solo acepta 128 bytes (SHA-512 en hexadecimal, como texto
//   ASCII) o 64 bytes (SHA-512 binario). Un hash BCrypt ("{bcrypt}$2a$..." = 68 bytes)
//   se rechaza ANTES de comparar, con "Error interno al validar las credenciales".
//   Por eso la clave se guarda como SHA-512 sin sal en hexadecimal (128 caracteres), el
//   mismo formato del seed (SHA2('...', 512)) y el que valida el DelegatingPasswordEncoder
//   para hashes sin prefijo.
const MIN_LARGO_CLAVE = 8;
const MAX_LARGO_CLAVE = 72;

function validarClave(clave) {
  if (typeof clave !== 'string' || clave.length < MIN_LARGO_CLAVE) {
    return `La clave inicial debe tener al menos ${MIN_LARGO_CLAVE} caracteres.`;
  }
  if (clave.length > MAX_LARGO_CLAVE) {
    return `La clave inicial no puede pasar de ${MAX_LARGO_CLAVE} caracteres.`;
  }
  return null;
}

function hashClave(clave) {
  return Buffer.from(crypto.createHash('sha512').update(clave, 'utf8').digest('hex'), 'ascii');
}

module.exports = { hashClave, validarClave, MIN_LARGO_CLAVE, MAX_LARGO_CLAVE };
