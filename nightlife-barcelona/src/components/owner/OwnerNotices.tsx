"use client"

import { useMemo, useState } from "react"
import { CalendarX2, Clock, Megaphone, Trash2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import { toDateLocale } from "../../lib/dateLocale"
import { logError } from "../../lib/log"
import { toast } from "../ui/Toast"
import { MAX_NOTICES, NOTE_MAX, addDays, nightDay, parseNotices, pruneNotices, type NoticeKind, type ScheduleNotice } from "../../lib/scheduleNotices"

// Avisos de cierre y horarios especiales (30/10/2026), dentro de «Mi club». Se guardan al instante
// (no esperan al botón de guardar de la ficha): si esta noche cierras, tiene que estar publicado ya.
// Salen en la ficha, en la tarjeta del listado y quitan al local de «abierto ahora» y de las
// recomendaciones esa noche. Los pasados se limpian solos.
const inputClass =
  "w-full rounded-ctl border border-white/15 bg-night px-4 py-3 text-base text-ink outline-none transition placeholder:text-zinc-500 focus:border-brand"
const labelClass = "mb-1.5 block text-sm font-semibold text-zinc-300"

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36))

export default function OwnerNotices({
  clubId,
  initial,
  onSaved,
}: {
  clubId: number
  initial: unknown
  onSaved: (list: ScheduleNotice[]) => void
}) {
  const { t, locale } = useLanguage()
  const [list, setList] = useState<ScheduleNotice[]>(() => pruneNotices(initial))
  const today = nightDay()

  const [kind, setKind] = useState<NoticeKind>("closed")
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState("")
  const [open, setOpen] = useState("20:00")
  const [close, setClose] = useState("02:00")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(toDateLocale(locale), { weekday: "short", day: "numeric", month: "short" })

  const describe = (n: ScheduleNotice) => {
    const when = n.from === n.to ? fmt(n.from) : t("notices.range").replace("{from}", fmt(n.from)).replace("{to}", fmt(n.to))
    if (n.kind === "closed") return t("ownerPortal.ntDescClosed").replace("{when}", when)
    if (n.kind === "hours") return t("ownerPortal.ntDescHours").replace("{when}", when).replace("{hours}", `${n.open}–${n.close}`)
    return t("ownerPortal.ntDescNotice").replace("{when}", when)
  }

  const persist = async (next: ScheduleNotice[]): Promise<boolean> => {
    setSaving(true)
    const clean = pruneNotices(next)
    const { error } = await supabase.from("clubs").update({ schedule_notices: clean }).eq("id", clubId)
    setSaving(false)
    if (error) {
      logError("OWNER NOTICES SAVE:", error)
      toast(t("ownerPortal.ntErrSave"), 5000)
      return false
    }
    setList(clean)
    onSaved(clean)
    return true
  }

  const quick = (k: NoticeKind, startsToday: boolean) => {
    setKind(k)
    setFrom(startsToday ? today : addDays(today, 1))
    setTo("")
    setNote("")
    window.setTimeout(() => document.getElementById("nt-note")?.focus(), 50)
  }

  const publish = async () => {
    if (saving) return
    if (list.length >= MAX_NOTICES) {
      toast(t("ownerPortal.ntErrMax"), 5000)
      return
    }
    if (!from || from < today) {
      toast(t("ownerPortal.ntErrDate"), 5000)
      return
    }
    const end = to && to >= from ? to : from
    if (kind === "notice" && !note.trim()) {
      toast(t("ownerPortal.ntErrNote"), 5000)
      return
    }
    const entry: ScheduleNotice = { id: newId(), kind, from, to: end }
    if (kind === "hours") {
      if (!open || !close) {
        toast(t("ownerPortal.ntErrHours"), 5000)
        return
      }
      entry.open = open
      entry.close = close
    }
    if (note.trim()) entry.note = note.trim().slice(0, NOTE_MAX)
    const parsed = parseNotices([entry])
    if (parsed.length === 0) {
      toast(t("ownerPortal.ntErrSave"), 5000)
      return
    }
    if (await persist([...list, parsed[0]])) {
      setNote("")
      setTo("")
      toast(t("ownerPortal.ntPublished"))
    }
  }

  const remove = async (id: string) => {
    if (saving) return
    if (await persist(list.filter((n) => n.id !== id))) toast(t("ownerPortal.ntRemoved"))
  }

  const kinds: { k: NoticeKind; label: string; Icon: typeof Clock }[] = useMemo(
    () => [
      { k: "closed", label: t("ownerPortal.ntKindClosed"), Icon: CalendarX2 },
      { k: "hours", label: t("ownerPortal.ntKindHours"), Icon: Clock },
      { k: "notice", label: t("ownerPortal.ntKindNotice"), Icon: Megaphone },
    ],
    [t]
  )

  const seg = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-2 rounded-ctl px-3 py-3 text-sm font-semibold transition ${
      active ? "bg-brand text-white" : "border border-white/15 text-zinc-200 hover:bg-white/5"
    }`

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => quick("closed", true)}
          className="rounded-full border border-warn/60 bg-warn/10 px-4 py-2.5 text-sm font-bold text-warn transition hover:bg-warn/20"
        >
          {t("ownerPortal.ntQuickToday")}
        </button>
        <button
          type="button"
          onClick={() => quick("closed", false)}
          className="rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/5"
        >
          {t("ownerPortal.ntQuickTomorrow")}
        </button>
      </div>

      <div className="mt-5 rounded-card border border-white/10 bg-night/40 p-4 sm:p-5">
        <div className="flex gap-2" role="radiogroup" aria-label={t("ownerPortal.ntKindLabel")}>
          {kinds.map(({ k, label, Icon }) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={seg(kind === k)}>
              <Icon size={16} aria-hidden="true" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="nt-from" className={labelClass}>
              {t("ownerPortal.ntFrom")}
            </label>
            <input
              id="nt-from"
              type="date"
              min={today}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{ colorScheme: "dark" }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="nt-to" className={labelClass}>
              {t("ownerPortal.ntTo")}
            </label>
            <input
              id="nt-to"
              type="date"
              min={from || today}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{ colorScheme: "dark" }}
              className={inputClass}
            />
          </div>
          {kind === "hours" && (
            <>
              <div>
                <label htmlFor="nt-open" className={labelClass}>
                  {t("ownerPortal.ntOpen")}
                </label>
                <input id="nt-open" type="time" value={open} onChange={(e) => setOpen(e.target.value)} style={{ colorScheme: "dark" }} className={inputClass} />
              </div>
              <div>
                <label htmlFor="nt-close" className={labelClass}>
                  {t("ownerPortal.ntClose")}
                </label>
                <input id="nt-close" type="time" value={close} onChange={(e) => setClose(e.target.value)} style={{ colorScheme: "dark" }} className={inputClass} />
              </div>
            </>
          )}
          <div className="sm:col-span-2">
            <label htmlFor="nt-note" className={labelClass}>
              {kind === "notice" ? t("ownerPortal.ntNoteRequired") : t("ownerPortal.ntNote")}
            </label>
            <input
              id="nt-note"
              value={note}
              maxLength={NOTE_MAX}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t(kind === "closed" ? "ownerPortal.ntPhClosed" : kind === "hours" ? "ownerPortal.ntPhHours" : "ownerPortal.ntPhNotice")}
              className={inputClass}
            />
            <p className="mt-1 text-right text-[11px] tabular-nums text-zinc-500">
              {note.length}/{NOTE_MAX}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={publish}
          disabled={saving}
          className="mt-2 w-full rounded-ctl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50 sm:w-auto"
        >
          {saving ? t("ownerPortal.ntPublishing") : t("ownerPortal.ntPublish")}
        </button>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-zinc-300">{t("ownerPortal.ntListTitle")}</h3>
        {list.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">{t("ownerPortal.ntEmpty")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {list.map((n) => {
              const live = n.from <= today && today <= n.to
              return (
                <li key={n.id} className="flex items-start justify-between gap-3 rounded-card border border-white/10 bg-surface p-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {describe(n)}{" "}
                      <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${live ? "bg-warn text-night" : "bg-white/10 text-zinc-300"}`}>
                        {live ? t("ownerPortal.ntLive") : t("ownerPortal.ntSoon")}
                      </span>
                    </p>
                    {n.note && <p className="mt-1 break-words text-sm text-zinc-400">{n.note}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(n.id)}
                    disabled={saving}
                    aria-label={t("ownerPortal.ntRemove")}
                    title={t("ownerPortal.ntRemove")}
                    className="shrink-0 rounded-ctl border border-white/15 p-2.5 text-zinc-300 transition hover:bg-white/5 hover:text-red-300 disabled:opacity-50"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
