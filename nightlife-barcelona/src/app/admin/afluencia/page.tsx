"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"
import { ADMIN_EMAIL } from "../../../lib/admin"
import { logError } from "../../../lib/log"
import { madridDaysAgo, madridToday, madridYear } from "../../../lib/madridDay"
import {
  extremes,
  fmtNum,
  niceMax,
  reliability,
  slotsFor,
  type AfluenciaMetric,
  type Kind,
  type Mode,
  type Reliability,
  type Slot,
} from "../../../lib/afluencia"

// «Cuándo sale la gente» (31/10/2026): qué días de la semana, del mes y qué meses hay más y menos
// gente. Solo con lo que Noctua ve de verdad (supabase/63_afluencia.sql): planes «Asistiré»,
// check-ins y visitas. Cada gráfica dice cuántas noches hay detrás y cuánto fiarse.

type MetricKey = "attend" | "checkin" | "visits"
type Data = { from: string; to: string; metrics: Record<MetricKey, AfluenciaMetric> }

const METRICS: { key: MetricKey; label: string; what: string; unit: string }[] = [
  { key: "attend", label: "Asistiré", what: "Personas que marcaron en Noctua que iban a salir esa noche.", unit: "personas" },
  { key: "checkin", label: "Check-ins", what: "Personas que confirmaron con un check-in que estaban en un local esa noche.", unit: "personas" },
  { key: "visits", label: "Visitas a la web", what: "Visitantes distintos de la web esa noche (cuenta tengan cuenta o no).", unit: "visitantes" },
]

const CHARTS: { kind: Kind; title: string; sub: string }[] = [
  { kind: "dow", title: "Por día de la semana", sub: "Media de gente cada lunes, martes…" },
  { kind: "dom", title: "Por día del mes", sub: "Media de gente cada día 1, 2… 31 (a final de mes hay menos observaciones)." },
  { kind: "month", title: "Por mes", sub: "Media de gente por noche en cada mes del año." },
]

const RELIABILITY_LABEL: Record<Reliability, string> = {
  none: "Sin datos",
  low: "Pocos datos",
  mid: "Orientativo",
  ok: "Fiable",
}

const RANGES = [
  { key: "all", label: "Todo el histórico", from: () => madridDaysAgo(730) },
  { key: "year", label: "Este año", from: () => `${madridYear()}-01-01` },
  { key: "90", label: "90 días", from: () => madridDaysAgo(89) },
  { key: "30", label: "30 días", from: () => madridDaysAgo(29) },
] as const

const BAR_MAX_PX = 24

function Chart({ slots, mode, unit }: { slots: Slot[]; mode: Mode; unit: string }) {
  const [active, setActive] = useState<number | null>(null)
  const ex = mode === "avg" ? extremes(slots) : null
  const top = niceMax(Math.max(0, ...slots.map((s) => s.value ?? 0)))
  const ticks = [top, top / 2, 0]
  const dense = slots.length > 12
  const readout = active !== null ? slots.find((s) => s.k === active) : null
  return (
    <div>
      <div className="relative mt-4 flex h-44 gap-2">
        {/* Eje Y: tres líneas finas (0, mitad y techo) con su número. */}
        <div className="relative w-8 shrink-0 text-right text-xs text-zinc-400" aria-hidden="true">
          {ticks.map((v, i) => (
            <span key={i} className="absolute right-0 -translate-y-1/2 leading-none" style={{ top: `${(i / 2) * 100}%` }}>
              {fmtNum(v, 1)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          {ticks.map((_, i) => (
            <div key={i} className="pointer-events-none absolute inset-x-0 border-t border-white/10" style={{ top: `${(i / 2) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-stretch" onMouseLeave={() => setActive(null)}>
            {slots.map((s) => {
              const isMax = ex?.max.k === s.k
              const isMin = ex?.min.k === s.k
              const h = s.value === null ? 0 : Math.max(2, ((s.value as number) / top) * 100)
              const name = s.value === null ? `${s.long}: sin datos` : `${s.long}: ${fmtNum(s.value)} ${unit}${mode === "avg" ? " de media por noche" : " en total"} (${s.nights} ${s.nights === 1 ? "noche" : "noches"})`
              return (
                <button
                  key={s.k}
                  type="button"
                  aria-label={name}
                  onMouseEnter={() => setActive(s.k)}
                  onFocus={() => setActive(s.k)}
                  onBlur={() => setActive(null)}
                  onClick={() => setActive((a) => (a === s.k ? null : s.k))}
                  className="group relative min-w-0 flex-1 px-px outline-none focus-visible:bg-white/5"
                >
                  <span
                    className={`absolute inset-x-px bottom-0 mx-auto block rounded-t transition-opacity group-hover:opacity-100 ${isMax ? "bg-brand" : isMin ? "bg-zinc-300" : "bg-brand/45"} ${active === s.k ? "opacity-100" : ""}`}
                    style={{ height: `${h}%`, maxWidth: BAR_MAX_PX }}
                  />
                  {s.value !== null && (isMax || isMin) && (
                    <span
                      className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold leading-none text-ink"
                      style={{ bottom: `calc(${h}% + 4px)` }}
                    >
                      {fmtNum(s.value)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      {/* Eje X */}
      <div className="flex gap-2" aria-hidden="true">
        <div className="w-8 shrink-0" />
        <div className="flex min-w-0 flex-1">
          {slots.map((s, i) => (
            <span key={s.k} className="min-w-0 flex-1 pt-1.5 text-center text-xs text-zinc-400">
              {dense ? (i === 0 || (i + 1) % 5 === 0 ? s.label : "") : s.label}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-3 min-h-[2.5rem] text-sm text-zinc-300" aria-live="off">
        {readout
          ? readout.value === null
            ? `${readout.long}: todavía sin datos.`
            : `${readout.long}: ${fmtNum(readout.value)} ${unit}${mode === "avg" ? " de media por noche" : " en total"} · ${fmtNum(readout.total, 0)} en ${readout.nights} ${readout.nights === 1 ? "noche" : "noches"}`
          : "Toca o pasa el ratón por una barra para ver el detalle."}
      </p>
    </div>
  )
}

function SlotTable({ slots, mode, unit }: { slots: Slot[]; mode: Mode; unit: string }) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs font-semibold text-zinc-400 underline underline-offset-2 hover:text-white">Ver como tabla</summary>
      <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-zinc-950 text-zinc-400">
            <tr>
              <th className="px-3 py-2 font-semibold">&nbsp;</th>
              <th className="px-3 py-2 text-right font-semibold">{mode === "avg" ? `Media por noche (${unit})` : `Total (${unit})`}</th>
              <th className="px-3 py-2 text-right font-semibold">Total</th>
              <th className="px-3 py-2 text-right font-semibold">Noches</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((s) => (
              <tr key={s.k} className="border-t border-white/5 text-zinc-200">
                <th scope="row" className="px-3 py-1.5 font-medium">{s.long}</th>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmtNum(s.value)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{s.nights ? fmtNum(s.total, 0) : "—"}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{s.nights || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

export default function AdminAfluenciaPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [metric, setMetric] = useState<MetricKey>("attend")
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("all")
  const [mode, setMode] = useState<Mode>("avg")
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  // Si cambias el rango rápido, solo vale la última respuesta.
  const seq = useRef(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: s, error: e }) => {
      if (e || s.session?.user.email !== ADMIN_EMAIL) {
        window.location.href = "/login"
        return
      }
      setCheckingAdmin(false)
    })
  }, [])

  const load = useCallback(async () => {
    const mine = ++seq.current
    setLoading(true)
    setError("")
    const from = RANGES.find((r) => r.key === range)!.from()
    const { data: res, error: err } = await supabase.rpc("admin_afluencia", { p_from: from, p_to: madridToday() })
    if (mine !== seq.current) return
    if (err) {
      logError("AFLUENCIA LOAD:", err)
      setError(/function|schema cache|does not exist/i.test(err.message || "") ? "missing" : err.message || "error")
      setData(null)
    } else {
      setData(res as Data)
    }
    setLoading(false)
  }, [range])

  useEffect(() => {
    if (!checkingAdmin) load()
  }, [checkingAdmin, load])

  const info = METRICS.find((m) => m.key === metric)!
  const current = data?.metrics?.[metric]
  const charts = useMemo(
    () =>
      CHARTS.map((c) => {
        const slots = slotsFor(c.kind, current, mode)
        return { ...c, slots, ex: mode === "avg" ? extremes(slots) : null, rel: reliability(c.kind, current) }
      }),
    [current, mode]
  )

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-night text-ink">
        <p className="text-sm text-zinc-400">Comprobando acceso…</p>
      </main>
    )
  }

  const pill = (on: boolean) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${on ? "bg-brand text-white" : "border border-white/15 text-zinc-200 hover:bg-white/5"}`

  return (
    <AdminShell
      title="Cuándo sale la gente"
      subtitle="Qué días de la semana, del mes y qué meses hay más y menos gente en Noctua."
    >
      <div className="space-y-6">
        <div className="rounded-card border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-zinc-300">
          Esto mide a la gente que usa Noctua, no a toda la ciudad. Y como Noctua crece, lo reciente pesa más: un mes puede salir alto solo
          porque había más usuarios. Para cada gráfica te digo cuántas noches hay detrás y cuánto fiarte.
        </div>

        <div role="tablist" aria-label="Medida" className="flex flex-wrap gap-2">
          {METRICS.map((m) => (
            <button key={m.key} role="tab" aria-selected={metric === m.key} onClick={() => setMetric(m.key)} className={pill(metric === m.key)}>
              {m.label}
            </button>
          ))}
        </div>
        <p className="-mt-3 text-sm text-zinc-400">{info.what}</p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Periodo">
            {RANGES.map((r) => (
              <button key={r.key} aria-pressed={range === r.key} onClick={() => setRange(r.key)} className={`${pill(range === r.key)} !py-1.5 !text-xs`}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2" role="group" aria-label="Qué mostrar">
            <button aria-pressed={mode === "avg"} onClick={() => setMode("avg")} className={`${pill(mode === "avg")} !py-1.5 !text-xs`}>
              Media por noche
            </button>
            <button aria-pressed={mode === "total"} onClick={() => setMode("total")} className={`${pill(mode === "total")} !py-1.5 !text-xs`}>
              Total
            </button>
          </div>
        </div>

        {loading && !data ? (
          <p className="text-sm text-zinc-400">Cargando…</p>
        ) : error ? (
          <div className="rounded-card border border-warn/40 bg-warn/[0.08] p-5 text-sm text-zinc-200">
            {error === "missing"
              ? "Todavía no está la función en Supabase. Ejecuta el SQL 63 (supabase/63_afluencia.sql) en el editor SQL y recarga esta página."
              : `No se han podido cargar los datos (${error}).`}
          </div>
        ) : !current || current.total === 0 ? (
          <p className="rounded-card border border-white/10 bg-white/[0.03] p-6 text-sm text-zinc-300">
            Todavía no hay datos de «{info.label}» en este periodo.
          </p>
        ) : (
          <>
            <p className="text-sm text-zinc-400">
              Datos de «{info.label}» desde el {current.first ? current.first.split("-").reverse().join("/") : "—"}: {current.nights}{" "}
              {current.nights === 1 ? "noche observada" : "noches observadas"}, {fmtNum(current.total, 0)} {info.unit}-noche en total.
            </p>
            {charts.map((c) => (
              <section key={c.kind} aria-labelledby={`af-${c.kind}`} className="rounded-card border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 id={`af-${c.kind}`} className="text-lg font-semibold text-ink">
                      {c.title}
                    </h2>
                    <p className="mt-0.5 text-xs text-zinc-400">{mode === "avg" ? c.sub : c.sub.replace("Media de gente", "Total de gente")}</p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      c.rel === "ok" ? "border-open/40 text-open" : c.rel === "mid" ? "border-white/25 text-zinc-200" : "border-warn/50 text-warn"
                    }`}
                  >
                    {RELIABILITY_LABEL[c.rel]}
                  </span>
                </div>

                {c.ex && c.rel !== "low" && (
                  <p className="mt-3 text-sm text-zinc-200">
                    Más gente: <strong className="text-ink">{c.ex.max.long}</strong> ({fmtNum(c.ex.max.value)} de media) · Menos:{" "}
                    <strong className="text-ink">{c.ex.min.long}</strong> ({fmtNum(c.ex.min.value)})
                  </p>
                )}
                {c.rel === "low" && (
                  <p className="mt-2 text-xs text-warn">
                    {c.kind === "month"
                      ? "Hay menos de unos seis meses de datos: aún no se pueden comparar meses."
                      : c.kind === "dom"
                        ? "Cada día del mes se ha visto menos de 3 veces: es ruido, no un patrón."
                        : "Algún día de la semana se ha visto menos de 8 veces: espera a tener más semanas."}
                  </p>
                )}
                {c.rel === "mid" && c.kind === "month" && (
                  <p className="mt-2 text-xs text-zinc-400">Aún no hay un año completo (o dos para separar temporada de crecimiento): tómalo como una pista.</p>
                )}

                <Chart slots={c.slots} mode={mode} unit={info.unit} />
                <SlotTable slots={c.slots} mode={mode} unit={info.unit} />
              </section>
            ))}
          </>
        )}
      </div>
    </AdminShell>
  )
}
