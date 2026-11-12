"use client"

import { useState } from "react"
import { HOURS_DAY_NAMES, compileRows, describeRows, hasEarlyRows, rowIsComplete, rowsFromClub, startsAfterMidnight, type DayRow } from "../../lib/clubHoursEditor"

// Horario por días para el admin y «Mi club» (06/11/2026): se marca cada día, se despliegan sus horas de inicio
// y de fin, y el texto de horario y los días de apertura se componen solos (lib/clubHoursEditor.ts).

export type ClubHoursEditorLabels = {
  start: string
  end: string
  missing: string // «Falta la hora de inicio o de fin»
  sameForAll: string // «Mismo horario para todos los días marcados»
  early: string // aviso cuando empieza pasada la medianoche
  legacy: string // «Horario anterior (no se puede separar por días):»
  preview?: string // «Se guardará como:» (solo en el admin)
  nights?: string // «Lo que has marcado:» (solo en el admin)
  previewNote?: string // por qué las letras del texto guardado van un día por delante en los horarios de madrugada (solo en el admin)
}

type Props = {
  hours: string
  openDays: string[]
  onChange: (next: { hours: string; open_days: string[] }) => void
  labels: ClubHoursEditorLabels
  dayLabel: (index: number) => string // 0 = lunes
  chipClass: (active: boolean) => string
  inputClass: string
}

const signature = (hours: string, openDays: string[]) => `${hours}§${openDays.join(",")}`

export default function ClubHoursEditor({ hours, openDays, onChange, labels, dayLabel, chipClass, inputClass }: Props) {
  const sig = signature(hours, openDays)
  const [state, setState] = useState(() => ({ sig, ...rowsFromClub(hours, openDays) }))

  // Si el formulario cambia desde fuera (otro club, formulario vaciado tras guardar) se vuelve a leer de él.
  // Lo que emite este mismo editor ya coincide con la firma, así que no se pisa lo que se está escribiendo.
  if (state.sig !== sig) setState({ sig, ...rowsFromClub(hours, openDays) })

  const rows = state.rows

  const apply = (next: DayRow[]) => {
    const c = compileRows(next)
    setState({ sig: signature(c.hours, c.openDays), rows: next, legacy: state.legacy })
    onChange({ hours: c.hours, open_days: c.openDays })
  }

  const setRow = (i: number, patch: Partial<DayRow>) => apply(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const toggleDay = (i: number) => {
    if (rows[i].on) return setRow(i, { on: false })
    // Al marcar un día se copian las horas del día marcado más cercano que las tenga: lo normal es que se repitan.
    const donors = rows.map((r, j) => ({ r, d: Math.abs(j - i) })).filter((x) => rowIsComplete(x.r)).sort((a, b) => a.d - b.d)
    const from = donors[0]?.r
    setRow(i, { on: true, start: from?.start ?? "", end: from?.end ?? "" })
  }

  const sameForAll = () => {
    const source = rows.find(rowIsComplete)
    if (!source) return
    apply(rows.map((r) => (r.on ? { ...r, start: source.start, end: source.end } : r)))
  }

  // Los campos de hora comparten fila con el día: menos relleno lateral para que quepan dos en un móvil.
  const timeClass = `${inputClass.replace(/\bpx-\d+\b/, "px-3")} min-w-0`

  const markedCount = rows.filter((r) => r.on).length
  const differentTimes = new Set(rows.filter(rowIsComplete).map((r) => `${r.start}-${r.end}`)).size > 1

  return (
    <div>
      {state.legacy && (
        <p className="mb-3 break-words rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          {labels.legacy} <span className="font-semibold">{state.legacy}</span>
        </p>
      )}

      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={HOURS_DAY_NAMES[i]}>
            <div className={`grid items-center gap-2 ${r.on ? "grid-cols-[4rem_minmax(0,1fr)_auto_minmax(0,1fr)]" : "grid-cols-[4rem]"}`}>
              <button type="button" aria-pressed={r.on} onClick={() => toggleDay(i)} className={`${chipClass(r.on)} w-full text-center capitalize`}>
                {dayLabel(i)}
              </button>
              {r.on && (
                <>
                  <input
                    type="time"
                    value={r.start}
                    onChange={(e) => setRow(i, { start: e.target.value })}
                    aria-label={`${dayLabel(i)}: ${labels.start}`}
                    style={{ colorScheme: "dark" }}
                    className={timeClass}
                  />
                  <span aria-hidden className="text-zinc-400">
                    –
                  </span>
                  <input
                    type="time"
                    value={r.end}
                    onChange={(e) => setRow(i, { end: e.target.value })}
                    aria-label={`${dayLabel(i)}: ${labels.end}`}
                    style={{ colorScheme: "dark" }}
                    className={timeClass}
                  />
                </>
              )}
            </div>
            {r.on && !rowIsComplete(r) && <p className="mt-1 pl-[4.5rem] text-xs text-amber-300">{labels.missing}</p>}
            {r.on && startsAfterMidnight(r.start, r.end) && <p className="mt-1 pl-[4.5rem] text-xs text-zinc-400">{labels.early}</p>}
          </li>
        ))}
      </ul>

      {markedCount > 1 && differentTimes && (
        <button type="button" onClick={sameForAll} className="mt-3 text-xs font-semibold text-zinc-300 underline underline-offset-2 hover:text-white">
          {labels.sameForAll}
        </button>
      )}

      {labels.preview && hours && (
        <div className="mt-3 space-y-1 break-words text-xs text-zinc-400">
          {labels.nights && (
            <p>
              {labels.nights} <span className="font-semibold text-zinc-100">{describeRows(rows, HOURS_DAY_NAMES.map((_, i) => dayLabel(i)))}</span>
            </p>
          )}
          <p>
            {labels.preview} <code className="rounded bg-white/10 px-1.5 py-0.5 text-zinc-200">{hours}</code>
          </p>
          {labels.previewNote && hasEarlyRows(rows) && <p className="text-zinc-500">{labels.previewNote}</p>}
        </div>
      )}
    </div>
  )
}

