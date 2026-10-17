// usePagination.js
// Paginación client-side: reemplaza el ITEMS_PER_PAGE + slice() manual
// duplicado en varios listados (Servicios, Puestos, Personal del Sistema).
// No cambia qué datos se muestran, solo cómo se trocean/recorren. Vive aparte
// de ListControls.jsx para que ese archivo exporte solo componentes.
import { useState } from 'react';

export const usePagination = (items, perPage = 6) => {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(page, totalPages);
  const pageItems = items.slice((safePage - 1) * perPage, safePage * perPage);
  return { page: safePage, setPage, totalPages, pageItems };
};
