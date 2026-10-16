// Mantiene el modo de presentación (desktop o móvil) según el ancho de la
// ventana y lo publica en LayoutContext. Ver layout.js.
import React, { useEffect, useState } from 'react';
import { LayoutContext, QUERY_DESKTOP } from './layout';

const coincide = () => typeof window !== 'undefined' && window.matchMedia(QUERY_DESKTOP).matches;

export default function LayoutProvider({ children }) {
  const [esDesktop, setEsDesktop] = useState(coincide);

  useEffect(() => {
    const mq = window.matchMedia(QUERY_DESKTOP);
    const onChange = (e) => setEsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return <LayoutContext.Provider value={{ esDesktop }}>{children}</LayoutContext.Provider>;
}
