"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CalendarDays } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { fmtDuration } from "../../lib/duration"
import { TIME_GRAINS, timeSeriesRows, timeSeriesTotals, type TimeGrain, type TimePeriod, type TimeSeries } from "../../lib/dataInsights"
import { FilterChip, Panel, SectionTitle } from "./ui"
import { NeedSql } from "./insights"

// Admin › Datos › Clics y tiempo: el tiempo en la web por día, semana, mes y año (11/11/2026, supabase/90).
// No depende de las fechas de arriba: cada vista enseña siempre sus últimos periodos (30 días, 12 semanas,
// 12 meses, este año y el anterior), porque lo que se busca aquí es ver cómo evoluciona.

type Metric = "total" | "avg"
const METRICS: { key: Metric; label: string }[] = [
  { key: "total", label: "Tiempo total" },
  { key: "avg", label: "Media por visita" },
]

const value = (r: TimePeriod, m: Metric) => (m === "total" ? r.totalSecs : r.avgSecs ?? 0)

function Bars({ rows, metric, grain }: { rows: TimePeriod[]; metric: Metric; grain: TimeGrain }) {
  const vals = rows.map((r) => value(r, metric))
  const max = Math.max(1, ...vals)
  // En un gráfico de 30 barras no caben 30 etiquetas: se enseña una de cada pocas.
  const every = grain === "day" ? 5 : grain === "week" ? 2 : 1
  const metricLabel = METRICS.find((m) => m.key === metric)!.label.toLowerCase()
  return (
    <div className="flex h-36 items-stretch gap-0.5" role="img" aria-label={`Gráfico de ${metricLabel} por ${TIME_GRAINS.find((g) => g.key === grain)!.label.toLowerCase()}`}>
      {rows.map((r, i) => (
        <div key={r.period} className="relative flex min-w-0 flex-1 flex-col items-center" title={`${r.long}: ${vals[i] > 0 ? fmtDuration(vals[i]) : "sin datos"}${r.current ? " (en curso)" : ""}`}>
          <div className="flex min-h-0 w-full flex-1 items-end">
            <div
              className="w-full rounded-t"
              style={{
                height: `${Math.max(2, (vals[i] / max) * 100)}%`,
                background: "#7c5cff",
                opacity: r.current ? 0.55 : vals[i] === 0 ? 0.25 : 1,
              }}
            />
          </div>
          <span className="mt-1 h-4 w-full text-center text-[10px] leading-4 text-zinc-400">
            {(rows.length - 1 - i) % every === 0 ? <span className="whitespace-nowrap">{r.short}</span> : null}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function TimeSeriesPanel() {
  const [grain, setGrain] = useState<TimeGrain>("day")
  const [metric, setMetric] = useState<Metric>("total")
  const [data, setData] = useState<TimeSeries | null | undefined>(undefined) // undefined = cargando, null = falta el SQL
  const seq = useRef(0)

  useEffect(() => {
    const mine = ++seq.current
    setData(undefined)
    supabase.rpc("admin_time_series", { p_grain: grain }).then(({ data: d, error }) => {
      if (mine !== seq.current) return // si cambias rápido de vista, solo vale la última
      setData(error ? null : (d as TimeSeries))
    })
  }, [grain])

  const rows = useMemo(() => timeSeriesRows(data), [data])
  const totals = useMemo(() => timeSeriesTotals(rows), [rows])
  const grainInfo = TIME_GRAINS.find((g) => g.key === grain)!

  if (data === null) return <NeedSql file="90_tiempo_por_periodo.sql" what="el tiempo en la web por día, semana, mes y año" />

  return (
    <Panel accent="cyan">
      <SectionTitle icon={CalendarDays} accent="cyan" className="mb-1">Tiempo por día, semana, mes y año</SectionTitle>
      <p className="mb-4 text-xs text-zinc-400">
        Siempre {grainInfo.plural}, sin depender de las fechas de arriba. Cada visita cuenta en el periodo en que empezó. Hora de Madrid; la semana empieza en lunes.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {TIME_GRAINS.map((g) => (
          <FilterChip key={g.key} active={grain === g.key} onClick={() => setGrain(g.key)}>{`Por ${g.label.toLowerCase()}`}</FilterChip>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {METRICS.map((m) => (
          <FilterChip key={m.key} active={metric === m.key} onClick={() => setMetric(m.key)}>{m.label}</FilterChip>
        ))}
      </div>

      {data === undefined ? (
        <p className="mt-5 text-sm text-zinc-400">Cargando...</p>
      ) : totals.visits === 0 ? (
        <p className="mt-5 text-sm text-zinc-400">Todavía no hay visitas con tiempo en este periodo.</p>
      ) : (
        <>
          <p className="mt-5 text-sm text-zinc-300">
            En {grainInfo.plural}: <span className="font-semibold text-ink">{fmtDuration(totals.totalSecs)}</span> en total,{" "}
            <span className="font-semibold text-ink">{fmtDuration(totals.avgSecs)}</span> de media por visita, {totals.visits} visitas con tiempo.
          </p>
          <div className="mt-4">
            <Bars rows={rows} metric={metric} grain={grain} />
            <p className="mt-2 text-xs text-zinc-500">La barra apagada del final es el periodo en curso: aún no ha terminado.</p>
          </div>

          {/* Móvil: una línea por periodo (las cifras largas no caben en columnas). Ordenador: tabla. */}
          <ul className="mt-4 max-h-80 divide-y divide-white/5 overflow-auto rounded-ctl border border-white/10 px-3 sm:hidden">
            {[...rows].reverse().map((r) => (
              <li key={r.period} className="flex items-baseline justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className={`text-sm ${r.visits ? "text-zinc-200" : "text-zinc-500"}`}>
                    {r.long}
                    {r.current && <span className="ml-1.5 text-xs text-zinc-500">(en curso)</span>}
                  </p>
                  <p className="text-xs text-zinc-500">{r.visits ? `${r.visits} visitas · ${metric === "total" ? `${fmtDuration(r.avgSecs)} de media` : `${fmtDuration(r.totalSecs)} en total`}` : "sin visitas con tiempo"}</p>
                </div>
                <span className={`shrink-0 text-sm font-semibold tabular-nums ${r.visits ? "text-ink" : "text-zinc-500"}`}>{r.visits ? fmtDuration(metric === "total" ? r.totalSecs : r.avgSecs) : "—"}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 hidden max-h-80 overflow-auto rounded-ctl border border-white/10 sm:block">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-white/10 text-xs text-zinc-400">
                  <th className="px-3 py-2 text-left font-semibold">{grainInfo.label}</th>
                  <th className="px-3 py-2 text-right font-semibold">Visitas</th>
                  <th className="px-3 py-2 text-right font-semibold">Media por visita</th>
                  <th className="px-3 py-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[...rows].reverse().map((r) => (
                  <tr key={r.period} className={r.visits === 0 ? "text-zinc-500" : ""}>
                    <td className="px-3 py-2">
                      {r.long}
                      {r.current && <span className="ml-1.5 text-xs text-zinc-500">(en curso)</span>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.visits || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{r.visits ? fmtDuration(r.avgSecs) : "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{r.visits ? fmtDuration(r.totalSecs) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  )
}
