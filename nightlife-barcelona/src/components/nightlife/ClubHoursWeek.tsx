"use client"

import { useEffect, useMemo, useState } from "react"
import Icon from "../ui/Icon"
import { InlineEditText } from "../admin/InlineEdit"
import { useLanguage } from "../../context/LanguageContext"
import { useClubText } from "../../lib/useClubText"
import { madridClock } from "../../lib/clubHours"
import { dayRuns, groupRows, rowsFromClub } from "../../lib/clubHoursEditor"

// Horario de la ficha como lo lee la gente (12/11/2026): siete bolitas con los días de la semana, encendidas las noches
// en que abre el local, y debajo las horas. Antes era una celda de la rejilla de datos con el texto tal como se guarda
// ("V 00:30-05:00 | S-D 00:30-06:00"): se cortaba si era largo y, con los horarios de madrugada, las letras llevan el día
// de calendario y no la noche, así que parecía que abría el domingo. Aquí los días son NOCHES, igual que en el editor del
// admin (lib/clubHoursEditor.ts): «Jue» es la noche del jueves, que acaba ya el viernes de madrugada.
// Si el horario es texto libre que no se puede repartir por días, se enseña tal cual y las bolitas salen de los días de
// apertura (si los hay).

function names(locale: string, width: "short" | "narrow"): string[] {
  try {
    const f = new Intl.DateTimeFormat(locale, { weekday: width, timeZone: "UTC" })
    // 1 de enero de 2024 fue lunes.
    return Array.from({ length: 7 }, (_, i) => {
      const w = f.format(new Date(Date.UTC(2024, 0, 1 + i))).replace(/\.$/, "")
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
  } catch {
    return width === "narrow" ? ["L", "M", "X", "J", "V", "S", "D"] : ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
  }
}

export default function ClubHoursWeek({
  clubId,
  hours,
  openDays,
  isAdmin = false,
}: {
  clubId: string | number
  hours: string
  openDays?: string[] | null
  isAdmin?: boolean
}) {
  const { t, locale } = useLanguage()
  const ct = useClubText()
  const { rows, legacy } = useMemo(() => rowsFromClub(hours, openDays), [hours, openDays])
  const initials = useMemo(() => names(locale, "narrow").map((s) => s.slice(0, 1)), [locale])
  const long = useMemo(() => names(locale, "short"), [locale])

  // La noche de hoy (hasta las 06:00 todavía es la de ayer). Solo tras montar: depende de la hora.
  const [tonight, setTonight] = useState<number | null>(null)
  useEffect(() => {
    const { dow, minutes } = madridClock()
    setTonight(((dow + (minutes < 6 * 60 ? 5 : 6)) % 7 + 7) % 7)
  }, [])

  const groups = groupRows(rows)
  const anyDay = rows.some((r) => r.on)
  const structured = !legacy && groups.length > 0
  // Qué pasa esta noche: la hora de esa noche, o que no abre.
  const tonightRow = tonight !== null && structured ? rows[tonight] : null
  const tonightTime = tonightRow && tonightRow.on ? groups.find((g) => g.days.includes(tonight as number))?.time ?? null : null
  const tonightClosed = tonight !== null && structured && !rows[tonight].on

  return (
    <section className="mx-auto mt-3 max-w-6xl px-4 sm:px-6" aria-labelledby="club-hours-title">
      <div className="rounded-card border border-white/10 bg-surface p-3.5 sm:flex sm:items-center sm:gap-8 sm:p-5">
        <div className="flex items-center justify-between gap-3 sm:w-44 sm:shrink-0 sm:flex-col sm:items-start sm:justify-center sm:gap-2.5">
          <div className="flex items-center gap-2.5">
            <Icon name="clock" className="h-4 w-4 shrink-0 text-brand-soft" />
            <h2 id="club-hours-title" className="text-xs font-semibold text-zinc-300 sm:text-sm">
              {t("club.hours")}
            </h2>
          </div>
          {(tonightTime || tonightClosed) && (
            <p
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none ${
                tonightTime ? "border-brand/50 bg-brand/15 text-brand-soft" : "border-white/10 bg-white/5 text-zinc-300"
              }`}
            >
              {tonightTime ? `${t("nav.tonight")} · ${tonightTime}` : t("attendance.closedTonight")}
            </p>
          )}
        </div>

        {anyDay && (
          <ul aria-hidden="true" className="mt-3.5 grid grid-cols-7 gap-1.5 sm:mt-0 sm:flex sm:gap-2">
            {rows.map((r, i) => (
              <li
                key={i}
                className={`mx-auto grid aspect-square w-full max-w-11 place-items-center rounded-full text-[13px] font-bold sm:mx-0 sm:h-10 sm:w-10 sm:max-w-none ${
                  r.on ? "bg-brand text-white shadow-[0_0_18px_-3px_rgba(124,92,255,.85)]" : "border border-white/15 text-zinc-500"
                } ${tonight === i ? "ring-2 ring-white/85 ring-offset-2 ring-offset-surface" : ""}`}
              >
                {initials[i]}
              </li>
            ))}
          </ul>
        )}

        <div className={`min-w-0 sm:flex-1 ${anyDay ? "mt-3.5 border-t border-white/10 pt-3 sm:mt-0 sm:border-0 sm:pt-0 sm:pl-2" : "mt-3.5 sm:mt-0"}`}>
          {legacy ? (
            <p className="break-words text-[13px] font-semibold leading-snug text-ink sm:text-sm">{ct.hours(legacy, openDays)}</p>
          ) : groups.length === 1 ? (
            <p className="font-display text-base leading-tight text-ink sm:text-lg">{groups[0].time}</p>
          ) : (
            <dl>
              {groups.map((g) => (
                <div key={g.time} className="flex items-baseline justify-between gap-4 border-t border-white/10 py-1.5 first:border-t-0 first:pt-0 last:pb-0 sm:justify-start sm:gap-6">
                  <dt className="text-sm text-zinc-300 sm:w-24">{dayRuns(g.days, long)}</dt>
                  <dd className="font-display text-sm text-ink sm:text-base">{g.time}</dd>
                </div>
              ))}
            </dl>
          )}
          {isAdmin && (
            <p className="mt-2 break-words text-xs text-zinc-400">
              Texto guardado: <InlineEditText table="clubs" id={clubId} field="hours" value={hours} />
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
