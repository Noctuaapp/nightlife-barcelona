"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { awardXp, XP_AMOUNTS } from "../../lib/xp"
import XpBurst from "../mascot/XpBurst"
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

  // Nota del check-in: lo único de verdad "en directo" que puede dejar alguien que ACABA de
  // comprobarlo con el GPS — distinto de una reseña de Google, que puede ser de hace meses.
  // Una nota por check-in (no por usuario), así que se guarda sobre la fila de hoy, no se crea
  // una tabla nueva. noteSaved evita mostrar el formulario otra vez tras guardar.
  const [note, setNote] = useState("")
  const [noteSaved, setNoteSaved] = useState(false)
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { setLoading(false); return }
      setUserId(data.user.id)

      const today = new Date().toISOString().slice(0, 10)
      const { data: existing } = await supabase
        .from("club_checkins")
        .select("id, note")
        .eq("user_id", data.user.id)
        .eq("club_id", clubId)
        .eq("checkin_date", today)
        .maybeSingle()

      setCheckedInToday(!!existing)
      if (existing?.note) setNoteSaved(true)
      setLoading(false)
    }
    load()
  }, [clubId])

  const handleSaveNote = async () => {
    if (!userId || !note.trim()) return
    setSavingNote(true)
    const today = new Date().toISOString().slice(0, 10)
    const { error: noteError } = await supabase
      .from("club_checkins")
      .update({ note: note.trim().slice(0, 140), note_created_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("club_id", clubId)
      .eq("checkin_date", today)
    setSavingNote(false)
    if (noteError) {
      console.log("CHECKIN NOTE ERROR:", noteError)
      return
    }
    setNoteSaved(true)
  }

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
      <XpBurst show={justEarned} amount={XP_AMOUNTS.checkin} />
      {checkedInToday && !noteSaved && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs font-semibold text-zinc-400">¿Cómo está la noche? Déjale una nota a quien venga después.</p>
          <div className="mt-2 flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={140}
              placeholder="Ej. cola corta, buen ambiente..."
              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-purple-500/50"
            />
            <button
              onClick={handleSaveNote}
              disabled={savingNote || !note.trim()}
              className="rounded-xl bg-purple-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-purple-400 disabled:opacity-50"
            >
              {savingNote ? "..." : "Publicar"}
            </button>
          </div>
        </div>
      )}
      {checkedInToday && noteSaved && (
        <p className="mt-2 text-center text-[11px] text-emerald-400">✓ Nota publicada — gracias por avisar</p>
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
