"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

// Estadísticas de la ficha para su dueño (25/10/2026), en "Mi club" y "Mis festivales".
// Cuánta gente ve la ficha, qué pulsa (entradas, cómo llegar, web, Instagram...), de dónde llega
// y a qué hora. Solo números agregados: nunca quién ha sido (eso solo lo ve Noctua).
// Datos: owner_item_stats() en supabase/35 y 37. Solo sale si Noctua se las ha activado a esa
// ficha (Admin › Usuarios › Estadísticas para dueños); el dueño no ve la comparación con el
// periodo anterior ni los avisos de "no me dejan entrar" (eso solo lo ve el admin).

type Stats = {
  days: number
  views: number
  visitors: number
  views_prev: number
  clicks: Record<string, number>
  daily: { day: string; views: number }[]
  sources: { label: string; n: number }[]
  devices: { label: string; n: number }[]
  hours: { h: number; n: number }[]
  night_views: number
  favorites: number
  attendances: number
  checkins: number
  entry_denials: number
}

const CLICK_LABELS: Record<string, string> = {
  tickets_click: "Entradas",
  directions_click: "Cómo llegar",
  website_click: "Web",
  instagram_click: "Instagram",
  tiktok_click: "TikTok",
  share_click: "Compartir",
  ride_click: "Taxi / VTC",
  favorite_click: "Guardar",
}
const SOURCE_LABELS: Record<string, string> = {
  search: "Google y buscadores",
  instagram: "Instagram",
  tiktok: "TikTok",
  social: "Otras redes",
  messaging: "WhatsApp / Telegram",
  invite: "Invitaciones",
  direct: "Directo / dentro de Noctua",
}
const PERIODS = [7, 30, 90]

export default function OwnerStats({ type, id, name }: { type: "club" | "event"; id: number; name: string }) {
  const [days, setDays] = useState(30)
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState(false)
  // null = Noctua todavía no le ha activado las estadísticas a esta ficha: no se enseña nada.
  const [disabled, setDisabled] = useState(false)

  useEffect(() => {
    let alive = true
    setStats(null)
    supabase.rpc("owner_item_stats", { p_type: type, p_id: id, p_days: days }).then(({ data, error }) => {
      if (!alive) return
      if (error) setError(true)
      else if (!data) setDisabled(true)
      else setStats(data as Stats)
    })
    return () => {
      alive = false
    }
  }, [type, id, days])

  if (error || disabled) return null

  const trend =
    stats && stats.views_prev > 0 ? Math.round(((stats.views - stats.views_prev) / stats.views_prev) * 100) : null

  // Serie diaria completa (los días sin visitas cuentan como 0).
  const series = Array.from({ length: days }).map((_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" })
    return { d, n: stats?.daily.find((x) => x.day === d)?.views || 0 }
  })
  const maxDay = Math.max(1, ...series.map((s) => s.n))
  const clicks = Object.entries(stats?.clicks || {}).sort((a, b) => b[1] - a[1])
  const totalSources = (stats?.sources || []).reduce((a, s) => a + s.n, 0) || 1
  const peak = [...(stats?.hours || [])].sort((a, b) => b.n - a.n)[0]

  return (
    <section className="rounded-card border border-white/10 bg-surface p-5 sm:p-6" aria-labelledby={`stats-${type}-${id}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id={`stats-${type}-${id}`} className="text-lg font-semibold text-ink">Estadísticas de {name}</h2>
          <p className="text-xs text-zinc-400">Visitas y clics en tu ficha de Noctua. Sin datos personales de nadie.</p>
        </div>
        <div className="flex rounded-full border border-white/10 p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setDays(p)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${days === p ? "bg-ink text-night" : "text-zinc-300 hover:bg-white/5"}`}
            >
              {p} días
            </button>
          ))}
        </div>
      </div>

      {!stats ? (
        <div className="mt-5 h-40 animate-pulse rounded-ctl bg-white/[0.03]" />
      ) : (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Visitas a la ficha" value={stats.views} sub={trend === null ? undefined : `${trend >= 0 ? "+" : ""}${trend}% vs. ${days} días antes`} good={trend !== null && trend >= 0} />
            <Kpi label="Personas distintas" value={stats.visitors} />
            <Kpi label="Clics en entradas / cómo llegar" value={(stats.clicks.tickets_click || 0) + (stats.clicks.directions_click || 0)} />
            <Kpi label="Lo han guardado" value={stats.favorites} sub="en total" />
          </dl>

          <div className="mt-5">
            <p className="text-xs font-semibold text-zinc-400">Visitas por día</p>
            <div className="mt-2 flex h-24 items-end gap-[2px]" aria-label="Visitas por día">
              {series.map((s) => (
                <div
                  key={s.d}
                  title={`${s.d}: ${s.n}`}
                  className="flex-1 rounded-t bg-brand/70"
                  style={{ height: `${Math.max(3, (s.n / maxDay) * 100)}%`, opacity: s.n ? 1 : 0.2 }}
                />
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-zinc-400">Qué pulsan</p>
              {clicks.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-500">Todavía nada en este periodo.</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {clicks.map(([k, n]) => (
                    <li key={k} className="flex justify-between gap-3">
                      <span className="text-zinc-300">{CLICK_LABELS[k] || k}</span>
                      <span className="font-semibold tabular-nums text-ink">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400">De dónde llegan</p>
              {(stats.sources || []).length === 0 ? (
                <p className="mt-2 text-sm text-zinc-500">Todavía nada en este periodo.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {stats.sources.slice(0, 6).map((s) => (
                    <li key={s.label}>
                      <div className="flex justify-between gap-3">
                        <span className="text-zinc-300">{SOURCE_LABELS[s.label] || s.label.replace(/^other:/, "")}</span>
                        <span className="tabular-nums text-zinc-400">{Math.round((s.n / totalSources) * 100)}%</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-brand-soft" style={{ width: `${(s.n / totalSources) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-4 text-sm text-zinc-300">
            {type === "club" && <li>Check-ins: <b className="text-ink">{stats.checkins}</b></li>}
            <li>«Asistiré»: <b className="text-ink">{stats.attendances}</b></li>
            {type === "club" && <li>Visitas a tus noches: <b className="text-ink">{stats.night_views}</b></li>}
            {peak && <li>Hora con más visitas: <b className="text-ink">{String(peak.h).padStart(2, "0")}:00</b></li>}
            {stats.entry_denials > 0 && <li>Avisos de «no me dejan entrar»: <b className="text-warn">{stats.entry_denials}</b></li>}
          </ul>
        </>
      )}
    </section>
  )
}

function Kpi({ label, value, sub, good }: { label: string; value: number; sub?: string; good?: boolean }) {
  return (
    <div className="rounded-ctl border border-white/10 bg-white/[0.02] p-3">
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className="mt-1 font-display text-2xl tabular-nums text-ink">{value.toLocaleString("es-ES")}</dd>
      {sub && <p className={`mt-0.5 text-[11px] ${good === undefined ? "text-zinc-500" : good ? "text-open" : "text-warn"}`}>{sub}</p>}
    </div>
  )
}
