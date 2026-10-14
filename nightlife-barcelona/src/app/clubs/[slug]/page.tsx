import type { Metadata } from "next"
import { cache } from "react"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import AdminEditButton from "../../../components/admin/AdminEditButton"
import ClubPageContent from "../../../components/nightlife/ClubPageContent"
import { notFound, permanentRedirect } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import { findBySlug } from "../../../lib/slugLookup"

// ISR: la ficha se genera la primera vez que alguien la pide y se sirve ya hecha durante 5 min
// (antes se generaba de cero en cada visita, consultando la base de datos cada vez). Los cambios
// del admin o del dueño tardan como mucho 5 min en verse.
export const revalidate = 300
export async function generateStaticParams() {
  return []
}

type ClubPageProps = {
  params: Promise<{ slug: string }>
}

// Antes esta ficha no tenía generateMetadata ni datos estructurados propios: todos los clubs
// compartían el mismo <title> de la portada. `cache()` evita repetir la búsqueda (una vez para
// generateMetadata y otra para la página) en la misma petición. La búsqueda ya no descarga todos
// los clubs: ver src/lib/slugLookup.ts. Los clubs ocultos desde el admin no se encuentran.
const getClub = cache(async (slug: string) => findBySlug("club", slug))

export async function generateMetadata({ params }: ClubPageProps): Promise<Metadata> {
  const { slug } = await params
  const match = await getClub(slug)

  if (!match) {
    return { title: "Club no encontrado | Noctua" }
  }
  const club = match.row

  const title = `${club.name} — Discoteca en ${club.neighborhood || "Barcelona"} | Noctua`
  const description = (
    club.description ||
    `Toda la información de ${club.name}: horarios, precio de entrada, estilo musical y cómo llegar. Descúbrelo en Noctua.`
  ).slice(0, 160)
  const url = `https://www.noctuaapp.com/clubs/${match.canonicalSlug}`

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
  const match = await getClub(slug)

  // notFound() devuelve un 404 real. Antes se pintaba "Club not found" pero con código 200, y
  // Google lo cuenta como "soft 404" (página vacía que dice existir).
  if (!match) notFound()
  // URL antigua o con otro formato → 301 a la buena (una sola URL por club para Google).
  if (!match.exact) permanentRedirect(`/clubs/${match.canonicalSlug}`)
  const club = match.row

  // En paralelo (antes iban una detrás de otra y sumaban sus tiempos).
  const [{ data: clubEvents }, { data: clubSessions }] = await Promise.all([
    supabase.from("club_events").select("*").eq("club_id", club.id).order("date", { ascending: true }),
    supabase.from("club_sessions").select("*").eq("club_id", club.id).order("sort_order", { ascending: true }),
  ])

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NightClub",
    name: club.name,
    description: club.description || undefined,
    image: club.image || undefined,
    url: `https://www.noctuaapp.com/clubs/${match.canonicalSlug}`,
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
    // Sin aggregateRating a propósito: las valoraciones son de Google, no de usuarios de Noctua, y
    // las directrices de Google prohíben marcar como propias reseñas de terceros (riesgo de
    // penalización manual de los resultados enriquecidos).
  }

  return (
    <>
      <Header />
      <ClubPageContent club={club} clubEvents={clubEvents || []} clubSessions={clubSessions || []} />
      <AdminEditButton kind="club" id={club.id} />
      <BottomNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}