"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { awardXp, XP_AMOUNTS } from "../../lib/xp"
import XpBurst from "../mascot/XpBurst"
import { useLanguage } from "../../context/LanguageContext"

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

// Botón "Asistiré esta noche" — marca intención de asistencia (independiente de favoritos) y
// da XP la primera vez que se marca. Quitarlo no resta XP (para no penalizar un cambio de
// planes ni animar a "farmear" marcando/desmarcando).
export default function AttendanceButton({ itemType, itemId }: AttendanceButtonProps) {
  const { t } = useLanguage()
  const [userId, setUserId] = useState<string | null>(null)
  const [attending, setAttending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [justEarned, setJustEarned] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { setLoading(false); return }
      setUserId(data.user.id)

      const { data: existing } = await supabase
        .from("attendances")
        .select("id, created_at")
        .eq("user_id", data.user.id)
        .eq("item_type", itemType)
        .eq("item_id", itemId)
        .maybeSingle()

      const stillValid =
        !!existing && (itemType !== "club" || new Date(existing.created_at).getTime() >= currentNightStartMs())
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
      if (!error) setAttending(false)
      return
    }

    // Si quedaba una marca de una noche anterior (la tabla no permite dos filas iguales),
    // se borra antes de crear la de esta noche.
    await supabase.from("attendances").delete().eq("user_id", userId).eq("item_type", itemType).eq("item_id", itemId)

    const { error } = await supabase.from("attendances").insert({
      user_id: userId,
      item_type: itemType,
      item_id: itemId,
    })

    if (error) {
      console.log("ATTENDANCE INSERT ERROR:", error)
      return
    }

    setAttending(true)

    const { awarded } = await awardXp(supabase, {
      userId,
      actionType: "attendance",
      itemType,
      itemId,
      amount: XP_AMOUNTS.attendance,
    })

    if (awarded) {
      setJustEarned(true)
      setTimeout(() => setJustEarned(false), 2500)
    }
  }

  if (loading) return null

  return (
    <div className="relative">
      <button
        onClick={toggleAttendance}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 font-bold transition hover:scale-[1.02] ${
          attending
            ? "bg-emerald-500 text-white"
            : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
        }`}
      >
        {attending ? `✅ ${t("attendance.going")}` : `🙋 ${t("attendance.willGo")}`}
      </button>
      <XpBurst show={justEarned} amount={XP_AMOUNTS.attendance} />
      {!attending && (
        <p className="mt-2 text-center text-[11px] leading-snug text-zinc-500">
          {t("attendance.hint").replace("{xp}", String(XP_AMOUNTS.attendance))}
          {" · "}
          <a href="/club-noctua" className="font-semibold text-zinc-400 underline underline-offset-2 hover:text-zinc-300">
            {t("levels.viewMine")}
          </a>
        </p>
      )}
    </div>
  )
}
