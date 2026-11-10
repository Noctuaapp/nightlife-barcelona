import type { AreaFacts } from "../areaFacts"

// Forma de las guías para visitantes (iguales en los cuatro idiomas: lib/intl/{en,de,fr,it}/guides.ts) y de las cifras
// reales de Noctua que las alimentan (GuideCtx, calculadas en lib/intl/guideData.ts).

export type Block =
  | { t: "p"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "table"; head: string[]; rows: string[][]; note?: string }
  | { t: "note"; title: string; text: string; tone?: "info" | "warn" }
  | { t: "links"; items: { label: string; href: string; note?: string }[] }
  | { t: "places"; items: { name: string; line: string }[]; more?: string }

export type GuideSection = { id: string; h2: string; blocks: Block[] }

export type Guide = {
  slug: string
  title: string
  h1: string
  description: string
  lead: string
  sections: GuideSection[]
  faq: { q: string; a: string }[]
  sources: { name: string; url: string }[]
  related: string[]
  cta: { label: string; href: string }
}

export type GuideMeta = { slug: string; title: string; h1: string; description: string; blurb: string }

export type PlaceLine = { name: string; where: string; phone?: string }

export type GuideCtx = {
  total: number
  facts: AreaFacts | null
  dress: { label: string; n: number }[]
  withDress: number
  ages: { age: number; n: number }[]
  withAge: number
  /** Cuántos locales abren cada noche (solo los que tienen horario o días de apertura). */
  nightsOpen: { day: string; n: number }[]
  pharmacies24: PlaceLine[]
  pharmacies24Total: number
  pharmaciesTotal: number
  hospitals: PlaceLine[]
  hospitalsTotal: number
  food24: PlaceLine[]
  food24Total: number
  supermarkets24: PlaceLine[]
  supermarkets24Total: number
  highFeeAtms: number
  atmsTotal: number
  busLines: { code: string; route: string; catalunya: boolean }[]
  areas: { slug: string; name: string; count: number; facts: AreaFacts | null }[]
}
