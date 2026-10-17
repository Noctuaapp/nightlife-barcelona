"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { awardXp, currentIsoWeek } from "../../lib/xp"
import { BADGES, activeChallenges, evaluateBadges } from "../../lib/badges"
import NocOwl from "../mascot/NocOwl"
import BadgeToast from "../mascot/BadgeToast"
import { badgeIcon, CHALLENGE_ICONS } from "./badgeIcons"
import { useLanguage } from "../../context/LanguageContext"

// Lunes (fecha Madrid) de la semana actual, como "YYYY-MM-DD".
function mondayISO(): string {
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date())
  const d = new Date(todayStr + "T12:00:00Z")
  const back = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - back)
  return d.toISOString().slice(0, 10)
}

// Objetivo de cada reto de la bolsa, por número — no por posición, porque cuáles 3 están
// activos rota cada semana (ver activeChallenges en lib/badges.ts).
const TARGETS: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 1, 5: 1, 6: 2 }

export default function BadgesAndChallenges() {
  const [userId, setUserId] = useState<string | null>(null)
  const [earned, setEarned] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState<Record<number, number>>({})
  const [claimed, setClaimed] = useState<Set<number>>(new Set())
  const [toast, setToast] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const { t } = useLanguage()

  const weekNum = Number(currentIsoWeek().replace("-W", "")) // 202641
  const itemId = (n: number) => weekNum * 10 + n
  const challenges = activeChallenges(weekNum)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const uid = data.user.id
      setUserId(uid)

      const fresh = await evaluateBadges(supabase)
      if (fresh.length) setToast(fresh)

      const monday = mondayISO()
      const weekStart = new Date(monday + "T00:00:00").toISOString()

      const [{ data: badgeRows }, { data: checkins }, { data: plans }, { data: votes }, { data: xpRows }] = await Promise.all([
        supabase.from("user_badges").select("badge_key").eq("user_id", uid),
        supabase.from("club_checkins").select("club_id, checkin_date, note_created_at").eq("user_id", uid),
        supabase.from("attendances").select("created_at").eq("user_id", uid).gte("created_at", weekStart),
        // Votos a notas de otros, para el reto "Vecino de la noche" — igual de nuevo que las
        // propias notas que ya se usaban para "Voz de la noche".
        supabase.from("club_checkin_votes").select("created_at").eq("user_id", uid).gte("created_at", weekStart),
        supabase.from("xp_events").select("item_id").eq("user_id", uid).eq("action_type", "challenge").eq("item_type", "challenge"),
      ])

      setEarned(new Set((badgeRows || []).map((b: any) => b.badge_key)))

      const all = checkins || []
      const before = new Set(all.filter((c: any) => c.checkin_date < monday).map((c: any) => c.club_id))
      const thisWeek = all.filter((c: any) => c.checkin_date >= monday)
      const newClubs = new Set(thisWeek.map((c: any) => c.club_id).filter((id: any) => !before.has(id)))
      const notes = all.filter((c: any) => c.note_created_at && c.note_created_at >= weekStart).length
      const distinctNights = new Set(thisWeek.map((c: any) => c.checkin_date)).size

      // Barrio nuevo: se resuelve el barrio de cada club_id aparte (la tabla de check-ins no lo
      // guarda) y se compara igual que con los clubs — nuevo esta semana si antes no había
      // ningún check-in en ese barrio.
      const clubIds = Array.from(new Set(all.map((c: any) => c.club_id)))
      let newHoods = 0
      if (clubIds.length) {
        const { data: clubsData } = await supabase.from("clubs").select("id, neighborhood").in("id", clubIds)
        const hoodByClub = new Map((clubsData || []).map((c: any) => [c.id, c.neighborhood || null]))
        const hoodsBefore = new Set(
          all.filter((c: any) => c.checkin_date < monday).map((c: any) => hoodByClub.get(c.club_id)).filter(Boolean)
        )
        const hoodsThisWeek = new Set(
          thisWeek.map((c: any) => hoodByClub.get(c.club_id)).filter((h: any) => h && !hoodsBefore.has(h))
        )
        newHoods = hoodsThisWeek.size
      }

      setProgress({
        1: Math.min(1, newClubs.size),
        2: Math.min(1, notes),
        3: Math.min(2, (plans || []).length),
        4: Math.min(1, newHoods),
        5: Math.min(1, (votes || []).length),
        6: Math.min(2, distinctNights),
      })

      const done = new Set<number>()
      for (const r of xpRows || []) {
        const n = Number((r as any).item_id) - weekNum * 10
        if (n >= 1 && n <= 6) done.add(n)
      }
      setClaimed(done)
      setReady(true)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const claim = async (n: number, xp: number) => {
    if (!userId) return
    const { error } = await awardXp(supabase, {
      userId,
      actionType: "challenge",
      itemType: "challenge",
      itemId: itemId(n),
      amount: xp,
    })
    // awarded=false también ocurre si ya estaba reclamado: en ambos casos se marca como hecho.
    if (!error) setClaimed((s) => new Set(s).add(n))
  }

  if (!userId || !ready) return null

  return (
    <>
      <BadgeToast keys={toast} onDone={() => setToast([])} />

      <section className="mb-10">
        <div className="mb-4 flex items-center gap-3">
          <NocOwl size={40} mood="wink" />
          <div>
            <h2 className="text-lg font-semibold text-ink">{t("challenges.title")}</h2>
            <p className="text-sm text-zinc-400">{t("challenges.subtitle")}</p>
          </div>
        </div>
        <ul className="space-y-2">
          {challenges.map((c) => {
            const p = progress[c.n] ?? 0
            const target = TARGETS[c.n]
            const done = p >= target
            const isClaimed = claimed.has(c.n)
            const CIcon = CHALLENGE_ICONS[c.n]
            return (
              <li key={c.n} className="flex items-center gap-3 rounded-card border border-white/10 bg-surface p-4">
                <CIcon size={22} className="shrink-0 text-brand-soft" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{t(`challenges.c${c.n}_title`)}</p>
                  <p className="text-xs text-zinc-400">{t(`challenges.c${c.n}_desc`)}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(p / target) * 100}%` }} />
                  </div>
                </div>
                {isClaimed ? (
                  <span className="shrink-0 rounded-full bg-open/15 px-3 py-1.5 text-xs font-semibold text-open">+{c.xp} XP</span>
                ) : done ? (
                  <button onClick={() => claim(c.n, c.xp)} className="shrink-0 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-strong active:scale-95">
                    {t("challenges.claim").replace("{n}", String(c.xp))}
                  </button>
                ) : (
                  <span className="shrink-0 text-xs font-semibold text-zinc-400">
                    {p}/{target}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-ink">{t("badges.title")}</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.keys(BADGES).map((key) => {
            const has = earned.has(key)
            const BIcon = badgeIcon(key)
            return (
              <li key={key} className={`rounded-card border p-4 text-center ${has ? "border-brand/50 bg-brand/10" : "border-white/10 bg-surface"}`}>
                <BIcon size={28} className={`mx-auto ${has ? "text-brand-soft" : "text-zinc-600"}`} />
                <p className={`mt-2 text-sm font-semibold ${has ? "text-ink" : "text-zinc-300"}`}>{t(`badges.${key}_name`)}</p>
                <p className="mt-0.5 text-xs leading-snug text-zinc-400">{t(`badges.${key}_hint`)}</p>
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}
