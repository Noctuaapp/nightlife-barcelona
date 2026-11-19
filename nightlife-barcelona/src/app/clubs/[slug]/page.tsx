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
import { fetchAllPages } from "../../../lib/fetchAll"
import { CITIES, cityOfClub, cityUrl, isCityOpen } from "../../../lib/cities"
import { CityScope } from "../../../lib/cityScope"
import { cityHeroUrl } from "../../../lib/citySeo"
import { createSlug } from "../../../lib/slug"
import { areaHref } from "../../../lib/zonePages"
import { clubMetaDescription, clubSummary, clubTitle } from "../../../lib/clubSummary"
import { clubsOfCity, type DbRow } from "../../../lib/clubQueries"
import { cleanPriceRange, safeJsonLd } from "../../../lib/structuredData"
import { clubOpeningHoursSpec } from "../../../lib/clubHours"
import { spanishAlternates } from "../../../lib/intl/site"
import { englishClubEligible } from "../../../lib/intl/clubEligible"

// ISR: la ficha se genera la primera vez que alguien la pide y se sirve ya hecha durante 6 h
// (antes se generaba de cero en cada visita, consultando la base de datos cada vez).
// 05/11/2026: antes 300 s. Vercel avisó de que las «ISR Writes» del plan gratuito (200.000 al mes) estaban al
// 100 %: cada vez que una página caducada recibe una visita (también las de buscadores y robots) se regenera y
// cuenta como una escritura, y con cientos de fichas a 5 min salían decenas de miles al día. Subido a 6 h. Los
// cambios del admin y de «mi club» se ven al momento igualmente: guardan con touchCache (lib/touchCache.ts), que
// refresca esa página en concreto.
export const revalidate = 21600
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

// La ficha es la misma para todas las ciudades (/clubs/[slug]: el slug es único) y la ciudad sale del propio local (Fase E).
// Si su ciudad aún no está abierta (Madrid en prelaunch), la ficha no existe para el público aunque el local esté publicado:
// el admin la ve en vista previa desde el 404 (not-found.tsx).
const visibleClub = (match: Awaited<ReturnType<typeof getClub>>) => (match && isCityOpen(cityOfClub(match.row)) ? match : null)

// Locales parecidos (mismo barrio y estilo, buena nota), calculados en el servidor: antes se
// pedían en el navegador después de cargar, así que en el HTML que recibe Google no había ningún
// enlace a otros clubs. Ahora salen como enlaces normales desde el primer byte, y siempre los
// mismos para un club dado (Google ve una red de enlaces estable entre fichas).
async function relatedClubs(club: DbRow): Promise<DbRow[]> {
  // Paginado: entre Barcelona y Madrid hay más de 1.000 locales y una sola consulta se cortaría sin avisar.
  const data = await fetchAllPages((from, to) =>
    supabase
      .from("clubs")
      .select("id, name, slug, image, neighborhood, music, rating, google_rating, city, latitude, longitude")
      .eq("hidden", false)
      .neq("id", club.id)
      .order("id")
      .range(from, to)
  )
  if (data.length === 0) return []
  // Solo locales de la misma ciudad: un club de Madrid no recomienda uno de Barcelona ni al revés.
  const sameCity = clubsOfCity(data as DbRow[], cityOfClub(club))
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
  return [...sameCity].sort((a, b) => score(b) - score(a) || a.id - b.id).slice(0, 6)
}

export async function generateMetadata({ params }: ClubPageProps): Promise<Metadata> {
  const { slug } = await params
  const match = visibleClub(await getClub(slug))

  if (!match) {
    return { title: "Club no encontrado | Noctua" }
  }
  const club = match.row
  const city = cityOfClub(club)

  // Antes todas las fichas decían "Discoteca", también bares y pubs: el título ahora usa el tipo
  // de local real (lo que la gente busca: "bar de copas en Gràcia", "pub en el Born"...).
  const title = clubTitle(club)
  const description = clubMetaDescription(club)
  const url = `https://www.noctuaapp.com/clubs/${match.canonicalSlug}`

  return {
    title,
    description,
    // Si el local tiene ficha propia en inglés (con datos suficientes), se enlaza como versión en inglés (hreflang). Las páginas
    // en otros idiomas son de Barcelona: la ficha de un local de Madrid solo está en español.
    alternates: city === "barcelona" && englishClubEligible(club) ? spanishAlternates(`/clubs/${match.canonicalSlug}`, `/clubs/${match.canonicalSlug}`) : { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Noctua",
      locale: "es_ES",
      type: "website",
      images: club.image ? [{ url: club.image, alt: club.name }] : [{ url: cityHeroUrl(city), alt: "Noctua" }],
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
  const match = visibleClub(await getClub(slug))

  // notFound() devuelve un 404 real. Antes se pintaba "Club not found" pero con código 200, y
  // Google lo cuenta como "soft 404" (página vacía que dice existir).
  if (!match) notFound()
  // URL antigua o con otro formato → 301 a la buena (una sola URL por club para Google).
  if (!match.exact) permanentRedirect(`/clubs/${match.canonicalSlug}`)
  const club = match.row
  const city = cityOfClub(club)

  // En paralelo (antes iban una detrás de otra y sumaban sus tiempos).
  const [{ data: clubEvents }, { data: clubSessions }, related] = await Promise.all([
    supabase.from("club_events").select("*").eq("club_id", club.id).order("date", { ascending: true }),
    supabase.from("club_sessions").select("*").eq("club_id", club.id).order("sort_order", { ascending: true }),
    relatedClubs(club),
  ])

  // Cerrado temporalmente: no se declara un horario que no se está cumpliendo.
  const openingHours = club.temporarily_closed === true ? [] : clubOpeningHoursSpec(club.hours, club.open_days)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NightClub",
    name: club.name,
    description: club.description || clubSummary(club),
    // Todas las fotos (portada + galería), no solo la portada: más posibilidades de salir en
    // Google Imágenes y en los resultados con foto.
    image: Array.from(new Set([club.image, ...(Array.isArray(club.gallery) ? club.gallery : [])].filter(Boolean))).slice(0, 6),
    url: `https://www.noctuaapp.com/clubs/${match.canonicalSlug}`,
    ...(club.website ? { sameAs: [club.website, club.instagram].filter(Boolean) } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: club.address || undefined,
      // En Barcelona, como siempre, el barrio; en otra ciudad, la propia ciudad (los barrios de Madrid son zonas de Madrid).
      addressLocality: city === "barcelona" ? club.neighborhood || "Barcelona" : CITIES[city].name,
      addressCountry: "ES",
    },
    ...(club.latitude && club.longitude
      ? { geo: { "@type": "GeoCoordinates", latitude: club.latitude, longitude: club.longitude } }
      : {}),
    priceRange: cleanPriceRange(club.price),
    // Horario (27/10/2026): solo si se puede interpretar el campo "hours" (ver clubOpeningHoursSpec).
    ...(openingHours.length > 0 ? { openingHoursSpecification: openingHours } : {}),
    // Sin aggregateRating a propósito: las valoraciones son de Google, no de usuarios de Noctua, y
    // las directrices de Google prohíben marcar como propias reseñas de terceros (riesgo de
    // penalización manual de los resultados enriquecidos).
  }

  // Migas de pan para Google (Noctua › Clubs › Barrio › Club): ayudan a entender la estructura
  // del sitio y salen en el resultado de búsqueda en vez de la URL pelada.
  const crumbs = [
    { name: "Noctua", url: cityUrl("/", city) },
    { name: "Clubs", url: cityUrl("/clubs", city) },
    ...(club.neighborhood ? [{ name: club.neighborhood, url: cityUrl(areaHref(club.neighborhood), city) }] : []),
    { name: club.name, url: `https://www.noctuaapp.com/clubs/${match.canonicalSlug}` },
  ]
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
  }

  return (
    <CityScope city={city}>
      <Header />
      {/* El dueño vinculado puede editar su ficha aquí mismo, igual que el admin. */}
      <EditAccessProvider ownerUserId={club.owner_user_id}>
        <ClubPageContent club={club} clubEvents={clubEvents || []} clubSessions={clubSessions || []} initialRelated={related} />
      </EditAccessProvider>
      <AdminEditButton kind="club" id={club.id} />
      <BottomNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />
    </CityScope>
  )
}