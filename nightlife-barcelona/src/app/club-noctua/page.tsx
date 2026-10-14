"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "../../context/LanguageContext"
import { supabase } from "../../lib/supabase"
import { LEVELS, getLevelInfo } from "../../lib/xp"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import BottomNav from "@/components/layout/BottomNav"
import BadgesAndChallenges from "@/components/gamification/BadgesAndChallenges"
import { Compass, Crown, Flame } from "lucide-react"

// Ventajas de cada nivel (textos en clubNoctua.*). Solo la insignia de perfil está activa de
// verdad; el resto se irá habilitando y por eso lleva la etiqueta "Próximamente".
const PERKS: Record<string, { base?: boolean; soon?: boolean }> = {
  bronce: { base: true },
  plata: { soon: true },
  oro: { soon: true },
  platino: { soon: true },
  zafiro: { soon: true },
  diamante: { soon: true },
  elite: { soon: true },
}

// Insignias de barrio: check-ins (club_checkins) agrupados por el barrio del club. Un check-in
// cuenta como una noche en ese barrio; tres niveles según cuántas lleva en cada uno.
type NeighborhoodBadge = { neighborhood: string; count: number }

function badgeTier(count: number): { key: string; icon: typeof Compass } {
  if (count >= 6) return { key: "legend", icon: Crown }
  if (count >= 3) return { key: "regular", icon: Flame }
  return { key: "explorer", icon: Compass }
}

export default function ClubNoctuaPage() {
  const { t } = useLanguage()
  const [xp, setXp] = useState<number | null>(null)
  const [neighborhoodBadges, setNeighborhoodBadges] = useState<NeighborhoodBadge[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return
      const { data } = await supabase.from("profiles").select("xp").eq("id", userData.user.id).maybeSingle()
      setXp(data?.xp ?? 0)

      const { data: checkins } = await supabase
        .from("club_checkins")
        .select("club_id")
        .eq("user_id", userData.user.id)

      if (checkins && checkins.length > 0) {
        const clubIds = Array.from(new Set(checkins.map((c) => c.club_id)))
        const { data: clubsData } = await supabase.from("clubs").select("id, neighborhood").in("id", clubIds)
        const neighborhoodById = new Map((clubsData || []).map((c) => [c.id, c.neighborhood || "Barcelona"]))

        const counts: Record<string, number> = {}
        for (const c of checkins) {
          const n = neighborhoodById.get(c.club_id) || "Barcelona"
          counts[n] = (counts[n] || 0) + 1
        }
        const badges = Object.entries(counts)
          .map(([neighborhood, count]) => ({ neighborhood, count }))
          .sort((a, b) => b.count - a.count)
        setNeighborhoodBadges(badges)
      }
    }
    load()
  }, [])

  const currentKey = xp !== null ? getLevelInfo(xp).key : null

  return (
    <div className="flex min-h-screen flex-col bg-night text-ink">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:pt-12">
        <div className="mb-10">
          <h1 className="font-display text-[2.1rem] leading-[1.06] sm:text-5xl">Club Noctua</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-300">{t("clubNoctua.intro")}</p>
          {xp !== null && (
            <p className="mt-3 text-sm text-zinc-400">{t("clubNoctua.youHave").replace("{n}", String(xp))}</p>
          )}
        </div>

        <BadgesAndChallenges />

        {neighborhoodBadges.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-ink">{t("clubNoctua.hoodsTitle")}</h2>
            <p className="mb-4 mt-1 max-w-xl text-sm leading-relaxed text-zinc-400">{t("clubNoctua.hoodsBody")}</p>
            <ul className="flex flex-wrap gap-2">
              {neighborhoodBadges.map((b) => {
                const tier = badgeTier(b.count)
                const TIcon = tier.icon
                return (
                  <li key={b.neighborhood} className="flex items-center gap-3 rounded-card border border-white/10 bg-surface px-4 py-3">
                    <TIcon size={20} className="shrink-0 text-brand-soft" />
                    <div>
                      <p className="text-sm font-semibold text-ink">{b.neighborhood}</p>
                      <p className="text-xs text-zinc-400">
                        {t(`clubNoctua.tier_${tier.key}`)} · {(b.count === 1 ? t("clubNoctua.nightOne") : t("clubNoctua.nightMany")).replace("{n}", String(b.count))}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink">{t("clubNoctua.levelsTitle")}</h2>
          <ul className="space-y-3">
            {LEVELS.map((level, i) => {
              const perks = PERKS[level.key] || {}
              const isCurrent = currentKey === level.key
              const nextLevel = LEVELS[i + 1]
              const name = t(`levels.${level.key}`)
              return (
                <li key={level.key} className={`rounded-card border p-5 ${isCurrent ? "border-brand/60 bg-brand/10" : "border-white/10 bg-surface"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: level.color }} aria-hidden="true" />
                      <div>
                        <p className="text-base font-semibold text-ink">{name}</p>
                        <p className="text-xs text-zinc-400">
                          {level.min === 0 ? t("clubNoctua.fromFirst") : t("clubNoctua.fromXp").replace("{n}", String(level.min))}
                          {nextLevel ? ` · ${t("clubNoctua.upToXp").replace("{n}", String(nextLevel.min - 1))}` : ""}
                        </p>
                      </div>
                    </div>
                    {isCurrent && <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-night">{t("clubNoctua.current")}</span>}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-200">{t("clubNoctua.perkBadge").replace("{name}", name)}</span>
                    {perks.base && <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-200">{t("clubNoctua.perkBase")}</span>}
                    {perks.soon && (
                      <span className="flex items-center gap-1.5 rounded-full border border-dashed border-white/15 px-3 py-1.5 text-xs text-zinc-400">
                        {t(`clubNoctua.perkSoon_${level.key}`)}
                        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-xs font-semibold text-zinc-300">{t("clubNoctua.soon")}</span>
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}
