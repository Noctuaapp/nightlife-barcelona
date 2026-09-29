"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { awardXp, XP_AMOUNTS } from "../../lib/xp"
import { useLanguage } from "../../context/LanguageContext"

type CheckInButtonProps = {
  clubId: number
  latitude: number | null
  longitude: number | null
}

// Radio de tolerancia del GPS para considerar que alguien está "en" el club. Los GPS de móvil
// dentro de un edificio en una zona urbana densa (mucha discoteca está en sótanos/locales sin
// buena señal) pueden dar 80-120m de error fácilmente, así que 200m es un compromiso entre
// exigencia real y no bloquear a gente que sí está allí.
const MAX_DISTANCE_METERS = 200

function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function CheckInButton({ clubId, latitude, longitude }: CheckInButtonProps) {
  const { t } = useLanguage()
  const [userId, setUserId] = useState<string | null>(null)
  const [checkedInToday, setCheckedInToday] = useState(false)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState("")
  const [justEarned, setJustEarned] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { setLoading(false); return }
      setUserId(data.user.id)

      const today = new Date().toISOString().slice(0, 10)
      const { data: existing } = await supabase
        .from("club_checkins")
        .select("id")
        .eq("user_id", data.user.id)
        .eq("club_id", clubId)
        .eq("checkin_date", today)
        .maybeSingle()

      setCheckedInToday(!!existing)
      setLoading(false)
    }
    load()
  }, [clubId])

  if (!latitude || !longitude) return null

  const handleCheckIn = () => {
    if (!userId) {
      window.location.href = "/login"
      return
    }
    if (!navigator.geolocation) {
      setError(t("checkin.noGeolocation"))
      return
    }

    setWorking(true)
    setError("")

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const dist = distanceInMeters(
          position.coords.latitude,
          position.coords.longitude,
          latitude,
          longitude
        )

        if (dist > MAX_DISTANCE_METERS) {
          setError(t("checkin.tooFar"))
          setWorking(false)
          return
        }

        const today = new Date().toISOString().slice(0, 10)
        const { error: insertError } = await supabase.from("club_checkins").insert({
          user_id: userId,
          club_id: clubId,
          checkin_date: today,
        })

        if (insertError) {
          // Violación de la restricción única (ya había check-in hoy) — no es un fallo real.
          if (insertError.code === "23505") {
            setCheckedInToday(true)
          } else {
            console.log("CHECKIN INSERT ERROR:", insertError)
            setError(t("checkin.error"))
          }
          setWorking(false)
          return
        }

        setCheckedInToday(true)
        setWorking(false)

        const { awarded } = await awardXp(supabase, {
          userId,
          actionType: "checkin",
          itemType: "club",
          itemId: clubId,
          amount: XP_AMOUNTS.checkin,
        })

        if (awarded) {
          setJustEarned(true)
          setTimeout(() => setJustEarned(false), 2500)
        }
      },
      () => {
        setError(t("checkin.permissionDenied"))
        setWorking(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  if (loading) return null

  return (
    <div className="relative mt-3">
      <button
        onClick={handleCheckIn}
        disabled={working || checkedInToday}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 font-bold transition hover:scale-[1.02] disabled:hover:scale-100 ${
          checkedInToday
            ? "bg-purple-500 text-white opacity-90"
            : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
        }`}
      >
        {checkedInToday ? `📍 ${t("checkin.done")}` : working ? `${t("checkin.locating")}` : `📍 ${t("checkin.cta")}`}
      </button>
      {justEarned && (
        <span className="absolute -top-3 right-2 rounded-full bg-purple-500 px-3 py-1 text-xs font-black text-white shadow-lg">
          +{XP_AMOUNTS.checkin} XP
        </span>
      )}
      {!checkedInToday && (
        <p className="mt-2 text-center text-[11px] leading-snug text-zinc-500">
          {t("checkin.hint").replace("{xp}", String(XP_AMOUNTS.checkin))}
          {" · "}
          <a href="/club-noctua" className="font-semibold text-zinc-400 underline underline-offset-2 hover:text-zinc-300">
            {t("levels.viewMine")}
          </a>
        </p>
      )}
      {error && <p className="mt-2 text-center text-xs text-red-400">{error}</p>}
    </div>
  )
}
