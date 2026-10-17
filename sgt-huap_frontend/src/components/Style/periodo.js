// periodo.js
// Mes y semanas (S1 a S5) que eligen PeriodoSelector (móvil) y PeriodoDesktop,
// y el rango de fechas que resulta. Vive aparte de PeriodoSelector.jsx para que
// ese archivo exporte solo componentes (fast refresh de Vite).
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

export const MAX_MESES_ATRAS = 6;

export function buildSemanasDelMes(anio, mes) {
  const inicioMes = dayjs(`${anio}-${String(mes).padStart(2, '0')}-01`);
  const totalDias = inicioMes.daysInMonth();
  const semanas = [];
  let diaInicio = 1;
  let idx = 1;
  while (diaInicio <= totalDias) {
    const diaFin = Math.min(diaInicio + 6, totalDias);
    semanas.push({
      key: `S${idx}`,
      label: `S${idx}  ${diaInicio}–${diaFin}`,
      dias: `${diaInicio}–${diaFin}`,
      inicio: inicioMes.date(diaInicio),
      fin: inicioMes.date(diaFin),
    });
    diaInicio += 7;
    idx++;
  }
  return semanas;
}

export function rangoPeriodo(mesOffset, semanaKey, semanas) {
  const base = dayjs().subtract(mesOffset, 'month');
  if (semanaKey) {
    const s = semanas.find(s => s.key === semanaKey);
    if (s) return { inicio: s.inicio, fin: s.fin };
  }
  return { inicio: base.startOf('month'), fin: base.endOf('month') };
}
