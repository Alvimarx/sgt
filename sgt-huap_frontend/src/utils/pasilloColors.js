// utils/pasilloColors.js
const PASILLO_COLORS = {
  "6TO A": "#FF7A70",
  "6TO C": "#E0FF70",
  "4TO A": "#7AFF70",
  "4TO B": "#B770FF",
  "4TO C": "#FF70A7",
  "3ER": "#70FFF1",
  "3RO": "#70FFF1", // Alias para 3ro de la BD
  "R1": "#1A2624",
  "SIN ASIGNAR": "#FF0000",
};

function normalizePasillo(pasillo) {
  if (!pasillo) return "SIN ASIGNAR";
  // Reemplazar underscores por espacios y normalizar espacios múltiples
  return pasillo.replace(/_/g, " ").replace(/\s+/g, " ").trim().toUpperCase() || "SIN ASIGNAR";
}

// MODIFICADO: Ahora acepta un mapa dinámico opcional
function getPasilloColor(pasillo, mapaColores = null) {
  const normalizedKey = normalizePasillo(pasillo);
  const rawKey = pasillo ? pasillo.toString().trim() : "";

  // 1. Si pasaron un mapa dinámico, buscamos ahí primero
  if (mapaColores) {
    // Intentar buscar por nombre exacto o normalizado
    if (mapaColores[rawKey]) return mapaColores[rawKey];
    if (mapaColores[normalizedKey]) return mapaColores[normalizedKey];
  }

  // 2. Si no, usamos los colores estáticos (Fallback)
  return PASILLO_COLORS[normalizedKey] || PASILLO_COLORS["SIN ASIGNAR"];
}

// Calcula si el texto debe ser negro o blanco según el fondo
function getTextColor(backgroundColor) {
  if (!backgroundColor) return "#000000";
  const hex = backgroundColor.replace("#", "");
  if (hex.length !== 6) return "#000000";

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Fórmula de luminosidad estándar
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#000000" : "#ffffff";
}

// Aclara un color para el fondo de las tarjetas
function lightenColor(hexColor, factor = 0.45) {
  if (!hexColor) return "#ffffff";
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6) return hexColor;

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  const mix = (channel) => Math.round(channel + (255 - channel) * factor);
  const toHex = (value) => value.toString(16).padStart(2, "0");

  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

// Agrupa los turnos. Nota: Ahora usa el nombre del puesto que viene en el turno
// Agrupa los turnos. Nota: Se agregó soporte para puestosMap para resolver nombres reales
function groupTurnosByPasillo(turnos = [], puestosMap = {}) {
  const map = new Map();

  turnos.forEach((turno) => {
    // Si tenemos puestosMap, tratamos de resolver el nombre usando id_puesto o Sección si es el ID
    let realName = null;
    if (puestosMap) {
      if (turno.id_puesto && puestosMap[turno.id_puesto]) realName = puestosMap[turno.id_puesto];
      else if (turno.idPuesto && puestosMap[turno.idPuesto]) realName = puestosMap[turno.idPuesto];
      else if (turno.Seccion && puestosMap[turno.Seccion]) realName = puestosMap[turno.Seccion];
    }

    const labelToUse = realName || turno?.Seccion || "SIN ASIGNAR";
    const normalizedKey = normalizePasillo(labelToUse);

    if (!map.has(normalizedKey)) {
      map.set(normalizedKey, { key: normalizedKey, label: labelToUse, turnos: [] });
    }
    map.get(normalizedKey).turnos.push(turno);
  });

  return Array.from(map.values());
}

export {
  getTextColor,
  lightenColor,
  groupTurnosByPasillo,
  getPasilloColor,
};