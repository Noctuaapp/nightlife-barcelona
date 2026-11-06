import { metroLineColor } from "./transitColors"

// Chincheta de una estación de metro en el mapa (06/11/2026). Antes era un círculo de 40 px con la
// inicial del nombre («B», «C»…): no decía nada y 155 círculos con letras tapaban el mapa. Ahora es
// un punto como en un plano de metro: del color de la línea si la estación es de una sola, y blanco
// con aro del color de la línea si es un transbordo (dos o más líneas).

export type MetroDot = {
  hub: boolean
  lines: string[]
  // Color de la línea que manda: la que se está filtrando si la estación la tiene, si no la primera.
  color: string
  // Lado del punto en px, sin contar el borde.
  size: number
  border: number
  fill: string
}

export function metroLinesOf(subcategory: string | null | undefined): string[] {
  return (subcategory || "")
    .split(",")
    .map((l) => l.trim().toUpperCase())
    .filter(Boolean)
}

export function metroDot(subcategory: string | null | undefined, selectedLine = "All"): MetroDot {
  const lines = metroLinesOf(subcategory)
  const wanted = selectedLine.trim().toUpperCase()
  const main = wanted !== "ALL" && lines.includes(wanted) ? wanted : lines[0] ?? ""
  const color = metroLineColor(main).bg
  const hub = lines.length >= 2
  return hub
    ? { hub, lines, color, size: 9, border: 4, fill: "#ffffff" }
    : { hub, lines, color, size: 8, border: 2, fill: color }
}

// Estilo en línea del punto. Mapbox coloca el elemento del marcador con su propio transform, así que
// el punto va dentro de un contenedor transparente de 32 px (zona para tocar con el dedo) y es el
// contenedor, no el punto, el que Mapbox mueve.
export const METRO_MARKER_HIT = 32

export function metroDotCss(d: MetroDot): string {
  const edge = d.hub ? d.color : "#ffffff"
  return `width:${d.size + d.border * 2}px;height:${d.size + d.border * 2}px;box-sizing:border-box;border-radius:9999px;background:${d.fill};border:${d.border}px solid ${edge};box-shadow:0 0 0 1.5px rgba(10,9,16,0.9),0 2px 6px rgba(0,0,0,0.5)`
}

export const metroMarkerHitCss = `width:${METRO_MARKER_HIT}px;height:${METRO_MARKER_HIT}px;display:flex;align-items:center;justify-content:center;cursor:pointer`
