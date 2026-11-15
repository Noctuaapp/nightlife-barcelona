"use client"

import { useMemo, useState } from "react"
import Link from "../system/CityLink"
import { ChevronRight, Search } from "lucide-react"
import Header from "../layout/Header"
import Footer from "../layout/Footer"
import BottomNav from "../layout/BottomNav"
import { NitbusBadge } from "../ui/TransitBadge"
import { useCityT } from "../../lib/useCityT"
import { normStopName, type NbSearchEntry } from "../../lib/nitbusRoutes"
import { NightPage } from "../ui/NightBackdrop"
import NocOwl from "../mascot/NocOwl"

// Portada de los búhos de Madrid (15/11/2026), hermana de /nitbus: las 32 líneas nocturnas de la EMT como tarjetas y un
// buscador de parada («¿qué búho cojo desde aquí?»). Cada línea abre su esquema en /madrid/buhos/N1 (la misma vista que el
// Nitbus: NitbusLineView). Los textos son los del Nitbus con su versión de Madrid (claves «_madrid», lib/cityText.ts).
// Fuente de los datos: portal de datos abiertos de la EMT; se cita sin dar a entender que la EMT respalde la web.

export type BuhoIndexLine = { code: string; from: string; to: string; count: number }

type Props = {
  lines: BuhoIndexLine[]
  search: NbSearchEntry[]
}

const MAX_RESULTS = 10

export default function BuhoIndexView({ lines, search }: Props) {
  const t = useCityT()
  const [query, setQuery] = useState("")

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
      <NightPage tone="violet">
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-[2rem] leading-tight text-ink sm:text-5xl">{t("nitbusPage.title")}</h1>
              <p className="mt-3 max-w-xl text-lg leading-relaxed text-zinc-300">{t("nitbusPage.subtitle")}</p>
              <p className="mt-2 text-sm font-semibold text-zinc-200">{t("essentialsPage.nitbusHours")}</p>
            </div>
            <NocOwl size={84} pose="nitbus" mood="open" className="mt-3 hidden shrink-0 min-[380px]:block sm:mr-4" />
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
                            <Link key={c} href={`/buhos/${c}?stop=${encodeURIComponent(r.name)}`} aria-label={`Búho ${c}: ${r.name}`}>
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

          <section className="mt-10" aria-labelledby="bh-lines">
            <h2 id="bh-lines" className="text-xl font-semibold text-ink">
              {t("nitbusPage.linesTitle")}
            </h2>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {lines.map((line) => (
                <li key={line.code}>
                  <Link
                    href={`/buhos/${line.code}`}
                    className="flex h-full items-center gap-3.5 rounded-card border border-white/10 bg-surface p-4 transition hover:border-white/25"
                  >
                    <NitbusBadge code={line.code} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug text-ink">
                        {line.from}
                        <span aria-hidden="true" className="mx-1 text-zinc-500">↔</span>
                        {line.to}
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-400">{t("nitbusPage.stopsCount").replace("{n}", String(line.count))}</span>
                    </span>
                    <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-zinc-500" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <p className="mt-8 text-xs leading-relaxed text-zinc-400">{t("nitbusPage.officialNote")}</p>
          <p className="mt-2 text-[11px] leading-snug text-zinc-500">
            {t("clubPage.buhoSource")}{" "}
            <a href="https://www.emtmadrid.es" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              emtmadrid.es
            </a>
          </p>
        </main>
      </NightPage>
      <Footer />
      <BottomNav />
    </div>
  )
}
