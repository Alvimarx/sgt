'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const filas = $('#filas');
  const estado = { filtro: 'todos', q: '' };
  let temporizador = null;

  async function api(ruta, opciones = {}) {
    const r = await fetch(ruta, {
      ...opciones,
      headers: { 'Content-Type': 'application/json', ...(opciones.headers || {}) },
      body: opciones.body ? JSON.stringify(opciones.body) : undefined,
    });
    let datos = {};
    try { datos = await r.json(); } catch (_) { /* sin cuerpo */ }
    if (!r.ok) throw new Error(datos.error || `Error ${r.status}`);
    return datos;
  }

  function aviso(texto) {
    const el = $('#aviso');
    el.textContent = texto;
    el.hidden = false;
    clearTimeout(aviso.t);
    aviso.t = setTimeout(() => { el.hidden = true; }, 9000);
  }

  function celda(tr, texto, clase) {
    const td = document.createElement('td');
    td.textContent = texto ?? '';
    if (clase) td.className = clase;
    tr.appendChild(td);
    return td;
  }

  function boton(texto, clase, accion) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = texto;
    if (clase) b.className = clase;
    b.addEventListener('click', accion);
    return b;
  }

  function pintar(datos) {
    filas.replaceChildren();
    $('#resumen').textContent =
      `${datos.activos} en el padrón de ${datos.total} registros. ` +
      (datos.personas.length < datos.total && !estado.q && estado.filtro === 'todos'
        ? `Se muestran los ${datos.personas.length} más recientes; busca por RUT o nombre para ver otros.`
        : `Mostrando ${datos.personas.length}.`);
    if (!datos.personas.length) {
      const tr = document.createElement('tr');
      const td = celda(tr, 'Nadie coincide con la búsqueda.', 'vacio');
      td.colSpan = 5;
      filas.appendChild(tr);
      return;
    }
    for (const p of datos.personas) {
      const tr = document.createElement('tr');
      celda(tr, p.rut, 'rut');
      celda(tr, [p.nombre, p.apelPat, p.apelMat].filter(Boolean).join(' '), 'nombre');
      celda(tr, p.cargo || '');
      const tdEstado = document.createElement('td');
      const chip = document.createElement('span');
      chip.className = 'estado ' + (p.activo ? 'ok' : 'fuera');
      chip.textContent = p.activo ? 'En el padrón' : (p.estadoNombre || 'Fuera del padrón');
      tdEstado.appendChild(chip);
      tr.appendChild(tdEstado);
      const tdAcc = document.createElement('td');
      tdAcc.className = 'col-acc';
      if (p.activo) {
        tdAcc.appendChild(boton('Sacar del padrón', 'peligro', () => sacar(p)));
      } else {
        tdAcc.appendChild(boton('Volver a agregar', '', () => abrirAlta(p)));
      }
      tr.appendChild(tdAcc);
      filas.appendChild(tr);
    }
  }

  async function cargar() {
    try {
      const params = new URLSearchParams({ q: estado.q, estado: estado.filtro });
      pintar(await api('/api/personal?' + params));
    } catch (e) {
      aviso('No se pudo leer el padrón: ' + e.message);
    }
  }

  async function sacar(p) {
    const nombre = [p.nombre, p.apelPat].filter(Boolean).join(' ');
    if (!window.confirm(`¿Sacar a ${nombre} (${p.rut}) del padrón? Ya no podrá iniciar sesión en el SGT. Sus datos y turnos en el SGT no se tocan.`)) return;
    try {
      await api(`/api/personal/${p.id}/baja`, { method: 'POST', body: {} });
      aviso(`${nombre} salió del padrón: ya no puede iniciar sesión.`);
      cargar();
    } catch (e) { aviso(e.message); }
  }

  // --- Agregar ---
  const dlgAgregar = $('#dlg-agregar');
  const formAgregar = $('#form-agregar');
  const errAgregar = $('#error-agregar');

  async function cargarCatalogos() {
    try {
      const c = await api('/api/catalogos');
      const sel = formAgregar.elements.profesion;
      for (const p of c.profesiones) {
        const o = document.createElement('option');
        o.value = p.codigo;
        o.textContent = p.estamento;
        sel.appendChild(o);
      }
    } catch (_) { /* el formulario funciona sin el catálogo */ }
  }

  $('#abrir-agregar').addEventListener('click', () => {
    formAgregar.reset();
    errAgregar.hidden = true;
    dlgAgregar.showModal();
    formAgregar.elements.rut.focus();
  });
  $('#cancelar-agregar').addEventListener('click', () => dlgAgregar.close());
  $('#ver-clave').addEventListener('click', (ev) => {
    const campo = formAgregar.elements.clave;
    const visible = campo.type === 'text';
    campo.type = visible ? 'password' : 'text';
    ev.target.textContent = visible ? 'Mostrar' : 'Ocultar';
  });
  formAgregar.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    errAgregar.hidden = true;
    const f = formAgregar.elements;
    try {
      const r = await api('/api/personal', {
        method: 'POST',
        body: {
          rut: f.rut.value, nombre: f.nombre.value, apelPat: f.apelPat.value, apelMat: f.apelMat.value,
          profesion: f.profesion.value, clave: f.clave.value,
        },
      });
      dlgAgregar.close();
      formAgregar.reset();
      aviso(`Entró al padrón: ${r.rut}. En el SGT, «Asignación» → sumar por este RUT.`);
      estado.q = '';
      $('#buscar').value = '';
      cargar();
    } catch (e) {
      errAgregar.textContent = e.message;
      errAgregar.hidden = false;
    }
  });

  // --- Volver a agregar ---
  const dlgAlta = $('#dlg-alta');
  const formAlta = $('#form-alta');
  const errAlta = $('#error-alta');
  let personaAlta = null;

  function abrirAlta(p) {
    personaAlta = p;
    formAlta.reset();
    errAlta.hidden = true;
    $('#alta-quien').textContent = `${[p.nombre, p.apelPat, p.apelMat].filter(Boolean).join(' ')} (${p.rut})`;
    dlgAlta.showModal();
  }
  $('#cancelar-alta').addEventListener('click', () => dlgAlta.close());
  formAlta.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    errAlta.hidden = true;
    try {
      await api(`/api/personal/${personaAlta.id}/alta`, { method: 'POST', body: { clave: formAlta.elements.clave.value } });
      dlgAlta.close();
      aviso(`${personaAlta.rut} volvió al padrón: puede iniciar sesión otra vez.`);
      cargar();
    } catch (e) {
      errAlta.textContent = e.message;
      errAlta.hidden = false;
    }
  });

  // --- Búsqueda y filtros ---
  $('#buscar').addEventListener('input', (ev) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { estado.q = ev.target.value; cargar(); }, 250);
  });
  for (const b of document.querySelectorAll('.filtro')) {
    b.addEventListener('click', () => {
      estado.filtro = b.dataset.estado;
      document.querySelectorAll('.filtro').forEach((x) => x.classList.toggle('activo', x === b));
      cargar();
    });
  }

  cargarCatalogos();
  cargar();
})();
