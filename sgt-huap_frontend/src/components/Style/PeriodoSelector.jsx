import React from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { SGT_DATA } from '../Admin2/data';
import { SGTIcon } from './UIPrimitives';

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

const PeriodoSelector = ({ mesOffset, setMesOffset, semanaKey, setSemanaKey }) => {
  const PA = SGT_DATA.PALETTE;

  const mesActual = dayjs().subtract(mesOffset, 'month');
  const semanas   = buildSemanasDelMes(mesActual.year(), mesActual.month() + 1);

  const puedeIrAtras    = mesOffset < MAX_MESES_ATRAS;
  const puedeIrAdelante = mesOffset > 0;

  const handleMesAtras    = () => { setMesOffset(o => o + 1); setSemanaKey(null); };
  const handleMesAdelante = () => { setMesOffset(o => o - 1); setSemanaKey(null); };

  return (
    <div style={{
      background: '#fff', border: `1px solid ${PA.line}`, borderRadius: 18, overflow: 'hidden', flexShrink: 0,
      boxShadow: '0 2px 10px rgba(15,23,42,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 8px' }}>
        <button
          className="sgt-nav-arrow"
          onClick={puedeIrAtras ? handleMesAtras : undefined}
          disabled={!puedeIrAtras}
          style={{
            background: 'none', border: 'none', borderRadius: 10, cursor: puedeIrAtras ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34,
            opacity: puedeIrAtras ? 1 : 0.25,
          }}
        >
          <SGTIcon name="chevron-left" size={18} color={PA.primary} strokeWidth={2.4} />
        </button>
        <span key={mesActual.format('YYYY-MM')} style={{
          fontSize: 17, fontWeight: 900, color: PA.ink, textTransform: 'capitalize', letterSpacing: -0.2,
          animation: 'sgtMonthIn .25s ease',
        }}>
          {mesActual.format('MMMM YYYY')}
        </span>
        <button
          className="sgt-nav-arrow"
          onClick={puedeIrAdelante ? handleMesAdelante : undefined}
          disabled={!puedeIrAdelante}
          style={{
            background: 'none', border: 'none', borderRadius: 10, cursor: puedeIrAdelante ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34,
            opacity: puedeIrAdelante ? 1 : 0.25,
          }}
        >
          <SGTIcon name="chevron-right" size={18} color={PA.primary} strokeWidth={2.4} />
        </button>
      </div>

      <div style={{ height: 1, background: PA.line2, margin: '0 12px' }} />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '10px', overflowX: 'auto',
        background: PA.surface2,
      }}>
        {[{ key: null, label: 'Todo', dias: 'mes' }, ...semanas].map((s) => {
          const activa = s.key === null ? !semanaKey : semanaKey === s.key;
          return (
            <button
              key={s.key ?? '__todo__'}
              className="sgt-week-pill"
              onClick={() => setSemanaKey(s.key === null ? null : (activa ? null : s.key))}
              style={{
                background: activa ? 'linear-gradient(150deg, #6C8BFF 0%, #2B3FA0 100%)' : 'transparent',
                border: activa ? 'none' : `1px solid ${PA.line}`,
                borderRadius: 10, flex: s.key === null ? '0 0 auto' : '1 1 0',
                padding: '7px 12px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                boxShadow: activa ? '0 4px 12px rgba(43,63,160,0.32)' : 'none',
                minWidth: s.key === null ? 52 : 40,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800, color: activa ? '#fff' : PA.ink2, lineHeight: 1 }}>
                {s.key ?? 'Todo'}
              </span>
              {s.key !== null && (
                <span style={{ fontSize: 9.5, fontWeight: 600, color: activa ? 'rgba(255,255,255,0.85)' : PA.ink3, lineHeight: 1 }}>
                  {s.dias}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PeriodoSelector;
