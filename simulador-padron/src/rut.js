'use strict';
// RUT chileno: modulo 11.

function calcularDv(cuerpo) {
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

// Acepta "40.000.008-5", "40000008-5" o "400000085". Devuelve { cuerpo, dv } o null si
// el formato es invalido o el digito verificador no calza.
function parsearRut(texto) {
  if (typeof texto !== 'string') return null;
  const limpio = texto.replace(/[.\-\s]/g, '').toUpperCase();
  if (!/^\d{6,9}[0-9K]$/.test(limpio)) return null;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (calcularDv(cuerpo) !== dv) return null;
  return { cuerpo, dv };
}

function formatearRut(cuerpo, dv) {
  const conPuntos = String(cuerpo).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${conPuntos}-${String(dv ?? '').toUpperCase()}`;
}

module.exports = { calcularDv, parsearRut, formatearRut };
