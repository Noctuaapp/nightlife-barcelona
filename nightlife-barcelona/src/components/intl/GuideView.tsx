import Link from "next/link"
import { CARD, FaqBlock, Hero, JsonLd, Crumbs, Section, SourceList } from "./IntlBits"
import type { Block, Guide } from "../../lib/intl/guideTypes"
import { guidesOf } from "../../lib/intl/guides"
import type { IntlLang } from "../../lib/intl/lang"
import { uiOf } from "../../lib/intl/ui"
import { breadcrumbLd, langPath, langUrl, faqLd, SITE } from "../../lib/intl/site"

// Pinta una guía (lib/intl/{idioma}/guides.ts) como página: titular, índice, secciones, preguntas, fuentes y
// guías relacionadas. Es un componente de servidor: todo el texto sale en el HTML.

function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case "p":
      return <p className="mt-4 text-base leading-relaxed text-zinc-300">{b.text}</p>
    case "ul":
      return (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-relaxed text-zinc-300 marker:text-zinc-600">
          {b.items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
      )
    case "table":
      return (
        <div className="mt-4">
          <div className={`${CARD} overflow-x-auto`}>
            <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500">
                  {b.head.map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, i) => (
                  <tr key={`${r[0]}-${i}`} className="border-b border-white/5 last:border-b-0">
                    {r.map((cell, j) =>
                      j === 0 ? (
                        <th key={j} scope="row" className="px-4 py-3 align-top font-semibold text-ink">
                          {cell}
                        </th>
                      ) : (
                        <td key={j} className="px-4 py-3 align-top text-zinc-300">
                          {cell}
                        </td>
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {b.note && <p className="mt-2 text-xs leading-relaxed text-zinc-500">{b.note}</p>}
        </div>
      )
    case "note":
      return (
        <aside
          className={`mt-5 rounded-card border p-4 ${b.tone === "warn" ? "border-amber-400/30 bg-amber-400/[0.06]" : "border-white/10 bg-white/[0.04]"}`}
        >
          <p className="text-sm font-semibold text-ink">{b.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-300">{b.text}</p>
        </aside>
      )
    case "links":
      return (
        <ul className="mt-4 space-y-2">
          {b.items.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="font-semibold text-ink underline decoration-white/25 underline-offset-4 transition hover:decoration-white/60">
                {l.label}
              </Link>
              {l.note && <span className="text-sm text-zinc-400"> – {l.note}</span>}
            </li>
          ))}
        </ul>
      )
    case "places":
      return (
        <div className="mt-4">
          <ul className={`${CARD} divide-y divide-white/10`}>
            {b.items.map((p) => (
              <li key={`${p.name}-${p.line}`} className="px-4 py-3">
                <p className="text-[15px] font-semibold text-ink">{p.name}</p>
                {p.line && <p className="mt-0.5 text-sm leading-snug text-zinc-400">{p.line}</p>}
              </li>
            ))}
          </ul>
          {b.more && <p className="mt-2 text-xs text-zinc-500">{b.more}</p>}
        </div>
      )
  }
}

export default function GuideView({ guide, updated, lang }: { guide: Guide; updated: string; lang: IntlLang }) {
  const ui = uiOf(lang)
  const gv = ui.guideView
  const { guideMeta } = guidesOf(lang)
  const url = langUrl(lang, `/guides/${guide.slug}`)
  const related = guide.related.map((s) => guideMeta(s)).filter((g): g is NonNullable<typeof g> => !!g)

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.h1,
    description: guide.description,
    inLanguage: lang,
    mainEntityOfPage: url,
    dateModified: updated,
    author: { "@type": "Organization", name: "Noctua", url: SITE },
    publisher: { "@type": "Organization", name: "Noctua", url: SITE },
  }
  const crumbs = [
    { name: "Noctua", url: langUrl(lang, "") },
    { name: ui.shell.navGuides, url: langUrl(lang, "/guides") },
    { name: guide.h1, url },
  ]

  return (
    <>
      <JsonLd data={article} />
      <JsonLd data={breadcrumbLd(crumbs)} />
      {guide.faq.length > 0 && <JsonLd data={faqLd(guide.faq)} />}

      <Crumbs lang={lang} items={[{ name: "Noctua", href: langPath(lang) }, { name: ui.shell.navGuides, href: langPath(lang, "/guides") }, { name: guide.h1 }]} />
      <Hero title={guide.h1} lead={guide.lead} tone="blue">
        <p className="mt-4 text-xs text-zinc-500">
          {gv.factsChecked}
          <time dateTime={updated}>{new Date(updated).toLocaleDateString(gv.dateLang, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</time>
          {gv.figuresLive}
        </p>
      </Hero>

      <div className="mx-auto max-w-3xl px-4">
        {guide.sections.length > 2 && (
          <nav aria-label={gv.inThisGuide} className={`${CARD} mt-8 p-4`}>
            <p className="text-sm font-semibold text-ink">{gv.inThisGuide}</p>
            <ol className="mt-2 space-y-1.5 text-sm">
              {guide.sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-zinc-300 underline decoration-white/20 underline-offset-2 transition hover:text-ink">
                    {s.h2}
                  </a>
                </li>
              ))}
              {guide.faq.length > 0 && (
                <li>
                  <a href="#faq" className="text-zinc-300 underline decoration-white/20 underline-offset-2 transition hover:text-ink">
                    {ui.common.faqTitle}
                  </a>
                </li>
              )}
            </ol>
          </nav>
        )}

        {guide.sections.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="mt-12 scroll-mt-28">
            <h2 id={`${s.id}-title`} className="font-display text-2xl sm:text-3xl">
              {s.h2}
            </h2>
            {s.blocks.map((b, i) => (
              <BlockView key={i} b={b} />
            ))}
          </section>
        ))}

        <div className={`${CARD} mt-12 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between`}>
          <p className="text-base font-semibold text-ink">{gv.ctaBanner}</p>
          <Link href={guide.cta.href} className="btn-pill btn-primary shrink-0 px-5 py-2.5 text-sm">
            {guide.cta.label}
          </Link>
        </div>
      </div>

      {guide.faq.length > 0 && (
        <div className="mx-auto max-w-3xl">
          <Section id="faq" title={ui.common.faqTitle}>
            <FaqBlock items={guide.faq} />
          </Section>
        </div>
      )}

      {guide.sources.length > 0 && (
        <div className="mx-auto max-w-3xl">
          <Section id="sources" title={ui.common.sourcesTitle}>
            <SourceList items={guide.sources} />
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">{gv.sourcesNote}</p>
          </Section>
        </div>
      )}

      {related.length > 0 && (
        <div className="mx-auto max-w-3xl">
          <Section id="related" title={gv.moreGuides}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {related.map((g) => (
                <li key={g.slug}>
                  <Link href={langPath(lang, `/guides/${g.slug}`)} className={`${CARD} block h-full p-4 transition hover:border-white/25`}>
                    <span className="block text-base font-semibold text-ink">{g.h1}</span>
                    <span className="mt-1 block text-sm text-zinc-400">{g.blurb}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </>
  )
}

