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
    <div style={{ background: '#fff', border: `1px solid ${PA.line}`, borderRadius: 14, overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px' }}>
        <button
          onClick={puedeIrAtras ? handleMesAtras : undefined}
          style={{ background: 'none', border: 'none', cursor: puedeIrAtras ? 'pointer' : 'default', display: 'flex', alignItems: 'center', padding: '4px 10px', opacity: puedeIrAtras ? 1 : 0.2 }}
        >
          <SGTIcon name="chevron-left" size={18} color={PA.ink} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 800, color: PA.ink, textTransform: 'capitalize' }}>
          {mesActual.format('MMMM YYYY')}
        </span>
        <button
          onClick={puedeIrAdelante ? handleMesAdelante : undefined}
          style={{ background: 'none', border: 'none', cursor: puedeIrAdelante ? 'pointer' : 'default', display: 'flex', alignItems: 'center', padding: '4px 10px', opacity: puedeIrAdelante ? 1 : 0.2 }}
        >
          <SGTIcon name="chevron-right" size={18} color={PA.ink} />
        </button>
      </div>

      <div style={{ height: 1, background: PA.line2, margin: '0 12px' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px 12px' }}>
        {[{ key: null, label: 'Todo', dias: 'mes' }, ...semanas].map((s, i) => {
          const activa = s.key === null ? !semanaKey : semanaKey === s.key;
          return (
            <React.Fragment key={s.key ?? '__todo__'}>
              {i > 0 && <span style={{ color: PA.line, fontSize: 12, userSelect: 'none' }}>·</span>}
              <button
                onClick={() => setSemanaKey(s.key === null ? null : (activa ? null : s.key))}
                style={{
                  background: activa ? PA.primary : 'none', border: 'none', borderRadius: 8,
                  padding: '4px 8px', cursor: 'pointer', transition: 'background .15s, color .15s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 800, color: activa ? '#fff' : PA.ink2, lineHeight: 1 }}>
                  {s.key ?? 'Todo'}
                </span>
                {s.key !== null && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: activa ? 'rgba(255,255,255,0.8)' : PA.ink3, lineHeight: 1 }}>
                    {s.dias}
                  </span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default PeriodoSelector;
