import type { Metadata } from "next"

// Páginas por idioma para quien busca en Google desde fuera (10/11/2026).
//
// La web guarda los textos de cada idioma en JSON que se carga en el navegador, así que para un
// buscador solo existía el español en una única dirección. Aquí viven las direcciones propias de cada
// idioma (/en/...), con el texto ya en el HTML y las etiquetas hreflang que le dicen a Google qué
// versión servir a cada persona. Hoy solo hay inglés; para añadir otro idioma (alemán, francés...) hay
// que crear su carpeta (src/app/de/...), su diccionario (como lib/intl/en.ts) y sus guías.

export const SITE = "https://www.noctuaapp.com"

export type IntlLang = "en"
export const INTL_LANGS: IntlLang[] = ["en"]

/** Dirección relativa de una página en inglés: enPath("/clubs") → "/en/clubs". */
export const enPath = (sub = "") => `/en${sub}`
/** Dirección completa de una página en inglés. */
export const enUrl = (sub = "") => `${SITE}/en${sub}`
/** Dirección completa de una página en español ("" = portada). */
export const esUrl = (path = "") => `${SITE}${path}`

type Alternates = NonNullable<Metadata["alternates"]>

/**
 * Canonical y hreflang de una página EN INGLÉS.
 * esPath = su gemela en español (null si no la tiene: entonces el inglés es la versión por defecto).
 */
export function englishAlternates(enSub: string, esPath: string | null): Alternates {
  const self = enUrl(enSub)
  if (esPath === null) return { canonical: self, languages: { en: self, "x-default": self } }
  const es = esUrl(esPath)
  return { canonical: self, languages: { en: self, es, "x-default": es } }
}

/** Canonical y hreflang de una página EN ESPAÑOL que tiene gemela en inglés. */
export function spanishAlternates(esPath: string, enSub: string): Alternates {
  const es = esUrl(esPath)
  return { canonical: es, languages: { es, en: enUrl(enSub), "x-default": es } }
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
