import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import IntlShell from "../../../../components/intl/IntlShell"
import { CARD, Chip, Crumbs, Hero, JsonLd, Section, Stat } from "../../../../components/intl/IntlBits"
import { ESSENTIALS_EN, essentialEn } from "../../../../lib/intl/en/essentialsText"
import { TAXI_2026, TAXI_PHONES, SOURCES } from "../../../../lib/intl/en/transit"
import { getEssentials, type EssentialRowEn } from "../../../../lib/intl/data"
import { enMetadata } from "../../../../lib/intl/meta"
import { breadcrumbLd, enUrl } from "../../../../lib/intl/site"
import { SourceList } from "../../../../components/intl/IntlBits"

// /en/essentials/[category]: lista de sitios de una categoría (farmacias, hospitales, taxi, comida...). Se genera al pedirla
// y se renueva cada 12 h. Solo existen las categorías de ESSENTIALS_EN; las demás dan 404 (siguen solo en español).
export const revalidate = 43200
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ category: string }> }

const MAX_ROWS = 60

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  const cat = essentialEn(category)
  if (!cat) return { title: "Not found | Noctua" }
  return enMetadata({ title: cat.title, description: cat.description, sub: `/essentials/${cat.slug}`, esPath: `/essentials/${cat.slug}` })
}

const mapHref = (r: EssentialRowEn) =>
  r.lat !== null && r.lon !== null ? `https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lon}` : null

function RowCard({ r }: { r: EssentialRowEn }) {
  const where = [r.address, r.neighborhood].filter((x) => x && x.trim()).slice(0, 2).join(", ")
  const href = mapHref(r)
  return (
    <li className="px-4 py-3">
      <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">
        {r.name}
        {r.open24 && <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-semibold text-emerald-200">Open 24 hours</span>}
        {r.highFee && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-200">High fees: avoid</span>}
      </p>
      {where && <p className="mt-0.5 text-sm leading-snug text-zinc-400">{where}</p>}
      {(r.phone || href) && (
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {r.phone && (
            <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="text-zinc-300 underline decoration-white/20 underline-offset-2 hover:text-ink">
              {r.phone}
            </a>
          )}
          {href && (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-zinc-300 underline decoration-white/20 underline-offset-2 hover:text-ink">
              Directions
            </a>
          )}
        </p>
      )}
    </li>
  )
}

export default async function EssentialCategoryEn({ params }: Props) {
  const { category } = await params
  const cat = essentialEn(category)
  if (!cat) notFound()
  const rows = await getEssentials(cat.key)
  const alwaysOpen = cat.slug === "taxi"
  const n24 = rows.filter((r) => r.open24).length
  // Primero los de 24 horas, luego el resto; sin pasar de MAX_ROWS.
  const sorted = [...rows].sort((a, b) => Number(b.open24) - Number(a.open24) || a.name.localeCompare(b.name, "en"))
  const shown = sorted.slice(0, MAX_ROWS)
  const url = enUrl(`/essentials/${cat.slug}`)

  return (
    <IntlShell esHref={`/essentials/${cat.slug}`} current="/en/essentials">
      <JsonLd
        data={breadcrumbLd([
          { name: "Noctua", url: enUrl("") },
          { name: "Essentials", url: enUrl("/essentials") },
          { name: cat.h1, url },
        ])}
      />
      <Crumbs items={[{ name: "Noctua", href: "/en" }, { name: "Essentials", href: "/en/essentials" }, { name: cat.h1 }]} />
      <Hero title={cat.h1} lead={cat.intro} tone="teal">
        {rows.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
            <Stat value={String(rows.length)} label="listed in Noctua" />
            {!alwaysOpen && n24 > 0 && <Stat value={String(n24)} label="open 24 hours" />}
          </div>
        )}
      </Hero>

      {alwaysOpen && (
        <Section id="fares" title="Official taxi fares, 2026">
          <div className={`${CARD} overflow-x-auto`}>
            <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
              <tbody>
                {[
                  ["Minimum fare (night tariff T-2)", TAXI_2026.minFare],
                  ["Per km, night tariff (T-2)", TAXI_2026.perKmNight],
                  ["Per km, day tariff (T-1)", TAXI_2026.perKmDay],
                  ["Waiting time, per hour", TAXI_2026.waitingPerHour],
                  ["Airport supplement", TAXI_2026.airportSurcharge],
                  ["Supplement when leaving Sants station", TAXI_2026.satsSurcharge],
                  ["Minimum fare from the airport", TAXI_2026.fromAirportMinimum],
                  ["Minimum for phone or app bookings", TAXI_2026.appBookingMinimum],
                ].map(([label, value]) => (
                  <tr key={label} className="border-b border-white/5 last:border-b-0">
                    <th scope="row" className="px-4 py-3 text-left font-semibold text-ink">
                      {label}
                    </th>
                    <td className="px-4 py-3 text-zinc-300">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="mt-6 text-base font-semibold text-ink">Book by phone</h3>
          <ul className="mt-2 space-y-1 text-base text-zinc-300">
            {TAXI_PHONES.map((p) => (
              <li key={p.tel}>
                {p.name}:{" "}
                <a href={`tel:${p.tel}`} className="font-semibold text-ink underline decoration-white/25 underline-offset-2">
                  {p.phone}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <SourceList items={[SOURCES.taxiAmb]} />
          </div>
        </Section>
      )}

      {shown.length > 0 ? (
        <Section id="list" title={alwaysOpen ? "Taxi ranks and services" : cat.slug === "atm" ? "Cash machines" : "Where to go"}>
          <ul className={`${CARD} divide-y divide-white/10`}>
            {shown.map((r) => (
              <RowCard key={r.id} r={r} />
            ))}
          </ul>
          {rows.length > shown.length && <p className="mt-2 text-xs text-zinc-500">{rows.length - shown.length} more in the app.</p>}
        </Section>
      ) : (
        <Section>
          <p className="text-base text-zinc-300">No places are listed here yet. Open the app for the latest.</p>
        </Section>
      )}

      <Section id="more">
        <div className={`${CARD} flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between`}>
          <p className="text-base font-semibold text-ink">See which are open right now, nearest first.</p>
          <Link href={`/essentials/${cat.slug}`} className="btn-pill btn-primary shrink-0 px-5 py-2.5 text-sm">
            Open in the app
          </Link>
        </div>
        {cat.guide && (
          <p className="mt-4 text-sm text-zinc-400">
            Related guide:{" "}
            <Link href={`/en/guides/${cat.guide}`} className="text-ink underline decoration-white/25 underline-offset-2">
              {cat.guideLabel}
            </Link>
          </p>
        )}
      </Section>

      <Section id="other" title="Other essentials">
        <div className="flex flex-wrap gap-2">
          {ESSENTIALS_EN.filter((e) => e.slug !== cat.slug).map((e) => (
            <Chip key={e.slug} href={`/en/essentials/${e.slug}`}>
              {e.h1}
            </Chip>
          ))}
        </div>
      </Section>
    </IntlShell>
  )
}
