// Colores oficiales de las líneas de metro/FGC de Barcelona (los mismos que en los rótulos del
// andén y en el plano de TMB/FGC). Usar estos en vez de un color genérico por categoría es lo que
// hace que "L3" se lea de un vistazo como la línea verde de toda la vida, no como una etiqueta
// cualquiera — es información, no decoración.
export const METRO_LINE_COLORS: Record<string, string> = {
  L1: "#E4032E",
  L2: "#942E8D",
  L3: "#00AE4D",
  L4: "#FFC20E",
  L5: "#1E58A8",
  L6: "#9A5FA5",
  L7: "#9A5FA5",
  L8: "#EB198D",
  L9: "#FF6319",
  L9N: "#FF6319",
  L9S: "#FF6319",
  L10: "#02ABE7",
  L10N: "#02ABE7",
  L10S: "#02ABE7",
  L11: "#8FC73E",
  L12: "#00A99D",
}

// L4 (amarillo) y L10 (celeste muy claro) son demasiado claros para texto blanco encima.
const LIGHT_LINES = new Set(["L4", "L10", "L10N", "L10S"])

export function metroLineColor(code: string): { bg: string; fg: string } {
  const key = code.trim().toUpperCase()
  const bg = METRO_LINE_COLORS[key] || "#7c5cff"
  return { bg, fg: LIGHT_LINES.has(key) ? "#16141f" : "#ffffff" }
}

// Nitbus no tiene un color por línea (serían 16 colores sin significado real); en vez de eso,
// toda la red comparte la placa azul noche con texto ámbar de las paradas reales de TMB.
export const NITBUS_PLATE = { bg: "#1b2559", fg: "#ffd166" }
