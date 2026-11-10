import type { Metadata } from "next"
import MetroIndexView, { type MetroIndexLine, type MetroSearchEntry } from "../../components/metro/MetroIndexView"
import { METRO_LINE_CODES, METRO_LINE_SECTIONS, buildMetroLine } from "../../lib/metroLines"
import { FGC_LINES } from "../../lib/intl/metroText"
import { safeJsonLd } from "../../lib/structuredData"
import { spanishAlternates } from "../../lib/intl/site"

// /metro: las líneas del metro de Barcelona (TMB y FGC) y buscador de estación (06/11/2026). Los datos son
// fijos (lib/metroLines.ts), así que la página se genera al compilar (sin ISR: no gasta escrituras en Vercel).

export const metadata: Metadata = {
  title: "Metro de Barcelona: líneas, estaciones y recorrido | Noctua",
  description:
    "Las 12 líneas del metro de Barcelona (L1 a L12) con sus estaciones en orden, transbordos y un planificador de trayecto: elige dónde subes y dónde bajas. Con los horarios del metro de noche.",
  alternates: spanishAlternates("/metro", "/metro"),
}

export default function MetroPage() {
  const lines: MetroIndexLine[] = METRO_LINE_CODES.map((code) => {
    const secs = METRO_LINE_SECTIONS[code]
    return {
      code,
      // Una frase por tramo: «Hospital de Bellvitge ↔ Fondo»; en L9 y L10, «Nord: … ↔ …» y «Sud: … ↔ …».
      routes: secs.map((s) => `${secs.length > 1 && s.name ? `${s.name}: ` : ""}${s.stations[0]} ↔ ${s.stations[s.stations.length - 1]}`),
      count: buildMetroLine(code)?.stopCount ?? 0,
      fgc: FGC_LINES.has(code),
    }
  })

  const byName = new Map<string, Set<string>>()
  for (const code of METRO_LINE_CODES)
    for (const sec of METRO_LINE_SECTIONS[code])
      for (const name of sec.stations) {
        if (!byName.has(name)) byName.set(name, new Set())
        byName.get(name)!.add(code)
      }
  const search: MetroSearchEntry[] = Array.from(byName, ([name, set]) => ({
    name,
    lines: METRO_LINE_CODES.filter((c) => set.has(c)),
  })).sort((a, b) => a.name.localeCompare(b.name, "es"))

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Noctua", item: "https://www.noctuaapp.com" },
      { "@type": "ListItem", position: 2, name: "Metro", item: "https://www.noctuaapp.com/metro" },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <MetroIndexView lines={lines} search={search} />
    </>
  )
}
