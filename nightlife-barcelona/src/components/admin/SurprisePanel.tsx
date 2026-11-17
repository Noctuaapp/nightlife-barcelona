"use client"

import { Dices, MousePointerClick, Sparkles, Users } from "lucide-react"
import { Panel, SectionTitle, StatTile } from "./ui"
import { NeedSql } from "./insights"

// «Sorpréndeme» en Admin › Datos › Resumen (17/11/2026): cuánta gente abre la ruleta, qué rollo elige, qué locales le salen y a cuáles hace clic.
// Lo alimenta admin_surprise_stats (supabase/128_analitica_sorprendeme.sql). Cuenta desde que se ejecuta ese SQL: antes no se guardaba nada.
// «Personas» son visitantes distintos (código anónimo), no cuentas. No incluye tu actividad de admin, bots ni pruebas.

type Totals = { opens: number; people: number; results: number; again: number; venue_clicks: number; directions_clicks: number; people_clicked: number }
type Stats = {
  totals: Totals | null
  moods: { mood: string; n: number }[]
  venues: { name: string; shown: number; clicked: number }[]
}

const MOOD_ES: Record<string, string> = { any: "Todo", dance: "Bailar", chat: "Charlar", chill: "Chill", live: "Directo" }

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)

export default function SurprisePanel({ stats, missingSql }: { stats: Stats | null; missingSql: boolean }) {
  if (missingSql) {
    return <NeedSql file="128_analitica_sorprendeme.sql" what="cuánta gente usa Sorpréndeme y qué le sale" className="md:col-span-2" />
  }
  if (!stats || !stats.totals) return null
  const t = stats.totals
  const clicks = (t.venue_clicks || 0) + (t.directions_clicks || 0)
  const maxMood = Math.max(1, ...stats.moods.map((m) => m.n))
  const venues = stats.venues.slice(0, 8)
  return (
    <Panel accent="violet" className="md:col-span-2">
      <SectionTitle icon={Dices} accent="violet" className="mb-1">Sorpréndeme</SectionTitle>
      <p className="mb-4 text-xs text-zinc-400">
        Cuenta desde el 17/11/2026 (cuando se ejecuta el SQL 128). «Abre» es quien pulsa el botón; «clics» es quien, tras el resultado, pulsa Ver ficha o Cómo llegar.
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Abren la ruleta" value={t.opens} icon={Dices} accent="violet" />
        <StatTile label="Personas distintas" value={t.people} icon={Users} accent="pink" />
        <StatTile label="Locales enseñados" value={t.results} icon={Sparkles} accent="cyan" note={`${t.again} con «Otra opción»`} />
        <StatTile label="Clics en el resultado" value={clicks} icon={MousePointerClick} accent="coral" note={`${t.venue_clicks} ver ficha · ${t.directions_clicks} cómo llegar · ${pct(t.people_clicked, t.people)} % de las personas`} />
      </div>
      {t.opens === 0 && t.results === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">Aún no hay datos en este periodo.</p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-bold text-zinc-300">Rollo elegido (en cada tirada)</p>
            <div className="space-y-2">
              {stats.moods.map((m) => (
                <div key={m.mood}>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300">{MOOD_ES[m.mood] || m.mood}</span>
                    <span className="font-semibold text-zinc-200">{m.n}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#7c5cff]" style={{ width: `${Math.max(3, (m.n / maxMood) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold text-zinc-300">Locales que más salen (y cuántos clics reciben)</p>
            <ul className="space-y-1.5 text-sm">
              {venues.map((v) => (
                <li key={v.name} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-zinc-200">{v.name}</span>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {v.shown} {v.shown === 1 ? "vez" : "veces"} · {v.clicked} {v.clicked === 1 ? "clic" : "clics"}
                  </span>
                </li>
              ))}
              {venues.length === 0 && <li className="text-sm text-zinc-400">Sin datos todavía.</li>}
            </ul>
          </div>
        </div>
      )}
    </Panel>
  )
}
