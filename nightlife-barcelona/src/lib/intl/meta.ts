import type { Metadata } from "next"
import { OG_LOCALE, type IntlLang } from "./lang"
import { intlAlternates, langUrl } from "./site"

const DEFAULT_IMAGE = "https://www.noctuaapp.com/hero/skyline_barcelona.jpeg"

// Palabras clave de cada idioma (las de la web en español se heredarían si no se declararan).
const KEYWORDS: Record<IntlLang, string[]> = {
  en: ["Barcelona nightlife", "Barcelona clubs", "Barcelona night bus", "Barcelona bars", "Barcelona nightclubs", "what to do in Barcelona at night"],
  de: ["Barcelona Nachtleben", "Clubs Barcelona", "Nachtbus Barcelona", "Bars Barcelona", "Diskotheken Barcelona", "Barcelona nachts unterwegs"],
  fr: ["vie nocturne Barcelone", "boîtes de nuit Barcelone", "bus de nuit Barcelone", "bars Barcelone", "sortir à Barcelone la nuit"],
  it: ["vita notturna Barcellona", "discoteche Barcellona", "bus notturno Barcellona", "bar Barcellona", "uscire a Barcellona di notte"],
}

export type MetaInput = {
  title: string
  description: string
  /** Parte de la dirección tras /{idioma} ("" = portada, "/clubs", "/guides/xxx"). */
  sub: string
  /** Su gemela en español ("" = portada, "/clubs"…) o null si no tiene. */
  esPath: string | null
  image?: string
  noindex?: boolean
  type?: "website" | "article"
}

/**
 * Metadatos de una página en un idioma internacional: título, descripción, canonical, hreflang (con todas sus
 * versiones), Open Graph y palabras clave en ese idioma.
 */
export function intlMetadata(lang: IntlLang, o: MetaInput): Metadata {
  const url = langUrl(lang, o.sub)
  const image = o.image && o.image.startsWith("http") ? o.image : DEFAULT_IMAGE
  return {
    title: o.title,
    description: o.description,
    keywords: KEYWORDS[lang],
    alternates: intlAlternates(lang, o.sub, o.esPath),
    ...(o.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: o.title,
      description: o.description,
      url,
      siteName: "Noctua",
      locale: OG_LOCALE[lang],
      type: o.type ?? "website",
      images: [{ url: image, alt: o.title }],
    },
    twitter: { card: "summary_large_image", title: o.title, description: o.description, images: [image] },
  }
}

/** Metadatos de una página en inglés. */
export function enMetadata(o: MetaInput): Metadata {
  return intlMetadata("en", o)
}
