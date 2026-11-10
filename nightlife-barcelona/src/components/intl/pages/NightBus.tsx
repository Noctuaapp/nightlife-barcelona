import type { Metadata } from "next"
import Link from "next/link"
import IntlShell from "../IntlShell"
import { CARD, Crumbs, FaqBlock, Hero, JsonLd, Section, SourceList } from "../IntlBits"
import { NIGHT_BUS_LINES } from "../../../lib/nightBuses"
import { compareLineCodes } from "../../../lib/nitbusRoutes"
import { getNitbusData } from "../../../lib/intl/data"
import { busRouteOf, sourcesOf } from "../../../lib/intl/transit"
import type { IntlLang } from "../../../lib/intl/lang"
import { intlMetadata } from "../../../lib/intl/meta"
import { breadcrumbLd, faqLd, langPath, langUrl } from "../../../lib/intl/site"
import { uiOf } from "../../../lib/intl/ui"

// /{idioma}/night-bus: todas las líneas del Nitbus con su recorrido. Se renueva cada 12 h (el número de paradas viene de la base).

export function nightBusMetadata(lang: IntlLang): Metadata {
  const t = uiOf(lang).bus
  return intlMetadata(lang, { title: t.title, description: t.description, sub: "/night-bus", esPath: "/nitbus" })
}

export default async function NightBus({ lang }: { lang: IntlLang }) {
  const ui = uiOf(lang)
  const t = ui.bus
  const lines = Object.values(NIGHT_BUS_LINES).sort((a, b) => compareLineCodes(a.code, b.code))
  const data = await getNitbusData().catch(() => null)
  const viaCat = lines.filter((l) => l.catalunya).length
  const faq = [
    { q: t.q1, a: t.a1(lines.length, viaCat) },
    { q: t.q2, a: t.a2 },
  ]

  return (
    <IntlShell lang={lang} sub="/night-bus" esHref="/nitbus" current="/night-bus">
      <JsonLd data={breadcrumbLd([{ name: "Noctua", url: langUrl(lang) }, { name: ui.shell.navNightBus, url: langUrl(lang, "/night-bus") }])} />
      <JsonLd data={faqLd(faq)} />
      <Crumbs lang={lang} items={[{ name: "Noctua", href: langPath(lang) }, { name: ui.shell.navNightBus }]} />
      <Hero title={t.heroTitle} lead={t.heroLead} tone="blue" />

      <Section id="lines" title={t.linesTitle}>
        <ul className="grid gap-3 sm:grid-cols-2">
          {lines.map((l) => {
            const stops = data?.lines[l.code]?.stopCount
            return (
              <li key={l.code}>
                <Link href={langPath(lang, `/night-bus/${l.code}`)} className={`${CARD} block h-full p-4 transition hover:border-white/25`}>
                  <span className="block font-display text-xl text-ink">
                    {l.code} {stops ? <span className="text-sm font-normal text-zinc-400">{t.stops(stops)}</span> : null}
                  </span>
                  <span className="mt-1 block text-sm text-zinc-300">{busRouteOf(lang, l.route)}</span>
                  <span className="mt-1 block text-xs text-zinc-500">{l.catalunya ? t.stopsAtCat : t.notStopsAtCat}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section id="how" title={t.goodToKnow} narrow>
        <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-zinc-300 marker:text-zinc-600">
          <li>{t.tip1}</li>
          <li>{t.tip2}</li>
          <li>
            {t.tip3Pre}
            <Link href={langPath(lang, "/metro")} className="text-ink underline decoration-white/25 underline-offset-2">
              {t.tip3Link}
            </Link>
            {t.tip3Post}
          </li>
        </ul>
      </Section>

      <Section id="faq" title={ui.common.faqTitle} narrow>
        <FaqBlock items={faq} />
      </Section>

      <Section id="sources" title={ui.common.sourceTitle} narrow>
        <SourceList items={[sourcesOf(lang).amb]} />
      </Section>
    </IntlShell>
  )
}
