import type { Metadata } from "next"
import { cache } from "react"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import ClubPageContent from "../../../components/nightlife/ClubPageContent"
import { notFound } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import { createSlug } from "../../../lib/slug"

type ClubPageProps = {
  params: Promise<{ slug: string }>
}

// Antes esta ficha no tenía generateMetadata ni datos estructurados propios: todos los clubs
// compartían el mismo <title> y descripción genéricos de la portada (definidos en layout.tsx),
// así que Google no podía distinguir en resultados de búsqueda "Pacha Barcelona" de "Razzmatazz"
// — ambos aparecían con el mismo título de la home. `cache()` evita pedir la lista de clubs dos
// veces (una para generateMetadata, otra para la página) en la misma petición.
const getClub = cache(async (slug: string) => {
  // Filtramos hidden igual que en el listado — si no, un club oculto desde el admin seguía siendo
  // visitable por enlace directo (compartido, indexado por Google, guardado en favoritos antes de
  // ocultarlo...), que es justo lo que "ocultar" pretende evitar.
  const { data: clubs } = await supabase.from("clubs").select("*").eq("hidden", false)
  return clubs?.find((club) => createSlug(club.name) === slug) || null
})

export async function generateMetadata({ params }: ClubPageProps): Promise<Metadata> {
  const { slug } = await params
  const club = await getClub(slug)

  if (!club) {
    return { title: "Club no encontrado | Noctua" }
  }

  const title = `${club.name} — Discoteca en ${club.neighborhood || "Barcelona"} | Noctua`
  const description = (
    club.description ||
    `Toda la información de ${club.name}: horarios, precio de entrada, estilo musical y cómo llegar. Descúbrelo en Noctua.`
  ).slice(0, 160)
  const url = `https://noctuaapp.com/clubs/${slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Noctua",
      locale: "es_ES",
      type: "website",
      images: club.image ? [{ url: club.image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: club.image ? [club.image] : undefined,
    },
  }
}

export default async function ClubPage({ params }: ClubPageProps) {
  const { slug } = await params
  const club = await getClub(slug)

  // notFound() devuelve un 404 real. Antes se pintaba "Club not found" pero con código 200, y
  // Google lo cuenta como "soft 404" (página vacía que dice existir).
  if (!club) notFound()

  const { data: clubEvents } = await supabase
    .from("club_events")
    .select("*")
    .eq("club_id", club.id)
    .order("date", { ascending: true })

  const { data: clubSessions } = await supabase
    .from("club_sessions")
    .select("*")
    .eq("club_id", club.id)
    .order("sort_order", { ascending: true })

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NightClub",
    name: club.name,
    description: club.description || undefined,
    image: club.image || undefined,
    url: `https://noctuaapp.com/clubs/${slug}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: club.address || undefined,
      addressLocality: club.neighborhood || "Barcelona",
      addressCountry: "ES",
    },
    ...(club.latitude && club.longitude
      ? { geo: { "@type": "GeoCoordinates", latitude: club.latitude, longitude: club.longitude } }
      : {}),
    priceRange: club.price || undefined,
    ...(club.rating || club.google_rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: club.rating || club.google_rating,
            reviewCount: club.reviews_count || club.review_count || club.google_review_count || club.people || 1,
          },
        }
      : {}),
  }

  return (
    <>
      <Header />
      <ClubPageContent club={club} clubEvents={clubEvents || []} clubSessions={clubSessions || []} />
      <BottomNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}