import type { Metadata } from "next"
import { CITIES, cityUrl, isCityOpen, type CityKey } from "./cities"

// Textos y reglas de buscadores que cambian por ciudad (Fase E). Barcelona mantiene los suyos de siempre (los de
// app/layout.tsx y de cada página); aquí solo está lo que hace falta para Madrid y las reglas comunes.

const SITE = "https://www.noctuaapp.com"

/**
 * Mientras una ciudad esté en prelaunch no se indexa nada suyo: ni sus páginas ni los enlaces que salen de ellas.
 * Con la ciudad abierta no se añade nada y manda lo que diga cada página (index por defecto).
 */
export function cityRobots(city: CityKey): Pick<Metadata, "robots"> {
  return isCityOpen(city) ? {} : { robots: { index: false, follow: false } }
}

/** Foto de la ciudad con su dirección completa (para Open Graph y Twitter). */
export function cityHeroUrl(city: CityKey): string {
  return `${SITE}${CITIES[city].heroImage}`
}

/**
 * Metadatos de partida de todo lo que cuelga de la ciudad (su layout): título, descripción, palabras clave, Open Graph y
 * Twitter con el nombre y la foto de la ciudad. Sin esto, cada página de Madrid que no define los suyos heredaba los de
 * Barcelona de app/layout.tsx («Vida nocturna en Barcelona», skyline de Barcelona). Cada página los puede sustituir.
 * No lleva canonical ni og:url: son de cada página.
 */
export function cityBaseMetadata(city: CityKey): Metadata {
  const name = CITIES[city].name
  const title = `Noctua — Vida nocturna en ${name}`
  const description = `Descubre las mejores discotecas, eventos y fiestas de ${name}. Horarios, precios, estilos de música y cómo volver a casa para salir de noche.`
  const shortDescription = `Descubre las mejores discotecas, eventos y fiestas de ${name}.`
  const hero = cityHeroUrl(city)
  return {
    title,
    description,
    keywords: `vida nocturna ${name}, discotecas ${name}, clubs ${name}, fiesta ${name}, ocio nocturno ${name}`,
    openGraph: {
      title,
      description: shortDescription,
      siteName: "Noctua",
      images: [{ url: hero, width: 1535, height: 1024, alt: `Vida nocturna de ${name} — Noctua` }],
      locale: "es_ES",
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description: shortDescription, images: [hero] },
    ...cityRobots(city),
  }
}

/** Título y descripción de la portada de una ciudad que no es Barcelona (la de Barcelona sale de app/layout.tsx). */
export function cityHomeMetadata(city: CityKey): Metadata {
  const base = cityBaseMetadata(city)
  return {
    ...base,
    alternates: { canonical: "./" },
    openGraph: { ...base.openGraph, url: cityUrl("/", city) },
  }
}
