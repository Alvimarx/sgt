// Grilla de módulos de los paneles de gestión (Jefatura, Subrogante) en
// desktop (R18). Cada módulo es un botón real con el mismo ícono, título,
// descripción y color que su tarjeta móvil (DASHBOARD_CARD_THEME_BY_TITLE), y
// llama exactamente a la misma acción.
import React from 'react';
import { SGTIcon, IconBadge3D } from '../../Style/UIPrimitives';
import { DASHBOARD_CARD_THEME_BY_TITLE } from '../../Admin2/data';
import './gestion.css';

// modulos: [{ icono, titulo, descripcion, onClick }]
export const GrillaModulosDesktop = ({ modulos, ariaLabel = 'Módulos' }) => (
  <nav className="sgt-dg-modulos" aria-label={ariaLabel}>
    {modulos.map((m) => (
      <button key={m.titulo} type="button" className="sgt-dg-modulo" onClick={m.onClick}>
        <IconBadge3D icon={m.icono} theme={DASHBOARD_CARD_THEME_BY_TITLE[m.titulo] || 'blue'} size={36} iconSize={18} radius={11} />
        <span className="sgt-dg-modulo__texto">
          <span className="sgt-dg-modulo__titulo">{m.titulo}</span>
          <span className="sgt-dg-modulo__desc">{m.descripcion}</span>
        </span>
        <span className="sgt-dg-modulo__flecha" aria-hidden="true">
          <SGTIcon name="chevron-right" size={16} strokeWidth={2.4} />
        </span>
      </button>
    ))}
  </nav>
);
