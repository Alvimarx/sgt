import React, { useState } from 'react';
import { SGT_DATA } from '../Admin2/data';
import { IconBadge3D, SGTIcon } from './UIPrimitives';

const P = () => SGT_DATA.PALETTE;

// Paginación client-side: reemplaza el ITEMS_PER_PAGE + slice() manual
// duplicado en varios listados (Servicios, Puestos, Personal del Sistema).
// No cambia qué datos se muestran, solo cómo se trocean/recorren.
export const usePagination = (items, perPage = 6) => {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(page, totalPages);
  const pageItems = items.slice((safePage - 1) * perPage, safePage * perPage);
  return { page: safePage, setPage, totalPages, pageItems };
};

export const PaginationControls = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  const PA = P();
  const arrowStyle = (disabled) => ({
    background: 'none', border: 'none', borderRadius: 10, width: 32, height: 32,
    display: 'grid', placeItems: 'center', cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.3 : 1,
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '10px 0' }}>
      <button
        className="sgt-nav-arrow" onClick={() => onChange(page - 1)} disabled={page <= 1}
        style={arrowStyle(page <= 1)} aria-label="Página anterior"
      >
        <SGTIcon name="chevron-left" size={16} color={PA.primary} strokeWidth={2.4} />
      </button>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: PA.ink2, fontVariantNumeric: 'tabular-nums' }}>
        {page} / {totalPages}
      </span>
      <button
        className="sgt-nav-arrow" onClick={() => onChange(page + 1)} disabled={page >= totalPages}
        style={arrowStyle(page >= totalPages)} aria-label="Página siguiente"
      >
        <SGTIcon name="chevron-right" size={16} color={PA.primary} strokeWidth={2.4} />
      </button>
    </div>
  );
};

// Estado vacío estándar para listados: icono 3D + título + mensaje, en vez
// de una línea de texto sola sobre fondo blanco.
export const ListEmptyState = ({ icon = 'search', theme = 'slate', title, message, action }) => {
  const PA = P();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '36px 20px', gap: 12,
      background: '#fff', border: `1px dashed ${PA.line}`, borderRadius: 18,
    }}>
      <div className="sgt-empty-icon">
        <IconBadge3D icon={icon} theme={theme} size={54} iconSize={26} radius={16} />
      </div>
      {title && <div style={{ fontSize: 15, fontWeight: 800, color: PA.ink }}>{title}</div>}
      {message && <div style={{ fontSize: 13, color: PA.ink3, fontWeight: 600, maxWidth: 260 }}>{message}</div>}
      {action}
    </div>
  );
};

// Reemplaza el "Cargando..." de texto plano por un skeleton con shimmer.
export const LoadingState = ({ label = 'Cargando…', rows = 3 }) => {
  const PA = P();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i} className="sgt-skeleton-row"
          style={{ height: 64, borderRadius: 14, background: PA.line2, animationDelay: `${i * 0.12}s` }}
        />
      ))}
      <div style={{ textAlign: 'center', fontSize: 12, color: PA.ink3, fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
};
