"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"
import { awardXp, currentIsoWeek } from "../../lib/xp"
import { BADGES, CHALLENGES, evaluateBadges } from "../../lib/badges"
import NocOwl from "../mascot/NocOwl"
import BadgeToast from "../mascot/BadgeToast"

// Lunes (fecha Madrid) de la semana actual, como "YYYY-MM-DD".
function mondayISO(): string {
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date())
  const d = new Date(todayStr + "T12:00:00Z")
  const back = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - back)
  return d.toISOString().slice(0, 10)
}

export default function BadgesAndChallenges() {
  const [userId, setUserId] = useState<string | null>(null)
  const [earned, setEarned] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState<number[]>([0, 0, 0])
  const [claimed, setClaimed] = useState<Set<number>>(new Set())
  const [toast, setToast] = useState<string[]>([])
  const [ready, setReady] = useState(false)

  const weekNum = Number(currentIsoWeek().replace("-W", "")) // 202641
  const itemId = (n: number) => weekNum * 10 + n

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

      const [{ data: badgeRows }, { data: checkins }, { data: plans }, { data: xpRows }] = await Promise.all([
        supabase.from("user_badges").select("badge_key").eq("user_id", uid),
        supabase.from("club_checkins").select("club_id, checkin_date, note_created_at").eq("user_id", uid),
        supabase.from("attendances").select("created_at").eq("user_id", uid).gte("created_at", weekStart),
        supabase.from("xp_events").select("item_id").eq("user_id", uid).eq("action_type", "challenge").eq("item_type", "challenge"),
      ])

      setEarned(new Set((badgeRows || []).map((b: any) => b.badge_key)))

      const all = checkins || []
      const before = new Set(all.filter((c: any) => c.checkin_date < monday).map((c: any) => c.club_id))
      const thisWeek = all.filter((c: any) => c.checkin_date >= monday)
      const newClubs = new Set(thisWeek.map((c: any) => c.club_id).filter((id: any) => !before.has(id)))
      const notes = all.filter((c: any) => c.note_created_at && c.note_created_at >= weekStart).length
      setProgress([Math.min(1, newClubs.size), Math.min(1, notes), Math.min(2, (plans || []).length)])

      const done = new Set<number>()
      for (const r of xpRows || []) {
        const n = Number((r as any).item_id) - weekNum * 10
        if (n >= 1 && n <= 3) done.add(n)
      }
      setClaimed(done)
      setReady(true)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const target = [1, 1, 2]

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

      <Link href="/mi-mes" className="mb-8 flex items-center gap-3 rounded-2xl border border-purple-400/30 bg-gradient-to-r from-purple-600/20 to-transparent p-4 transition hover:border-purple-400/60">
        <NocOwl size={44} mood="party" />
        <div className="flex-1">
          <p className="text-sm font-black text-white">Tu mes en Noctua</p>
          <p className="text-xs text-zinc-400">Mira tu resumen y compártelo</p>
        </div>
        <span className="text-zinc-400">→</span>
      </Link>

      <Link href="/invitar" className="mb-8 flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/15 to-transparent p-4 transition hover:border-amber-400/60">
        <span className="text-3xl">🎟️</span>
        <div className="flex-1">
          <p className="text-sm font-black text-white">Invita a un amigo</p>
          <p className="text-xs text-zinc-400">+50 XP para ti y +25 para tu amigo</p>
        </div>
        <span className="text-zinc-400">→</span>
      </Link>

      <div className="mb-10">
        <div className="mb-3 flex items-center gap-3">
          <NocOwl size={40} mood="wink" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-purple-400">Retos de la semana</p>
            <p className="text-xs text-zinc-500">Se renuevan cada lunes. Son de descubrir, no de beber más.</p>
          </div>
        </div>
        <div className="space-y-3">
          {CHALLENGES.map((c, i) => {
            const p = progress[i]
            const done = p >= target[i]
            const isClaimed = claimed.has(c.n)
            return (
              <div key={c.n} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <span className="text-2xl">{c.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">{c.title}</p>
                  <p className="text-xs text-zinc-400">{c.desc}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${(p / target[i]) * 100}%` }} />
                  </div>
                </div>
                {isClaimed ? (
                  <span className="shrink-0 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300">✓ +{c.xp} XP</span>
                ) : done ? (
                  <button onClick={() => claim(c.n, c.xp)} className="shrink-0 rounded-full bg-purple-500 px-3 py-1.5 text-xs font-black text-white transition hover:bg-purple-400 active:scale-95">
                    Reclamar +{c.xp} XP
                  </button>
                ) : (
                  <span className="shrink-0 text-xs font-bold text-zinc-500">{p}/{target[i]}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-purple-400">Insignias de exploración</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.entries(BADGES).map(([key, b]) => {
            const has = earned.has(key)
            return (
              <div key={key} className={`rounded-2xl border p-3 text-center ${has ? "border-purple-400/40 bg-purple-500/10" : "border-white/10 bg-white/[0.02]"}`}>
                <div className={`text-3xl ${has ? "" : "opacity-30 grayscale"}`}>{b.emoji}</div>
                <p className={`mt-1 text-sm font-bold ${has ? "text-white" : "text-zinc-500"}`}>{b.name}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{b.hint}</p>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
