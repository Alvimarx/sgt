// Cuántas solicitudes pendientes le corresponden al usuario: el número del
// badge "Solicitudes" del menú lateral desktop. Mismo criterio que el Centro
// de operaciones (R16): jefatura y subrogante ven las pendientes del servicio;
// el resto, las propias y las recibidas.
//
// `user` null = no consultar (en móvil no hay badge y no se hace la llamada).
// `refrescarCon`: cualquier valor que, al cambiar, vuelve a contar (p. ej. la
// vista actual, para que el número se actualice al navegar).
import { useEffect, useState } from 'react';
import { solicitudesService } from '../services/adminService';
import { solicitudPendienteVigente } from '../utils/reglasSolicitud';

export function useSolicitudesPendientes(user, refrescarCon) {
  const [cantidad, setCantidad] = useState(0);
  const servicioId = user?.servicioId;
  const rol = user?.rol;
  const myUserId = (() => {
    const raw = Number(user?.id ?? user?.userId);
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  })();

  useEffect(() => {
    if (!user || myUserId == null) { setCantidad(0); return undefined; }
    let vivo = true;
    const decide = rol === 'JEFATURA' || rol === 'SUBROGANTE';
    const carga = decide
      ? solicitudesService.getAll().then((r) => (Array.isArray(r) ? r : [])
        .filter((s) => !s.turno || String(s.turno.servicio?.idServicio) === String(servicioId)))
      : Promise.all([
        solicitudesService.getByFuncionario(myUserId).catch(() => []),
        solicitudesService.getByReceptor(myUserId).catch(() => []),
      ]).then(([mias, recibidas]) => {
        const vistas = new Set();
        return [...(Array.isArray(mias) ? mias : []), ...(Array.isArray(recibidas) ? recibidas : [])]
          .filter((s) => (vistas.has(s.idSolicitud) ? false : (vistas.add(s.idSolicitud), true)));
      });
    carga
      .then((lista) => { if (vivo) setCantidad(lista.filter((s) => solicitudPendienteVigente(s)).length); })
      .catch(() => { if (vivo) setCantidad(0); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(user), servicioId, rol, myUserId, refrescarCon]);

  return cantidad;
}
