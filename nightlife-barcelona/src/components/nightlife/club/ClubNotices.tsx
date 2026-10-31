"use client"

import { useEffect, useState } from "react"
import Icon from "../../ui/Icon"
import { useLanguage } from "../../../context/LanguageContext"
import { toDateLocale } from "../../../lib/dateLocale"
import { activeNotices, nightDay, upcomingNotices, type ScheduleNotice } from "../../../lib/scheduleNotices"

// Avisos del propio local en su ficha (30/10/2026), los que publica desde «Mi club»:
//   · cerrado esta noche (lo más visible, en ámbar),
//   · horario especial esta noche,
//   · un aviso con texto (obras, evento privado...),
//   · y, más discretos, los cierres y horarios especiales de los próximos 14 días.
// Se calcula tras montar la página porque depende de la hora (de Madrid) y la ficha se sirve ya hecha.
export default function ClubNotices({ notices }: { notices: unknown }) {
  const { t, locale } = useLanguage()
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  if (!ready) return null

  const today = nightDay()
  const active = activeNotices(notices, today)
  const upcoming = upcomingNotices(notices, today)
  if (active.length === 0 && upcoming.length === 0) return null

  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(toDateLocale(locale), { weekday: "short", day: "numeric", month: "short" })

  const range = (n: ScheduleNotice) => (n.from === n.to ? fmt(n.from) : t("notices.range").replace("{from}", fmt(n.from)).replace("{to}", fmt(n.to)))
  const hoursText = (n: ScheduleNotice) => `${n.open}–${n.close}`

  const upcomingLine = (n: ScheduleNotice) =>
    n.kind === "closed"
      ? t("notices.upClosed").replace("{when}", range(n))
      : t("notices.upHours").replace("{when}", range(n)).replace("{hours}", hoursText(n))

  return (
    <div className="mt-5 max-w-2xl space-y-3">
      {active.map((n) => {
        if (n.kind === "closed") {
          return (
            <div key={n.id} className="flex items-start gap-3 rounded-card border border-warn/50 bg-warn/[0.14] px-4 py-3.5" role="note">
              <Icon name="clock" className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
              <div>
                <p className="text-base font-bold text-warn">{t("notices.closedTonight")}</p>
                {n.to !== n.from && <p className="mt-0.5 text-sm text-zinc-100">{t("notices.closedUntil").replace("{date}", fmt(n.to))}</p>}
                {n.note && <p className="mt-1 text-sm leading-relaxed text-zinc-100">{n.note}</p>}
              </div>
            </div>
          )
        }
        if (n.kind === "hours") {
          return (
            <div key={n.id} className="flex items-start gap-3 rounded-card border border-white/15 bg-white/[0.05] px-4 py-3.5" role="note">
              <Icon name="clock" className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
              <div>
                <p className="text-base font-bold text-ink">{t("notices.hoursTonight").replace("{hours}", hoursText(n))}</p>
                {n.note && <p className="mt-1 text-sm leading-relaxed text-zinc-200">{n.note}</p>}
              </div>
            </div>
          )
        }
        return (
          <div key={n.id} className="flex items-start gap-3 rounded-card border border-white/15 bg-white/[0.05] px-4 py-3.5" role="note">
            <Icon name="megaphone" className="mt-0.5 h-5 w-5 shrink-0 text-brand-soft" />
            <div>
              <p className="text-sm font-bold text-ink">{t("notices.fromVenue")}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-zinc-200">{n.note}</p>
            </div>
          </div>
        )
      })}

      {upcoming.length > 0 && (
        <ul className="space-y-1 text-sm text-zinc-300" aria-label={t("notices.upcomingTitle")}>
          {upcoming.slice(0, 4).map((n) => (
            <li key={n.id} className="flex items-start gap-2">
              <Icon name="calendar" className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
              <span>
                {upcomingLine(n)}
                {n.note ? <span className="text-zinc-400"> · {n.note}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
