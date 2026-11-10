import type { Metadata } from "next"
import { INTL_LANGS, type IntlLang } from "./lang"

// Páginas por idioma para quien busca en Google desde fuera (10/11/2026 inglés; 10/11/2026 alemán, francés e
// italiano).
//
// La web guarda los textos de cada idioma en JSON que se carga en el navegador, así que para un buscador solo
// existía el español en una única dirección. Aquí viven las direcciones propias de cada idioma (/en/..., /de/...,
// /fr/..., /it/...), con el texto ya en el HTML y las etiquetas hreflang que le dicen a Google qué versión servir
// a cada persona. Para añadir otro idioma, ver lib/intl/lang.ts.

export const SITE = "https://www.noctuaapp.com"

export { INTL_LANGS }
export type { IntlLang }

/** Dirección relativa de una página de un idioma: langPath("de", "/clubs") → "/de/clubs". */
export const langPath = (lang: IntlLang, sub = "") => `/${lang}${sub}`
/** Dirección completa de una página de un idioma. */
export const langUrl = (lang: IntlLang, sub = "") => `${SITE}/${lang}${sub}`
/** Dirección relativa de una página en inglés: enPath("/clubs") → "/en/clubs". */
export const enPath = (sub = "") => langPath("en", sub)
/** Dirección completa de una página en inglés. */
export const enUrl = (sub = "") => langUrl("en", sub)
/** Dirección completa de una página en español ("" = portada). */
export const esUrl = (path = "") => `${SITE}${path}`

type Alternates = NonNullable<Metadata["alternates"]>

/**
 * Todas las versiones de una página para hreflang. Los cuatro idiomas internacionales tienen siempre la misma
 * página (misma dirección tras el prefijo). esPath = su gemela en español (null si no la tiene: entonces el
 * inglés es la versión por defecto).
 */
export function languagesOf(sub: string, esPath: string | null): Record<string, string> {
  const languages: Record<string, string> = {}
  for (const l of INTL_LANGS) languages[l] = langUrl(l, sub)
  if (esPath === null) {
    languages["x-default"] = languages.en
  } else {
    languages.es = esUrl(esPath)
    languages["x-default"] = languages.es
  }
  return languages
}

/**
 * Canonical (la propia página) y hreflang (todas sus versiones) de una página en un idioma internacional.
 * esPath = su gemela en español, o null si no la tiene.
 */
export function intlAlternates(lang: IntlLang, sub: string, esPath: string | null): Alternates {
  return { canonical: langUrl(lang, sub), languages: languagesOf(sub, esPath) }
}

/** Canonical y hreflang de una página EN INGLÉS. */
export function englishAlternates(enSub: string, esPath: string | null): Alternates {
  return intlAlternates("en", enSub, esPath)
}

/** Canonical y hreflang de una página EN ESPAÑOL que tiene gemela en los idiomas internacionales (misma dirección tras el prefijo). */
export function spanishAlternates(esPath: string, sub: string): Alternates {
  return { canonical: esUrl(esPath), languages: languagesOf(sub, esPath) }
}

/** Migas de pan para Google (schema.org BreadcrumbList). */
export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
  }
}

/** Preguntas frecuentes para Google (schema.org FAQPage). Solo se usa con preguntas visibles en la página. */
export function faqLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  }
}
