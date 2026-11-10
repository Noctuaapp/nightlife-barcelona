"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarCheck, Camera, Car, Clock, Globe, Heart, Hourglass, Music2, Navigation, Phone, Share2, Smartphone, Ticket, Users, type LucideIcon } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { fmtDuration } from "../../lib/duration"
import { pageLabel } from "../../lib/adminPageLabel"
import { Panel, SectionTitle, StatTile, type Accent } from "./ui"

// Admin › Datos › «Clics y tiempo» (10/11/2026). Responde a dos preguntas: ¿cuánta gente pulsa «cómo llegar»,
// la web, Instagram, «asistiré» o guarda un local en favoritos? y ¿cuánto tiempo se queda en la web?
// Datos: admin_interaction_stats y admin_time_stats, de supabase/84_clics_y_tiempo.sql. Solo cifras agregadas
// (el tiempo por usuario está en Admin › Actividad, que es donde ya se trabaja con personas concretas).

type Kind =
  | "directions_click" | "website_click" | "instagram_click" | "tiktok_click" | "attendance" | "favorite_click"
  | "tickets_click" | "phone_click" | "share_click" | "ride_click"

const KINDS: { key: Kind; label: string; icon: LucideIcon; accent: Accent; hint?: string }[] = [
  { key: "directions_click", label: "Cómo llegar", icon: Navigation, accent: "coral" },
  { key: "attendance", label: "Asistiré", icon: CalendarCheck, accent: "pink", hint: "marcas hechas en esas noches" },
  { key: "favorite_click", label: "Guardados en favoritos", icon: Heart, accent: "pink", hint: "guardados nuevos en el periodo" },
  { key: "website_click", label: "Web del local", icon: Globe, accent: "cyan" },
  { key: "instagram_click", label: "Instagram", icon: Camera, accent: "violet" },
  { key: "tiktok_click", label: "TikTok", icon: Music2, accent: "violet" },
  { key: "tickets_click", label: "Entradas", icon: Ticket, accent: "coral" },
  { key: "phone_click", label: "Llamar", icon: Phone, accent: "cyan" },
  { key: "share_click", label: "Compartir", icon: Share2, accent: "violet" },
  { key: "ride_click", label: "Taxi / VTC", icon: Car, accent: "coral" },
]

type Interaction = {
  totals: Record<string, { n: number; people: number }>
  daily: { day: string; kind: string; n: number }[]
  top: { kind: string; item_type: string | null; item_id: string | null; name: string | null; n: number }[]
  favorites_total: number
  favorites_people: number
  favorites_top: { item_type: string | null; item_id: string | null; name: string | null; n: number }[]
}
type TimeStats = {
  visits: { total: number; timed: number; measured: number; avg_secs: number | null; median_secs: number | null; total_secs: number | null }
  by_device: { label: string; n: number; avg_secs: number | null }[]
  by_account: { with_account: { n: number; avg_secs: number | null }; anonymous: { n: number; avg_secs: number | null } }
  sections: { section: string; views: number; avg_secs: number; total_secs: number }[]
  pages: { path: string; views: number; avg_secs: number; total_secs: number }[]
}

const ITEM_LABEL: Record<string, string> = { club: "Club", event: "Evento", club_event: "Noche de club", essential: "Esencial" }
const DEVICE_LABEL: Record<string, string> = { mobile: "Móvil", desktop: "Ordenador", tablet: "Tablet" }

function dayList(from: string, to: string): string[] {
  const out: string[] = []
  const end = new Date(`${to}T12:00:00Z`).getTime()
  for (let t = new Date(`${from}T12:00:00Z`).getTime(); t <= end && out.length < 400; t += 86400000) out.push(new Date(t).toISOString().slice(0, 10))
  return out
}

function BarList({ rows, empty = "Sin datos en este periodo." }: { rows: { label: string; sub?: string; n: number }[]; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n))
  if (rows.length === 0) return <p className="text-sm text-zinc-400">{empty}</p>
  return (
    <ol className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={`${r.label}-${i}`}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="min-w-0 truncate text-zinc-200">
              <span className="mr-1.5 tabular-nums text-zinc-500">{i + 1}.</span>
              {r.label}
              {r.sub && <span className="ml-1.5 text-zinc-500">{r.sub}</span>}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-ink">{r.n}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-white/5">
            <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${(r.n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  )
}

function DayBars({ days, values }: { days: string[]; values: number[] }) {
  const max = Math.max(1, ...values)
  const step = days.length > 12 ? Math.ceil(days.length / 6) : 1
  return (
    <div className="flex h-32 items-stretch gap-1">
      {days.map((d, i) => (
        <div key={d} className="relative flex min-w-0 flex-1 flex-col items-center" title={`${d}: ${values[i]}`}>
          <div className="flex min-h-0 w-full flex-1 items-end">
            <div className="w-full rounded-t bg-purple-500" style={{ height: `${Math.max(2, (values[i] / max) * 100)}%` }} />
          </div>
          <span className="mt-1 h-4 w-full text-center text-xs leading-4 text-zinc-400">
            {i % step === 0 ? <span className="whitespace-nowrap">{d.slice(5)}</span> : null}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function InteractionStats({ from, to }: { from: string; to: string }) {
  const [inter, setInter] = useState<Interaction | null>(null)
  const [time, setTime] = useState<TimeStats | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [kind, setKind] = useState<Kind>("directions_click")

  useEffect(() => {
    // Si se cambian las fechas rápido, solo vale la última respuesta.
    let current = true
    setLoading(true)
    setError("")
    Promise.all([
      supabase.rpc("admin_interaction_stats", { p_from: from, p_to: to }),
      supabase.rpc("admin_time_stats", { p_from: from, p_to: to }),
    ]).then(([a, b]) => {
      if (!current) return
      const err = a.error || b.error
      setError(err ? err.message || "error" : "")
      setInter(a.error ? null : (a.data as Interaction))
      setTime(b.error ? null : (b.data as TimeStats))
      setLoading(false)
    })
    return () => {
      current = false
    }
  }, [from, to])

  const days = useMemo(() => dayList(from, to), [from, to])
  const series = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of inter?.daily || []) if (d.kind === kind) m.set(d.day, d.n)
    return days.map((d) => m.get(d) || 0)
  }, [inter, kind, days])

  const topRows = (inter?.top || [])
    .filter((t) => t.kind === kind)
    .map((t) => ({ label: t.name || `${ITEM_LABEL[t.item_type || ""] || "Elemento"} #${t.item_id}`, sub: ITEM_LABEL[t.item_type || ""], n: t.n }))
  const selected = KINDS.find((k) => k.key === kind)!
  const empty = new Map<string, string>()

  if (loading) return <p className="text-sm text-zinc-400">Cargando datos...</p>

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          No se pudieron cargar todos los datos: {error}. ¿Has ejecutado el SQL 84 (84_clics_y_tiempo.sql) en Supabase › SQL Editor?
        </p>
      )}

      {inter && (
        <>
          <p className="text-xs text-zinc-400">
            Cuenta lo que hace la gente en la web publicada. No incluye tu actividad de admin ni bots. «Personas» son cuentas o, si no hay cuenta, visitas distintas.
            Los «asistiré» se cuentan por la noche a la que se refieren; los guardados en favoritos son los nuevos del periodo.
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {KINDS.map((k) => {
              const t = inter.totals?.[k.key]
              return (
                <StatTile
                  key={k.key}
                  accent={k.accent}
                  icon={k.icon}
                  label={k.label}
                  value={t?.n ?? 0}
                  note={t?.n ? `${t.people} ${t.people === 1 ? "persona" : "personas"}` : k.hint}
                  active={kind === k.key}
                  onClick={() => setKind(k.key)}
                />
              )
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel accent={selected.accent}>
              <SectionTitle icon={selected.icon} accent={selected.accent} className="mb-4">{selected.label} por día</SectionTitle>
              <DayBars days={days} values={series} />
            </Panel>
            <Panel accent={selected.accent}>
              <SectionTitle icon={selected.icon} accent={selected.accent} className="mb-4">Dónde más: {selected.label.toLowerCase()}</SectionTitle>
              <BarList rows={topRows} />
            </Panel>
          </div>

          <Panel accent="pink">
            <SectionTitle icon={Heart} accent="pink" className="mb-1">Guardados en favoritos ahora mismo</SectionTitle>
            <p className="mb-4 text-xs text-zinc-400">
              {inter.favorites_total} guardados en total, de {inter.favorites_people} {inter.favorites_people === 1 ? "persona" : "personas"}. No depende de las fechas de arriba.
            </p>
            <BarList
              rows={(inter.favorites_top || []).map((f) => ({ label: f.name || `${ITEM_LABEL[f.item_type || ""] || "Elemento"} #${f.item_id}`, sub: ITEM_LABEL[f.item_type || ""], n: f.n }))}
              empty="Todavía nadie ha guardado nada."
            />
          </Panel>
        </>
      )}

      {time && (
        <>
          <div>
            <SectionTitle icon={Clock} accent="cyan" className="mb-1">Tiempo en la web</SectionTitle>
            <p className="text-xs text-zinc-400">
              Tiempo con la pestaña a la vista, por visita. {time.visits.measured} de {time.visits.timed} visitas con tiempo están medidas página a página;
              las anteriores al 10/11/2026 (o las que se cierran sin dar tiempo a enviarlo) se estiman entre su primer y su último registro, y se quedan cortas.
              Las visitas de una sola página sin más actividad no cuentan.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile accent="cyan" icon={Hourglass} label="Tiempo medio por visita" value={fmtDuration(time.visits.avg_secs)} note={`mediana ${fmtDuration(time.visits.median_secs)}`} />
            <StatTile accent="violet" icon={Clock} label="Tiempo total" value={fmtDuration(time.visits.total_secs)} note={`${time.visits.timed} visitas con tiempo`} />
            <StatTile accent="pink" icon={Users} label="Con cuenta" value={fmtDuration(time.by_account?.with_account?.avg_secs)} note={`${time.by_account?.with_account?.n ?? 0} visitas, de media`} />
            <StatTile accent="coral" icon={Users} label="Sin cuenta" value={fmtDuration(time.by_account?.anonymous?.avg_secs)} note={`${time.by_account?.anonymous?.n ?? 0} visitas, de media`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel accent="cyan">
              <SectionTitle icon={Smartphone} accent="cyan" className="mb-4">Por dispositivo</SectionTitle>
              {(time.by_device || []).length === 0 ? (
                <p className="text-sm text-zinc-400">Sin datos en este periodo.</p>
              ) : (
                <ul className="divide-y divide-white/5 text-sm">
                  {time.by_device.map((d) => (
                    <li key={d.label} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-zinc-200">{DEVICE_LABEL[d.label] || d.label}</span>
                      <span className="text-zinc-400"><span className="font-semibold text-ink">{fmtDuration(d.avg_secs)}</span> de media · {d.n} visitas</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel accent="cyan">
              <SectionTitle icon={Clock} accent="cyan" className="mb-4">Por sección</SectionTitle>
              {(time.sections || []).length === 0 ? (
                <p className="text-sm text-zinc-400">Aún no hay tiempo medido página a página. Aparecerá cuando la gente navegue con la versión nueva.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-xs text-zinc-400">
                        <th className="px-2 py-2 text-left font-semibold">Sección</th>
                        <th className="px-2 py-2 text-right font-semibold">Vistas</th>
                        <th className="px-2 py-2 text-right font-semibold">Media</th>
                        <th className="px-2 py-2 text-right font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {time.sections.map((s) => (
                        <tr key={s.section} className="border-b border-white/5">
                          <td className="px-2 py-2 text-zinc-200">{pageLabel(s.section, empty)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{s.views}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{fmtDuration(s.avg_secs)}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-zinc-400">{fmtDuration(s.total_secs)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>

          {(time.pages || []).length > 0 && (
            <Panel accent="cyan">
              <SectionTitle icon={Clock} accent="cyan" className="mb-4">Páginas donde más tiempo pasa la gente</SectionTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-zinc-400">
                      <th className="px-2 py-2 text-left font-semibold">Página</th>
                      <th className="px-2 py-2 text-right font-semibold">Vistas</th>
                      <th className="px-2 py-2 text-right font-semibold">Media</th>
                      <th className="px-2 py-2 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {time.pages.map((p) => (
                      <tr key={p.path} className="border-b border-white/5">
                        <td className="max-w-[16rem] truncate px-2 py-2 text-zinc-200" title={p.path}>{pageLabel(p.path, empty)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{p.views}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmtDuration(p.avg_secs)}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-zinc-400">{fmtDuration(p.total_secs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  )
}
