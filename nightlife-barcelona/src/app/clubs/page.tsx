import type { Metadata } from "next"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import ClubsExplorer from "../../components/nightlife/ClubsExplorer"
import { fetchVisibleClubs, LIST_CLUB_FIELDS } from "../../lib/clubQueries"

export const revalidate = 3600

export const metadata: Metadata = {
  title: "Discotecas y clubs en Barcelona | Noctua",
  description:
    "Descubre las mejores discotecas y clubs de Barcelona: horarios, precios, estilo musical y ubicación. Filtra por barrio, género musical y ambiente.",
  alternates: { canonical: "https://www.noctuaapp.com/clubs" },
  openGraph: {
    title: "Discotecas y clubs en Barcelona | Noctua",
    description:
      "Descubre las mejores discotecas y clubs de Barcelona: horarios, precios, estilo musical y ubicación.",
    url: "https://www.noctuaapp.com/clubs",
    siteName: "Noctua",
    locale: "es_ES",
    type: "website",
  },
}

export default async function ClubsPage() {
  const clubs = await fetchVisibleClubs(LIST_CLUB_FIELDS)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: clubs.slice(0, 30).map((club, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "NightClub",
        name: club.name,
        image: club.image || undefined,
        address: {
          "@type": "PostalAddress",
          addressLocality: club.neighborhood || "Barcelona",
          addressCountry: "ES",
        },
        priceRange: club.price || undefined,
      },
    })),
  }

  return (
    <>
      <Header />
      <ClubsExplorer initialClubs={clubs} />
      <BottomNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}