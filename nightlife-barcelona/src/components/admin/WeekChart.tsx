"use client"

import { useState } from "react"

// Gráfica de columnas de la semana para el Resumen del admin (19/11/2026).
//
// Sustituye a las tres miniaturas sueltas de antes. Reglas de la casa para gráficas: un solo eje, un solo tono (violeta
// de marca, el último día más fuerte), columnas finas con la punta redondeada y la base recta, rejilla casi
// invisible, valor en el pico y en el último día (no en todas), el texto de los valores siempre en gris/blanco (el
// color es solo de la marca), y al pasar el ratón o enfocar con teclado sale el detalle del día. La semana anterior
// va como una marca fina al nivel que tuvo ese mismo día, para ver de un vistazo si se va por encima o por debajo.
// Una tabla oculta repite los datos para lectores de pantalla.

export type DayPoint = { d: string; v: number; prev: number | null }

/** Techo «redondo» del eje: 47 → 50, 178 → 200, 458 → 500. */
function niceMax(max: number) {
  if (max <= 5) return 5
  const mag = Math.pow(10, Math.floor(Math.log10(max)))
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (max <= m * mag) return m * mag
  return 10 * mag
}

function weekdayShort(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString("es-ES", { weekday: "short" }).replace(".", "")
}
function weekdayLong(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })
}

export function WeekChart({ days, unit, className = "" }: { days: DayPoint[]; unit: string; className?: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const n = days.length
  const peak = Math.max(0, ...days.map((p) => p.v))
  const top = niceMax(Math.max(peak, ...days.map((p) => p.prev ?? 0)))
  const peakIdx = peak > 0 ? days.findIndex((p) => p.v === peak) : -1
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / top) * 100))}%`
  const hasPrev = days.some((p) => p.prev != null)

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-end gap-4 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px] bg-linear-to-b from-[#b3a2ff] to-[#7c5cff]" /> Esta semana
        </span>
        {hasPrev && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0.5 w-3.5 rounded-full bg-zinc-300" /> Semana anterior
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {/* Eje vertical: tres marcas, las justas para leer la escala */}
        <div aria-hidden="true" className="relative h-44 w-8 shrink-0 text-[11px] tabular-nums text-zinc-500 sm:h-56">
          {[top, top / 2, 0].map((t, i) => (
            <span key={i} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>
              {Math.round(t)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Rejilla */}
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-44 sm:h-56">
            {[0, 50, 100].map((p) => (
              <div key={p} className="absolute inset-x-0 border-t border-white/[0.06]" style={{ bottom: `${p}%` }} />
            ))}
          </div>

          {/* Columnas */}
          <div className="relative flex h-44 items-end gap-1.5 sm:h-56 sm:gap-3" role="img" aria-label={`${unit} de los últimos ${n} días`}>
            {days.map((p, i) => {
              const last = i === n - 1
              const showValue = p.v > 0 && (i === peakIdx || last)
              const active = hover === i
              const tipSide = i <= 1 ? "left-0" : i >= n - 2 ? "right-0" : "left-1/2 -translate-x-1/2"
              return (
                <div
                  key={p.d}
                  className="relative flex h-full flex-1 items-end justify-center"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                >
                  <button
                    type="button"
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover((h) => (h === i ? null : h))}
                    aria-label={`${weekdayLong(p.d)}: ${p.v} ${unit}${p.prev != null ? `. El mismo día de la semana anterior: ${p.prev}` : ""}`}
                    className="absolute inset-0 z-10 cursor-default rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand/70"
                  />
                  {/* Marca de la semana anterior */}
                  {p.prev != null && (
                    <span aria-hidden="true" className="absolute left-1/2 h-0.5 w-[calc(min(100%,40px)+8px)] -translate-x-1/2 rounded-full bg-zinc-300/80" style={{ bottom: pct(p.prev) }} />
                  )}
                  <span
                    aria-hidden="true"
                    className={`relative w-full max-w-[32px] rounded-t-[4px] transition-colors ${active ? "bg-linear-to-b from-[#c4b5ff] to-[#8f73ff]" : last ? "bg-linear-to-b from-[#b3a2ff] to-[#7c5cff] shadow-[0_0_22px_-4px_rgba(124,92,255,0.75)]" : "bg-linear-to-b from-brand/70 to-brand/30"}`}
                    style={{ height: p.v > 0 ? pct(p.v) : "2px", minHeight: 2 }}
                  >
                    {showValue && !active && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-surface/85 px-1 text-[11px] font-bold tabular-nums text-ink">{p.v}</span>
                    )}
                  </span>
                  {active && (
                    <div
                      role="presentation"
                      className={`pointer-events-none absolute z-20 whitespace-nowrap rounded-lg border border-white/10 bg-surface-2 px-3 py-2 text-xs shadow-xl shadow-black/40 ${tipSide}`}
                      style={{ bottom: `calc(${pct(Math.max(p.v, p.prev ?? 0))} + 12px)` }}
                    >
                      <span className="block font-semibold text-ink first-letter:uppercase">{weekdayLong(p.d)}</span>
                      <span className="mt-0.5 block text-zinc-300">
                        <strong className="font-extrabold text-ink">{p.v}</strong> {unit}
                      </span>
                      {p.prev != null && <span className="block text-zinc-500">semana anterior: {p.prev}</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Eje horizontal */}
          <div aria-hidden="true" className="mt-2 flex gap-1.5 sm:gap-3">
            {days.map((p, i) => (
              <div key={p.d} className={`flex flex-1 flex-col items-center text-[11px] leading-tight ${i === n - 1 ? "font-bold text-ink" : "text-zinc-500"}`}>
                <span className="capitalize">{i === n - 1 ? "hoy" : weekdayShort(p.d)}</span>
                <span className="tabular-nums">{Number(p.d.slice(8, 10))}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>{unit} por día</caption>
        <thead>
          <tr>
            <th>Día</th>
            <th>Esta semana</th>
            <th>Semana anterior</th>
          </tr>
        </thead>
        <tbody>
          {days.map((p) => (
            <tr key={p.d}>
              <td>{weekdayLong(p.d)}</td>
              <td>{p.v}</td>
              <td>{p.prev ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Cuando una cifra no tiene desglose por día (los clics en entradas), se compara el total con el de la semana anterior.
export function CompareBars({ now, before, unit, className = "" }: { now: number; before: number; unit: string; className?: string }) {
  const max = Math.max(now, before, 1)
  const rows = [
    { label: "Esta semana", v: now, cls: "bg-brand" },
    { label: "Semana anterior", v: before, cls: "bg-zinc-500" },
  ]
  return (
    <div className={`flex min-h-44 flex-col justify-center gap-5 sm:min-h-56 ${className}`}>
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1.5 flex items-baseline justify-between text-xs text-zinc-400">
            <span>{r.label}</span>
            <span className="text-sm font-extrabold tabular-nums text-ink">
              {r.v} <span className="text-xs font-medium text-zinc-500">{unit}</span>
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-white/[0.05]">
            <div className={`h-full rounded-full ${r.cls}`} style={{ width: `${Math.max(1.5, (r.v / max) * 100)}%` }} />
          </div>
        </div>
      ))}
      <p className="text-xs text-zinc-500">Este dato no se guarda por días, por eso se compara solo el total de cada semana.</p>
    </div>
  )
}
