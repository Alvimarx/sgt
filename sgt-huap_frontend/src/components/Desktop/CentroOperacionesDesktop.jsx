import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getTurnosServicio } from '../../services/funcionarioService';
import { solicitudesService, usuariosService, ofertasGeneralesService } from '../../services/adminService';
import { asignarTurnoLibre } from '../../services/turnosService';
import { useNotifications } from '../../context/NotificationContext';

// ---------------------------------------------------------------------------
// CENTRO DE OPERACIONES — vista desktop (R16, "Propuesta C" de Claude Design,
// la definitiva). Réplica fiel del mockup aprobado: sidebar azul con gradiente
// y navegación vertical, fila semanal donde el día seleccionado se EXPANDE
// inline (los demás quedan como tarjetas compactas), y debajo dos paneles:
// Solicitudes pendientes (grid de 2 columnas) y Ofertas generales.
//
// Dinámicos por diseño (no fijos como en el mockup estático):
//  - el resalte de HOY (#E8EEF4 / borde #B9CCDE, pill HOY) sigue la fecha real;
//  - el "verdecito": el punto y los colores de cobertura son VERDE #2E7D57
//    cuando el turno está completo y coral #E57F84/#B85A60 cuando faltan
//    cupos — derivan del estado real de cada turno;
//  - el día expandido parte en HOY y se mueve con el clic / botón Hoy.
// Los estilos inline vienen del mockup tal cual; los datos, de los servicios
// reales del sistema.
// ---------------------------------------------------------------------------

const EQ_COLORS = [
  ['oklch(0.94 0.04 250)', 'oklch(0.35 0.08 250)'],
  ['oklch(0.94 0.04 150)', 'oklch(0.35 0.08 150)'],
  ['oklch(0.94 0.04 30)',  'oklch(0.4 0.09 30)'],
  ['oklch(0.94 0.04 85)',  'oklch(0.38 0.08 85)'],
  ['oklch(0.94 0.04 300)', 'oklch(0.38 0.08 300)'],
  ['oklch(0.94 0.04 190)', 'oklch(0.35 0.08 190)'],
];
const eqColor = (idRotativa, nombreRotativa) => {
  let h = Number(idRotativa);
  if (!Number.isFinite(h)) {
    h = 0;
    const s = String(nombreRotativa || '');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return EQ_COLORS[Math.abs(h) % EQ_COLORS.length];
};

const AV_COLORS = {
  coord: ['#E9D9C2', '#6E4E1F'],
  urg:   ['#D5E3EE', '#2B4E6B'],
  med:   ['#E8E2EE', '#4E3A6F'],
};
const bucketPuesto = (nombrePuesto) => {
  const p = String(nombrePuesto || '').toLowerCase();
  if (p.includes('coordina')) return 'coord';
  if (p.includes('urgenci')) return 'urg';
  return 'med';
};

const TIPO_SOL = {
  1: { l: 'Permiso',           c: '#94B8E0' },
  2: { l: 'Botar turno',       c: '#D4888D' },
  3: { l: 'Cobertura',         c: '#88C4A8' },
  4: { l: 'Intercambio',       c: '#B89FD8' },
  5: { l: 'Oferta particular', c: '#E0B87A' },
};
const BADGE = {
  warn:    ['#FDF5E2', '#C88700'],
  success: ['#E4F1EB', '#2E7D57'],
  accent:  ['#FBEEEF', '#B85A60'],
  neutral: ['#EFF2F7', '#3B4A5F'],
  primary: ['#E8EEF4', '#17416C'],
};

const DOW_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DOW_LARGO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Fechas como YYYY-MM-DD en hora local (nada de toISOString: cruza a UTC y
// desfasa el día en Chile — misma disciplina que la agenda móvil).
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const parseISO = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d);
};
const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const lunesDe = (iso) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};

const iniciales = (nombre) => {
  const partes = String(nombre || '').trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase() || '·';
};
const apellidoCorto = (nombre) => {
  const partes = String(nombre || '').trim().split(/\s+/);
  return partes[1] || partes[0] || '—';
};
const fmtHora = (h) => String(h || '').substring(0, 5);
const fmtFechaCorta = (iso) => {
  if (!iso) return '—';
  const d = parseISO(iso);
  return `${d.getDate()} ${MES_CORTO[d.getMonth()]}`;
};
// Las solicitudes traen funcionarios con apelPat/apelMat; usuariosService.getAll
// usa apellidoPaterno/apellidoMaterno. Se aceptan ambas convenciones.
const nombreCompletoDe = (f) =>
  [f?.nombre, f?.apelPat ?? f?.apellidoPaterno, f?.apelMat ?? f?.apellidoMaterno].filter(Boolean).join(' ');

const personaVM = (nombre, opts = {}) => {
  const yo = Boolean(opts.yo);
  const [bg, ink] = yo ? ['#17416C', '#fff'] : AV_COLORS[bucketPuesto(opts.puesto)] || AV_COLORS.med;
  return { n: nombre || 'Sin asignar', i: iniciales(nombre), ap: apellidoCorto(nombre), yo, bg, ink };
};

const etiquetaPuesto = (nombrePuesto) => {
  const b = bucketPuesto(nombrePuesto);
  if (b === 'coord') return 'Coordinación';
  if (b === 'urg') return 'Urgenciólogo';
  return nombrePuesto || 'Médico';
};

const turnoTxtDe = (t) => {
  if (!t) return '—';
  const d = parseISO(String(t.diaInicioTurno));
  const dow = DOW_CORTO[(d.getDay() + 6) % 7];
  const esDia = String(t.diaInicioTurno) === String(t.diaFinalTurno);
  return `${dow} ${d.getDate()} ${MES_CORTO[d.getMonth()]} · ${esDia ? 'Día' : 'Noche'} ${fmtHora(t.horaInicio)}–${fmtHora(t.horaFin)}${t.rotativa?.nombre ? ` · ${t.rotativa.nombre}` : ''}`;
};

const IconSol = ({ size = 12, color = 'currentColor', width = 2.2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M5 5l1.5 1.5M17.5 17.5L19 19M2 12h2M20 12h2M5 19l1.5-1.5M17.5 6.5L19 5" />
  </svg>
);
const IconLuna = ({ size = 11, color = 'currentColor', width = 2.2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);
const Chevron = ({ dir }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d={dir === 'izq' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
  </svg>
);
const IconCheck = ({ size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
const NAV_ICONS = {
  inicio: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  centro: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  solicitudes: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4M3 8l4-4 4 4M17 8v12M13 16l4 4 4-4" /></svg>,
  personal: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  planificacion: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
  estadisticas: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V14M4 10V3M12 21V12M12 8V3M20 21V16M20 12V3M1 14h6M9 8h6M17 16h6" /></svg>,
  bitacora: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" /></svg>,
};
const IconFlechas = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C88700" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 16V4M3 8l4-4 4 4M17 8v12M13 16l4 4 4-4" />
  </svg>
);
const IconMano = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E0A040" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </svg>
);

const CentroOperacionesDesktop = ({ user, onNavigate, onLogout, onSwitchService, onOpenSolicitudes }) => {
  const servicioId = user?.servicioId;
  const myUserId = (() => {
    const raw = Number(user?.id ?? user?.userId);
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  })();
  const canDecide = user?.rol === 'JEFATURA' || user?.rol === 'SUBROGANTE';
  const canAssign = canDecide || ['ADMIN', 'ADMINISTRADOR'].includes(String(user?.rolSistema || '').toUpperCase());
  const servicioNombre = localStorage.getItem('sgt_servicio_activo_nombre') || 'Servicio';
  const { unreadCount } = useNotifications();

  const hoy = hoyISO();
  const [agenda, setAgenda] = useState({ turnos: [] });
  const [sols, setSols] = useState([]);
  const [ofertas, setOfertas] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selDay, setSelDay] = useState(hoy);
  const [asignFor, setAsignFor] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const toastTimer = useRef(null);

  const toast = useCallback((msg) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2800);
  }, []);
  const recargar = () => setRefreshTick((v) => v + 1);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    const cargas = [
      getTurnosServicio(servicioId, myUserId)
        .then((r) => { if (vivo) setAgenda({ turnos: (r?.success ? r?.data?.turnos : null) || [] }); })
        .catch(() => { if (vivo) setAgenda({ turnos: [] }); }),
      ofertasGeneralesService.getByServicio(servicioId)
        .then((r) => { if (vivo) setOfertas(Array.isArray(r) ? r : []); })
        .catch(() => { if (vivo) setOfertas([]); }),
    ];
    if (canDecide) {
      cargas.push(solicitudesService.getAll()
        .then((r) => {
          if (!vivo) return;
          const todas = Array.isArray(r) ? r : [];
          setSols(todas.filter((s) => !s.turno || String(s.turno.servicio?.idServicio) === String(servicioId)));
        })
        .catch(() => { if (vivo) setSols([]); }));
    } else {
      cargas.push(Promise.all([
        solicitudesService.getByFuncionario(myUserId).catch(() => []),
        solicitudesService.getByReceptor(myUserId).catch(() => []),
      ]).then(([mias, recibidas]) => {
        if (!vivo) return;
        const vistas = new Set();
        setSols([...(Array.isArray(mias) ? mias : []), ...(Array.isArray(recibidas) ? recibidas : [])]
          .filter((s) => (vistas.has(s.idSolicitud) ? false : (vistas.add(s.idSolicitud), true))));
      }));
    }
    if (canAssign) {
      cargas.push(usuariosService.getAll(servicioId)
        .then((r) => { if (vivo) setFuncionarios(Array.isArray(r) ? r : []); })
        .catch(() => { if (vivo) setFuncionarios([]); }));
    }
    Promise.all(cargas).finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [servicioId, myUserId, canDecide, canAssign, refreshTick]);

  // ── Semana visible; el día expandido parte en HOY y sigue a la navegación ──
  const diasSemana = useMemo(() => {
    const lunes = lunesDe(hoy);
    lunes.setDate(lunes.getDate() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes);
      d.setDate(d.getDate() + i);
      return toISO(d);
    });
  }, [hoy, weekOffset]);

  useEffect(() => {
    // Al cambiar de semana, expandir HOY si cae en ella; si no, el lunes.
    setAsignFor(null);
    setSelDay(diasSemana.includes(hoy) ? hoy : diasSemana[0]);
  }, [diasSemana, hoy]);

  const gruposPorCelda = useMemo(() => {
    const mapa = new Map();
    (agenda.turnos || []).forEach((t) => {
      if (!t?.fecha || !t?.tipo) return;
      const clave = `${t.fecha}|${t.tipo}`;
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave).push(t);
    });
    return mapa;
  }, [agenda.turnos]);

  const solsPendientes = useMemo(() => sols.filter((s) => s.estado === 'PENDIENTE'), [sols]);
  const idsTurnoConSolicitud = useMemo(() => {
    const m = new Map();
    solsPendientes.forEach((s) => {
      [s.turno?.idTurno, s.turnoReceptor?.idTurno].filter((x) => x != null).forEach((id) => {
        m.set(String(id), (m.get(String(id)) || 0) + 1);
      });
    });
    return m;
  }, [solsPendientes]);

  // ── Acciones ──────────────────────────────────────────────────────────────
  const aprobar = async (id) => {
    try { await solicitudesService.updateEstado(id, 'APROBADA', myUserId); toast('Solicitud aprobada.'); recargar(); }
    catch (e) { toast(e?.message || 'No se pudo aprobar la solicitud.'); }
  };
  const rechazar = async (id) => {
    try { await solicitudesService.updateEstado(id, 'RECHAZADA', myUserId); toast('Solicitud rechazada.'); recargar(); }
    catch (e) { toast(e?.message || 'No se pudo rechazar la solicitud.'); }
  };
  const elegir = async (solId, nombre) => {
    setConfirm(null);
    try {
      await solicitudesService.updateEstado(solId, 'APROBADA', myUserId);
      toast(`Cupo asignado a ${nombre}. Las demás postulaciones fueron rechazadas.`);
      recargar();
    } catch (e) { toast(e?.message || 'No se pudo asignar el cupo.'); }
  };
  const responder = async (id, tipo, ok) => {
    try {
      if (tipo === 4) await solicitudesService.responderIntercambio(id, myUserId, ok);
      else await solicitudesService.responderOfertaParticular(id, myUserId, ok);
      toast(ok ? 'Aceptaste — queda pendiente de jefatura.' : 'Rechazada.');
      recargar();
    } catch (e) { toast(e?.message || 'No se pudo responder.'); }
  };
  const ofAprobar = async (id) => {
    try { await ofertasGeneralesService.aprobar(id, myUserId); toast('Oferta abierta al servicio.'); recargar(); }
    catch (e) { toast(e?.message || 'No se pudo abrir la oferta.'); }
  };
  const ofRechazar = async (id) => {
    try { await ofertasGeneralesService.rechazar(id, myUserId); toast('Oferta rechazada.'); recargar(); }
    catch (e) { toast(e?.message || 'No se pudo rechazar la oferta.'); }
  };
  const ofSeleccionar = async (idOferta, idPostulacion, nombre) => {
    setConfirm(null);
    try {
      await ofertasGeneralesService.seleccionar(idOferta, idPostulacion, myUserId);
      toast(`Turno reasignado a ${nombre}.`);
      recargar();
    } catch (e) { toast(e?.message || 'No se pudo seleccionar al postulante.'); }
  };
  const asignarCupo = async (turnoLibre, candidato) => {
    // asignarTurnoLibre no lanza: devuelve { success, error } — hay que chequear.
    const r = await asignarTurnoLibre({
      idTurno: turnoLibre.id,
      idNuevoMedico: Number(candidato.idFuncionario),
      idAdministrador: myUserId,
      motivo: 'Asignación desde el centro de turnos',
    });
    if (!r?.success) { toast(r?.error || 'No se pudo asignar el cupo.'); return; }
    setAsignFor(null);
    toast(`Cupo asignado a ${nombreCompletoDe(candidato)}.`);
    recargar();
  };

  // ── VM del panel expandido de un turno (día o noche) ──────────────────────
  const shiftVM = useCallback((fechaISO, tipo) => {
    const clave = `${fechaISO}|${tipo}`;
    const turnos = gruposPorCelda.get(clave) || [];
    if (turnos.length === 0) return null;
    const total = turnos.length;
    const asignados = turnos.filter((t) => t.idFuncionario != null).length;
    const full = asignados === total;
    const rep = turnos.find((t) => t.miTurno) || turnos[0];
    const nombreRotativa = rep.teamGroup?.nombreRotativa || rep.nombreRotativa || null;
    const [eqBg, eqInk] = eqColor(rep.idRotativa, nombreRotativa);

    const orden = { coord: 0, urg: 1, med: 2 };
    const people = turnos
      .filter((t) => t.idFuncionario != null)
      .sort((a, b) => (orden[bucketPuesto(a.nombrePuesto)] ?? 3) - (orden[bucketPuesto(b.nombrePuesto)] ?? 3))
      .map((t) => ({
        ...personaVM(t.nombreFuncionario, { puesto: t.nombrePuesto, yo: t.miTurno }),
        key: t.id,
        puesto: etiquetaPuesto(t.nombrePuesto),
      }));

    const ocupadosDia = new Set();
    ['dia', 'noche'].forEach((t2) => (gruposPorCelda.get(`${fechaISO}|${t2}`) || []).forEach((t) => {
      if (t.idFuncionario != null) ocupadosDia.add(String(t.idFuncionario));
    }));

    const libres = turnos.filter((t) => t.idFuncionario == null).map((t) => {
      const assigning = asignFor === `${clave}:${t.id}`;
      return {
        key: t.id, puesto: t.nombrePuesto || 'Sin puesto',
        idle: !assigning, assigning,
        yaSolicitada: Boolean(t.solicitudPendiente),
        cands: assigning
          ? funcionarios
              .filter((f) => !ocupadosDia.has(String(f.idFuncionario)))
              .slice(0, 6)
              .map((f) => ({
                ...personaVM(nombreCompletoDe(f), {}),
                key: f.idFuncionario,
                onPick: () => asignarCupo(t, f),
              }))
          : [],
        onAsignar: canAssign
          ? () => setAsignFor(`${clave}:${t.id}`)
          : () => onOpenSolicitudes?.({ tipoSolicitudId: 3, idTurno: t.id, turnoLabel: `${fechaISO} ${fmtHora(t.inicio)}–${fmtHora(t.fin)}` }),
        onCancel: () => setAsignFor(null),
      };
    });

    return {
      rot: nombreRotativa || 'Sin rotativa', eqBg, eqInk,
      horario: `${fmtHora(rep.inicio)}–${fmtHora(rep.fin)}`,
      cob: `${asignados}/${total}`, cobInk: full ? '#2E7D57' : '#B85A60',
      pct: `${Math.round((asignados / total) * 100)}%`, barBg: full ? '#2E7D57' : '#E57F84',
      people, libres,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruposPorCelda, asignFor, funcionarios, canAssign, onOpenSolicitudes]);

  // ── VM de los 7 días (compactos + expandido) ──────────────────────────────
  const days = useMemo(() => diasSemana.map((iso) => {
    const d = parseISO(iso);
    const esHoy = iso === hoy;
    const finde = d.getDay() === 0 || d.getDay() === 6;
    const expanded = selDay === iso;

    const mini = (tipo) => {
      const turnos = gruposPorCelda.get(`${iso}|${tipo}`) || [];
      if (turnos.length === 0) return null;
      const total = turnos.length;
      const asignados = turnos.filter((t) => t.idFuncionario != null).length;
      const rep = turnos.find((t) => t.miTurno) || turnos[0];
      const nombreRotativa = rep.teamGroup?.nombreRotativa || rep.nombreRotativa || null;
      const [eqBg, eqInk] = eqColor(rep.idRotativa, nombreRotativa);
      const full = asignados === total;
      return {
        rot: nombreRotativa || '—', eqBg, eqInk,
        cob: `${asignados}/${total}`,
        ink: full ? '#2E7D57' : '#B85A60',
        dot: full ? '#2E7D57' : '#E57F84',
        pend: turnos.reduce((acc, t) => acc + (idsTurnoConSolicitud.get(String(t.id)) || 0), 0),
      };
    };
    const md = mini('dia');
    const mn = mini('noche');
    const pend = (md?.pend || 0) + (mn?.pend || 0);

    return {
      k: iso,
      dow: DOW_CORTO[(d.getDay() + 6) % 7],
      dowFull: DOW_LARGO[(d.getDay() + 6) % 7],
      num: d.getDate(),
      mes: d.getMonth(),
      hoy: esHoy, expanded, compact: !expanded,
      bg: esHoy ? '#E8EEF4' : '#fff',
      border: esHoy ? '#B9CCDE' : '#E5EAF1',
      dateInk: esHoy ? '#17416C' : finde ? '#7486A0' : '#3B4A5F',
      dia: md, noche: mn,
      pendTxt: pend ? `${pend} sol.` : false,
      aria: `Expandir ${DOW_LARGO[(d.getDay() + 6) % 7]} ${d.getDate()}`,
      onSelect: () => { setSelDay(iso); setAsignFor(null); },
      diaVM: expanded ? shiftVM(iso, 'dia') : null,
      nocheVM: expanded ? shiftVM(iso, 'noche') : null,
    };
  }), [diasSemana, hoy, selDay, gruposPorCelda, idsTurnoConSolicitud, shiftVM]);

  const { asigT, totT, libresT } = useMemo(() => {
    let a = 0, t = 0;
    diasSemana.forEach((iso) => ['dia', 'noche'].forEach((tipo) => {
      const turnos = gruposPorCelda.get(`${iso}|${tipo}`) || [];
      t += turnos.length;
      a += turnos.filter((x) => x.idFuncionario != null).length;
    }));
    return { asigT: a, totT: t, libresT: t - a };
  }, [diasSemana, gruposPorCelda]);

  const nSol = solsPendientes.length;
  const nDisp = ofertas.filter((o) => o.estado !== 'CERRADA').length;

  const tituloSemana = useMemo(() => {
    const ini = parseISO(diasSemana[0]);
    const fin = parseISO(diasSemana[6]);
    if (ini.getMonth() === fin.getMonth()) {
      return `Semana ${ini.getDate()}–${fin.getDate()} ${MES_CORTO[ini.getMonth()]}`;
    }
    return `Semana ${ini.getDate()} ${MES_CORTO[ini.getMonth()]} – ${fin.getDate()} ${MES_CORTO[fin.getMonth()]}`;
  }, [diasSemana]);
  const hoyD = parseISO(hoy);
  const subFecha = `${DOW_LARGO[(hoyD.getDay() + 6) % 7]} ${hoyD.getDate()} de ${MES_LARGO[hoyD.getMonth()]} de ${hoyD.getFullYear()}`;

  // ── VM de solicitudes (agrupación R10 incluida) ───────────────────────────
  const solsVM = useMemo(() => {
    const porTurno = new Map();
    solsPendientes
      .filter((s) => s.tipoSolicitud?.tipo === 3 && s.turno?.idTurno != null)
      .forEach((s) => {
        const k = String(s.turno.idTurno);
        if (!porTurno.has(k)) porTurno.set(k, []);
        porTurno.get(k).push(s);
      });
    const grupos = canDecide ? Array.from(porTurno.values()).filter((g) => g.length >= 2) : [];
    const agrupadas = new Set(grupos.flat().map((s) => s.idSolicitud));

    const items = [];
    grupos.forEach((g) => {
      const s0 = g[0];
      items.push({
        id: `grupo-${s0.turno.idTurno}`,
        tipoL: 'Cobertura', c: TIPO_SOL[3].c,
        fecha: fmtFechaCorta(String(s0.fechaCreacion || '').slice(0, 10)),
        badge: 'Pendiente', badgeBg: BADGE.warn[0], badgeInk: BADGE.warn[1],
        rows: [{ l: 'Turno a cubrir', v: turnoTxtDe(s0.turno) }],
        motivo: false, isGroup: true, nPost: g.length,
        postu: [...g]
          .sort((a, b) => new Date(a.fechaCreacion) - new Date(b.fechaCreacion))
          .map((s) => {
            const confirming = confirm?.t === 'elegir' && confirm.id === s.idSolicitud;
            return {
              ...personaVM(nombreCompletoDe(s.funcionario), {}),
              key: s.idSolicitud, idle: !confirming, confirming,
              onElegir: () => setConfirm({ t: 'elegir', id: s.idSolicitud }),
              onYes: () => elegir(s.idSolicitud, nombreCompletoDe(s.funcionario)),
              onNo: () => setConfirm(null),
            };
          }),
        waitNote: false, segNote: false, canDecide: false, canRespond: false,
      });
    });

    solsPendientes
      .filter((s) => !agrupadas.has(s.idSolicitud))
      .forEach((s) => {
        const tipo = s.tipoSolicitud?.tipo;
        const T = TIPO_SOL[tipo] || { l: 'Solicitud', c: '#94B8E0' };
        const esBifasico = tipo === 4 || tipo === 5;
        const esMiReceptor = String(s.funcionarioReceptor?.idFuncionario) === String(myUserId);
        const esMia = String(s.funcionario?.idFuncionario) === String(myUserId);
        const esperandoReceptor = esBifasico && s.aceptadoReceptor == null && !esMiReceptor;
        const receptorAcepto = esBifasico && s.aceptadoReceptor === true;

        const rows = [{ l: 'Solicitante', v: nombreCompletoDe(s.funcionario) + (esMia ? ' (tú)' : '') }];
        if (tipo === 2) rows.push({ l: 'Turno a liberar', v: turnoTxtDe(s.turno) });
        if (tipo === 3) rows.push({ l: 'Turno a cubrir', v: turnoTxtDe(s.turno) });
        if (tipo === 1) rows.push({ l: 'Período', v: `${fmtFechaCorta(String(s.fechaInicioPermiso || '').slice(0, 10))} – ${fmtFechaCorta(String(s.fechaTerminoPermiso || '').slice(0, 10))}` });
        if (tipo === 4) {
          rows.push({ l: 'Entrega', v: turnoTxtDe(s.turnoReceptor) });
          rows.push({ l: 'Recibe', v: `${turnoTxtDe(s.turno)} (${apellidoCorto(nombreCompletoDe(s.funcionarioReceptor))})` });
        }
        if (tipo === 5) {
          rows.push({ l: 'Receptor', v: nombreCompletoDe(s.funcionarioReceptor) + (esMiReceptor ? ' (tú)' : '') });
          rows.push({ l: 'Turno ofrecido', v: turnoTxtDe(s.turno) });
        }

        let badge = 'Pendiente', tone = 'warn';
        if (tipo === 4 && receptorAcepto) badge = 'Receptor aceptó';
        if (esperandoReceptor) { badge = 'Esperando receptor'; tone = 'neutral'; }
        if (esMiReceptor && esBifasico && s.aceptadoReceptor == null) badge = 'Requiere tu respuesta';
        if (esMiReceptor && receptorAcepto) { badge = 'Pend. otra jefatura'; tone = 'neutral'; }
        const [badgeBg, badgeInk] = BADGE[tone];

        const participo = esMia || esMiReceptor;
        items.push({
          id: s.idSolicitud, tipoL: T.l, c: T.c,
          fecha: fmtFechaCorta(String(s.fechaCreacion || '').slice(0, 10)),
          badge, badgeBg, badgeInk, rows,
          motivo: s.motivo || false, isGroup: false, nPost: 0, postu: [],
          waitNote: canDecide && esperandoReceptor
            ? `Esperando respuesta de ${nombreCompletoDe(s.funcionarioReceptor)} — aún no puedes decidirla.` : false,
          segNote: canDecide && participo
            ? 'Participas en esta solicitud: por segregación de funciones, la decisión corresponde a otra jefatura.' : false,
          canDecide: canDecide && !esperandoReceptor && !participo,
          canRespond: esMiReceptor && esBifasico && s.aceptadoReceptor == null,
          onAprobar: () => aprobar(s.idSolicitud),
          onRechazar: () => rechazar(s.idSolicitud),
          onAceptar: () => responder(s.idSolicitud, tipo, true),
          onRechazarRec: () => responder(s.idSolicitud, tipo, false),
        });
      });
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solsPendientes, confirm, canDecide, myUserId]);

  // ── VM de ofertas generales ───────────────────────────────────────────────
  const ofertasVM = useMemo(() => {
    const map = {
      ABIERTA: ['Abierta', 'success'],
      PENDIENTE_APROBACION: ['Pend. apertura', 'warn'],
      CERRADA: ['Cerrada', 'neutral'],
    };
    return ofertas
      .filter((o) => o.estado !== 'CERRADA' || o.postulaciones?.some((p) => p.seleccionado))
      .map((o) => {
        const [badge, tone] = map[o.estado] || ['—', 'neutral'];
        const [badgeBg, badgeInk] = BADGE[tone];
        const op = personaVM(nombreCompletoDe(o.ofertor), {});
        const postul = o.postulaciones || [];
        const seleccionado = postul.find((p) => p.seleccionado);
        return {
          id: o.idOfertaGeneral,
          fecha: fmtFechaCorta(String(o.fechaCreacion || '').slice(0, 10)),
          badge, badgeBg, badgeInk,
          ofertor: op.n, ofertorAp: op.ap, avI: op.i, avBg: op.bg, avInk: op.ink,
          turno: turnoTxtDe(o.turno), motivo: o.motivo || '—',
          closedTo: o.estado === 'CERRADA' && seleccionado ? nombreCompletoDe(seleccionado.postulante) : false,
          canOpen: canDecide && o.estado === 'PENDIENTE_APROBACION',
          showPost: o.estado === 'ABIERTA',
          sinPost: o.estado === 'ABIERTA' && postul.length === 0,
          nPost: postul.length,
          postu: postul.map((p) => {
            const confirming = confirm?.t === 'oferta' && confirm.id === o.idOfertaGeneral && confirm.p === p.idPostulacion;
            return {
              ...personaVM(nombreCompletoDe(p.postulante), {}),
              key: p.idPostulacion, idle: !confirming, confirming,
              onSel: canDecide ? () => setConfirm({ t: 'oferta', id: o.idOfertaGeneral, p: p.idPostulacion }) : null,
              onYes: () => ofSeleccionar(o.idOfertaGeneral, p.idPostulacion, nombreCompletoDe(p.postulante)),
              onNo: () => setConfirm(null),
            };
          }),
          onAprobar: () => ofAprobar(o.idOfertaGeneral),
          onRechazar: () => ofRechazar(o.idOfertaGeneral),
        };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ofertas, confirm, canDecide]);

  // ── Sub-renders ───────────────────────────────────────────────────────────
  const itemNav = (icono, label, dest, activo = false, badge = null) => (
    <a
      key={label}
      href="#"
      onClick={(e) => { e.preventDefault(); if (dest) onNavigate?.(dest); }}
      className={activo ? '' : 'sgt-nav-item'}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 9,
        color: activo ? '#fff' : 'rgba(255,255,255,0.68)',
        fontSize: '12.5px', fontWeight: activo ? 800 : 700,
        background: activo ? 'rgba(255,255,255,0.15)' : 'transparent',
        boxShadow: activo ? 'inset 3px 0 0 #E57F84' : 'none',
      }}
    >
      {icono}{label}
      {badge != null && badge > 0 && (
        <span style={{ marginLeft: 'auto', background: '#E57F84', color: '#fff', fontSize: '10px', fontWeight: 800, borderRadius: 99, padding: '1px 7px' }}>{badge}</span>
      )}
    </a>
  );

  const panelTurno = (vm, esDia) => {
    const borde = esDia ? '#DCEBE2' : '#F3DCDE';
    const headBg = esDia ? '#F0F7F2' : '#FBF1F2';
    const headInk = esDia ? '#2E7D57' : '#B85A60';
    return (
      <div style={{ border: `1px solid ${borde}`, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: headBg, padding: '8px 11px', display: 'flex', alignItems: 'center', gap: 7 }}>
          {esDia ? <IconSol size={13} color={headInk} /> : <IconLuna size={12} color={headInk} />}
          <span style={{ fontSize: '10.5px', fontWeight: 800, color: headInk, letterSpacing: '0.3px' }}>
            {esDia ? 'DÍA' : 'NOCHE'} · {vm ? vm.horario : esDia ? '08:00–20:00' : '20:00–08:00'}
          </span>
          {vm && <span style={{ background: vm.eqBg, color: vm.eqInk, fontSize: '10px', fontWeight: 800, borderRadius: 6, padding: '2px 7px' }}>{vm.rot}</span>}
          {vm && <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 800, color: vm.cobInk }}>{vm.cob}</span>}
        </div>
        <div style={{ padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
          {!vm && <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#7486A0', textAlign: 'center', padding: '10px 0' }}>Sin turnos.</div>}
          {vm && (
            <>
              <div style={{ height: '3.5px', borderRadius: 99, background: '#EFF2F7', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: vm.barBg, width: vm.pct, transition: 'width .3s ease' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {vm.people.map((p) => (
                  <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F7F9FC', borderRadius: 7, padding: '4px 6px', minWidth: 0 }} title={p.n}>
                    <span style={{ width: 18, height: 18, borderRadius: 99, background: p.bg, color: p.ink, display: 'inline-grid', placeItems: 'center', fontSize: '7px', fontWeight: 800, flexShrink: 0 }}>{p.i}</span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: 'block', fontSize: '10px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.ap}</span>
                      <span style={{ display: 'block', fontSize: '8px', fontWeight: 700, color: '#7486A0', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{p.puesto}</span>
                    </span>
                  </div>
                ))}
                {vm.libres.filter((l) => l.idle).map((l) => (
                  <button key={l.key} onClick={l.onAsignar} className="sgt-libre" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FBEEEF', border: '1.5px dashed #E57F84', borderRadius: 7, padding: '4px 6px', cursor: 'pointer', minWidth: 0 }}>
                    <span style={{ width: 18, height: 18, borderRadius: 99, border: '1.5px dashed #E57F84', color: '#B85A60', display: 'inline-grid', placeItems: 'center', fontSize: '10px', fontWeight: 800, flexShrink: 0 }}>+</span>
                    <span style={{ minWidth: 0, textAlign: 'left' }}>
                      <span style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: '#8C3F44' }}>
                        {canAssign ? 'Asignar' : l.yaSolicitada ? 'Solicitado' : 'Solicitar'}
                      </span>
                      <span style={{ display: 'block', fontSize: '8px', fontWeight: 700, color: '#B85A60', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{l.puesto} libre</span>
                    </span>
                  </button>
                ))}
              </div>
              {vm.libres.filter((l) => l.assigning).map((l) => (
                <div key={l.key} style={{ border: '1.5px dashed #E57F84', background: '#FBEEEF', borderRadius: 9, padding: '8px 9px', animation: 'sgtUp .18s ease' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#8C3F44', marginBottom: 6 }}>Asignar cupo · {l.puesto}</div>
                  {l.cands.length === 0 && (
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#8C3F44', marginBottom: 4 }}>Sin candidatos disponibles ese día.</div>
                  )}
                  {l.cands.map((c) => (
                    <button key={c.key} onClick={c.onPick} className="sgt-cand" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 7, background: '#fff', border: '1px solid #E5EAF1', borderRadius: 8, padding: '5px 8px', marginBottom: 4, cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ width: 20, height: 20, borderRadius: 99, background: c.bg, color: c.ink, display: 'inline-grid', placeItems: 'center', fontSize: '7.5px', fontWeight: 800 }}>{c.i}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: '10.5px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.n}</span>
                      <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#17416C' }}>Asignar</span>
                    </button>
                  ))}
                  <button onClick={l.onCancel} style={{ width: '100%', background: 'transparent', border: 'none', color: '#7486A0', fontSize: '10px', fontWeight: 700, cursor: 'pointer', padding: '3px 0' }}>Cancelar</button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F2F5F9', color: '#0F1B2D', fontFamily: "'Raleway', system-ui, sans-serif" }}>
      <style>{`
        @keyframes sgtFade{from{opacity:0}to{opacity:1}}
        @keyframes sgtUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes sgtToast{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
        .sgt-nav-item:hover{background:rgba(255,255,255,0.08)!important;color:#fff!important}
        .sgt-day-compact:hover{box-shadow:0 8px 20px rgba(15,27,45,0.1);border-color:#17416C!important}
        .sgt-libre:hover{background:#F8E2E4!important}
        .sgt-cand:hover{border-color:#17416C!important}
      `}</style>

      {/* Sidebar */}
      <aside style={{ width: 218, flexShrink: 0, background: 'linear-gradient(172deg,#17416C 0%,oklch(0.32 0.062 220) 62%,oklch(0.36 0.075 200) 100%)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '20px 18px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,0.14)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 900, fontSize: '13px' }}>S</div>
          <div>
            <div style={{ color: '#fff', fontSize: '14px', fontWeight: 800, letterSpacing: '0.3px' }}>SGT · HUAP</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{servicioNombre}</div>
          </div>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 10px', flex: 1 }}>
          {itemNav(NAV_ICONS.inicio, 'Inicio', 'inicio')}
          {itemNav(NAV_ICONS.centro, 'Centro de turnos', null, true)}
          {itemNav(NAV_ICONS.solicitudes, 'Solicitudes', 'solicitudes', false, nSol || unreadCount)}
          {canAssign && itemNav(NAV_ICONS.personal, 'Personal', 'personal')}
          {itemNav(NAV_ICONS.planificacion, 'Planificación', 'planificacion')}
          {canAssign && itemNav(NAV_ICONS.estadisticas, 'Estadísticas', 'estadisticas')}
          {canAssign && itemNav(NAV_ICONS.bitacora, 'Bitácora', 'bitacora')}
        </nav>
        <div style={{ margin: 10, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 99, background: '#fff', color: '#17416C', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '12px' }}>{iniciales(user?.nombre)}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: '12.5px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.nombre || 'Usuario'}</div>
              {user?.rutCompleto && <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10.5px', fontWeight: 600 }}>{user.rutCompleto}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 9 }}>
            <span style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', borderRadius: 99, padding: '3px 8px' }}>{(user?.rol || '').toLowerCase()}</span>
            <a href="#" onClick={(e) => { e.preventDefault(); onSwitchService?.(); }} style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.6)', fontSize: '10.5px', fontWeight: 700 }}>Cambiar servicio</a>
          </div>
          <button onClick={onLogout} style={{ marginTop: 8, width: '100%', background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, color: 'rgba(255,255,255,0.85)', fontSize: '10.5px', fontWeight: 800, padding: '6px 0', cursor: 'pointer' }}>Cerrar sesión</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '16px 22px 18px', gap: 12 }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.2px' }}>Centro de turnos · {tituloSemana}</h1>
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#7486A0', marginTop: 2 }}>{servicioNombre} · {subFecha} · Toca un día para expandirlo</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <span style={{ background: '#E4F1EB', color: '#2E7D57', fontSize: '11px', fontWeight: 800, borderRadius: 99, padding: '5px 10px' }}>{asigT}/{totT} asignados</span>
            <span style={{ background: '#FBEEEF', color: '#B85A60', fontSize: '11px', fontWeight: 800, borderRadius: 99, padding: '5px 10px' }}>{libresT} cupos libres</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
              <button onClick={() => setWeekOffset((v) => v - 1)} aria-label="Semana anterior" style={{ width: 29, height: 29, borderRadius: 9, border: '1px solid #E5EAF1', background: '#fff', color: '#7486A0', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Chevron dir="izq" /></button>
              <button onClick={() => { setWeekOffset(0); setSelDay(hoy); }} style={{ height: 29, borderRadius: 9, border: '1px solid #E5EAF1', background: weekOffset === 0 ? '#E8EEF4' : '#fff', color: '#17416C', fontSize: '11px', fontWeight: 800, padding: '0 12px', cursor: 'pointer' }}>Hoy</button>
              <button onClick={() => setWeekOffset((v) => v + 1)} aria-label="Semana siguiente" style={{ width: 29, height: 29, borderRadius: 9, border: '1px solid #E5EAF1', background: '#fff', color: '#7486A0', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Chevron dir="der" /></button>
            </div>
          </div>
        </header>

        {/* Fila semanal: compactos + expandido */}
        <section style={{ display: 'flex', gap: 8, alignItems: 'stretch', overflowX: 'auto', paddingBottom: 2 }} aria-label="Semana completa">
          {days.map((d) => d.compact ? (
            <button
              key={d.k}
              onClick={d.onSelect}
              aria-label={d.aria}
              className="sgt-day-compact"
              style={{ width: 86, flexShrink: 0, background: d.bg, border: `1.5px solid ${d.border}`, borderRadius: 14, padding: '10px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'box-shadow .15s,border-color .15s' }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: d.dateInk }}>{d.dow}</div>
                <div style={{ fontSize: '21px', fontWeight: 900, lineHeight: 1.1, color: d.dateInk }}>{d.num}</div>
                {d.hoy && <div style={{ marginTop: 3, fontSize: '7.5px', fontWeight: 900, color: '#fff', background: '#17416C', borderRadius: 99, padding: '1px 6px', letterSpacing: '0.5px', display: 'inline-block' }}>HOY</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                {d.dia && <span style={{ background: d.dia.eqBg, color: d.dia.eqInk, fontSize: '8.5px', fontWeight: 800, borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap', maxWidth: 74, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.dia.rot}</span>}
                {d.noche && <span style={{ background: d.noche.eqBg, color: d.noche.eqInk, fontSize: '8.5px', fontWeight: 800, borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap', maxWidth: 74, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.noche.rot}</span>}
              </div>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 5, marginTop: 'auto' }}>
                {d.dia && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F0F7F2', borderRadius: 8, padding: '5px 7px' }}>
                    <IconSol size={10} color="#2E7D57" width={2.4} />
                    <span style={{ fontSize: '10px', fontWeight: 800, color: d.dia.ink }}>{d.dia.cob}</span>
                    <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: 99, background: d.dia.dot }} />
                  </div>
                )}
                {d.noche && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#FBF1F2', borderRadius: 8, padding: '5px 7px' }}>
                    <IconLuna size={10} color="#B85A60" width={2.4} />
                    <span style={{ fontSize: '10px', fontWeight: 800, color: d.noche.ink }}>{d.noche.cob}</span>
                    <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: 99, background: d.noche.dot }} />
                  </div>
                )}
                {d.pendTxt && <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#C88700', background: '#FDF5E2', borderRadius: 99, padding: '2px 6px', textAlign: 'center' }}>{d.pendTxt}</div>}
              </div>
            </button>
          ) : (
            <div key={d.k} style={{ flex: 1, minWidth: 540, background: '#fff', border: '1.5px solid #17416C', borderRadius: 14, padding: '12px 14px', boxShadow: '0 10px 26px rgba(23,65,108,0.13)', animation: 'sgtFade .2s ease' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: '15px', fontWeight: 900, color: '#17416C' }}>{d.dowFull} {d.num}</span>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#7486A0' }}>de {MES_LARGO[d.mes]}</span>
                {d.hoy && <span style={{ fontSize: '8.5px', fontWeight: 900, color: '#fff', background: '#17416C', borderRadius: 99, padding: '2px 8px', letterSpacing: '0.5px' }}>HOY</span>}
                {d.pendTxt && <span style={{ marginLeft: 'auto', fontSize: '9.5px', fontWeight: 800, color: '#C88700', background: '#FDF5E2', borderRadius: 99, padding: '3px 9px' }}>{d.pendTxt} vinculadas</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {panelTurno(d.diaVM, true)}
                {panelTurno(d.nocheVM, false)}
              </div>
            </div>
          ))}
        </section>

        {/* Paneles inferiores */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12 }}>
          <section style={{ flex: 1.25, minWidth: 0, background: '#fff', border: '1px solid #E5EAF1', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} aria-label="Solicitudes pendientes">
            <div style={{ padding: '11px 15px 10px', borderBottom: '1px solid #EFF2F7', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 25, height: 25, borderRadius: 8, background: '#FDF5E2', display: 'grid', placeItems: 'center' }}><IconFlechas /></span>
              <span style={{ fontSize: '12.5px', fontWeight: 800 }}>Solicitudes pendientes</span>
              <span style={{ background: '#FDF5E2', color: '#C88700', fontSize: '9.5px', fontWeight: 800, borderRadius: 99, padding: '2px 8px' }}>{nSol}</span>
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate?.('solicitudes'); }} style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 800, color: '#17416C' }}>Historial</a>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '10px 13px 13px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, alignContent: 'start' }}>
              {solsVM.length === 0 && !cargando && (
                <div style={{ gridColumn: '1 / -1', fontSize: '11px', fontWeight: 600, color: '#7486A0', textAlign: 'center', padding: '16px 0' }}>Sin solicitudes pendientes.</div>
              )}
              {solsVM.map((s) => (
                <div key={s.id} style={{ background: '#fff', border: '1px solid #E5EAF1', borderLeft: `4px solid ${s.c}`, borderRadius: 11, padding: '9px 10px', animation: 'sgtUp .2s ease', alignSelf: 'start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 800 }}>{s.tipoL}</span>
                    <span style={{ fontSize: '9px', fontWeight: 600, color: '#7486A0' }}>{s.fecha}</span>
                    <span style={{ marginLeft: 'auto', background: s.badgeBg, color: s.badgeInk, fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px', borderRadius: 99, padding: '2px 6px', whiteSpace: 'nowrap' }}>{s.badge}</span>
                  </div>
                  {s.rows.map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#7486A0', width: 74, flexShrink: 0 }}>{r.l}</span>
                      <span style={{ fontSize: '10.5px', fontWeight: 700, flex: 1 }}>{r.v}</span>
                    </div>
                  ))}
                  {s.motivo && (
                    <div style={{ background: '#F7F9FC', borderRadius: 7, padding: '5px 8px', marginTop: 4, fontSize: '10px', fontWeight: 600, color: '#3B4A5F', lineHeight: 1.4 }}>“{s.motivo}”</div>
                  )}
                  {s.isGroup && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7486A0', marginBottom: 4 }}>Postulantes · {s.nPost}</div>
                      {s.postu.map((p) => (
                        <div key={p.key} style={{ background: '#F7F9FC', borderRadius: 8, padding: '5px 7px', marginBottom: 4 }}>
                          {p.confirming ? (
                            <>
                              <div style={{ fontSize: '10px', fontWeight: 700, marginBottom: 5 }}>¿Asignar a <b>{p.n}</b>? Las demás se rechazan.</div>
                              <div style={{ display: 'flex', gap: 5 }}>
                                <button onClick={p.onNo} style={{ flex: 1, background: '#fff', border: '1px solid #E5EAF1', borderRadius: 6, padding: '4px 0', fontSize: '10px', fontWeight: 800, color: '#3B4A5F', cursor: 'pointer' }}>Cancelar</button>
                                <button onClick={p.onYes} style={{ flex: 1, background: '#2E7D57', border: 'none', borderRadius: 6, padding: '4px 0', fontSize: '10px', fontWeight: 800, color: '#fff', cursor: 'pointer' }}>Confirmar</button>
                              </div>
                            </>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 20, height: 20, borderRadius: 99, background: p.bg, color: p.ink, display: 'inline-grid', placeItems: 'center', fontSize: '7.5px', fontWeight: 800 }}>{p.i}</span>
                              <span style={{ flex: 1, minWidth: 0, fontSize: '10.5px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.n}</span>
                              {canDecide && (
                                <button onClick={p.onElegir} style={{ background: '#17416C', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 9px', fontSize: '9.5px', fontWeight: 800, cursor: 'pointer' }}>Elegir</button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {s.waitNote && (
                    <div style={{ marginTop: 6, padding: '4px 7px', background: '#FDF5E2', borderRadius: 7, fontSize: '9.5px', color: '#C88700', fontWeight: 700 }}>⏳ {s.waitNote}</div>
                  )}
                  {s.segNote && (
                    <div style={{ marginTop: 6, padding: '4px 7px', background: '#E8EEF4', borderRadius: 7, fontSize: '9.5px', color: '#17416C', fontWeight: 700, lineHeight: 1.35 }}>{s.segNote}</div>
                  )}
                  {s.canDecide && (
                    <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
                      <button onClick={s.onRechazar} style={{ background: '#fff', border: '1px solid #F3D2D5', color: '#B85A60', borderRadius: 8, padding: '6px 10px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>Rechazar</button>
                      <button onClick={s.onAprobar} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: '#2E7D57', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 10px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}><IconCheck />Aprobar</button>
                    </div>
                  )}
                  {s.canRespond && (
                    <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
                      <button onClick={s.onRechazarRec} style={{ background: '#fff', border: '1px solid #F3D2D5', color: '#B85A60', borderRadius: 8, padding: '6px 10px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>Rechazar</button>
                      <button onClick={s.onAceptar} style={{ flex: 1, background: '#17416C', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 10px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>Aceptar</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section style={{ flex: 0.85, minWidth: 0, background: '#fff', border: '1px solid #E5EAF1', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} aria-label="Disponibles">
            <div style={{ padding: '11px 15px 10px', borderBottom: '1px solid #EFF2F7', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 25, height: 25, borderRadius: 8, background: '#FDF3E3', display: 'grid', placeItems: 'center' }}><IconMano /></span>
              <span style={{ fontSize: '12.5px', fontWeight: 800 }}>Disponibles · Ofertas generales</span>
              <span style={{ background: '#FDF3E3', color: '#C88700', fontSize: '9.5px', fontWeight: 800, borderRadius: 99, padding: '2px 8px' }}>{nDisp}</span>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '10px 13px 13px' }}>
              {ofertasVM.length === 0 && !cargando && (
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#7486A0', textAlign: 'center', padding: '16px 0' }}>Sin ofertas activas.</div>
              )}
              {ofertasVM.map((o) => (
                <div key={o.id} style={{ background: '#fff', border: '1px solid #F0DDBE', borderLeft: '4px solid #E0A040', borderRadius: 11, padding: '9px 10px', marginBottom: 8, animation: 'sgtUp .2s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 99, background: o.avBg, color: o.avInk, display: 'inline-grid', placeItems: 'center', fontSize: '8px', fontWeight: 800 }}>{o.avI}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.ofertor}</span>
                      <span style={{ display: 'block', fontSize: '8.5px', fontWeight: 600, color: '#7486A0' }}>{o.fecha}</span>
                    </span>
                    <span style={{ background: o.badgeBg, color: o.badgeInk, fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', borderRadius: 99, padding: '2px 6px', whiteSpace: 'nowrap' }}>{o.badge}</span>
                  </div>
                  <div style={{ background: '#FDF9F0', border: '1px solid #F5EAD3', borderRadius: 7, padding: '5px 8px', fontSize: '10.5px', fontWeight: 800 }}>{o.turno}</div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#3B4A5F', marginTop: 4, lineHeight: 1.4 }}>“{o.motivo}”</div>
                  {o.closedTo && (
                    <div style={{ marginTop: 5, padding: '4px 7px', background: '#E4F1EB', borderRadius: 7, fontSize: '10px', color: '#2E7D57', fontWeight: 800 }}>✓ Reasignado a {o.closedTo}</div>
                  )}
                  {o.canOpen && (
                    <div style={{ display: 'flex', gap: 5, marginTop: 7 }}>
                      <button onClick={o.onRechazar} style={{ background: '#fff', border: '1px solid #F3D2D5', color: '#B85A60', borderRadius: 8, padding: '5px 9px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>Rechazar</button>
                      <button onClick={o.onAprobar} style={{ flex: 1, background: '#2E7D57', border: 'none', color: '#fff', borderRadius: 8, padding: '5px 9px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>Abrir al servicio</button>
                    </div>
                  )}
                  {o.showPost && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7486A0', marginBottom: 4 }}>Postulantes · {o.nPost}</div>
                      {o.sinPost && <div style={{ fontSize: '10px', fontWeight: 600, color: '#7486A0' }}>Sin postulantes aún.</div>}
                      {o.postu.map((p) => (
                        <div key={p.key} style={{ background: '#F7F9FC', borderRadius: 8, padding: '5px 7px', marginBottom: 4 }}>
                          {p.confirming ? (
                            <>
                              <div style={{ fontSize: '10px', fontWeight: 700, marginBottom: 5 }}>Turno de <b>{o.ofertorAp}</b> → <b>{p.n}</b></div>
                              <div style={{ display: 'flex', gap: 5 }}>
                                <button onClick={p.onNo} style={{ flex: 1, background: '#fff', border: '1px solid #E5EAF1', borderRadius: 6, padding: '4px 0', fontSize: '10px', fontWeight: 800, color: '#3B4A5F', cursor: 'pointer' }}>Cancelar</button>
                                <button onClick={p.onYes} style={{ flex: 1, background: '#2E7D57', border: 'none', borderRadius: 6, padding: '4px 0', fontSize: '10px', fontWeight: 800, color: '#fff', cursor: 'pointer' }}>Confirmar</button>
                              </div>
                            </>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 20, height: 20, borderRadius: 99, background: p.bg, color: p.ink, display: 'inline-grid', placeItems: 'center', fontSize: '7.5px', fontWeight: 800 }}>{p.i}</span>
                              <span style={{ flex: 1, minWidth: 0, fontSize: '10.5px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.n}</span>
                              {p.onSel && (
                                <button onClick={p.onSel} style={{ background: '#E0A040', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: '9.5px', fontWeight: 800, cursor: 'pointer' }}>Seleccionar</button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Toast */}
      {toastMsg && (
        <div style={{ position: 'fixed', left: '50%', bottom: 26, transform: 'translateX(-50%)', background: 'rgba(23,65,108,0.96)', color: '#fff', borderRadius: 99, padding: '10px 18px', fontSize: '12.5px', fontWeight: 700, boxShadow: '0 10px 24px rgba(15,23,42,0.3)', animation: 'sgtToast .25s ease', zIndex: 60 }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
};

export default CentroOperacionesDesktop;
