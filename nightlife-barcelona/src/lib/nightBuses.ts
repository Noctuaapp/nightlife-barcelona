// Datos de las líneas Nitbus (autobús nocturno del área de Barcelona, operado por AMB/TMB)
// leídos directamente del plano oficial de la red ("Xarxa Nitbus ciutat de Barcelona", AMB
// Nitbus) para poder mostrar a qué zona lleva cada línea, no solo su número. No incluye el
// recorrido parada a parada (eso solo está publicado como mapa en imagen): para la parada
// exacta más cercana remitimos al buscador oficial. Si en algún momento aparece una línea que
// no está en esta lista (p.ej. una línea nueva como N22-N28, añadidas después de este plano),
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
  N3: { code: "N3", route: "Collblanc ↔ Montcada i Reixac", catalunya: true },
  N4: { code: "N4", route: "Carmel / Gran Vista (vía Favència)", catalunya: true },
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
}

export function getNightBusLine(raw: string): NightBusLine | null {
  const code = raw.trim().toUpperCase()
  return NIGHT_BUS_LINES[code] || null
}

// Enlace al plano oficial de esa línea concreta (parada a parada, como imagen) — es donde vive
// de verdad el recorrido completo, así que en vez de inventarnos una lista de paradas enlazamos
// directamente a la fuente real cuando alguien quiere ver "todas las paradas que hace el bus".
export function nightBusStopsUrl(code: string): string {
  const num = code.trim().toUpperCase().replace(/^N/, "")
  return `https://www.redtransporte.com/barcelona/nitbus/linea-n${num}.html`
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
