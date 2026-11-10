import type { Metadata } from "next"
import Link from "next/link"
import IntlShell from "../../../components/intl/IntlShell"
import { CARD, Crumbs, FaqBlock, Hero, JsonLd, Section, SourceList } from "../../../components/intl/IntlBits"
import { METRO_LINE_CODES, METRO_LINE_SECTIONS, buildMetroLine } from "../../../lib/metroLines"
import { METRO_HOURS, METRO_HOURS_NOTE, SOURCES } from "../../../lib/intl/en/transit"
import { enMetadata } from "../../../lib/intl/meta"
import { breadcrumbLd, enUrl, faqLd } from "../../../lib/intl/site"
import { metroStationName, sectionName } from "../../../lib/intl/en/metroText"

// /en/metro: horario nocturno y líneas. Los datos son fijos (lib/metroLines.ts), así que la página se genera al compilar.

export const metadata: Metadata = enMetadata({
  title: "Barcelona Metro at Night: Hours, Lines & Stations | Noctua",
  description: "Barcelona metro opening hours on weekends and at night, plus all 12 lines with their stations in order. Know when the last train leaves before you go out.",
  sub: "/metro",
  esPath: "/metro",
})

const FAQ = [
  {
    q: "Does the Barcelona metro run all night?",
    a: "Only on Saturday nights, when it runs non-stop from Saturday morning until midnight on Sunday, and on a few special nights such as Sant Joan and New Year's Eve. On Fridays and the night before a public holiday it closes at 02:00, and on other nights at midnight.",
  },
  {
    q: "What time does the first metro start?",
    a: "Services start at 05:00 on weekdays and Saturdays. Check TMB for Sundays and public holidays.",
  },
]

export default function MetroEn() {
  const lines = METRO_LINE_CODES.map((code) => {
    const secs = METRO_LINE_SECTIONS[code]
    return {
      code,
      routes: secs.map((s) => `${secs.length > 1 && s.name ? `${sectionName(s.name)}: ` : ""}${metroStationName(s.stations[0])} ↔ ${metroStationName(s.stations[s.stations.length - 1])}`),
      count: buildMetroLine(code)?.stopCount ?? 0,
    }
  })

  return (
    <IntlShell esHref="/metro" current="/en/metro">
      <JsonLd data={breadcrumbLd([{ name: "Noctua", url: enUrl("") }, { name: "Metro", url: enUrl("/metro") }])} />
      <JsonLd data={faqLd(FAQ)} />
      <Crumbs items={[{ name: "Noctua", href: "/en" }, { name: "Metro" }]} />
      <Hero title="Barcelona metro at night" lead="When the last train leaves, and every line with its stations in order." tone="blue" />

      <Section id="hours" title="Metro hours">
        <div className={`${CARD} overflow-x-auto`}>
          <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500">
                <th scope="col" className="px-4 py-3 font-semibold">
                  When
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Metro hours
                </th>
              </tr>
            </thead>
            <tbody>
              {METRO_HOURS.map((r) => (
                <tr key={r.when} className="border-b border-white/5 last:border-b-0">
                  <th scope="row" className="px-4 py-3 align-top font-semibold text-ink">
                    {r.when}
                  </th>
                  <td className="px-4 py-3 align-top text-zinc-300">{r.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">{METRO_HOURS_NOTE}</p>
        <p className="mt-4 text-base text-zinc-300">
          When the metro is closed, take the{" "}
          <Link href="/en/night-bus" className="font-semibold text-ink underline decoration-white/25 underline-offset-4 hover:decoration-white/60">
            night bus
          </Link>{" "}
          or a{" "}
          <Link href="/en/essentials/taxi" className="font-semibold text-ink underline decoration-white/25 underline-offset-4 hover:decoration-white/60">
            taxi
          </Link>
          .
        </p>
      </Section>

      <Section id="lines" title="Metro lines">
        <ul className="grid gap-3 sm:grid-cols-2">
          {lines.map((l) => (
            <li key={l.code}>
              <Link href={`/en/metro/${l.code}`} className={`${CARD} block h-full p-4 transition hover:border-white/25`}>
                <span className="block font-display text-xl text-ink">
                  {l.code} <span className="text-sm font-normal text-zinc-400">{l.count} stations</span>
                </span>
                {l.routes.map((r) => (
                  <span key={r} className="mt-1 block text-sm text-zinc-300">
                    {r}
                  </span>
                ))}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="faq" title="Frequently asked questions" narrow>
        <FaqBlock items={FAQ} />
      </Section>

      <Section id="sources" title="Source" narrow>
        <SourceList items={[SOURCES.tmbHours]} />
      </Section>
    </IntlShell>
  )
}
