"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import BadgeToast from "../mascot/BadgeToast"
import { evaluateBadges } from "../../lib/badges"
import { useLanguage } from "../../context/LanguageContext"
import Icon from "../ui/Icon"
import { logError } from "../../lib/log"

type AttendanceButtonProps = {
  itemType: "event" | "club_event" | "club"
  itemId: number
  title?: string
}

// Inicio de la "noche" actual: las 06:00 más recientes en Madrid. Una marca de asistencia a un
// CLUB solo vale hasta ese momento (antes se quedaba marcada para siempre, y al día siguiente
// seguía diciendo "Voy esta noche"). Los eventos y noches de club tienen fecha propia y la ficha
// ni muestra el botón cuando ya han pasado, así que a esos no se les aplica.
function currentNightStartMs(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date())
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value || "0", 10)
  const hour = get("hour") % 24
  const sinceSix = (((hour - 6 + 24) % 24) * 60 + get("minute")) * 60 + get("second")
  return Date.now() - sinceSix * 1000
}

// Fecha (YYYY-MM-DD) de la "noche" actual en Madrid: hasta las 06:00 sigue contando como la
// noche del día anterior. Cada marca guarda su noche, así el historial se conserva entero.
function currentNightDate(): string {
  return new Date(currentNightStartMs() + 12 * 3600 * 1000)
    .toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" })
}

// Botón "Asistiré esta noche" — marca intención de asistencia (independiente de favoritos).
// Ya no da XP: el XP se gana con el check-in real en el local.
export default function AttendanceButton({ itemType, itemId }: AttendanceButtonProps) {
  const { t } = useLanguage()
  const [userId, setUserId] = useState<string | null>(null)
  const [attending, setAttending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newBadges, setNewBadges] = useState<string[]>([])
  const [count, setCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      const { data: cnt } = await supabase.rpc("attendance_count", { p_type: itemType, p_id: itemId })
      if (typeof cnt === "number") setCount(cnt)
      const { data } = await supabase.auth.getUser()
      if (!data.user) { setLoading(false); return }
      setUserId(data.user.id)

      const { data: existing } = await supabase
        .from("attendances")
        .select("id, night")
        .eq("user_id", data.user.id)
        .eq("item_type", itemType)
        .eq("item_id", itemId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      const stillValid = !!existing && (itemType !== "club" || existing.night === currentNightDate())
      setAttending(stillValid)
      setLoading(false)
    }
    load()
  }, [itemType, itemId])

  const toggleAttendance = async () => {
    if (!userId) {
      window.location.href = "/login"
      return
    }

    if (attending) {
      const { error } = await supabase
        .from("attendances")
        .delete()
        .eq("user_id", userId)
        .eq("item_type", itemType)
        .eq("item_id", itemId)
        .eq("night", currentNightDate())
      if (!error) {
        setAttending(false)
        setCount((c) => Math.max(0, c - 1))
      }
      return
    }

    const { error } = await supabase.from("attendances").insert({
      user_id: userId,
      item_type: itemType,
      item_id: itemId,
      night: currentNightDate(),
    })

    if (error) {
      logError("ATTENDANCE INSERT ERROR:", error)
      return
    }

    setAttending(true)
    setCount((c) => c + 1)

    const nb = await evaluateBadges(supabase)
    if (nb.length) setNewBadges(nb)
  }

  if (loading) return null

  return (
    <div className="relative">
      <BadgeToast keys={newBadges} onDone={() => setNewBadges([])} />
      <button
        onClick={toggleAttendance}
        aria-pressed={attending}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-ctl px-6 py-3.5 text-sm font-semibold transition ${
          attending ? "bg-open text-night" : "border border-white/10 bg-white/5 text-ink hover:bg-white/10"
        }`}
      >
        <Icon name={attending ? "check" : "calendar"} className="h-4 w-4" />
        {attending ? t("attendance.going") : t("attendance.willGo")}
      </button>
      {count >= 10 && (
        <p className="mt-2 text-center text-xs font-semibold text-zinc-300">
          {(itemType === "club" ? t("attendance.countTonight") : t("attendance.count")).replace("{n}", String(Math.floor(count / 10) * 10))}
        </p>
      )}
    </div>
  )
}
