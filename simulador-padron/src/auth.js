'use strict';
const crypto = require('node:crypto');

function igual(a, b) {
  // timingSafeEqual exige el mismo largo: se comparan los SHA-256 de ambos.
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Autenticacion basica con usuario y clave de la configuracion. Los intentos fallidos
// esperan un segundo antes de responder para frenar la fuerza bruta.
function basicAuth(usuario, clave, { esperaFallo = 1000 } = {}) {
  return (req, res, next) => {
    const rechazar = () => {
      setTimeout(() => {
        res.set('WWW-Authenticate', 'Basic realm="Simulador del padron (demo)", charset="UTF-8"');
        res.status(401).type('text/plain').send('Autenticacion requerida');
      }, esperaFallo);
    };
    const cabecera = req.headers.authorization || '';
    const [esquema, credencial] = cabecera.split(' ');
    if (!/^basic$/i.test(esquema || '') || !credencial) return rechazar();
    const decodificado = Buffer.from(credencial, 'base64').toString('utf8');
    const i = decodificado.indexOf(':');
    if (i < 0) return rechazar();
    const okUsuario = igual(decodificado.slice(0, i), usuario);
    const okClave = igual(decodificado.slice(i + 1), clave);
    if (okUsuario && okClave) return next();
    return rechazar();
  };
}

module.exports = { basicAuth };
