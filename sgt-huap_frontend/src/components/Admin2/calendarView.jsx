// CalendarView.jsx
import React, { useState, useMemo } from 'react';
import { SGT_DATA } from './data';
import { SGTIcon, IconBtn, Sheet, SGTBadge, SGTAvatar } from './UIPrimitives';

const CalendarView = ({ onOpenDetail, onBack }) => { // <-- 1. AÑADIDO onBack AQUÍ
  const D = SGT_DATA;
  const PA = D.PALETTE;
  const [selectedDay, setSelectedDay] = useState(null);

  const LEADING_EMPTY = 6;
  const DAYS_IN_MONTH = 30;
  const DAY_LABELS    = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const keyFor        = d => `2026-11-${String(d).padStart(2, '0')}`;

  const cells = useMemo(() => {
    const arr = Array(LEADING_EMPTY).fill(null);
    for (let d = 1; d <= DAYS_IN_MONTH; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, []);

  const selectedShifts = selectedDay ? (D.SHIFTS_BY_DAY[keyFor(selectedDay)] || []) : [];
  const H   = D.HOURS_SUMMARY || { acumuladas: 144, objetivo: 180 };
  const pct = Math.round((H.acumuladas / H.objetivo) * 100);
  const colOf = cellIdx => cellIdx % 7;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: PA.surface2, animation: 'sgtFade .3s ease', overflow: 'hidden' }}>
      
      {/* Header Personalizado */}
      <div style={{ padding: '16px', background: '#fff', borderBottom: `1px solid ${PA.line2}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        
        {/* 2. BOTÓN DE VOLVER AÑADIDO AQUÍ */}
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
          <SGTIcon name="chevron-left" size={24} color={PA.ink} />
        </button>

        <div style={{ flex: 1, fontSize: 19, fontWeight: 800, color: PA.ink }}>Noviembre 2026</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <IconBtn icon="bell" badge={D.PENDIENTES?.length || 0}/>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Resumen de horas */}
        <div style={{
            margin:'10px 14px 0', padding:'9px 12px', background: PA.primarySoft,
            borderRadius:12, display:'flex', alignItems:'center', gap:10,
        }}>
          <div style={{
            width:38, height:38, borderRadius:10, background:'#fff', border:`2px solid ${PA.primary}`,
            display:'grid', placeItems:'center', fontSize:11, fontWeight:800, color:PA.primary, flexShrink:0,
          }}>
            {pct}%
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color:PA.primary, textTransform:'uppercase', letterSpacing:0.4 }}>Horas del mes</div>
            <div style={{ fontSize:14, fontWeight:800, color:PA.ink }}>
              {H.acumuladas}h <span style={{ fontSize:11, color:PA.ink3, fontWeight:700 }}> / {H.objetivo}h objetivo</span>
            </div>
          </div>
        </div>

        {/* Calendario */}
        <div style={{ padding:'14px 14px 0' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', marginBottom:6 }}>
            {DAY_LABELS.map((l, i) => (
              <div key={l} style={{ textAlign:'center', fontSize:11, fontWeight:800, color: i >= 5 ? PA.ink3 : PA.ink2 }}>{l}</div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:'3px 2px' }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={idx}/>;
              const key      = keyFor(day);
              const shifts   = D.SHIFTS_BY_DAY[key] || [];
              const miShift  = shifts.find(s => s.miTurno);
              const hasLibre = shifts.some(s => s.turnoLibre);
              const isToday  = key === D.TODAY_KEY;
              const isSel    = selectedDay === day;
              const isWknd   = colOf(idx) >= 5;
              const tappable = shifts.length > 0;

              return (
                <div key={idx} onClick={() => tappable && setSelectedDay(isSel ? null : day)} style={{
                    textAlign:'center', padding:'5px 2px', borderRadius:10, cursor: tappable ? 'pointer' : 'default',
                    background: isToday ? PA.primary : isSel ? PA.primarySoft : 'transparent',
                    transition:'background 0.15s',
                  }}>
                  <div style={{
                    fontSize:14, lineHeight:1, fontWeight: isToday || isSel ? 800 : 500,
                    color: isToday ? '#fff' : isSel ? PA.primary : isWknd ? PA.ink3 : PA.ink, marginBottom: 4,
                  }}>
                    {day}
                  </div>
                  <div style={{ display:'flex', justifyContent:'center', gap:2, minHeight:6 }}>
                    {miShift && <div style={{ width:5, height:5, borderRadius:99, background: isToday ? 'rgba(255,255,255,0.85)' : (D.TEAMS[miShift.equipo]?.ink || PA.primary) }}/>}
                    {hasLibre && <div style={{ width:5, height:5, borderRadius:99, background: isToday ? 'rgba(255,255,255,0.6)' : PA.accent }}/>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leyenda */}
        <div style={{ display:'flex', gap:14, padding:'10px 18px', borderTop:`1px solid ${PA.line2}`, marginTop:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:8, height:8, borderRadius:99, background:PA.primary }}/><span style={{ fontSize:10.5, fontWeight:700, color:PA.ink2 }}>Mi turno</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:8, height:8, borderRadius:99, background:PA.accent }}/><span style={{ fontSize:10.5, fontWeight:700, color:PA.ink2 }}>Cupo libre</span>
          </div>
        </div>

        {!selectedDay && (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'30px 24px' }}>
            <span style={{ fontSize:12, color:PA.ink3, fontWeight:600, textAlign:'center' }}>Toca un día con punto para ver sus turnos</span>
          </div>
        )}
      </div>

      <Sheet open={!!selectedDay} onClose={() => setSelectedDay(null)} title={selectedDay ? `${D.WEEK_DAYS.find(d => d.key === keyFor(selectedDay))?.dia || ''} ${selectedDay} nov` : ''} maxHeight="72%">
        <div style={{ padding:'4px 16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
          {selectedShifts.map(s => {
            const t = D.TEAMS[s.equipo];
            return (
              <div key={s.id} onClick={() => onOpenDetail(s)} style={{ background: t.bg, border:`1px solid ${t.soft}`, borderRadius:12, padding:12, cursor:'pointer' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <SGTIcon name={s.tipo === 'dia' ? 'sun' : 'moon'} size={15} color={t.ink}/>
                  <span style={{ fontSize:13.5, fontWeight:800, color:t.ink, flex:1 }}>{s.tipo === 'dia' ? 'Turno día' : 'Turno noche'} · {s.inicio}–{s.fin}</span>
                  {s.miTurno && <SGTBadge tone="primary" size="xs">Tu turno</SGTBadge>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.75)', padding:'6px 8px', borderRadius:8 }}>
                  <SGTAvatar person={s.team.jefe} size={22} ring="#E9D9C2"/>
                  <span style={{ fontSize:11.5, fontWeight:700, color:PA.ink, flex:1 }}>{s.team.jefe.nombre}</span>
                  <SGTIcon name="chevron-right" size={13} color={PA.ink3}/>
                </div>
              </div>
            );
          })}
        </div>
      </Sheet>
    </div>
  );
};

export default CalendarView;