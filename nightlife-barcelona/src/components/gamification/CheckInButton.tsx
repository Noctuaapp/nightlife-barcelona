"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { awardXp, XP_AMOUNTS } from "../../lib/xp"
import XpBurst from "../mascot/XpBurst"
import BadgeToast from "../mascot/BadgeToast"
import { evaluateBadges } from "../../lib/badges"
import { useLanguage } from "../../context/LanguageContext"
import Icon from "../ui/Icon"

type CheckInButtonProps = {
  clubId: number
  latitude: number | null
  longitude: number | null
}

// Límites del check-in. La comprobación de verdad se hace ahora en el servidor (función
// do_checkin en Supabase): antes todo se validaba en el navegador y cualquiera podía saltárselo
// insertando la fila directamente. Aquí solo se usan para el modo de respaldo (ver más abajo).
const MAX_DISTANCE_METERS = 80
const MAX_ACCURACY_METERS = 50

// Noche actual en Madrid (YYYY-MM-DD): hasta las 06:00 cuenta como la noche anterior. Antes se
// usaba la fecha UTC, que cambia a las 01:00-02:00 hora de Madrid y partía una misma noche en dos.
function nightDate(): string {
  const d = new Date(Date.now() - 6 * 3600 * 1000)
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" })
}

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
  const [newBadges, setNewBadges] = useState<string[]>([])

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

      const today = nightDate()
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
    const today = nightDate()
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
    const nb = await evaluateBadges(supabase)
    if (nb.length) setNewBadges(nb)
  }

  if (!latitude || !longitude) return null

  // Check-in antiguo (validado solo en el navegador). Solo se usa si la función do_checkin aún no
  // existe en Supabase; en cuanto se ejecuta el SQL deja de usarse.
  const legacyCheckIn = async (lat: number, lng: number, accuracy: number) => {
    if (!userId || !latitude || !longitude) return
    if (accuracy > MAX_ACCURACY_METERS) {
      setError(t("checkin.lowAccuracy"))
      setWorking(false)
      return
    }
    if (distanceInMeters(lat, lng, latitude, longitude) > MAX_DISTANCE_METERS) {
      setError(t("checkin.tooFar"))
      setWorking(false)
      return
    }
    const { error: insertError } = await supabase.from("club_checkins").insert({
      user_id: userId,
      club_id: clubId,
      checkin_date: nightDate(),
    })
    if (insertError && insertError.code !== "23505") {
      console.log("CHECKIN INSERT ERROR:", insertError)
      setError(t("checkin.error"))
      setWorking(false)
      return
    }
    setCheckedInToday(true)
    setWorking(false)
    if (insertError) return
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
  }

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
        const { latitude: lat, longitude: lng, accuracy } = position.coords

        const { data: result, error: rpcError } = await supabase.rpc("do_checkin", {
          p_club_id: clubId,
          p_lat: lat,
          p_lng: lng,
          p_accuracy: accuracy,
        })

        // Respaldo mientras no exista la función en la base de datos (SQL sin ejecutar todavía).
        if (rpcError && (rpcError.code === "PGRST202" || rpcError.code === "42883")) {
          await legacyCheckIn(lat, lng, accuracy)
          return
        }
        if (rpcError || !result) {
          console.log("CHECKIN RPC ERROR:", rpcError)
          setError(t("checkin.error"))
          setWorking(false)
          return
        }

        const res = result as { ok: boolean; reason?: string; awarded?: boolean }
        if (!res.ok) {
          const messages: Record<string, string> = {
            low_accuracy: t("checkin.lowAccuracy"),
            too_far: t("checkin.tooFar"),
            ambiguous: t("checkin.ambiguous"),
            limit: t("checkin.limit"),
            too_soon: t("checkin.tooSoon"),
            blocked: t("checkin.blocked"),
          }
          if (res.reason === "login") {
            window.location.href = "/login"
            return
          }
          setError(messages[res.reason || ""] || t("checkin.error"))
          setWorking(false)
          return
        }

        setCheckedInToday(true)
        setWorking(false)
        if (res.awarded) {
          setJustEarned(true)
          setTimeout(() => setJustEarned(false), 2500)
        }
        const nb = await evaluateBadges(supabase)
        if (nb.length) setNewBadges(nb)
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
      <BadgeToast keys={newBadges} onDone={() => setNewBadges([])} />
      <button
        onClick={handleCheckIn}
        disabled={working || checkedInToday}
        className={`flex w-full items-center justify-center gap-2 rounded-ctl px-6 py-3.5 text-sm font-semibold transition ${
          checkedInToday ? "bg-brand/20 text-brand-soft" : "border border-white/10 bg-white/5 text-ink hover:bg-white/10"
        }`}
      >
        <Icon name={checkedInToday ? "check" : "map"} className="h-4 w-4" />
        {checkedInToday ? t("checkin.done") : working ? t("checkin.locating") : t("checkin.cta")}
      </button>
      <XpBurst show={justEarned} amount={XP_AMOUNTS.checkin} />
      {checkedInToday && !noteSaved && (
        <div className="mt-3 rounded-ctl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs font-semibold text-zinc-300">{t("checkin.notePrompt")}</p>
          <div className="mt-2 flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={140}
              placeholder={t("checkin.notePlaceholder")}
              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-purple-500/50"
            />
            <button
              onClick={handleSaveNote}
              disabled={savingNote || !note.trim()}
              className="rounded-ctl bg-brand px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50"
            >
              {savingNote ? "..." : t("checkin.notePublish")}
            </button>
          </div>
        </div>
      )}
      {checkedInToday && noteSaved && (
        <p className="mt-2 text-center text-xs text-open">{t("checkin.noteDone")}</p>
      )}
      {!checkedInToday && (
        <p className="mt-2 text-center text-xs leading-snug text-zinc-400">
          {t("checkin.hint").replace("{xp}", String(XP_AMOUNTS.checkin))}
          {" · "}
          <a href="/club-noctua" className="font-semibold text-zinc-300 underline underline-offset-2 hover:text-ink">
            {t("levels.viewMine")}
          </a>
        </p>
      )}
      {error && <p className="mt-2 text-center text-xs text-red-400">{error}</p>}
    </div>
  )
}
