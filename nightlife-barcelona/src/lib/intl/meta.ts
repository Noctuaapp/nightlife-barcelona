import type { Metadata } from "next"
import { englishAlternates, enUrl } from "./site"

const DEFAULT_IMAGE = "https://www.noctuaapp.com/hero/skyline_barcelona.jpeg"

const KEYWORDS = ["Barcelona nightlife", "Barcelona clubs", "Barcelona night bus", "Barcelona bars", "Barcelona nightclubs", "what to do in Barcelona at night"]

/**
 * Metadatos de una página en inglés: título, descripción, canonical, hreflang (con su gemela en español, si la
 * tiene), Open Graph en inglés y palabras clave en inglés (las de la web en español se heredarían si no).
 */
export function enMetadata(o: {
  title: string
  description: string
  /** Parte de la dirección tras /en ("" = portada, "/clubs", "/guides/xxx"). */
  sub: string
  /** Su gemela en español ("" = portada, "/clubs"…) o null si no tiene. */
  esPath: string | null
  image?: string
  noindex?: boolean
  type?: "website" | "article"
}): Metadata {
  const url = enUrl(o.sub)
  const image = o.image && o.image.startsWith("http") ? o.image : DEFAULT_IMAGE
  return {
    title: o.title,
    description: o.description,
    keywords: KEYWORDS,
    alternates: englishAlternates(o.sub, o.esPath),
    ...(o.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: o.title,
      description: o.description,
      url,
      siteName: "Noctua",
      locale: "en_GB",
      type: o.type ?? "website",
      images: [{ url: image, alt: o.title }],
    },
    twitter: { card: "summary_large_image", title: o.title, description: o.description, images: [image] },
  }
}
