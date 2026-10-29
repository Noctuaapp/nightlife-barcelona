import type { Metadata } from "next"
import { cache } from "react"
import { notFound } from "next/navigation"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import AreaListing from "../../../components/nightlife/AreaListing"
import { fetchVisibleClubs, LIST_CLUB_FIELDS } from "../../../lib/clubQueries"
import { MIN_INDEXABLE, STYLES, clubsForStyle, neighborhoodsOf, rankClubs, styleBySlug, stylesOf } from "../../../lib/areas"
import { createSlug } from "../../../lib/slug"
import { safeJsonLd } from "../../../lib/structuredData"
import { computeAreaFacts } from "../../../lib/areaFactsData"
import { zoneLinks } from "../../../lib/zonePages"

// /musica/techno, /musica/reggaeton… Una página por estilo con los locales que lo pinchan.
export const revalidate = 3600
export function generateStaticParams() {
  return STYLES.map((s) => ({ slug: s.slug }))
}
export const dynamicParams = false

type Props = { params: Promise<{ slug: string }> }

const getData = cache(async (slug: string) => {
  const style = styleBySlug(slug)
  if (!style) return null
  const all = await fetchVisibleClubs(LIST_CLUB_FIELDS)
  const clubs = rankClubs(clubsForStyle(all, style))
  const facts = await computeAreaFacts(clubs)
  return { style, clubs, neighborhoods: neighborhoodsOf(all), styles: stylesOf(all), facts, zones: zoneLinks(all, MIN_INDEXABLE) }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getData(slug)
  if (!data) return { title: "Estilo no encontrado | Noctua" }
  const { style, clubs } = data
  const title = `Discotecas de ${style.label} en Barcelona | Noctua`
  const description = `${clubs.length} discotecas y clubs de ${style.label} en Barcelona: horarios, precios, barrio y cómo llegar.`
  const url = `https://www.noctuaapp.com/musica/${style.slug}`
  return {
    title,
    description,
    alternates: { canonical: url },
    ...(clubs.length < MIN_INDEXABLE ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url, siteName: "Noctua", locale: "es_ES", type: "website", images: clubs[0]?.image ? [{ url: clubs[0].image }] : undefined },
  }
}

export default async function MusicaPage({ params }: Props) {
  const { slug } = await params
  const data = await getData(slug)
  if (!data || data.clubs.length === 0) notFound()
  const { style, clubs, neighborhoods, styles, facts, zones } = data
  const url = `https://www.noctuaapp.com/musica/${style.slug}`

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Noctua", item: "https://www.noctuaapp.com" },
        { "@type": "ListItem", position: 2, name: "Discotecas", item: "https://www.noctuaapp.com/clubs" },
        { "@type": "ListItem", position: 3, name: style.label, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Discotecas de ${style.label} en Barcelona`,
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
