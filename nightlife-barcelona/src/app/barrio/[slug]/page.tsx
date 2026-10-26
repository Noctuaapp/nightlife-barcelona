import type { Metadata } from "next"
import { cache } from "react"
import { notFound } from "next/navigation"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import AreaListing from "../../../components/nightlife/AreaListing"
import { fetchVisibleClubs, LIST_CLUB_FIELDS } from "../../../lib/clubQueries"
import { MIN_INDEXABLE, neighborhoodsOf, rankClubs, stylesOf } from "../../../lib/areas"
import { createSlug } from "../../../lib/slug"
import { safeJsonLd } from "../../../lib/structuredData"

// /barrio/el-born, /barrio/poblenou… Una página por barrio con sus discotecas (ver src/lib/areas.ts).
export const revalidate = 3600
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

const getData = cache(async (slug: string) => {
  const all = await fetchVisibleClubs(LIST_CLUB_FIELDS)
  const neighborhoods = neighborhoodsOf(all)
  const area = neighborhoods.find((n) => n.slug === slug)
  if (!area) return null
  const clubs = rankClubs(all.filter((c) => createSlug(c.neighborhood) === slug))
  return { area, clubs, neighborhoods, styles: stylesOf(all) }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getData(slug)
  if (!data) return { title: "Barrio no encontrado | Noctua" }
  const { area, clubs } = data
  const title = `Discotecas en ${area.name}, Barcelona | Noctua`
  const description = `${clubs.length} discotecas y clubs en ${area.name}, Barcelona: horarios, precios, estilo de música y cómo llegar.`
  const url = `https://www.noctuaapp.com/barrio/${area.slug}`
  return {
    title,
    description,
    alternates: { canonical: url },
    ...(clubs.length < MIN_INDEXABLE ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url, siteName: "Noctua", locale: "es_ES", type: "website", images: clubs[0]?.image ? [{ url: clubs[0].image }] : undefined },
  }
}

export default async function BarrioPage({ params }: Props) {
  const { slug } = await params
  const data = await getData(slug)
  if (!data) notFound()
  const { area, clubs, neighborhoods, styles } = data
  const url = `https://www.noctuaapp.com/barrio/${area.slug}`

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Noctua", item: "https://www.noctuaapp.com" },
        { "@type": "ListItem", position: 2, name: "Discotecas", item: "https://www.noctuaapp.com/clubs" },
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
      <AreaListing kind="barrio" slug={area.slug} name={area.name} clubs={clubs} neighborhoods={neighborhoods} styles={styles} />
      <BottomNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
    </>
  )
}
