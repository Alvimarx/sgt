// Pie de tabla con paginación para listas largas en desktop (R18), p. ej. la
// bitácora (más de mil registros en un mes). Solo trocea lo que ya se filtró.
import React from 'react';
import { BotonDesktop } from '../ui';
import './gestion.css';

const fmtNum = (n) => Number(n || 0).toLocaleString('es-CL');

export const PaginacionDesktop = ({ pagina, totalPaginas, total, porPagina, onCambiar, unidad = 'registros' }) => {
  if (total === 0) return null;
  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(total, pagina * porPagina);
  return (
    <div className="sgt-dg-paginacion">
      <span className="sgt-dg-paginacion__texto">
        {fmtNum(desde)}–{fmtNum(hasta)} de {fmtNum(total)} {unidad}
      </span>
      {totalPaginas > 1 && (
        <span className="sgt-dg-paginacion__botones">
          <BotonDesktop tamano="sm" icono="chevron-left" onClick={() => onCambiar(pagina - 1)} disabled={pagina <= 1}>
            Anterior
          </BotonDesktop>
          <span className="sgt-dg-paginacion__texto">Página {pagina} de {totalPaginas}</span>
          <BotonDesktop tamano="sm" onClick={() => onCambiar(pagina + 1)} disabled={pagina >= totalPaginas}>
            Siguiente
          </BotonDesktop>
        </span>
      )}
    </div>
  );
};
