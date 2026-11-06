"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronRight, Map as MapIcon, Search } from "lucide-react"
import Header from "../layout/Header"
import Footer from "../layout/Footer"
import BottomNav from "../layout/BottomNav"
import { MetroLineBadge } from "../ui/TransitBadge"
import { useLanguage } from "../../context/LanguageContext"
import { normStopName } from "../../lib/nitbusRoutes"
import { NightPage } from "../ui/NightBackdrop"

// Portada del metro (06/11/2026), hermana de /nitbus: las 12 líneas como tarjetas y un buscador de
// estación («¿qué líneas paran aquí?»). Cada línea abre su esquema en /metro/L3, con «Mi trayecto».

export type MetroIndexLine = { code: string; routes: string[]; count: number }
export type MetroSearchEntry = { name: string; lines: string[] }

type Props = {
  lines: MetroIndexLine[]
  search: MetroSearchEntry[]
}

const MAX_RESULTS = 10

export default function MetroIndexView({ lines, search }: Props) {
  const { t } = useLanguage()
  const [query, setQuery] = useState("")

  const q = normStopName(query)
  const results = useMemo(() => {
    if (q.length < 2) return []
    const starts: MetroSearchEntry[] = []
    const contains: MetroSearchEntry[] = []
    for (const e of search) {
      const k = normStopName(e.name)
      if (k.startsWith(q)) starts.push(e)
      else if (k.includes(q)) contains.push(e)
    }
    return [...starts, ...contains]
  }, [q, search])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <NightPage tone="blue">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <header>
          <h1 className="font-display text-[2rem] leading-tight text-ink sm:text-5xl">{t("metroPage.title")}</h1>
          <p className="mt-3 max-w-xl text-lg leading-relaxed text-zinc-300">{t("metroPage.subtitle")}</p>
          <p className="mt-2 text-sm font-semibold text-zinc-200">{t("essentialsPage.metroRules")}</p>
        </header>

        <section className="mt-8" aria-label={t("metroPage.findStopAll")}>
          <div className="relative">
            <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("metroPage.findStopAll")}
              aria-label={t("metroPage.findStopAll")}
              className="w-full rounded-ctl border border-white/10 bg-surface py-3.5 pl-12 pr-4 text-base text-ink outline-none placeholder:text-zinc-500 focus:border-brand/50"
            />
          </div>

          {q.length >= 2 && (
            <div aria-live="polite" className="mt-3">
              {results.length === 0 ? (
                <p className="text-base text-zinc-300">{t("metroPage.noMatch").replace("{q}", query)}</p>
              ) : (
                <ul className="space-y-2">
                  {results.slice(0, MAX_RESULTS).map((r) => (
                    <li key={r.name} className="rounded-card border border-white/10 bg-surface p-4">
                      <p className="text-base font-semibold text-ink">{r.name}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-zinc-400">{t("nitbusPage.linesHere")}</span>
                        {r.lines.map((c) => (
                          <Link key={c} href={`/metro/${c}?stop=${encodeURIComponent(r.name)}`} aria-label={`Metro ${c}: ${r.name}`}>
                            <MetroLineBadge code={c} size="md" />
                          </Link>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <section className="mt-10" aria-labelledby="mt-lines">
          <h2 id="mt-lines" className="text-xl font-semibold text-ink">
            {t("nitbusPage.linesTitle")}
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {lines.map((line) => (
              <li key={line.code}>
                <Link
                  href={`/metro/${line.code}`}
                  className="flex h-full items-center gap-3.5 rounded-card border border-white/10 bg-surface p-4 transition hover:border-white/25"
                >
                  <MetroLineBadge code={line.code} size="lg" />
                  <span className="min-w-0 flex-1">
                    {line.routes.map((r) => (
                      <span key={r} className="block text-sm font-semibold leading-snug text-ink">
                        {r}
                      </span>
                    ))}
                    <span className="mt-0.5 block text-xs text-zinc-400">{t("metroPage.stopsCount").replace("{n}", String(line.count))}</span>
                  </span>
                  <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-zinc-500" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <Link
          href="/essentials/metro"
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-brand-soft underline underline-offset-4 hover:text-ink"
        >
          <MapIcon size={16} aria-hidden="true" /> {t("metroPage.viewMap")}
        </Link>
        <p className="mt-6 text-xs leading-relaxed text-zinc-400">{t("metroPage.officialNote")}</p>
      </main>
      </NightPage>
      <Footer />
      <BottomNav />
    </div>
  )
}
