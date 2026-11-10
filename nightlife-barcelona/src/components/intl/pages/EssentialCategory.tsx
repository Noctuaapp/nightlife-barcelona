import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import IntlShell from "../IntlShell"
import { CARD, Chip, Crumbs, Hero, JsonLd, Section, SourceList, Stat } from "../IntlBits"
import { essentialIn, essentialsOf } from "../../../lib/intl/essentialsText"
import { TAXI_PHONES, sourcesOf, taxiFaresOf } from "../../../lib/intl/transit"
import { getEssentials, type EssentialRowEn } from "../../../lib/intl/data"
import { NUM_LOCALE, type IntlLang } from "../../../lib/intl/lang"
import { intlMetadata } from "../../../lib/intl/meta"
import { breadcrumbLd, langPath, langUrl } from "../../../lib/intl/site"
import { uiOf, type Ui } from "../../../lib/intl/ui"

// /{idioma}/essentials/[category]: lista de sitios de una categoría (farmacias, hospitales, taxi, comida...). Se genera al pedirla
// y se renueva cada 12 h. Solo existen las categorías de essentialsOf(); las demás dan 404 (siguen solo en español).

const MAX_ROWS = 60

export function essentialCategoryMetadata(lang: IntlLang, category: string): Metadata {
  const cat = essentialIn(lang, category)
  if (!cat) return { title: uiOf(lang).essCat.notFoundTitle }
  return intlMetadata(lang, { title: cat.title, description: cat.description, sub: `/essentials/${cat.slug}`, esPath: `/essentials/${cat.slug}` })
}

const mapHref = (r: EssentialRowEn) => (r.lat !== null && r.lon !== null ? `https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lon}` : null)

function RowCard({ r, t, directions }: { r: EssentialRowEn; t: Ui["essCat"]; directions: string }) {
  const where = [r.address, r.neighborhood].filter((x) => x && x.trim()).slice(0, 2).join(", ")
  const href = mapHref(r)
  return (
    <li className="px-4 py-3">
      <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">
        {r.name}
        {r.open24 && <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-semibold text-emerald-200">{t.open24}</span>}
        {r.highFee && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-200">{t.highFee}</span>}
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
              {directions}
            </a>
          )}
        </p>
      )}
    </li>
  )
}

export default async function EssentialCategory({ lang, category }: { lang: IntlLang; category: string }) {
  const ui = uiOf(lang)
  const t = ui.essCat
  const cat = essentialIn(lang, category)
  if (!cat) notFound()
  const rows = await getEssentials(cat.key)
  const alwaysOpen = cat.slug === "taxi"
  const n24 = rows.filter((r) => r.open24).length
  // Primero los de 24 horas, luego el resto; sin pasar de MAX_ROWS.
  const sorted = [...rows].sort((a, b) => Number(b.open24) - Number(a.open24) || a.name.localeCompare(b.name, NUM_LOCALE[lang]))
  const shown = sorted.slice(0, MAX_ROWS)
  const url = langUrl(lang, `/essentials/${cat.slug}`)
  const fares = taxiFaresOf(lang)
  const sources = sourcesOf(lang)

  return (
    <IntlShell lang={lang} sub={`/essentials/${cat.slug}`} esHref={`/essentials/${cat.slug}`} current="/essentials">
      <JsonLd
        data={breadcrumbLd([
          { name: "Noctua", url: langUrl(lang) },
          { name: ui.shell.navEssentials, url: langUrl(lang, "/essentials") },
          { name: cat.h1, url },
        ])}
      />
      <Crumbs lang={lang} items={[{ name: "Noctua", href: langPath(lang) }, { name: ui.shell.navEssentials, href: langPath(lang, "/essentials") }, { name: cat.h1 }]} />
      <Hero title={cat.h1} lead={cat.intro} tone="teal">
        {rows.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
            <Stat value={String(rows.length)} label={t.statListed} />
            {!alwaysOpen && n24 > 0 && <Stat value={String(n24)} label={t.stat24} />}
          </div>
        )}
      </Hero>

      {alwaysOpen && (
        <Section id="fares" title={t.faresTitle}>
          <div className={`${CARD} overflow-x-auto`}>
            <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
              <tbody>
                {[
                  [t.fareLabels.minFare, fares.minFare],
                  [t.fareLabels.perKmNight, fares.perKmNight],
                  [t.fareLabels.perKmDay, fares.perKmDay],
                  [t.fareLabels.waitingPerHour, fares.waitingPerHour],
                  [t.fareLabels.airportSurcharge, fares.airportSurcharge],
                  [t.fareLabels.satsSurcharge, fares.satsSurcharge],
                  [t.fareLabels.fromAirportMinimum, fares.fromAirportMinimum],
                  [t.fareLabels.appBookingMinimum, fares.appBookingMinimum],
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
          <h3 className="mt-6 text-base font-semibold text-ink">{t.bookByPhone}</h3>
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
            <SourceList items={[sources.taxiAmb]} />
          </div>
        </Section>
      )}

      {shown.length > 0 ? (
        <Section id="list" title={alwaysOpen ? t.listTaxi : cat.slug === "atm" ? t.listAtm : t.listDefault}>
          <ul className={`${CARD} divide-y divide-white/10`}>
            {shown.map((r) => (
              <RowCard key={r.id} r={r} t={t} directions={ui.common.directions} />
            ))}
          </ul>
          {rows.length > shown.length && <p className="mt-2 text-xs text-zinc-500">{t.moreInApp(rows.length - shown.length)}</p>}
        </Section>
      ) : (
        <Section>
          <p className="text-base text-zinc-300">{t.empty}</p>
        </Section>
      )}

      <Section id="more">
        <div className={`${CARD} flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between`}>
          <p className="text-base font-semibold text-ink">{t.moreCta}</p>
          <Link href={`/essentials/${cat.slug}`} className="btn-pill btn-primary shrink-0 px-5 py-2.5 text-sm">
            {ui.common.openInApp}
          </Link>
        </div>
        {cat.guide && (
          <p className="mt-4 text-sm text-zinc-400">
            {t.relatedGuide}
            <Link href={langPath(lang, `/guides/${cat.guide}`)} className="text-ink underline decoration-white/25 underline-offset-2">
              {cat.guideLabel}
            </Link>
          </p>
        )}
      </Section>

      <Section id="other" title={t.otherEssentials}>
        <div className="flex flex-wrap gap-2">
          {essentialsOf(lang)
            .filter((e) => e.slug !== cat.slug)
            .map((e) => (
              <Chip key={e.slug} href={langPath(lang, `/essentials/${e.slug}`)}>
                {e.h1}
              </Chip>
            ))}
        </div>
      </Section>
    </IntlShell>
  )
}
