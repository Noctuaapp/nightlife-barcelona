import type { MetadataRoute } from "next"
import type { DbRow } from "../clubQueries"
import { createSlug } from "../slug"
import { englishAreas } from "./areasEn"
import { englishClubEligible } from "./clubEligible"
import { ESSENTIALS_EN } from "./en/essentialsText"
import { GUIDES } from "./en/guides"
import { enUrl, esUrl } from "./site"

// Páginas en inglés dentro de sitemap.xml, con sus hreflang (10/11/2026).
//
// Cada página en inglés que tiene gemela en español se declara con las dos direcciones, y la española se
// marca con la inglesa (withSpanishAlternates): Google exige que el enlace entre idiomas sea de ida y vuelta,
// si no lo ignora. Los locales con pocos datos (englishClubEligible) no entran: su página en inglés se puede
// abrir pero lleva noindex y no tiene hreflang.

export type EnglishSitemap = {
  /** Entradas nuevas (todas en /en). */
  entries: MetadataRoute.Sitemap
  /** Dirección española → dirección inglesa de su gemela (para marcar también la española). */
  twins: Map<string, string>
}

type Sitemap = MetadataRoute.Sitemap
type Freq = NonNullable<Sitemap[number]["changeFrequency"]>

export function buildEnglishSitemap(input: { clubs: DbRow[]; busCodes: string[]; metroCodes: string[] }): EnglishSitemap {
  const entries: Sitemap = []
  const twins = new Map<string, string>()

  // Con gemela en español: ambos idiomas + x-default (el español).
  const pair = (enSub: string, esPath: string, changeFrequency: Freq, priority: number, extra: Partial<Sitemap[number]> = {}) => {
    const en = enUrl(enSub)
    const es = esUrl(esPath)
    twins.set(es, en)
    entries.push({ url: en, changeFrequency, priority, alternates: { languages: { en, es, "x-default": es } }, ...extra })
  }
  // Sin gemela: solo inglés.
  const only = (enSub: string, changeFrequency: Freq, priority: number) => {
    const en = enUrl(enSub)
    entries.push({ url: en, changeFrequency, priority, alternates: { languages: { en, "x-default": en } } })
  }

  pair("", "", "daily", 0.9)
  pair("/clubs", "/clubs", "daily", 0.8)

  for (const c of input.clubs) {
    if (!englishClubEligible(c)) continue
    const slug = String(c.slug || createSlug(c.name))
    if (!slug) continue
    pair(`/clubs/${slug}`, `/clubs/${slug}`, "weekly", 0.6, typeof c.image === "string" && c.image.startsWith("http") ? { images: [c.image] } : {})
  }

  for (const a of englishAreas(input.clubs)) pair(`/neighbourhoods/${a.slug}`, `/barrio/${a.slug}`, "weekly", 0.5)

  pair("/night-bus", "/nitbus", "weekly", 0.5)
  for (const code of input.busCodes) pair(`/night-bus/${code}`, `/nitbus/${code}`, "weekly", 0.4)

  pair("/metro", "/metro", "monthly", 0.5)
  for (const code of input.metroCodes) pair(`/metro/${code}`, `/metro/${code}`, "monthly", 0.4)

  pair("/essentials", "/essentials", "weekly", 0.5)
  for (const e of ESSENTIALS_EN) pair(`/essentials/${e.slug}`, `/essentials/${e.slug}`, "weekly", 0.5)

  only("/guides", "weekly", 0.7)
  for (const g of GUIDES) only(`/guides/${g.slug}`, "monthly", 0.8)

  return { entries, twins }
}

/** Marca las páginas españolas que tienen gemela en inglés con su hreflang (el enlace tiene que ser de ida y vuelta). */
export function withSpanishAlternates(entries: Sitemap, twins: Map<string, string>): Sitemap {
  return entries.map((e) => {
    const en = twins.get(e.url)
    return en ? { ...e, alternates: { languages: { es: e.url, en, "x-default": e.url } } } : e
  })
}
