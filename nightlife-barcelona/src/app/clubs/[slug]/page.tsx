import type { Metadata } from "next"
import { cache } from "react"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import AdminEditButton from "../../../components/admin/AdminEditButton"
import ClubPageContent from "../../../components/nightlife/ClubPageContent"
import { EditAccessProvider } from "../../../components/admin/EditAccess"
import { notFound, permanentRedirect } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import { findBySlug } from "../../../lib/slugLookup"
import { createSlug } from "../../../lib/slug"
import { clubMetaDescription, clubSummary, venueKind } from "../../../lib/clubSummary"
import type { DbRow } from "../../../lib/clubQueries"
import { safeJsonLd } from "../../../lib/structuredData"

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

function venueKindLabel(venueType: string | null | undefined): string {
  return venueKind(venueType).label
}

// Locales parecidos (mismo barrio y estilo, buena nota), calculados en el servidor: antes se
// pedían en el navegador después de cargar, así que en el HTML que recibe Google no había ningún
// enlace a otros clubs. Ahora salen como enlaces normales desde el primer byte, y siempre los
// mismos para un club dado (Google ve una red de enlaces estable entre fichas).
async function relatedClubs(club: DbRow): Promise<DbRow[]> {
  const { data } = await supabase
    .from("clubs")
    .select("id, name, slug, image, neighborhood, music, rating, google_rating")
    .eq("hidden", false)
    .neq("id", club.id)
  if (!data) return []
  const myMusic = String(club.music || "").toLowerCase().split(/[,/·]/).map((m) => m.trim()).filter(Boolean)
  const score = (r: DbRow) => {
    const rating = Number(r.google_rating || r.rating || 0)
    let points = rating >= 4 ? rating : rating >= 3.5 ? rating / 2 : 0
    if (club.neighborhood && r.neighborhood === club.neighborhood) points += 3
    const theirMusic = String(r.music || "").toLowerCase()
    if (myMusic.some((m) => theirMusic.includes(m))) points += 2
    if (r.image) points += 1
    return points
  }
  return [...(data as DbRow[])].sort((a, b) => score(b) - score(a) || a.id - b.id).slice(0, 6)
}

export async function generateMetadata({ params }: ClubPageProps): Promise<Metadata> {
  const { slug } = await params
  const match = await getClub(slug)

  if (!match) {
    return { title: "Club no encontrado | Noctua" }
  }
  const club = match.row

  // Antes todas las fichas decían "Discoteca", también bares y pubs: el título ahora usa el tipo
  // de local real (lo que la gente busca: "bar de copas en Gràcia", "pub en el Born"...).
  const kind = venueKindLabel(club.venue_type)
  const title = `${club.name} — ${kind} en ${club.neighborhood || "Barcelona"} | Noctua`
  const description = clubMetaDescription(club)
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
      images: club.image ? [{ url: club.image, alt: club.name }] : [{ url: "https://www.noctuaapp.com/hero/skyline_barcelona.jpeg", alt: "Noctua" }],
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
  const [{ data: clubEvents }, { data: clubSessions }, related] = await Promise.all([
    supabase.from("club_events").select("*").eq("club_id", club.id).order("date", { ascending: true }),
    supabase.from("club_sessions").select("*").eq("club_id", club.id).order("sort_order", { ascending: true }),
    relatedClubs(club),
  ])

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NightClub",
    name: club.name,
    description: club.description || clubSummary(club),
    // Todas las fotos (portada + galería), no solo la portada: más posibilidades de salir en
    // Google Imágenes y en los resultados con foto.
    image: [club.image, ...(Array.isArray(club.gallery) ? club.gallery : [])].filter(Boolean).slice(0, 6),
    url: `https://www.noctuaapp.com/clubs/${match.canonicalSlug}`,
    ...(club.website ? { sameAs: [club.website, club.instagram].filter(Boolean) } : {}),
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

  // Migas de pan para Google (Noctua › Clubs › Barrio › Club): ayudan a entender la estructura
  // del sitio y salen en el resultado de búsqueda en vez de la URL pelada.
  const crumbs = [
    { name: "Noctua", url: "https://www.noctuaapp.com" },
    { name: "Clubs", url: "https://www.noctuaapp.com/clubs" },
    ...(club.neighborhood ? [{ name: club.neighborhood, url: `https://www.noctuaapp.com/barrio/${createSlug(club.neighborhood)}` }] : []),
    { name: club.name, url: `https://www.noctuaapp.com/clubs/${match.canonicalSlug}` },
  ]
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
  }

  return (
    <>
      <Header />
      {/* El dueño vinculado puede editar su ficha aquí mismo, igual que el admin. */}
      <EditAccessProvider ownerUserId={club.owner_user_id}>
        <ClubPageContent club={club} clubEvents={clubEvents || []} clubSessions={clubSessions || []} initialRelated={related} />
      </EditAccessProvider>
      <AdminEditButton kind="club" id={club.id} />
      <BottomNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />
    </>
  )
}