import type { Metadata } from "next"
import { cache } from "react"
import { notFound } from "next/navigation"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import AreaListing from "../../../components/nightlife/AreaListing"
import { fetchVisibleClubs, LIST_CLUB_FIELDS } from "../../../lib/clubQueries"
import { MIN_INDEXABLE, neighborhoodsOf, rankClubs, stylesOf } from "../../../lib/areas"
import { computeAreaFacts } from "../../../lib/areaFactsData"
import { zoneLinks, zoneNameBySlug } from "../../../lib/zonePages"
import { zoneOf } from "../../../lib/zones"
import { createSlug } from "../../../lib/slug"
import { safeJsonLd } from "../../../lib/structuredData"

// /zona/hospitalet, /zona/badalona, /zona/sant-feliu… Una página por municipio del área de
// Barcelona fuera de la ciudad. La gente busca «discotecas en Hospitalet» o «bares en Badalona» y
// hasta ahora esos locales solo salían dentro del filtro de /clubs, que Google no ve. La zona de
// cada local sale de lib/zones.ts (la misma lógica de los filtros de la web).
export const revalidate = 3600
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

const getData = cache(async (slug: string) => {
  const zone = zoneNameBySlug(slug)
  if (!zone) return null
  const all = await fetchVisibleClubs(LIST_CLUB_FIELDS)
  const clubs = rankClubs(all.filter((c) => zoneOf(c) === zone))
  if (clubs.length === 0) return null
  const facts = await computeAreaFacts(clubs)
  return {
    zone,
    clubs,
    facts,
    neighborhoods: neighborhoodsOf(all),
    styles: stylesOf(all),
    zones: zoneLinks(all, MIN_INDEXABLE),
  }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getData(slug)
  if (!data) return { title: "Zona no encontrada | Noctua" }
  const { zone, clubs } = data
  const title = `Discotecas y bares en ${zone} | Noctua`
  const description = `${clubs.length} discotecas, bares y locales de ocio nocturno en ${zone}: horarios, precios, estilo de música y cómo volver a casa.`
  const url = `https://www.noctuaapp.com/zona/${slug}`
  return {
    title,
    description,
    alternates: { canonical: url },
    // Con muy pocos locales la página existe pero no se pide indexar (contenido escaso).
    ...(clubs.length < MIN_INDEXABLE ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url, siteName: "Noctua", locale: "es_ES", type: "website", images: clubs[0]?.image ? [{ url: clubs[0].image }] : undefined },
  }
}

export default async function ZonaPage({ params }: Props) {
  const { slug } = await params
  const data = await getData(slug)
  if (!data) notFound()
  const { zone, clubs, facts, neighborhoods, styles, zones } = data
  const url = `https://www.noctuaapp.com/zona/${slug}`

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Noctua", item: "https://www.noctuaapp.com" },
        { "@type": "ListItem", position: 2, name: "Discotecas", item: "https://www.noctuaapp.com/clubs" },
        { "@type": "ListItem", position: 3, name: zone, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Discotecas y bares en ${zone}`,
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
      <AreaListing kind="zona" slug={slug} name={zone} clubs={clubs} neighborhoods={neighborhoods} styles={styles} zones={zones} facts={facts} />
      <BottomNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
    </>
  )
}
