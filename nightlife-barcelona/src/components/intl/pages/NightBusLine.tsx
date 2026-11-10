import type { Metadata } from "next"
import { cache } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import IntlShell from "../IntlShell"
import { CARD, Chip, Crumbs, Hero, JsonLd, Section } from "../IntlBits"
import { NIGHT_BUS_LINES, getNightBusLine, parseRoute } from "../../../lib/nightBuses"
import { compareLineCodes } from "../../../lib/nitbusRoutes"
import { getNitbusData } from "../../../lib/intl/data"
import { busRouteOf } from "../../../lib/intl/transit"
import type { IntlLang } from "../../../lib/intl/lang"
import { intlMetadata } from "../../../lib/intl/meta"
import { breadcrumbLd, langPath, langUrl } from "../../../lib/intl/site"
import { uiOf } from "../../../lib/intl/ui"

// /{idioma}/night-bus/N24: recorrido de la línea con sus paradas en orden. Se genera al pedirla y se renueva cada 12 h.

const getData = cache(async () => getNitbusData().catch(() => null))

export async function nightBusLineMetadata(lang: IntlLang, rawLine: string): Promise<Metadata> {
  const t = uiOf(lang).busLine
  const code = rawLine.toUpperCase()
  const info = getNightBusLine(code)
  if (!info) return { title: t.notFoundTitle }
  const data = await getData()
  const n = data?.lines[code]?.stopCount
  const route = busRouteOf(lang, info.route)
  return intlMetadata(lang, {
    title: t.metaTitle(code),
    description: t.metaDescription(n, code, route),
    sub: `/night-bus/${code}`,
    esPath: `/nitbus/${code}`,
  })
}

export default async function NightBusLine({ lang, line: raw }: { lang: IntlLang; line: string }) {
  const ui = uiOf(lang)
  const t = ui.busLine
  const code = raw.toUpperCase()
  const info = getNightBusLine(code)
  const data = await getData()
  const line = data?.lines[code] ?? null
  if (!info && !line) notFound()
  const route = info ? parseRoute(busRouteOf(lang, info.route)) : null
  const allCodes = Object.keys(NIGHT_BUS_LINES).sort(compareLineCodes)
  const url = langUrl(lang, `/night-bus/${code}`)
  const leadRoute = route ? `${route.to ? `${route.from} ↔ ${route.to}` : route.from}${route.note ? ` (${route.note})` : ""}` : ""

  return (
    <IntlShell lang={lang} sub={`/night-bus/${code}`} esHref={`/nitbus/${code}`} current="/night-bus">
      <JsonLd
        data={breadcrumbLd([
          { name: "Noctua", url: langUrl(lang) },
          { name: ui.shell.navNightBus, url: langUrl(lang, "/night-bus") },
          { name: t.crumb(code), url },
        ])}
      />
      <Crumbs lang={lang} items={[{ name: "Noctua", href: langPath(lang) }, { name: ui.shell.navNightBus, href: langPath(lang, "/night-bus") }, { name: code }]} />
      <Hero title={t.heroTitle(code)} lead={route ? `${leadRoute}${info?.catalunya ? `. ${t.atCatSentence}` : "."}` : t.heroLeadFallback} tone="blue" />

      {line && line.directions.length > 0 ? (
        <>
          {!line.ordered && (
            <Section>
              <p className="rounded-card border border-amber-400/30 bg-amber-400/[0.06] p-4 text-sm leading-relaxed text-zinc-300">{t.unorderedNote}</p>
            </Section>
          )}
          {line.directions.map((d, i) => (
            <Section key={i} id={`dir-${i}`} title={line.ordered ? `${d.from} → ${d.to}` : t.stopsTitle}>
              <ol className={`${CARD} divide-y divide-white/10`}>
                {d.stops.map((s, j) => (
                  <li key={`${s.name}-${j}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
                    {line.ordered && <span className="w-7 shrink-0 text-right text-xs text-zinc-500">{j + 1}</span>}
                    <span className="text-[15px] font-semibold text-ink">{s.name}</span>
                    {s.others.length > 0 && <span className="text-sm text-zinc-400">{t.changeFor(s.others.join(", "))}</span>}
                  </li>
                ))}
              </ol>
            </Section>
          ))}
        </>
      ) : (
        <Section>
          <p className="text-base text-zinc-300">{t.noStops}</p>
        </Section>
      )}

      <Section id="other-lines" title={t.otherLines}>
        <div className="flex flex-wrap gap-2">
          {allCodes
            .filter((c) => c !== code)
            .map((c) => (
              <Chip key={c} href={langPath(lang, `/night-bus/${c}`)}>
                {c}
              </Chip>
            ))}
        </div>
        <p className="mt-5 text-sm text-zinc-400">
          <Link href={langPath(lang, "/night-bus")} className="text-ink underline decoration-white/25 underline-offset-2">
            {t.allLines}
          </Link>
          {t.hoursNote}
        </p>
      </Section>
    </IntlShell>
  )
}
