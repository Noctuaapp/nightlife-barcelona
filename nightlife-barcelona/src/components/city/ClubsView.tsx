import type { Metadata } from "next"
import Header from "../layout/Header"
import BottomNav from "../layout/BottomNav"
import ClubsExplorer from "../nightlife/ClubsExplorer"
import ExploreLinks from "../nightlife/ExploreLinks"
import ClubsDirectory from "../nightlife/ClubsDirectory"
import OnlyOpenCity from "../system/OnlyOpenCity"
import { fetchVisibleClubs, LIST_CLUB_FIELDS } from "../../lib/clubQueries"
import { MIN_INDEXABLE, neighborhoodsOf, stylesOf } from "../../lib/areas"
import { CITIES, cityUrl, type CityKey } from "../../lib/cities"
import { cityRobots } from "../../lib/citySeo"
import { cleanPriceRange, safeJsonLd } from "../../lib/structuredData"
import { createSlug } from "../../lib/slug"
import { spanishAlternates } from "../../lib/intl/site"

// Listado de clubs de una ciudad: /clubs (Barcelona) y /madrid/clubs (Madrid).

export function clubsMetadata(city: CityKey): Metadata {
  const name = CITIES[city].name
  const url = cityUrl("/clubs", city)
  return {
    title: `Discotecas y clubs en ${name} | Noctua`,
    description: `Descubre las mejores discotecas y clubs de ${name}: horarios, precios, estilo musical y ubicación. Filtra por barrio, género musical y ambiente.`,
    // Las versiones en otros idiomas (/en/clubs...) son de Barcelona; Madrid solo está en español.
    alternates: city === "barcelona" ? spanishAlternates("/clubs", "/clubs") : { canonical: url },
    openGraph: {
      title: `Discotecas y clubs en ${name} | Noctua`,
      description: `Descubre las mejores discotecas y clubs de ${name}: horarios, precios, estilo musical y ubicación.`,
      url,
      siteName: "Noctua",
      locale: "es_ES",
      type: "website",
    },
    ...cityRobots(city),
  }
}

export default async function ClubsView({ city }: { city: CityKey }) {
  const clubs = await fetchVisibleClubs(LIST_CLUB_FIELDS, city)
  const name = CITIES[city].name

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: clubs.slice(0, 30).map((club, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "NightClub",
        name: club.name,
        url: `https://www.noctuaapp.com/clubs/${club.slug || createSlug(club.name)}`,
        image: club.image || undefined,
        address: {
          "@type": "PostalAddress",
          addressLocality: club.neighborhood || name,
          addressCountry: "ES",
        },
        priceRange: cleanPriceRange(club.price),
      },
    })),
  }

  return (
    <>
      <Header />
      <ClubsExplorer initialClubs={clubs} />
      {/* El índice A–Z y los enlaces a barrios salen del servidor: con una ciudad en vista previa (solo el admin) no salen. */}
      <OnlyOpenCity>
        <ClubsDirectory clubs={clubs} />
        <ExploreLinks
          neighborhoods={neighborhoodsOf(clubs).filter((n) => n.count >= MIN_INDEXABLE)}
          styles={stylesOf(clubs).filter((n) => n.count >= MIN_INDEXABLE)}
        />
      </OnlyOpenCity>
      <BottomNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
    </>
  )
}
