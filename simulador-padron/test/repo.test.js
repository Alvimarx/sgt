'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { crearRepo, ErrorNegocio } = require('../src/repo');

// Pool falso: registra el SQL y responde lo que se le configure.
function poolFalso({ existentes = [], afectadas = 1 } = {}) {
  const log = [];
  const conn = {
    beginTransaction: async () => log.push(['begin']),
    commit: async () => log.push(['commit']),
    rollback: async () => log.push(['rollback']),
    release: () => log.push(['release']),
    query: async (sql, params) => {
      log.push(['conn', sql, params]);
      if (/^SELECT/.test(sql)) return [existentes];
      return [{ insertId: 77, affectedRows: 1 }];
    },
  };
  return {
    log,
    getConnection: async () => conn,
    query: async (sql, params) => {
      log.push(['pool', sql, params]);
      if (/COUNT/.test(sql)) return [[{ total: 3, activos: 2 }]];
      if (/^UPDATE/.test(sql)) return [{ affectedRows: afectadas }];
      return [[]];
    },
  };
}

const datos = (extra = {}) => ({
  rut: '40.000.001-8', nombre: 'Persona', apelPat: 'Prueba', apelMat: 'Demo', profesion: '31',
  clave: crypto.randomBytes(9).toString('hex'), ...extra,
});

test('agregar inserta en personalAux con estado 1, DV y clave SHA-512 hex', async () => {
  const pool = poolFalso();
  const d = datos();
  const r = await crearRepo(pool).agregar(d);
  assert.deepEqual(r, { id: 77, rut: '40.000.001-8' });
  const ins = pool.log.find((l) => l[0] === 'conn' && /^INSERT INTO personalAux/.test(l[1]));
  assert.ok(ins);
  const p = ins[2];
  assert.deepEqual(p.slice(0, 5), ['40000001', '8', 'Persona', 'Prueba', 'Demo']);
  assert.equal(p[5], 31);
  assert.equal(p[6], 'Médico');
  assert.equal(p[7].length, 128);
  assert.equal(p[7].toString('ascii'), crypto.createHash('sha512').update(d.clave).digest('hex'));
  assert.equal(p[8], 1);
  assert.ok(pool.log.some((l) => l[0] === 'commit'));
});

test('agregar rechaza RUT con DV malo, nombres vacios y clave corta, sin abrir conexion', async () => {
  const pool = poolFalso();
  const repo = crearRepo(pool);
  await assert.rejects(repo.agregar(datos({ rut: '40.000.001-9' })), (e) => e.status === 400 && /RUT/.test(e.message));
  await assert.rejects(repo.agregar(datos({ nombre: '  ' })), (e) => e.status === 400);
  await assert.rejects(repo.agregar(datos({ clave: 'corta' })), (e) => e.status === 400);
  await assert.rejects(repo.agregar(datos({ nombre: 'Ñandú 😀' })), (e) => e.status === 400 && /latin1/.test(e.message));
  await assert.rejects(repo.agregar(datos({ profesion: '999' })), (e) => e.status === 400);
  assert.equal(pool.log.length, 0);
});

test('agregar rechaza un RUT que ya existe (activo o fuera) con 409', async () => {
  for (const [estado, texto] of [[1, /ya esta en el padron/], [6, /Volver a agregar/]]) {
    const pool = poolFalso({ existentes: [{ id_personal: 5, estado }] });
    await assert.rejects(crearRepo(pool).agregar(datos()), (e) => e.status === 409 && texto.test(e.message));
    assert.ok(pool.log.some((l) => l[0] === 'rollback'));
    assert.ok(!pool.log.some((l) => l[0] === 'conn' && /^INSERT/.test(l[1])));
    assert.ok(pool.log.some((l) => l[0] === 'release'));
  }
});

test('sacar marca la baja (estado 6 por defecto) solo si estaba activa', async () => {
  const pool = poolFalso();
  const r = await crearRepo(pool).sacar('12');
  assert.deepEqual(r, { id: 12, estado: 6 });
  const up = pool.log.find((l) => l[0] === 'pool' && /^UPDATE/.test(l[1]));
  assert.match(up[1], /SET estado = \? WHERE id_personal = \? AND estado = \?/);
  assert.deepEqual(up[2], [6, 12, 1]);
  await assert.rejects(crearRepo(poolFalso()).sacar('12', 1), (e) => e.status === 400); // 1 = activo no es una baja
  await assert.rejects(crearRepo(poolFalso({ afectadas: 0 })).sacar('12'), (e) => e instanceof ErrorNegocio && e.status === 409);
});

test('reactivar vuelve a estado 1, con o sin clave nueva, y nunca borra', async () => {
  let pool = poolFalso();
  await crearRepo(pool).reactivar('12');
  let up = pool.log.find((l) => l[0] === 'pool' && /^UPDATE/.test(l[1]));
  assert.doesNotMatch(up[1], /clave/);
  assert.deepEqual(up[2], [1, 12, 1]);
  pool = poolFalso();
  await crearRepo(pool).reactivar('12', crypto.randomBytes(9).toString('hex'));
  up = pool.log.find((l) => l[0] === 'pool' && /^UPDATE/.test(l[1]));
  assert.match(up[1], /clave = \?/);
  assert.equal(up[2][1].length, 128);
  assert.ok(!pool.log.some((l) => /DELETE/i.test(String(l[1]))));
  await assert.rejects(crearRepo(poolFalso({ afectadas: 0 })).reactivar('12'), (e) => e.status === 409);
});

test('listar busca por RUT o nombre con LIKE parametrizado y escapado', async () => {
  const pool = poolFalso();
  await crearRepo(pool).listar({ q: "40.000.001-8", estado: 'fuera' });
  const sel = pool.log.find((l) => l[0] === 'pool' && /FROM personalAux p LEFT JOIN/.test(l[1]));
  assert.match(sel[1], /p\.rut LIKE \?/);
  assert.match(sel[1], /p\.estado <> \?/);
  assert.ok(sel[2].includes('400000018%'));
  assert.ok(sel[2].includes('40000001%'));
  // un cuerpo de 8 digitos sin DV no se recorta (antes traia 3000000x al buscar 30000001)
  const pool3 = poolFalso();
  await crearRepo(pool3).listar({ q: '30000001' });
  const sel3 = pool3.log.find((l) => l[0] === 'pool' && /LEFT JOIN/.test(l[1]));
  assert.equal(sel3[2][0], '30000001%');
  assert.equal(sel3[2][1], '30000001%');
  const pool2 = poolFalso();
  await crearRepo(pool2).listar({ q: "o'%_" });
  const sel2 = pool2.log.find((l) => l[0] === 'pool' && /LEFT JOIN/.test(l[1]));
  assert.ok(sel2[2].includes("%o'\\%\\_%"));
  assert.doesNotMatch(sel2[1], /o'/); // el termino nunca va dentro del SQL
});
