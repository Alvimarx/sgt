import React from 'react';
import { SGT_DATA } from '../Admin2/data';
import { SGTIcon } from '../Style/UIPrimitives';
import { useLayout } from '../../layout/layout';
import { MarcoEntradaDesktop } from '../Desktop/gestion/EntradaDesktop';
import { BotonDesktop } from '../Desktop/ui';

const PendingRegistrationView = ({ message, onBackToLogin }) => {
  const PA = SGT_DATA.PALETTE;
  const { esDesktop } = useLayout();

  // Desktop (R18): el mismo aviso y la misma salida, en la tarjeta del marco
  // de entrada.
  if (esDesktop) {
    return (
      <MarcoEntradaDesktop>
        <div className="sgt-dg-entrada__tarjeta" style={{ maxWidth: 440, animation: 'sgtFade .35s ease' }} role="alert">
          <div className="sgt-dg-entrada__encabezado" style={{ alignItems: 'center' }}>
            <div className="sgt-dg-aviso-icono" aria-hidden="true">
              <SGTIcon name="alert" size={22} />
            </div>
            <h2 className="sgt-dg-entrada__h2">Cuenta no registrada aún</h2>
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: PA.ink2, fontWeight: 600 }}>
            {message || 'Tu cuenta fue validada, pero todavía no existe un registro local en el sistema. Por ahora no puedes continuar con la selección de servicio.'}
          </p>
          <div className="sgt-dg-nota">
            Si crees que esto es un error, contacta a jefatura o al equipo de soporte para que te creen el registro correspondiente.
          </div>
          <div className="sgt-dg-pie-form" style={{ borderTop: 'none', marginTop: 6 }}>
            <BotonDesktop variante="primario" icono="chevron-left" onClick={onBackToLogin}>Volver al inicio</BotonDesktop>
          </div>
        </div>
      </MarcoEntradaDesktop>
    );
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: 24,
      background: PA.surface2,
      animation: 'sgtFade .35s ease'
    }}>
      <div style={{
        background: '#fff',
        border: `1px solid ${PA.line}`,
        borderRadius: 20,
        padding: 24,
        boxShadow: '0 10px 30px rgba(15,23,42,0.08)'
      }}>
        <div style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          display: 'grid',
          placeItems: 'center',
          background: '#FEF3C7',
          color: '#B45309',
          marginBottom: 16
        }}>
          <SGTIcon name="alert" size={26} />
        </div>

        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: PA.ink }}>
          Cuenta no registrada aún
        </h2>
        <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: PA.ink2, fontWeight: 600 }}>
          {message || 'Tu cuenta fue validada, pero todavía no existe un registro local en el sistema. Por ahora no puedes continuar con la selección de servicio.'}
        </p>

        <div style={{
          marginTop: 20,
          padding: 14,
          borderRadius: 14,
          background: '#F8FAFC',
          border: `1px solid ${PA.line}`,
          color: PA.ink3,
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.5
        }}>
          Si crees que esto es un error, contacta a jefatura o al equipo de soporte para que te creen el registro correspondiente.
        </div>

        <button
          onClick={onBackToLogin}
          style={{
            marginTop: 20,
            width: '100%',
            border: 'none',
            borderRadius: 12,
            padding: '14px 16px',
            background: PA.primary,
            color: '#fff',
            fontSize: 15,
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
};

export default PendingRegistrationView;