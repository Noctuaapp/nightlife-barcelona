"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronRight, Map as MapIcon, Search } from "lucide-react"
import Header from "../layout/Header"
import Footer from "../layout/Footer"
import BottomNav from "../layout/BottomNav"
import { NitbusBadge } from "../ui/TransitBadge"
import { useLanguage } from "../../context/LanguageContext"
import { NIGHT_BUS_LINES, parseRoute } from "../../lib/nightBuses"
import { compareLineCodes, normStopName, type NbSearchEntry } from "../../lib/nitbusRoutes"

// Portada de Nitbus (31/10/2026): todas las líneas como tarjetas y un buscador de parada
// («¿qué nocturno cojo desde aquí?»). Cada línea abre su esquema en /nitbus/N24.

type Props = {
  counts: Record<string, number>
  search: NbSearchEntry[]
}

const MAX_RESULTS = 10

export default function NitbusIndexView({ counts, search }: Props) {
  const { t } = useLanguage()
  const [query, setQuery] = useState("")

  const codes = useMemo(() => Object.keys(NIGHT_BUS_LINES).sort(compareLineCodes), [])
  const q = normStopName(query)
  const results = useMemo(() => {
    if (q.length < 2) return []
    const starts: NbSearchEntry[] = []
    const contains: NbSearchEntry[] = []
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
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <header>
          <h1 className="font-display text-[2rem] leading-tight text-ink sm:text-5xl">{t("nitbusPage.title")}</h1>
          <p className="mt-3 max-w-xl text-lg leading-relaxed text-zinc-300">{t("nitbusPage.subtitle")}</p>
          <p className="mt-2 text-sm font-semibold text-zinc-200">{t("essentialsPage.nitbusHours")}</p>
        </header>

        <section className="mt-8" aria-label={t("nitbusPage.findStopAll")}>
          <div className="relative">
            <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("nitbusPage.findStopAll")}
              aria-label={t("nitbusPage.findStopAll")}
              className="w-full rounded-ctl border border-white/10 bg-surface py-3.5 pl-12 pr-4 text-base text-ink outline-none placeholder:text-zinc-500 focus:border-brand/50"
            />
          </div>

          {q.length >= 2 && (
            <div aria-live="polite" className="mt-3">
              {results.length === 0 ? (
                <p className="text-base text-zinc-300">{t("nitbusPage.noMatch").replace("{q}", query)}</p>
              ) : (
                <ul className="space-y-2">
                  {results.slice(0, MAX_RESULTS).map((r) => (
                    <li key={r.name} className="rounded-card border border-white/10 bg-surface p-4">
                      <p className="text-base font-semibold text-ink">{r.name}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-zinc-400">{t("nitbusPage.linesHere")}</span>
                        {r.lines.map((c) => (
                          <Link key={c} href={`/nitbus/${c}?stop=${encodeURIComponent(r.name)}`} aria-label={`Nitbus ${c}: ${r.name}`}>
                            <NitbusBadge code={c} size="md" />
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

        <section className="mt-10" aria-labelledby="nb-lines">
          <h2 id="nb-lines" className="text-xl font-semibold text-ink">
            {t("nitbusPage.linesTitle")}
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {codes.map((code) => {
              const line = NIGHT_BUS_LINES[code]
              const { from, to, note } = parseRoute(line.route)
              const n = counts[code]
              return (
                <li key={code}>
                  <Link
                    href={`/nitbus/${code}`}
                    className="flex h-full items-center gap-3.5 rounded-card border border-white/10 bg-surface p-4 transition hover:border-white/25"
                  >
                    <NitbusBadge code={code} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug text-ink">
                        {from}
                        {to && (
                          <>
                            <span aria-hidden="true" className="mx-1 text-zinc-500">↔</span>
                            {to}
                          </>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-400">
                        {note && <>{note}</>}
                        {note && n ? " · " : ""}
                        {n ? t("nitbusPage.stopsCount").replace("{n}", String(n)) : ""}
                      </span>
                    </span>
                    <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-zinc-500" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>

        <Link
          href="/essentials/nitbus"
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-brand-soft underline underline-offset-4 hover:text-ink"
        >
          <MapIcon size={16} aria-hidden="true" /> {t("nitbusPage.viewMap")}
        </Link>
        <p className="mt-6 text-xs leading-relaxed text-zinc-400">{t("nitbusPage.officialNote")}</p>
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}
