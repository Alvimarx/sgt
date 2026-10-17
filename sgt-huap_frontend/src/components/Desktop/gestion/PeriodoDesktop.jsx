// Selector de período compacto para desktop (R18): mes con flechas y semanas
// como segmentos, en una sola línea para el encabezado de la página.
//
// Es otra presentación del PeriodoSelector móvil (Style/PeriodoSelector.jsx) y
// se comporta igual: mismo estado (mesOffset, semanaKey) de la vista, mismas
// semanas (buildSemanasDelMes), hasta MAX_MESES_ATRAS meses hacia atrás, nada
// hacia el futuro, al cambiar de mes vuelve a "Todo" y tocar la semana activa
// la desmarca.
import React from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { SGTIcon } from '../../Style/UIPrimitives';
import { buildSemanasDelMes, MAX_MESES_ATRAS } from '../../Style/PeriodoSelector';
import { SegmentosDesktop } from '../ui';
import './gestion.css';

export const PeriodoDesktop = ({ mesOffset, setMesOffset, semanaKey, setSemanaKey }) => {
  const mesActual = dayjs().subtract(mesOffset, 'month');
  const semanas = buildSemanasDelMes(mesActual.year(), mesActual.month() + 1);
  const puedeIrAtras = mesOffset < MAX_MESES_ATRAS;
  const puedeIrAdelante = mesOffset > 0;

  const opciones = [
    { id: '__todo__', etiqueta: 'Todo' },
    ...semanas.map((s) => ({
      id: s.key,
      etiqueta: (
        <span className="sgt-dg-semana">
          {s.key}<span className="sgt-dg-semana__dias">{s.dias}</span>
        </span>
      ),
    })),
  ];

  const elegir = (id) => {
    if (id === '__todo__') { setSemanaKey(null); return; }
    setSemanaKey(semanaKey === id ? null : id);
  };

  return (
    <div className="sgt-dg-periodo">
      <div className="sgt-dg-mes" role="group" aria-label="Mes">
        <button
          type="button"
          className="sgt-dg-mes__boton"
          onClick={() => { setMesOffset((o) => o + 1); setSemanaKey(null); }}
          disabled={!puedeIrAtras}
          aria-label="Mes anterior"
        >
          <SGTIcon name="chevron-left" size={14} strokeWidth={2.4} />
        </button>
        <span className="sgt-dg-mes__nombre" aria-live="polite">{mesActual.format('MMMM YYYY')}</span>
        <button
          type="button"
          className="sgt-dg-mes__boton"
          onClick={() => { setMesOffset((o) => o - 1); setSemanaKey(null); }}
          disabled={!puedeIrAdelante}
          aria-label="Mes siguiente"
        >
          <SGTIcon name="chevron-right" size={14} strokeWidth={2.4} />
        </button>
      </div>
      <SegmentosDesktop
        ariaLabel="Semana del mes"
        opciones={opciones}
        valor={semanaKey ?? '__todo__'}
        onChange={elegir}
      />
    </div>
  );
};
