"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { awardXp, XP_AMOUNTS } from "../../lib/xp"
import { useLanguage } from "../../context/LanguageContext"

type AttendanceButtonProps = {
  itemType: "event" | "club_event"
  itemId: number
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
        .select("id")
        .eq("user_id", data.user.id)
        .eq("item_type", itemType)
        .eq("item_id", itemId)
        .maybeSingle()

      setAttending(!!existing)
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
      {justEarned && (
        <span className="absolute -top-3 right-2 rounded-full bg-purple-500 px-3 py-1 text-xs font-black text-white shadow-lg">
          +{XP_AMOUNTS.attendance} XP
        </span>
      )}
    </div>
  )
}
