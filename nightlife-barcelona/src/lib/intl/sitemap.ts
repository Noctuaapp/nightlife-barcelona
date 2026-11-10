import type { MetadataRoute } from "next"
import type { DbRow } from "../clubQueries"
import { createSlug } from "../slug"
import { englishAreas } from "./areasEn"
import { englishClubEligible } from "./clubEligible"
import { essentialsOf } from "./essentialsText"
import { GUIDES } from "./en/guides"
import { INTL_LANGS, esUrl, languagesOf, langUrl } from "./site"

// Páginas en inglés, alemán, francés e italiano dentro de sitemap.xml, con sus hreflang (10/11/2026).
//
// Cada página internacional que tiene gemela en español se declara en los cuatro idiomas, y todas llevan el mismo
// conjunto de hreflang (en, de, fr, it, es y x-default); la española se marca con los cuatro (withSpanishAlternates):
// Google exige que el enlace entre idiomas sea de ida y vuelta, si no lo ignora. Los locales con pocos datos
// (englishClubEligible) no entran: su página internacional se puede abrir pero lleva noindex y no tiene hreflang.

export type IntlSitemap = {
  /** Entradas nuevas (una por página y por idioma: /en, /de, /fr, /it). */
  entries: MetadataRoute.Sitemap
  /** Dirección española → parte de la dirección tras /{idioma} de sus gemelas (para marcar también la española). */
  twins: Map<string, string>
}
/** Nombre anterior (solo había inglés). */
export type EnglishSitemap = IntlSitemap

type Sitemap = MetadataRoute.Sitemap
type Freq = NonNullable<Sitemap[number]["changeFrequency"]>

export function buildIntlSitemap(input: { clubs: DbRow[]; busCodes: string[]; metroCodes: string[] }): IntlSitemap {
  const entries: Sitemap = []
  const twins = new Map<string, string>()

  // Con gemela en español: los cuatro idiomas + el español, con x-default = español.
  const pair = (sub: string, esPath: string, changeFrequency: Freq, priority: number, extra: Partial<Sitemap[number]> = {}) => {
    twins.set(esUrl(esPath), sub)
    const languages = languagesOf(sub, esPath)
    for (const lang of INTL_LANGS) entries.push({ url: langUrl(lang, sub), changeFrequency, priority, alternates: { languages }, ...extra })
  }
  // Sin gemela: solo los cuatro idiomas, con x-default = inglés.
  const only = (sub: string, changeFrequency: Freq, priority: number) => {
    const languages = languagesOf(sub, null)
    for (const lang of INTL_LANGS) entries.push({ url: langUrl(lang, sub), changeFrequency, priority, alternates: { languages } })
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
  for (const e of essentialsOf("en")) pair(`/essentials/${e.slug}`, `/essentials/${e.slug}`, "weekly", 0.5)

  only("/guides", "weekly", 0.7)
  for (const g of GUIDES) only(`/guides/${g.slug}`, "monthly", 0.8)

  return { entries, twins }
}

/** Nombre anterior de buildIntlSitemap (solo había inglés). */
export const buildEnglishSitemap = buildIntlSitemap

/** Marca las páginas españolas que tienen gemelas internacionales con su hreflang (el enlace tiene que ser de ida y vuelta). */
export function withSpanishAlternates(entries: Sitemap, twins: Map<string, string>): Sitemap {
  return entries.map((e) => {
    const sub = twins.get(e.url)
    if (sub === undefined) return e
    const languages: Record<string, string> = { es: e.url }
    for (const lang of INTL_LANGS) languages[lang] = langUrl(lang, sub)
    languages["x-default"] = e.url
    return { ...e, alternates: { languages } }
  })
}
