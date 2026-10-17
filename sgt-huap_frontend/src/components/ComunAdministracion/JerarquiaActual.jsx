// JerarquiaActual.jsx
// Jerarquía actual de un servicio y la confirmación de «Quitar subrogancia»,
// compartidas por la Jerarquía del servicio (jefatura) y la Jerarquía de
// funcionarios (administrador). Solo dibujan: cada vista arma las listas con
// utils/rolesServicio.js y hace la llamada (funcionarioService.quitarSubrogancia).
import React from 'react';
import { SGT_DATA } from '../Admin2/data';
import { ConfirmDialog, IconBadge3D } from '../Style/UIPrimitives';

const nombreDe = (funcionario) =>
  `${funcionario?.nombre || ''} ${funcionario?.apellidoPaterno || ''}`.trim();

/**
 * Tarjeta móvil con las jefaturas, los subrogantes y cuántos funcionarios
 * tiene el servicio. Los desktop la dibujan a su modo, con los mismos datos.
 *   jefaturas, subrogantes: funcionarios de /funcionarios/summary.
 *   onQuitarSubrogancia(funcionario): si viene, cada subrogante tiene el botón
 *   «Quitar subrogancia» (la vista pide la confirmación).
 */
const JerarquiaActual = ({ jefaturas, subrogantes, totalFuncionarios, onQuitarSubrogancia }) => {
  const PA = SGT_DATA.PALETTE;
  return (
    <div style={{ background: '#fff', border: `1px solid ${PA.line}`, borderRadius: 16, padding: 16, marginBottom: 22, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: PA.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        Jerarquía actual del servicio
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconBadge3D icon="crown" theme="amber" size={36} iconSize={17} radius={10} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: PA.ink3, textTransform: 'uppercase' }}>
            Jefatura{jefaturas.length > 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: PA.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {jefaturas.length > 0 ? jefaturas.map(nombreDe).join(', ') : 'Sin jefatura designada'}
          </div>
        </div>
      </div>

      <div style={{ marginLeft: 17, width: 1, height: 16, background: PA.line }} />

      {/* Un subrogante por fila: cada uno puede tener su «Quitar subrogancia». */}
      <div style={{ display: 'flex', alignItems: subrogantes.length > 1 ? 'flex-start' : 'center', gap: 10 }}>
        <IconBadge3D icon="shield-check" theme="blue" size={36} iconSize={17} radius={10} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: PA.ink3, textTransform: 'uppercase' }}>
            Subrogante{subrogantes.length !== 1 ? 's' : ''}
          </div>
          {subrogantes.length === 0 && (
            <div style={{ fontSize: 13.5, fontWeight: 700, color: PA.ink }}>Sin subrogante designado</div>
          )}
          {subrogantes.map((s, i) => (
            <div key={s.idFuncionario ?? i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: i > 0 ? 6 : 0 }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: PA.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {nombreDe(s)}
              </span>
              {onQuitarSubrogancia && (
                <button
                  type="button"
                  onClick={() => onQuitarSubrogancia(s)}
                  aria-label={`Quitar subrogancia a ${nombreDe(s)}`}
                  style={{ flexShrink: 0, background: '#fff', color: '#B85A60', border: '1px solid #F3D2D5', borderRadius: 8, padding: '5px 9px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}
                >
                  Quitar subrogancia
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginLeft: 17, width: 1, height: 16, background: PA.line }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconBadge3D icon="users" theme="green" size={36} iconSize={17} radius={10} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: PA.ink3, textTransform: 'uppercase' }}>Funcionarios</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: PA.ink }}>{totalFuncionarios} en el servicio</div>
        </div>
      </div>
    </div>
  );
};

/**
 * Confirmación de «Quitar subrogancia», la misma en móvil y desktop.
 *   persona: el subrogante (null = cerrada). quitando: la llamada en curso.
 */
export const ConfirmarQuitarSubrogancia = ({ persona, servicioNombre, quitando, onConfirmar, onCancelar }) => {
  const PA = SGT_DATA.PALETTE;
  return (
    <ConfirmDialog
      open={!!persona}
      icon="shield-check" tone="danger"
      title="¿Quitar la subrogancia?"
      busy={quitando}
      confirmLabel={quitando ? 'Quitando...' : 'Quitar subrogancia'}
      cancelLabel="Volver"
      onConfirm={onConfirmar}
      onCancel={onCancelar}
    >
      <strong style={{ color: PA.ink }}>{nombreDe(persona)}</strong> vuelve a ser médico del servicio
      {servicioNombre ? <> <strong style={{ color: PA.ink }}>{servicioNombre}</strong></> : null}.
    </ConfirmDialog>
  );
};

export default JerarquiaActual;
