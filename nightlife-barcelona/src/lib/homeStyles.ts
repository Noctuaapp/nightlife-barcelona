import { STYLES, clubsForStyle, rankClubs } from "./areas"
import type { DbRow } from "./clubQueries"

// «¿Qué te apetece esta noche?» de la portada (06/11/2026): una tarjeta por estilo de música, con la foto del
// mejor local de ese estilo de fondo y el número de locales. Lleva a /musica/[slug]. Todo sale de los datos y
// es determinista (sin azar), para que el servidor y el navegador pinten lo mismo.

// «Música electrónica» solapa con techno y house (los incluye): enseñarla al lado sería repetir los mismos locales.
const SKIP = new Set(["electronica"])
// Con menos locales, la tarjeta prometería un estilo que casi no hay.
export const HOME_STYLE_MIN = 2
export const HOME_STYLE_MAX = 8

export type HomeStyleCard = {
  slug: string
  count: number
  image: string | null
  // Ids de los locales del estilo: la portada los cruza con «abierto ahora» (que se calcula tras montar).
  ids: (string | number)[]
}

export function homeStyleCards(clubs: DbRow[], max: number = HOME_STYLE_MAX): HomeStyleCard[] {
  const visible = clubs.filter((c) => !c.temporarily_closed)
  const used = new Set<string>()
  const cards = STYLES.filter((s) => !SKIP.has(s.slug))
    .map((s, order) => ({ s, order, list: rankClubs(clubsForStyle(visible, s)) }))
    .filter((x) => x.list.length >= HOME_STYLE_MIN)
    // Los estilos con más locales primero; a igualdad, el orden de STYLES.
    .sort((a, b) => b.list.length - a.list.length || a.order - b.order)
    .slice(0, max)

  return cards.map(({ s, list }) => {
    const withImage = list.filter((c) => typeof c.image === "string" && c.image !== "")
    // Cada estilo, una foto distinta si se puede: el mejor local aún no usado; si no, el mejor a secas.
    const pick = withImage.find((c) => !used.has(String(c.image))) ?? withImage[0] ?? null
    if (pick) used.add(String(pick.image))
    return { slug: s.slug, count: list.length, image: pick ? String(pick.image) : null, ids: list.map((c) => c.id) }
  })
}
