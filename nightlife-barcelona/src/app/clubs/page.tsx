import type { Metadata } from "next"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import ClubsExplorer from "../../components/nightlife/ClubsExplorer"
import { supabase } from "../../lib/supabase"

export const revalidate = 3600

export const metadata: Metadata = {
  title: "Discotecas y clubs en Barcelona | Noctua",
  description:
    "Descubre las mejores discotecas y clubs de Barcelona: horarios, precios, estilo musical y ubicación. Filtra por barrio, género musical y ambiente.",
  alternates: { canonical: "https://noctuaapp.com/clubs" },
  openGraph: {
    title: "Discotecas y clubs en Barcelona | Noctua",
    description:
      "Descubre las mejores discotecas y clubs de Barcelona: horarios, precios, estilo musical y ubicación.",
    url: "https://noctuaapp.com/clubs",
    siteName: "Noctua",
    locale: "es_ES",
    type: "website",
  },
}

export default async function ClubsPage() {
  const { data: clubs } = await supabase.from("clubs").select("*").eq("hidden", false)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: (clubs || []).slice(0, 30).map((club, index) => ({
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
        ...(club.rating
          ? { aggregateRating: { "@type": "AggregateRating", ratingValue: club.rating, reviewCount: club.people || 1 } }
          : {}),
      },
    })),
  }

  return (
    <>
      <Header />
      <ClubsExplorer initialClubs={clubs || []} />
      <BottomNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}