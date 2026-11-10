import type { Metadata } from "next"
import { cache } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import IntlShell from "../../../../components/intl/IntlShell"
import { CARD, Chip, Crumbs, Hero, JsonLd, Section } from "../../../../components/intl/IntlBits"
import { NIGHT_BUS_LINES, getNightBusLine, parseRoute } from "../../../../lib/nightBuses"
import { compareLineCodes } from "../../../../lib/nitbusRoutes"
import { getNitbusData } from "../../../../lib/intl/data"
import { busRouteEn } from "../../../../lib/intl/en/transit"
import { enMetadata } from "../../../../lib/intl/meta"
import { breadcrumbLd, enUrl } from "../../../../lib/intl/site"

// /en/night-bus/N24: recorrido de la línea con sus paradas en orden. Se genera al pedirla y se renueva cada 12 h.
export const revalidate = 43200
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ line: string }> }

const getData = cache(async () => getNitbusData().catch(() => null))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { line } = await params
  const code = line.toUpperCase()
  const info = getNightBusLine(code)
  if (!info) return { title: "Line not found | Noctua" }
  const data = await getData()
  const n = data?.lines[code]?.stopCount
  const route = busRouteEn(info.route)
  return enMetadata({
    title: `Barcelona Night Bus ${code}: Route & Stops | Noctua`,
    description: `${n ? `The ${n} stops` : "The stops"} of night bus ${code} in Barcelona in order, with transfers to other night lines. Route: ${route}.`,
    sub: `/night-bus/${code}`,
    esPath: `/nitbus/${code}`,
  })
}

export default async function NightBusLineEn({ params }: Props) {
  const { line: raw } = await params
  const code = raw.toUpperCase()
  const info = getNightBusLine(code)
  const data = await getData()
  const line = data?.lines[code] ?? null
  if (!info && !line) notFound()
  const route = info ? parseRoute(busRouteEn(info.route)) : null
  const allCodes = Object.keys(NIGHT_BUS_LINES).sort(compareLineCodes)
  const url = enUrl(`/night-bus/${code}`)

  return (
    <IntlShell esHref={`/nitbus/${code}`} current="/en/night-bus">
      <JsonLd
        data={breadcrumbLd([
          { name: "Noctua", url: enUrl("") },
          { name: "Night bus", url: enUrl("/night-bus") },
          { name: `Night bus ${code}`, url },
        ])}
      />
      <Crumbs items={[{ name: "Noctua", href: "/en" }, { name: "Night bus", href: "/en/night-bus" }, { name: code }]} />
      <Hero
        title={`Barcelona night bus ${code}`}
        lead={
          route
            ? `${route.to ? `${route.from} ↔ ${route.to}` : route.from}${route.note ? ` (${route.note})` : ""}${info?.catalunya ? ". Stops at Plaça Catalunya." : "."}`
            : "Night bus line."
        }
        tone="blue"
      />

      {line && line.directions.length > 0 ? (
        <>
          {!line.ordered && (
            <Section>
              <p className="rounded-card border border-amber-400/30 bg-amber-400/[0.06] p-4 text-sm leading-relaxed text-zinc-300">
                We don&apos;t have the exact order of the stops for this line yet, so they are listed alphabetically.
              </p>
            </Section>
          )}
          {line.directions.map((d, i) => (
            <Section key={i} id={`dir-${i}`} title={line.ordered ? `${d.from} → ${d.to}` : "Stops"}>
              <ol className={`${CARD} divide-y divide-white/10`}>
                {d.stops.map((s, j) => (
                  <li key={`${s.name}-${j}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
                    {line.ordered && <span className="w-7 shrink-0 text-right text-xs text-zinc-500">{j + 1}</span>}
                    <span className="text-[15px] font-semibold text-ink">{s.name}</span>
                    {s.others.length > 0 && <span className="text-sm text-zinc-400">Change for {s.others.join(", ")}</span>}
                  </li>
                ))}
              </ol>
            </Section>
          ))}
        </>
      ) : (
        <Section>
          <p className="text-base text-zinc-300">We don&apos;t have the stops for this line yet. Check the line in the app or on the official AMB site.</p>
        </Section>
      )}

      <Section id="other-lines" title="Other night bus lines">
        <div className="flex flex-wrap gap-2">
          {allCodes
            .filter((c) => c !== code)
            .map((c) => (
              <Chip key={c} href={`/en/night-bus/${c}`}>
                {c}
              </Chip>
            ))}
        </div>
        <p className="mt-5 text-sm text-zinc-400">
          <Link href="/en/night-bus" className="text-ink underline decoration-white/25 underline-offset-2">
            All night bus lines
          </Link>{" "}
          · Night buses generally run from about 22:00 to about 05:00–05:30.
        </p>
      </Section>
    </IntlShell>
  )
}
