import Link from "next/link"
import Image from "../ui/SafeImage"
import NightBackdrop, { type NightTone } from "../ui/NightBackdrop"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"
import { safeJsonLd } from "../../lib/structuredData"
import { langPath } from "../../lib/intl/site"
import type { IntlLang } from "../../lib/intl/lang"
import { uiOf } from "../../lib/intl/ui"
import { clubSlugOf } from "../../lib/intl/data"
import { englishClubEligible } from "../../lib/intl/clubEligible"
import { clubTagline, priceOf, ratingOf } from "../../lib/intl/clubText"
import type { DbRow } from "../../lib/clubQueries"

// Piezas comunes de las páginas en inglés, alemán, francés e italiano. Todas son de servidor (sin JavaScript en el navegador).

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }} />
}

export function Crumbs({ items, lang }: { items: { name: string; href?: string }[]; lang: IntlLang }) {
  return (
    <nav aria-label={uiOf(lang).common.crumbsAria} className="mx-auto max-w-6xl px-4 pt-4 text-xs text-zinc-400">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => (
          <li key={`${c.name}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {c.href ? (
              <Link href={c.href} className="transition hover:text-ink">
                {c.name}
              </Link>
            ) : (
              <span aria-current="page" className="text-zinc-300">
                {c.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function Hero({
  title,
  lead,
  tone = "violet",
  children,
}: {
  title: string
  lead?: string
  tone?: NightTone
  children?: React.ReactNode
}) {
  return (
    <section className="relative isolate px-4 pb-6 pt-8 sm:pt-12">
      <NightBackdrop tone={tone} />
      <div className="mx-auto max-w-6xl">
        <h1 className="max-w-3xl font-display text-3xl leading-tight sm:text-5xl">{title}</h1>
        {lead && <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">{lead}</p>}
        {children}
      </div>
    </section>
  )
}

export function Section({ title, id, children, narrow = false }: { title?: string; id?: string; children: React.ReactNode; narrow?: boolean }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={`mx-auto mt-12 px-4 ${narrow ? "max-w-3xl" : "max-w-6xl"}`}>
      {title && (
        <h2 id={id ? `${id}-title` : undefined} className="font-display text-2xl sm:text-3xl">
          {title}
        </h2>
      )}
      <div className={title ? "mt-5" : ""}>{children}</div>
    </section>
  )
}

export const CARD = "rounded-card border border-white/10 bg-surface"

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className={`${CARD} p-4`}>
      <p className="font-display text-2xl text-ink">{value}</p>
      <p className="mt-1 text-sm leading-snug text-zinc-400">{label}</p>
    </div>
  )
}

export function Chip({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-2 text-sm font-semibold text-ink transition hover:border-white/30 hover:bg-white/10"
    >
      {children}
    </Link>
  )
}

export function FaqBlock({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="space-y-2">
      {items.map((f) => (
        <details key={f.q} className={`${CARD} group p-4`}>
          <summary className="cursor-pointer list-none text-base font-semibold text-ink marker:hidden">
            <span className="flex items-start justify-between gap-3">
              {f.q}
              <span aria-hidden="true" className="mt-0.5 text-zinc-500 transition group-open:rotate-45">
                +
              </span>
            </span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">{f.a}</p>
        </details>
      ))}
    </div>
  )
}

export function SourceList({ items }: { items: { name: string; url: string }[] }) {
  if (items.length === 0) return null
  return (
    <ul className="space-y-1.5 text-sm text-zinc-400">
      {items.map((s) => (
        <li key={s.url}>
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline decoration-white/20 underline-offset-2 transition hover:text-ink">
            {s.name}
          </a>
        </li>
      ))}
    </ul>
  )
}

/** Tarjeta de local. Si el local no tiene página internacional que valga la pena, enlaza a su ficha en español (la web ya traduce sola). */
export function ClubCard({ club, lang }: { club: DbRow; lang: IntlLang }) {
  const slug = clubSlugOf(club)
  const href = englishClubEligible(club) ? langPath(lang, `/clubs/${slug}`) : `/clubs/${slug}`
  const rating = ratingOf(club)
  const price = priceOf(lang, club.price)
  const showPrice = price && price.text.length <= 28
  return (
    <Link href={href} className={`${CARD} group flex gap-3 p-3 transition hover:border-white/25`}>
      <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-ctl bg-white/5">
        <Image src={club.image || FALLBACK_IMAGE} alt="" fill sizes="80px" unoptimized={!club.image} className="object-cover transition duration-500 group-hover:scale-105" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold text-ink">{club.name}</span>
        <span className="mt-0.5 block truncate text-xs text-zinc-400">{clubTagline(lang, club)}</span>
        {(rating || showPrice) && (
          <span className="mt-1.5 flex items-center gap-2 text-xs text-zinc-300">
            {rating && <span className="font-semibold text-ink">★ {lang === "en" ? rating.value.toFixed(1) : rating.value.toFixed(1).replace(".", ",")}</span>}
            {showPrice && (
              <span className="truncate" lang={price.translated ? undefined : "es"}>
                {price.text}
              </span>
            )}
          </span>
        )}
      </span>
    </Link>
  )
}

/** Fila de «dato: valor» de las fichas. */
export function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-white/10 py-3 first:border-t-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 text-[15px] leading-snug text-ink">{children}</dd>
    </div>
  )
}
