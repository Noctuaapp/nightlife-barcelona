import type { Metadata } from "next"
import Link from "next/link"
import IntlShell from "../IntlShell"
import { CARD, Crumbs, FaqBlock, Hero, JsonLd, Section, SourceList } from "../IntlBits"
import { METRO_LINE_CODES, METRO_LINE_SECTIONS, buildMetroLine } from "../../../lib/metroLines"
import { metroHoursOf, metroNoteOf, sourcesOf } from "../../../lib/intl/transit"
import { metroStationName, sectionNameOf } from "../../../lib/intl/metroText"
import type { IntlLang } from "../../../lib/intl/lang"
import { intlMetadata } from "../../../lib/intl/meta"
import { breadcrumbLd, faqLd, langPath, langUrl } from "../../../lib/intl/site"
import { uiOf } from "../../../lib/intl/ui"

// /{idioma}/metro: horario nocturno y líneas. Los datos son fijos (lib/metroLines.ts), así que la página se genera al compilar.

export function metroMetadata(lang: IntlLang): Metadata {
  const t = uiOf(lang).metro
  return intlMetadata(lang, { title: t.title, description: t.description, sub: "/metro", esPath: "/metro" })
}

export default function MetroIndex({ lang }: { lang: IntlLang }) {
  const ui = uiOf(lang)
  const t = ui.metro
  const faq = [
    { q: t.q1, a: t.a1 },
    { q: t.q2, a: t.a2 },
  ]
  const lines = METRO_LINE_CODES.map((code) => {
    const secs = METRO_LINE_SECTIONS[code]
    return {
      code,
      routes: secs.map((s) => `${secs.length > 1 && s.name ? `${sectionNameOf(lang, s.name)}: ` : ""}${metroStationName(s.stations[0])} ↔ ${metroStationName(s.stations[s.stations.length - 1])}`),
      count: buildMetroLine(code)?.stopCount ?? 0,
    }
  })

  return (
    <IntlShell lang={lang} sub="/metro" esHref="/metro" current="/metro">
      <JsonLd data={breadcrumbLd([{ name: "Noctua", url: langUrl(lang) }, { name: ui.shell.navMetro, url: langUrl(lang, "/metro") }])} />
      <JsonLd data={faqLd(faq)} />
      <Crumbs lang={lang} items={[{ name: "Noctua", href: langPath(lang) }, { name: ui.shell.navMetro }]} />
      <Hero title={t.heroTitle} lead={t.heroLead} tone="blue" />

      <Section id="hours" title={t.hoursTitle}>
        <div className={`${CARD} overflow-x-auto`}>
          <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500">
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t.thWhen}
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t.thHours}
                </th>
              </tr>
            </thead>
            <tbody>
              {metroHoursOf(lang).map((r) => (
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
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">{metroNoteOf(lang)}</p>
        <p className="mt-4 text-base text-zinc-300">
          {t.closedPre}
          <Link href={langPath(lang, "/night-bus")} className="font-semibold text-ink underline decoration-white/25 underline-offset-4 hover:decoration-white/60">
            {t.closedBus}
          </Link>
          {t.closedMid}
          <Link href={langPath(lang, "/essentials/taxi")} className="font-semibold text-ink underline decoration-white/25 underline-offset-4 hover:decoration-white/60">
            {t.closedTaxi}
          </Link>
          {t.closedPost}
        </p>
      </Section>

      <Section id="lines" title={t.linesTitle}>
        <ul className="grid gap-3 sm:grid-cols-2">
          {lines.map((l) => (
            <li key={l.code}>
              <Link href={langPath(lang, `/metro/${l.code}`)} className={`${CARD} block h-full p-4 transition hover:border-white/25`}>
                <span className="block font-display text-xl text-ink">
                  {l.code} <span className="text-sm font-normal text-zinc-400">{t.stations(l.count)}</span>
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

      <Section id="faq" title={ui.common.faqTitle} narrow>
        <FaqBlock items={faq} />
      </Section>

      <Section id="sources" title={ui.common.sourceTitle} narrow>
        <SourceList items={[sourcesOf(lang).tmbHours]} />
      </Section>
    </IntlShell>
  )
}
