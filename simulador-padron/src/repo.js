'use strict';
const { parsearRut, formatearRut } = require('./rut');
const { hashClave, validarClave } = require('./clave');

// El padron es innhosp.personalAux (la tabla que alimenta la vista viewPersonal). El SGT
// lee la vista en solo lectura; este servicio es el unico que escribe, y solo en esta tabla.

const ESTADO_ACTIVO = 1;
// Estados de conf_estados con que se saca a alguien del padron (login exige estado = 1).
const ESTADOS_BAJA = { 5: 'No Activo', 6: 'Termino Anticipado / Desvinculado', 7: 'Renunciado' };
const ESTADO_BAJA_POR_DEFECTO = 6;

// Valores de personalAux.profesion / estamento que usa el seed del hospital ficticio.
const PROFESIONES = [
  { codigo: 31, estamento: 'Médico' },
  { codigo: 32, estamento: 'Enfermera(o)' },
  { codigo: 53, estamento: 'Kinesiología' },
  { codigo: 54, estamento: 'Fonoaudiología' },
  { codigo: 55, estamento: 'Nutrición' },
  { codigo: 60, estamento: 'Administrativo' },
];

class ErrorNegocio extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

function limpiarNombre(valor, etiqueta, { obligatorio }) {
  const texto = String(valor ?? '').replace(/\s+/g, ' ').trim();
  if (!texto) {
    if (obligatorio) throw new ErrorNegocio(400, `${etiqueta} es obligatorio.`);
    return '';
  }
  if (texto.length > 100) throw new ErrorNegocio(400, `${etiqueta} no puede pasar de 100 caracteres.`);
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(texto)) throw new ErrorNegocio(400, `${etiqueta} tiene caracteres no validos.`);
  // Las columnas de nombre del padron son latin1: lo que no cabe se grabaria como '?'.
  if (/[^\u0000-ÿ]/.test(texto)) {
    throw new ErrorNegocio(400, `${etiqueta} tiene caracteres que el padron (latin1) no admite.`);
  }
  return texto;
}

function escapeLike(texto) {
  return texto.replace(/[\\%_]/g, (c) => '\\' + c);
}

function fila(r) {
  return {
    id: Number(r.id_personal),
    rut: formatearRut(r.rut, r.dv),
    rutCuerpo: r.rut,
    nombre: r.nombre,
    apelPat: r.apel_pat,
    apelMat: r.apel_mat,
    cargo: r.estamento,
    estado: r.estado,
    estadoNombre: r.estado_nombre,
    activo: r.estado === ESTADO_ACTIVO,
    tieneClave: Number(r.tiene_clave) === 1,
    agregado: r.date_added,
  };
}

function crearRepo(pool) {
  async function listar({ q = '', estado = 'todos', limite = 300 } = {}) {
    const donde = [];
    const params = [];
    const termino = String(q).trim();
    if (termino) {
      const soloRut = termino.replace(/[.\-\s]/g, '');
      const patronNombre = `%${escapeLike(termino)}%`;
      if (/^[0-9kK]+$/.test(soloRut)) {
        // Busca por el cuerpo del RUT. Si viene con digito verificador (guion o 9 digitos)
        // tambien se prueba sin el.
        const conDv = /-/.test(termino) || soloRut.length >= 9;
        const cuerpo = conDv ? soloRut.slice(0, -1) : soloRut;
        donde.push(
          "(p.rut LIKE ? OR p.rut LIKE ? OR CONCAT_WS(' ', p.nombre, p.apel_pat, p.apel_mat) LIKE ?)"
        );
        params.push(`${escapeLike(soloRut)}%`, `${escapeLike(cuerpo)}%`, patronNombre);
      } else {
        donde.push("CONCAT_WS(' ', p.nombre, p.apel_pat, p.apel_mat) LIKE ?");
        params.push(patronNombre);
      }
    }
    if (estado === 'activos') {
      donde.push('p.estado = ?');
      params.push(ESTADO_ACTIVO);
    } else if (estado === 'fuera') {
      donde.push('(p.estado IS NULL OR p.estado <> ?)');
      params.push(ESTADO_ACTIVO);
    }
    const sql =
      'SELECT p.id_personal, p.rut, p.dv, p.nombre, p.apel_pat, p.apel_mat, p.estamento, p.estado, ' +
      'e.nombre AS estado_nombre, p.date_added, (p.clave IS NOT NULL AND LENGTH(p.clave) > 0) AS tiene_clave ' +
      'FROM personalAux p LEFT JOIN conf_estados e ON e.id_estado = p.estado ' +
      (donde.length ? 'WHERE ' + donde.join(' AND ') + ' ' : '') +
      'ORDER BY p.id_personal DESC LIMIT ?';
    const [rows] = await pool.query(sql, [...params, Math.min(Number(limite) || 300, 500)]);
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM personalAux');
    const [[{ activos }]] = await pool.query(
      'SELECT COUNT(*) AS activos FROM personalAux WHERE estado = ?',
      [ESTADO_ACTIVO]
    );
    return { total: Number(total), activos: Number(activos), personas: rows.map(fila) };
  }

  async function agregar({ rut, nombre, apelPat, apelMat, profesion, clave }) {
    const parsed = parsearRut(String(rut ?? ''));
    if (!parsed) throw new ErrorNegocio(400, 'El RUT no es valido (revisa el digito verificador).');
    const n = limpiarNombre(nombre, 'Los nombres', { obligatorio: true });
    const ap = limpiarNombre(apelPat, 'El apellido paterno', { obligatorio: true });
    const am = limpiarNombre(apelMat, 'El apellido materno', { obligatorio: false });
    const errClave = validarClave(clave);
    if (errClave) throw new ErrorNegocio(400, errClave);
    let codigo = null;
    let estamento = null;
    if (profesion !== undefined && profesion !== null && profesion !== '') {
      const p = PROFESIONES.find((x) => x.codigo === Number(profesion));
      if (!p) throw new ErrorNegocio(400, 'La profesion o cargo no esta en el catalogo.');
      codigo = p.codigo;
      estamento = p.estamento;
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [existentes] = await conn.query(
        'SELECT id_personal, estado FROM personalAux WHERE rut = ? FOR UPDATE',
        [parsed.cuerpo]
      );
      if (existentes.length) {
        await conn.rollback();
        const activo = existentes[0].estado === ESTADO_ACTIVO;
        throw new ErrorNegocio(
          409,
          activo
            ? 'Ese RUT ya esta en el padron.'
            : 'Ese RUT ya existe en el padron pero esta fuera: usa «Volver a agregar».'
        );
      }
      const [res] = await conn.query(
        'INSERT INTO personalAux (rol, rut, dv, nombre, apel_pat, apel_mat, rrhh, profesion, estamento, clave, estado) ' +
          "VALUES ('USUARIO', ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)",
        [parsed.cuerpo, parsed.dv, n, ap, am, codigo, estamento, hashClave(clave), ESTADO_ACTIVO]
      );
      await conn.commit();
      return { id: res.insertId, rut: formatearRut(parsed.cuerpo, parsed.dv) };
    } catch (e) {
      try { await conn.rollback(); } catch (_) { /* ya cerrada */ }
      throw e;
    } finally {
      conn.release();
    }
  }

  async function sacar(id, estado) {
    const nuevo = estado === undefined || estado === null || estado === '' ? ESTADO_BAJA_POR_DEFECTO : Number(estado);
    if (!ESTADOS_BAJA[nuevo]) throw new ErrorNegocio(400, 'Motivo de baja no valido.');
    const [res] = await pool.query(
      'UPDATE personalAux SET estado = ? WHERE id_personal = ? AND estado = ?',
      [nuevo, Number(id), ESTADO_ACTIVO]
    );
    if (res.affectedRows === 0) throw new ErrorNegocio(409, 'La persona no existe o ya esta fuera del padron.');
    return { id: Number(id), estado: nuevo };
  }

  async function reactivar(id, clave) {
    let res;
    if (clave !== undefined && clave !== null && clave !== '') {
      const errClave = validarClave(clave);
      if (errClave) throw new ErrorNegocio(400, errClave);
      [res] = await pool.query(
        'UPDATE personalAux SET estado = ?, clave = ? WHERE id_personal = ? AND (estado IS NULL OR estado <> ?)',
        [ESTADO_ACTIVO, hashClave(clave), Number(id), ESTADO_ACTIVO]
      );
    } else {
      [res] = await pool.query(
        'UPDATE personalAux SET estado = ? WHERE id_personal = ? AND (estado IS NULL OR estado <> ?)',
        [ESTADO_ACTIVO, Number(id), ESTADO_ACTIVO]
      );
    }
    if (res.affectedRows === 0) throw new ErrorNegocio(409, 'La persona no existe o ya esta en el padron.');
    return { id: Number(id), estado: ESTADO_ACTIVO };
  }

  return { listar, agregar, sacar, reactivar };
}

module.exports = {
  crearRepo,
  ErrorNegocio,
  PROFESIONES,
  ESTADOS_BAJA,
  ESTADO_BAJA_POR_DEFECTO,
  ESTADO_ACTIVO,
};
