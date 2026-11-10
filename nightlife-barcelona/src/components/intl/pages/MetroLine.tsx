import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import IntlShell from "../IntlShell"
import { CARD, Chip, Crumbs, Hero, JsonLd, Section } from "../IntlBits"
import { METRO_LINE_CODES, METRO_LINE_SECTIONS, buildMetroLine, isMetroLine } from "../../../lib/metroLines"
import { metroStationName, operatorOf, sectionNameOf } from "../../../lib/intl/metroText"
import type { IntlLang } from "../../../lib/intl/lang"
import { intlMetadata } from "../../../lib/intl/meta"
import { breadcrumbLd, langPath, langUrl } from "../../../lib/intl/site"
import { uiOf } from "../../../lib/intl/ui"

// /{idioma}/metro/L1: estaciones de la línea en orden y los transbordos. Datos fijos: todas las líneas se generan al compilar.

function summaryOf(lang: IntlLang, code: string): string {
  const secs = METRO_LINE_SECTIONS[code] ?? []
  return secs
    .map((s) => `${secs.length > 1 && s.name ? `${sectionNameOf(lang, s.name)}: ` : ""}${metroStationName(s.stations[0])} ↔ ${metroStationName(s.stations[s.stations.length - 1])}`)
    .join(" · ")
}

export async function metroLineMetadata(lang: IntlLang, rawLine: string): Promise<Metadata> {
  const t = uiOf(lang).metroLine
  const code = rawLine.toUpperCase()
  const data = buildMetroLine(code)
  if (!data) return { title: t.notFoundTitle }
  return intlMetadata(lang, {
    title: t.metaTitle(code),
    description: t.metaDescription(data.stopCount, code, summaryOf(lang, code)),
    sub: `/metro/${code}`,
    esPath: `/metro/${code}`,
  })
}

export default function MetroLine({ lang, line: raw }: { lang: IntlLang; line: string }) {
  const ui = uiOf(lang)
  const t = ui.metroLine
  const code = raw.toUpperCase()
  if (!isMetroLine(code)) notFound()
  const data = buildMetroLine(code)
  if (!data) notFound()
  const secs = METRO_LINE_SECTIONS[code]
  // buildMetroLine pone cada tramo en los dos sentidos; para listarlo basta el de ida (posiciones pares).
  const forward = data.directions.filter((_, i) => i % 2 === 0)
  const url = langUrl(lang, `/metro/${code}`)

  return (
    <IntlShell lang={lang} sub={`/metro/${code}`} esHref={`/metro/${code}`} current="/metro">
      <JsonLd
        data={breadcrumbLd([
          { name: "Noctua", url: langUrl(lang) },
          { name: ui.shell.navMetro, url: langUrl(lang, "/metro") },
          { name: t.crumb(code), url },
        ])}
      />
      <Crumbs lang={lang} items={[{ name: "Noctua", href: langPath(lang) }, { name: ui.shell.navMetro, href: langPath(lang, "/metro") }, { name: t.crumb(code) }]} />
      <Hero title={t.heroTitle(code)} lead={t.heroLead(data.stopCount, summaryOf(lang, code), operatorOf(code))} tone="blue" />

      {forward.map((dir, i) => {
        const sec = secs[i]
        return (
          <Section key={i} id={`section-${i}`} title={secs.length > 1 && sec?.name ? t.sectionTitle(sectionNameOf(lang, sec.name)) : t.stationsTitle}>
            <ol className={`${CARD} divide-y divide-white/10`}>
              {dir.stops.map((s, j) => (
                <li key={`${s.name}-${j}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
                  <span className="w-7 shrink-0 text-right text-xs text-zinc-500">{j + 1}</span>
                  <span className="text-[15px] font-semibold text-ink">{metroStationName(s.name)}</span>
                  {s.others.length > 0 && <span className="text-sm text-zinc-400">{uiOf(lang).busLine.changeFor(s.others.join(", "))}</span>}
                </li>
              ))}
            </ol>
          </Section>
        )
      })}

      <Section id="other-lines" title={t.otherLines}>
        <div className="flex flex-wrap gap-2">
          {METRO_LINE_CODES.filter((c) => c !== code).map((c) => (
            <Chip key={c} href={langPath(lang, `/metro/${c}`)}>
              {c}
            </Chip>
          ))}
        </div>
        <p className="mt-5 text-sm text-zinc-400">
          {t.checkPre}
          <Link href={langPath(lang, "/metro")} className="text-ink underline decoration-white/25 underline-offset-2">
            {t.checkLink}
          </Link>
          {t.checkPost}
        </p>
      </Section>
    </IntlShell>
  )
}
