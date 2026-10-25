// Datos de las líneas Nitbus (autobús nocturno del área de Barcelona, operado por AMB/TMB)
// leídos directamente del plano oficial de la red ("Xarxa Nitbus ciutat de Barcelona", AMB
// Nitbus) para poder mostrar a qué zona lleva cada línea, no solo su número. No incluye el
// recorrido parada a parada (eso solo está publicado como mapa en imagen): para la parada
// exacta más cercana remitimos al buscador oficial. Si en algún momento aparece una línea que
// no está en esta lista (p.ej. una línea nueva que aún no esté aquí),
// se muestra solo el código y un enlace al buscador oficial en vez de inventar un recorrido.
export type NightBusLine = {
  code: string
  route: string
  // true si la línea para en Plaça Catalunya (nodo central de transbordo de casi toda la red;
  // la única excepción confirmada en el plano es la N0, que es circular por el centro).
  catalunya: boolean
}

export const NIGHT_BUS_LINES: Record<string, NightBusLine> = {
  N0: { code: "N0", route: "Circular por el centro (Pl. Portal de la Pau)", catalunya: false },
  N1: { code: "N1", route: "Zona Franca ↔ Trinitat Nova", catalunya: true },
  N2: { code: "N2", route: "L'Hospitalet de Ll. ↔ Badalona (vía Aragó)", catalunya: true },
  // N3 y N4 cambiaron en abril de 2025, al crearse la N23 y la N24.
  N3: { code: "N3", route: "Collblanc ↔ Can Cuiàs / Ciutat Meridiana", catalunya: true },
  N4: { code: "N4", route: "Carmel / Horta ↔ Estació Marítima (WTC) (vía Paral·lel)", catalunya: true },
  N5: { code: "N5", route: "Carmel / Gran Vista", catalunya: true },
  N6: { code: "N6", route: "Roquetes ↔ Santa Coloma de Gramenet (Les Oliveres)", catalunya: true },
  N7: { code: "N7", route: "Fòrum ↔ Pedralbes", catalunya: true },
  N8: { code: "N8", route: "Barcelona ↔ Santa Coloma de Gramenet (Can Franquesa)", catalunya: true },
  N9: { code: "N9", route: "Pl. Portal de la Pau ↔ Tiana (vía Badalona y Montgat)", catalunya: true },
  N11: { code: "N11", route: "Badalona (Hospital Can Ruti)", catalunya: true },
  N12: { code: "N12", route: "Sant Feliu de Ll. (La Salut)", catalunya: true },
  N13: { code: "N13", route: "Sant Boi de Ll. (Ciutat Cooperativa)", catalunya: true },
  N14: { code: "N14", route: "Castelldefels (Centre Vila)", catalunya: true },
  N15: { code: "N15", route: "Sant Joan Despí (Torreblanca)", catalunya: true },
  N16: { code: "N16", route: "Castelldefels (Platges)", catalunya: true },
  // Añadidas el 24/10/2026 (faltaban: Jordi encontró un local con la N24 y la N28 que la web no
  // reconocía). Fuentes: AMB / Ajuntament de Barcelona (cambios del 30/04/2025) y RedTransporte.
  N17: { code: "N17", route: "Pl. Catalunya ↔ Aeroport T1", catalunya: true },
  N18: { code: "N18", route: "Pl. Catalunya ↔ Aeroport T1-T2 (vía El Prat)", catalunya: true },
  N19: { code: "N19", route: "Castelldefels ↔ Aeroport T1-T2", catalunya: false },
  N20: { code: "N20", route: "Sant Pere ↔ Sant Boi de Ll. (vía Sepúlveda)", catalunya: false },
  N23: { code: "N23", route: "Estació de Sants ↔ Montcada i Reixac (vía Meridiana)", catalunya: false },
  N24: { code: "N24", route: "Barceloneta ↔ Roquetes (vía Gràcia y Canyelles)", catalunya: true },
  N28: { code: "N28", route: "Fòrum (Diagonal Mar) ↔ Collblanc / Can Serra (vía Port Olímpic y Sants)", catalunya: true },
}

export function getNightBusLine(raw: string): NightBusLine | null {
  const code = raw.trim().toUpperCase()
  return NIGHT_BUS_LINES[code] || null
}

export type ParsedRoute = { from: string; to: string | null; note: string | null }

// Descompone "Roquetes ↔ Santa Coloma de Gramenet (Les Oliveres)" en origen/destino/nota, para
// poder dibujar el recorrido como dos paradas con una flecha en vez de una frase corrida — así se
// lee de un vistazo, como en un rótulo de parada real, en lugar de tener que leer el texto entero
// para encontrar a dónde va.
export function parseRoute(route: string): ParsedRoute {
  const noteMatch = route.match(/\(([^)]+)\)\s*$/)
  const note = noteMatch ? noteMatch[1].trim() : null
  const base = (noteMatch ? route.slice(0, noteMatch.index) : route).trim()
  if (base.includes("↔")) {
    const [from, to] = base.split("↔").map((s) => s.trim())
    return { from, to, note }
  }
  return { from: base, to: null, note }
}

// "Ver paradas" de una línea: antes abría una búsqueda de Google Maps ("parada nitbus N24") que
// enseñaba paradas de cualquier línea, sin orden ni utilidad. Ahora lleva al mapa de Nitbus de la
// propia web filtrado por esa línea y, si se mira desde un club o evento, centrado en la parada
// de esa línea más cercana a él (25/10/2026).
export function nightBusStopsUrl(code: string, near?: { lat: number; lon: number }): string {
  const params = new URLSearchParams({ line: code.trim().toUpperCase() })
  if (near) {
    params.set("lat", near.lat.toFixed(5))
    params.set("lon", near.lon.toFixed(5))
  }
  return `/essentials/nitbus?${params.toString()}`
}

// Separa el texto libre que escribe el admin en códigos individuales. No solo por comas: si
// alguien escribe "N6 y N9" o "N6/N9" en vez de "N6, N9", antes se tragaba la frase entera como
// un único código irreconocible (y mostraba el aviso de "consulta la app" para las dos líneas
// juntas). Aquí se admite coma, barra, "y"/"i" (catalán) y saltos de línea como separadores.
export function splitNightBusCodes(raw: string): string[] {
  return raw
    .split(/,|\/|\n|\s+y\s+|\s+i\s+/gi)
    .map((s) => s.trim())
    .filter(Boolean)
}
