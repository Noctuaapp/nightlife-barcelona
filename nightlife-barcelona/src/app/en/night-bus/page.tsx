import type { Metadata } from "next"
import Link from "next/link"
import IntlShell from "../../../components/intl/IntlShell"
import { CARD, Crumbs, FaqBlock, Hero, JsonLd, Section, SourceList } from "../../../components/intl/IntlBits"
import { NIGHT_BUS_LINES } from "../../../lib/nightBuses"
import { compareLineCodes } from "../../../lib/nitbusRoutes"
import { getNitbusData } from "../../../lib/intl/data"
import { busRouteEn } from "../../../lib/intl/en/transit"
import { SOURCES } from "../../../lib/intl/en/transit"
import { enMetadata } from "../../../lib/intl/meta"
import { breadcrumbLd, enUrl, faqLd } from "../../../lib/intl/site"

// /en/night-bus: todas las líneas del Nitbus con su recorrido. Se renueva cada 12 h (el número de paradas viene de la base).
export const revalidate = 43200

export const metadata: Metadata = enMetadata({
  title: "Barcelona Night Bus (NitBus): All N-Lines, Routes & Stops | Noctua",
  description: "Every Barcelona night bus line (N0 to N28) with its route, stops and transfers. How to get home when the metro is closed.",
  sub: "/night-bus",
  esPath: "/nitbus",
})

export default async function NightBusEn() {
  const lines = Object.values(NIGHT_BUS_LINES).sort((a, b) => compareLineCodes(a.code, b.code))
  const data = await getNitbusData().catch(() => null)
  const viaCat = lines.filter((l) => l.catalunya).length
  const faq = [
    {
      q: "Is there a night bus in Barcelona?",
      a: `Yes. The NitBus network has ${lines.length} N-lines in Noctua's list, and ${viaCat} of them stop at Plaça Catalunya, the central transfer point. Buses generally run from about 22:00 to about 05:00–05:30, roughly every 20 minutes; check the timetable of your line.`,
    },
    {
      q: "Where do I catch the night bus?",
      a: "Most lines pass through Plaça Catalunya. Each line page lists its stops in order, so you can find the one nearest to you.",
    },
  ]

  return (
    <IntlShell esHref="/nitbus" current="/en/night-bus">
      <JsonLd data={breadcrumbLd([{ name: "Noctua", url: enUrl("") }, { name: "Night bus", url: enUrl("/night-bus") }])} />
      <JsonLd data={faqLd(faq)} />
      <Crumbs items={[{ name: "Noctua", href: "/en" }, { name: "Night bus" }]} />
      <Hero
        title="Barcelona night bus (NitBus)"
        lead="The N-lines take over when the metro closes. Pick a line to see its stops in order and where you can change."
        tone="blue"
      />

      <Section id="lines" title="Night bus lines">
        <ul className="grid gap-3 sm:grid-cols-2">
          {lines.map((l) => {
            const stops = data?.lines[l.code]?.stopCount
            return (
              <li key={l.code}>
                <Link href={`/en/night-bus/${l.code}`} className={`${CARD} block h-full p-4 transition hover:border-white/25`}>
                  <span className="block font-display text-xl text-ink">
                    {l.code} {stops ? <span className="text-sm font-normal text-zinc-400">{stops} stops</span> : null}
                  </span>
                  <span className="mt-1 block text-sm text-zinc-300">{busRouteEn(l.route)}</span>
                  <span className="mt-1 block text-xs text-zinc-500">{l.catalunya ? "Stops at Plaça Catalunya" : "Does not stop at Plaça Catalunya"}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section id="how" title="Good to know" narrow>
        <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-zinc-300 marker:text-zinc-600">
          <li>Night buses generally run from about 22:00 until about 05:00–05:30, roughly every 20 minutes. Exact times vary by line.</li>
          <li>If you are not sure which bus to take, go to Plaça Catalunya and change there.</li>
          <li>
            The metro runs until 02:00 on Fridays and all night on Saturdays: see the{" "}
            <Link href="/en/metro" className="text-ink underline decoration-white/25 underline-offset-2">
              metro hours
            </Link>
            .
          </li>
        </ul>
      </Section>

      <Section id="faq" title="Frequently asked questions" narrow>
        <FaqBlock items={faq} />
      </Section>

      <Section id="sources" title="Source" narrow>
        <SourceList items={[SOURCES.amb]} />
      </Section>
    </IntlShell>
  )
}
