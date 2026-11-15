import type { Metadata } from "next"
import { cache } from "react"
import { notFound, permanentRedirect } from "next/navigation"
import Header from "../layout/Header"
import BottomNav from "../layout/BottomNav"
import AreaListing from "../nightlife/AreaListing"
import { fetchVisibleClubs, LIST_CLUB_FIELDS } from "../../lib/clubQueries"
import { MIN_INDEXABLE, neighborhoodsOf, rankClubs, styleBySlug, stylesOf, clubsForStyle } from "../../lib/areas"
import { CITIES, cityUrl, type CityKey } from "../../lib/cities"
import { cityRobots } from "../../lib/citySeo"
import { createSlug } from "../../lib/slug"
import { safeJsonLd } from "../../lib/structuredData"
import { computeAreaFacts } from "../../lib/areaFactsData"
import { zoneLinks, zoneSlugByName } from "../../lib/zonePages"
import { zoneOf } from "../../lib/zones"
import { spanishAlternates } from "../../lib/intl/site"

// Páginas de barrio (/barrio/el-born, /madrid/barrio/malasana…) y de estilo musical (/musica/techno, /madrid/musica/techno…):
// una por barrio y por estilo con sus discotecas (ver src/lib/areas.ts). Son las búsquedas más habituales ("discotecas en el
// Born", "discotecas de techno Madrid"). Cada ciudad usa solo sus locales.

type Params = { slug: string }

// ───────────────────────────── Barrio ─────────────────────────────

const getBarrioData = cache(async (city: CityKey, slug: string) => {
  const all = await fetchVisibleClubs(LIST_CLUB_FIELDS, city)
  const neighborhoods = neighborhoodsOf(all)
  const area = neighborhoods.find((n) => n.slug === slug)
  if (!area) return null
  const clubs = rankClubs(all.filter((c) => createSlug(c.neighborhood) === slug))
  // Datos reales de la zona (entrada, horario, metro, Nitbus...) y enlaces a las zonas de fuera de Barcelona.
  const facts = await computeAreaFacts(clubs)
  return { area, clubs, neighborhoods, styles: stylesOf(all), facts, zones: zoneLinks(all, MIN_INDEXABLE) }
})

export async function barrioMetadata(city: CityKey, { params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const data = await getBarrioData(city, slug)
  if (!data) return { title: "Barrio no encontrado | Noctua", ...cityRobots(city) }
  const { area, clubs } = data
  const name = CITIES[city].name
  const title = `Discotecas en ${area.name}, ${name} | Noctua`
  const description = `${clubs.length} discotecas y clubs en ${area.name}, ${name}: horarios, precios, estilo de música y cómo llegar.`
  const url = cityUrl(`/barrio/${area.slug}`, city)
  return {
    title,
    description,
    // Los barrios de Barcelona con locales suficientes tienen su página en inglés (/en/neighbourhoods/...). Madrid solo está en español.
    alternates:
      city === "barcelona" && clubs.length >= MIN_INDEXABLE && !zoneSlugByName(zoneOf({ neighborhood: area.name }))
        ? spanishAlternates(`/barrio/${area.slug}`, `/neighbourhoods/${area.slug}`)
        : { canonical: url },
    ...(clubs.length < MIN_INDEXABLE ? { robots: { index: false, follow: true } } : {}),
    ...cityRobots(city),
    openGraph: { title, description, url, siteName: "Noctua", locale: "es_ES", type: "website", images: clubs[0]?.image ? [{ url: clubs[0].image }] : undefined },
  }
}

export async function BarrioView({ city, params }: { city: CityKey; params: Promise<Params> }) {
  const { slug } = await params
  const data = await getBarrioData(city, slug)
  if (!data) notFound()
  const { area, clubs, neighborhoods, styles, facts, zones } = data
  // Un municipio de fuera de Barcelona (Badalona, L'Hospitalet…) ya tiene su página en /zona/: esta
  // es un duplicado (mismos locales y un título que dice «…, Barcelona»), así que se manda allí.
  const zoneSlug = zoneSlugByName(zoneOf({ neighborhood: area.name }))
  if (zoneSlug) permanentRedirect(`/zona/${zoneSlug}`)
  const url = cityUrl(`/barrio/${area.slug}`, city)

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Noctua", item: cityUrl("/", city) },
        { "@type": "ListItem", position: 2, name: "Discotecas", item: cityUrl("/clubs", city) },
        { "@type": "ListItem", position: 3, name: area.name, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Discotecas en ${area.name}`,
      itemListElement: clubs.slice(0, 30).map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://www.noctuaapp.com/clubs/${c.slug || createSlug(c.name)}`,
        name: c.name,
      })),
    },
  ]

  return (
    <>
      <Header />
      <AreaListing kind="barrio" slug={area.slug} name={area.name} clubs={clubs} neighborhoods={neighborhoods} styles={styles} zones={zones} facts={facts} />
      <BottomNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
    </>
  )
}

// ───────────────────────────── Estilo de música ─────────────────────────────

const getStyleData = cache(async (city: CityKey, slug: string) => {
  const style = styleBySlug(slug)
  if (!style) return null
  const all = await fetchVisibleClubs(LIST_CLUB_FIELDS, city)
  const clubs = rankClubs(clubsForStyle(all, style))
  const facts = await computeAreaFacts(clubs)
  return { style, clubs, neighborhoods: neighborhoodsOf(all), styles: stylesOf(all), facts, zones: zoneLinks(all, MIN_INDEXABLE) }
})

export async function styleMetadata(city: CityKey, { params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const data = await getStyleData(city, slug)
  if (!data) return { title: "Estilo no encontrado | Noctua", ...cityRobots(city) }
  const { style, clubs } = data
  const name = CITIES[city].name
  const title = `Discotecas de ${style.label} en ${name} | Noctua`
  const description = `${clubs.length} discotecas y clubs de ${style.label} en ${name}: horarios, precios, barrio y cómo llegar.`
  const url = cityUrl(`/musica/${style.slug}`, city)
  return {
    title,
    description,
    alternates: { canonical: url },
    ...(clubs.length < MIN_INDEXABLE ? { robots: { index: false, follow: true } } : {}),
    ...cityRobots(city),
    openGraph: { title, description, url, siteName: "Noctua", locale: "es_ES", type: "website", images: clubs[0]?.image ? [{ url: clubs[0].image }] : undefined },
  }
}

export async function StyleView({ city, params }: { city: CityKey; params: Promise<Params> }) {
  const { slug } = await params
  const data = await getStyleData(city, slug)
  if (!data || data.clubs.length === 0) notFound()
  const { style, clubs, neighborhoods, styles, facts, zones } = data
  const name = CITIES[city].name
  const url = cityUrl(`/musica/${style.slug}`, city)

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Noctua", item: cityUrl("/", city) },
        { "@type": "ListItem", position: 2, name: "Discotecas", item: cityUrl("/clubs", city) },
        { "@type": "ListItem", position: 3, name: style.label, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Discotecas de ${style.label} en ${name}`,
      itemListElement: clubs.slice(0, 30).map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://www.noctuaapp.com/clubs/${c.slug || createSlug(c.name)}`,
        name: c.name,
      })),
    },
  ]

  return (
    <>
      <Header />
      <AreaListing kind="musica" slug={style.slug} name={style.label} clubs={clubs} neighborhoods={neighborhoods} styles={styles} zones={zones} facts={facts} />
      <BottomNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
    </>
  )
}
