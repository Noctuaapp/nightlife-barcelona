import type { Metadata } from "next"
import { cache } from "react"
import Link from "next/link"
import { notFound, permanentRedirect } from "next/navigation"
import IntlShell from "../../../../components/intl/IntlShell"
import { CARD, ClubCardEn, Crumbs, Fact, Hero, JsonLd, Section } from "../../../../components/intl/IntlBits"
import { getAllClubs, nightBusesNear, rankClubs } from "../../../../lib/intl/data"
import { englishClubEligible } from "../../../../lib/intl/clubEligible"
import {
  capitalize,
  clubMetaDescriptionEn,
  clubSummaryEn,
  clubTitleEn,
  dressEn,
  featuresEn,
  hoursEn,
  listEn,
  minAgeOf,
  musicEn,
  priceEn,
  ratingOf,
  streetOf,
  venueKindEn,
} from "../../../../lib/intl/en/clubText"
import { enMetadata } from "../../../../lib/intl/meta"
import { breadcrumbLd, enUrl } from "../../../../lib/intl/site"
import { findBySlug } from "../../../../lib/slugLookup"
import { nearestMetroStations } from "../../../../lib/metroStations"
import { clubOpeningHoursSpec } from "../../../../lib/clubHours"
import { createSlug } from "../../../../lib/slug"
import { cleanPriceRange } from "../../../../lib/structuredData"

// /en/clubs/[slug]: ficha del local en inglés, con los mismos datos que la española, el metro y los autobuses nocturnos para
// volver a casa. Se genera al pedirla y se renueva cada 3 días (cientos de fichas: poca escritura en Vercel).
// Un local con pocos datos se puede abrir pero no se pide indexar (ver lib/intl/clubEligible.ts).
export const revalidate = 259200
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

const getClub = cache(async (slug: string) => findBySlug("club", slug))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const match = await getClub(slug)
  if (!match) return { title: "Venue not found | Noctua" }
  const club = match.row
  return enMetadata({
    title: clubTitleEn(club),
    description: clubMetaDescriptionEn(club),
    sub: `/clubs/${match.canonicalSlug}`,
    esPath: `/clubs/${match.canonicalSlug}`,
    image: typeof club.image === "string" ? club.image : undefined,
    noindex: !englishClubEligible(club),
  })
}

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""))
  return Number.isFinite(n) ? n : null
}

const metersText = (m: number) => (m < 950 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`)

export default async function ClubEn({ params }: Props) {
  const { slug } = await params
  const match = await getClub(slug)
  if (!match) notFound()
  if (!match.exact) permanentRedirect(`/en/clubs/${match.canonicalSlug}`)
  const club = match.row
  const canonical = match.canonicalSlug
  const url = enUrl(`/clubs/${canonical}`)

  const lat = num(club.latitude)
  const lon = num(club.longitude)
  const [all, buses] = await Promise.all([getAllClubs(), lat !== null && lon !== null ? nightBusesNear(lat, lon, 500) : Promise.resolve([] as string[])])
  const metro = lat !== null && lon !== null ? nearestMetroStations(lat, lon, 900, 2) : []

  const hours = hoursEn(club.hours, club.open_days)
  const price = priceEn(club.price)
  const music = musicEn(club.music)
  const dress = dressEn(club)
  const age = minAgeOf(club)
  const features = featuresEn(club)
  const rating = ratingOf(club)
  const kind = venueKindEn(club.venue_type)
  const street = streetOf(club)
  const area = typeof club.neighborhood === "string" ? club.neighborhood.trim() : ""
  const closed = club.temporarily_closed === true
  const openingHours = closed ? [] : clubOpeningHoursSpec(club.hours, club.open_days)

  const related = rankClubs(
    all.filter((c) => c.id !== club.id && englishClubEligible(c) && (area ? createSlug(c.neighborhood) === createSlug(area) : false))
  ).slice(0, 6)

  const ld = {
    "@context": "https://schema.org",
    "@type": "NightClub",
    name: club.name,
    description: clubSummaryEn(club),
    inLanguage: "en",
    image: [club.image, ...(Array.isArray(club.gallery) ? club.gallery : [])].filter(Boolean).slice(0, 6),
    url,
    ...(club.website ? { sameAs: [club.website, club.instagram].filter(Boolean) } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: street || undefined,
      addressLocality: area || "Barcelona",
      addressCountry: "ES",
    },
    ...(lat !== null && lon !== null ? { geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lon } } : {}),
    ...(price?.translated ? { priceRange: cleanPriceRange(price.text) } : {}),
    ...(openingHours.length > 0 ? { openingHoursSpecification: openingHours } : {}),
  }
  const crumbs = [
    { name: "Noctua", url: enUrl("") },
    { name: "Clubs & bars", url: enUrl("/clubs") },
    ...(area && createSlug(area) ? [{ name: area, url: enUrl(`/neighbourhoods/${createSlug(area)}`) }] : []),
    { name: club.name, url },
  ]

  const mapHref = lat !== null && lon !== null ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}` : null
  const website = typeof club.website === "string" && /^https?:\/\//.test(club.website) ? club.website : null

  return (
    <IntlShell esHref={`/clubs/${canonical}`} current="/en/clubs">
      <JsonLd data={ld} />
      <JsonLd data={breadcrumbLd(crumbs)} />
      <Crumbs
        items={[
          { name: "Noctua", href: "/en" },
          { name: "Clubs & bars", href: "/en/clubs" },
          ...(area && createSlug(area) ? [{ name: area, href: `/en/neighbourhoods/${createSlug(area)}` }] : []),
          { name: club.name },
        ]}
      />
      <Hero title={club.name} lead={`${capitalize(kind.noun)} in ${area || "Barcelona"}${street ? `, ${street}` : ""}.`} tone="violet">
        {closed && <p className="mt-3 inline-block rounded-full bg-amber-400/15 px-3 py-1 text-sm font-semibold text-amber-200">Temporarily closed</p>}
      </Hero>

      <div className="mx-auto mt-6 grid max-w-6xl gap-8 px-4 lg:grid-cols-[1fr_20rem]">
        <div>
          <p className="text-base leading-relaxed text-zinc-300">{clubSummaryEn(club)}</p>

          {metro.length + buses.length > 0 && (
            <section aria-labelledby="home-title" className="mt-10">
              <h2 id="home-title" className="font-display text-2xl">
                Getting home from {club.name}
              </h2>
              <div className={`${CARD} mt-4 space-y-3 p-5 text-base leading-relaxed text-zinc-300`}>
                {metro.length > 0 && (
                  <p>
                    Nearest metro: <span className="font-semibold text-ink">{listEn(metro.map((m) => `${m.name} (${metersText(m.distanceMeters)})`))}</span>.{" "}
                    <Link href="/en/guides/how-to-get-home-barcelona-at-night" className="underline decoration-white/25 underline-offset-2 hover:text-ink">
                      Metro hours
                    </Link>
                  </p>
                )}
                {buses.length > 0 && (
                  <p>
                    Night buses within 500 m: <span className="font-semibold text-ink">{buses.slice(0, 8).join(", ")}</span>.{" "}
                    <Link href="/en/night-bus" className="underline decoration-white/25 underline-offset-2 hover:text-ink">
                      All night bus lines
                    </Link>
                  </p>
                )}
                <p>
                  <Link href="/en/essentials/taxi" className="underline decoration-white/25 underline-offset-2 hover:text-ink">
                    Taxi ranks and phone numbers
                  </Link>
                </p>
              </div>
            </section>
          )}
        </div>

        <aside aria-label="Venue facts" className={`${CARD} h-fit p-5`}>
          <dl>
            {hours.length > 0 && (
              <Fact label="Opening hours">
                {hours.map((h) => (
                  <span key={h} className="block">
                    {h}
                  </span>
                ))}
              </Fact>
            )}
            {price && (
              <Fact label="Entry">
                <span lang={price.translated ? undefined : "es"}>{price.text}</span>
              </Fact>
            )}
            {music.length > 0 && <Fact label="Music">{listEn(music.map(capitalize))}</Fact>}
            {dress && <Fact label="Dress code">{dress}</Fact>}
            {age && <Fact label="Minimum age">{age}+</Fact>}
            {features.length > 0 && <Fact label="Facilities">{capitalize(listEn(features))}</Fact>}
            {rating && <Fact label="Google rating">★ {rating.value.toFixed(1)} / 5</Fact>}
            {(street || area) && <Fact label="Address">{[street, area].filter(Boolean).join(", ")}</Fact>}
          </dl>
          <div className="mt-4 flex flex-col gap-2">
            <Link href={`/clubs/${canonical}`} className="btn-pill btn-primary px-5 py-2.5 text-center text-sm">
              Open in the app
            </Link>
            {mapHref && (
              <a href={mapHref} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/15 px-5 py-2.5 text-center text-sm font-semibold text-ink transition hover:bg-white/10">
                Directions (Google Maps)
              </a>
            )}
            {website && (
              <a href={website} target="_blank" rel="noopener noreferrer nofollow" className="rounded-full border border-white/15 px-5 py-2.5 text-center text-sm font-semibold text-ink transition hover:bg-white/10">
                Website
              </a>
            )}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-zinc-500">Hours and prices come from the venue and can change. Check before you go.</p>
        </aside>
      </div>

      {related.length > 0 && (
        <Section id="related" title={`More in ${area}`}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((c) => (
              <li key={c.id}>
                <ClubCardEn club={c} />
              </li>
            ))}
          </ul>
          {area && createSlug(area) && (
            <p className="mt-5">
              <Link href={`/en/neighbourhoods/${createSlug(area)}`} className="font-semibold text-ink underline decoration-white/25 underline-offset-4 transition hover:decoration-white/60">
                All venues in {area}
              </Link>
            </p>
          )}
        </Section>
      )}
    </IntlShell>
  )
}
