"use client"

import { hourLabel, peakHour } from "../../lib/dataInsights"

// Piezas compartidas por las pantallas de Admin › Datos que usan el SQL 88 (11/11/2026).

/** Aviso cuando falta ejecutar un SQL en Supabase. Sin él, una pantalla sin datos parecería «cero». */
export function NeedSql({ file, what, className = "" }: { file: string; what: string; className?: string }) {
  return (
    <p className={`rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200 ${className}`}>
      Para ver {what}, ejecuta el SQL {file.split("_")[0]} ({file}) en Supabase › SQL Editor.
    </p>
  )
}

/** 24 barras, una por hora (hora de Madrid). La hora más alta va más clara. */
export function HourBars({ values, color = "#7c5cff", peakColor = "#b9a4ff" }: { values: number[]; color?: string; peakColor?: string }) {
  const max = Math.max(1, ...values)
  const peak = peakHour(values)
  return (
    <div
      className="flex h-32 items-stretch gap-0.5"
      role="img"
      aria-label={peak === null ? "Sin datos por hora" : `Hora con más actividad: ${hourLabel(peak)}, ${values[peak]}`}
    >
      {values.map((v, h) => (
        <div key={h} className="relative flex min-w-0 flex-1 flex-col items-center" title={`${hourLabel(h)}: ${v}`}>
          <div className="flex min-h-0 w-full flex-1 items-end">
            <div className="w-full rounded-t" style={{ height: `${Math.max(2, (v / max) * 100)}%`, background: h === peak ? peakColor : color }} />
          </div>
          <span className="mt-1 h-4 w-full text-center text-xs leading-4 text-zinc-400">{h % 3 === 0 ? <span className="whitespace-nowrap">{String(h).padStart(2, "0")}</span> : null}</span>
        </div>
      ))}
    </div>
  )
}

/** Una línea bajo un gráfico de horas: dónde está el pico. */
export function PeakNote({ values, noun }: { values: number[]; noun: string }) {
  const peak = peakHour(values)
  const total = values.reduce((a, b) => a + b, 0)
  if (peak === null) return <p className="mt-3 text-xs text-zinc-400">Sin datos en este periodo.</p>
  return (
    <p className="mt-3 text-xs text-zinc-400">
      Hora de Madrid. La más alta: <span className="font-semibold text-ink">{hourLabel(peak)}</span> ({values[peak]} de {total} {noun}).
    </p>
  )
}
