import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import IntlShell from "../../../../components/intl/IntlShell"
import { CARD, Chip, Crumbs, Hero, JsonLd, Section } from "../../../../components/intl/IntlBits"
import { METRO_LINE_CODES, METRO_LINE_SECTIONS, buildMetroLine, isMetroLine } from "../../../../lib/metroLines"
import { metroStationName, operatorOf, sectionName } from "../../../../lib/intl/en/metroText"
import { enMetadata } from "../../../../lib/intl/meta"
import { breadcrumbLd, enUrl } from "../../../../lib/intl/site"

// /en/metro/L1: estaciones de la línea en orden y los transbordos. Datos fijos: todas las líneas se generan al compilar.
export const dynamicParams = false
export function generateStaticParams() {
  return METRO_LINE_CODES.map((line) => ({ line }))
}

type Props = { params: Promise<{ line: string }> }

function summaryOf(code: string): string {
  const secs = METRO_LINE_SECTIONS[code] ?? []
  return secs
    .map((s) => `${secs.length > 1 && s.name ? `${sectionName(s.name)}: ` : ""}${metroStationName(s.stations[0])} ↔ ${metroStationName(s.stations[s.stations.length - 1])}`)
    .join(" · ")
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { line } = await params
  const code = line.toUpperCase()
  const data = buildMetroLine(code)
  if (!data) return { title: "Line not found | Noctua" }
  return enMetadata({
    title: `Barcelona Metro ${code}: Stations & Route | Noctua`,
    description: `The ${data.stopCount} stations of metro line ${code} in Barcelona in order (${summaryOf(code)}), with connections to other lines.`,
    sub: `/metro/${code}`,
    esPath: `/metro/${code}`,
  })
}

export default async function MetroLineEn({ params }: Props) {
  const { line: raw } = await params
  const code = raw.toUpperCase()
  if (!isMetroLine(code)) notFound()
  const data = buildMetroLine(code)
  if (!data) notFound()
  const secs = METRO_LINE_SECTIONS[code]
  // buildMetroLine pone cada tramo en los dos sentidos; para listarlo basta el de ida (posiciones pares).
  const forward = data.directions.filter((_, i) => i % 2 === 0)
  const url = enUrl(`/metro/${code}`)

  return (
    <IntlShell esHref={`/metro/${code}`} current="/en/metro">
      <JsonLd
        data={breadcrumbLd([
          { name: "Noctua", url: enUrl("") },
          { name: "Metro", url: enUrl("/metro") },
          { name: `Metro ${code}`, url },
        ])}
      />
      <Crumbs items={[{ name: "Noctua", href: "/en" }, { name: "Metro", href: "/en/metro" }, { name: `Metro ${code}` }]} />
      <Hero title={`Barcelona metro ${code}`} lead={`${data.stopCount} stations · ${summaryOf(code)} · operated by ${operatorOf(code)}`} tone="blue" />

      {forward.map((dir, i) => {
        const sec = secs[i]
        return (
          <Section key={i} id={`section-${i}`} title={secs.length > 1 && sec?.name ? `${sectionName(sec.name)} section` : "Stations"}>
            <ol className={`${CARD} divide-y divide-white/10`}>
              {dir.stops.map((s, j) => (
                <li key={`${s.name}-${j}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
                  <span className="w-7 shrink-0 text-right text-xs text-zinc-500">{j + 1}</span>
                  <span className="text-[15px] font-semibold text-ink">{metroStationName(s.name)}</span>
                  {s.others.length > 0 && <span className="text-sm text-zinc-400">Change for {s.others.join(", ")}</span>}
                </li>
              ))}
            </ol>
          </Section>
        )
      })}

      <Section id="other-lines" title="Other lines">
        <div className="flex flex-wrap gap-2">
          {METRO_LINE_CODES.filter((c) => c !== code).map((c) => (
            <Chip key={c} href={`/en/metro/${c}`}>
              {c}
            </Chip>
          ))}
        </div>
        <p className="mt-5 text-sm text-zinc-400">
          Check the{" "}
          <Link href="/en/metro" className="text-ink underline decoration-white/25 underline-offset-2">
            metro hours
          </Link>{" "}
          before you go out.
        </p>
      </Section>
    </IntlShell>
  )
}
