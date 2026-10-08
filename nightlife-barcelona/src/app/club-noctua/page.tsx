"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "../../context/LanguageContext"
import { supabase } from "../../lib/supabase"
import { LEVELS, getLevelInfo } from "../../lib/xp"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import BottomNav from "@/components/layout/BottomNav"
import BadgesAndChallenges from "@/components/gamification/BadgesAndChallenges"

// Ventajas de cada nivel. De momento son el roadmap de Club Noctua — solo la insignia de perfil
// (el nombre y el icono del nivel, visibles ya en /profile) está activa de verdad; el resto son
// beneficios que se irán habilitando más adelante y por eso llevan la etiqueta "Próximamente".
const PERKS: Record<string, { active: string[]; soon: string[] }> = {
  bronce: {
    active: ["Insignia Bronce en tu perfil", "Favoritos, planifica tu noche y check-in en todos los locales"],
    soon: [],
  },
  plata: {
    active: ["Insignia Plata en tu perfil"],
    soon: ["Descuento de bienvenida en locales seleccionados"],
  },
  oro: {
    active: ["Insignia Oro en tu perfil"],
    soon: ["Acceso anticipado a entradas de eventos con aforo limitado"],
  },
  platino: {
    active: ["Insignia Platino en tu perfil"],
    soon: ["Descuentos exclusivos en una selección de clubs asociados"],
  },
  zafiro: {
    active: ["Insignia Zafiro en tu perfil"],
    soon: ["Invitaciones a preventas VIP y sorteos de Noctua"],
  },
  diamante: {
    active: ["Insignia Diamante en tu perfil"],
    soon: ["Acceso a lista de invitados en eventos seleccionados"],
  },
  elite: {
    active: ["Insignia Élite en tu perfil"],
    soon: ["Ventajas exclusivas para los miembros más fieles de Noctua"],
  },
}

// Insignias de barrio: no es una tabla nueva ni una columna nueva, es información que ya
// existe (club_checkins + clubs.neighborhood) vista desde otro ángulo. Un check-in cuenta como
// "una noche" en ese barrio; a partir de ahí, tres niveles según cuántas noches distintas lleva
// en cada barrio — igual de reales que el XP, solo que agrupados por geografía en vez de en
// total.
type NeighborhoodBadge = { neighborhood: string; count: number }

function badgeTier(count: number): { label: string; icon: string; color: string } {
  if (count >= 6) return { label: "Leyenda", icon: "👑", color: "#a855f7" }
  if (count >= 3) return { label: "Habitual", icon: "🔥", color: "#f59e0b" }
  return { label: "Explorador", icon: "🧭", color: "#34d399" }
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
    <div className="min-h-screen flex flex-col bg-[#050308]">
      <Header />
      <main className="flex-1 px-4 py-16 max-w-3xl mx-auto w-full">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-3">Club Noctua</p>
          <h1 className="text-3xl font-black text-white mb-3">Niveles y ventajas</h1>
          <p className="text-white/60 text-sm leading-relaxed max-w-xl">
            Gana XP saliendo de fiesta — asistiendo a noches, haciendo check-in en el local y usando Noctua con
            regularidad — y sube de nivel. Las ventajas marcadas como <span className="text-white/80 font-semibold">Próximamente</span> todavía
            no están activas: hoy el sistema muestra tu progreso e insignia, y las iremos activando por fases.
          </p>
          {xp !== null && (
            <p className="mt-4 text-sm text-zinc-400">
              Ahora mismo tienes <span className="font-bold text-white">{xp} XP</span>.
            </p>
          )}
        </div>

        <BadgesAndChallenges />

        {neighborhoodBadges.length > 0 && (
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-3">Barrios conquistados</p>
            <p className="text-white/60 text-sm leading-relaxed max-w-xl mb-4">
              Cada check-in cuenta como una noche en ese barrio. Tres check-ins y eres Habitual, seis y eres Leyenda.
            </p>
            <div className="flex flex-wrap gap-3">
              {neighborhoodBadges.map((b) => {
                const tier = badgeTier(b.count)
                return (
                  <div
                    key={b.neighborhood}
                    className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    style={{ borderColor: `${tier.color}40` }}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base"
                      style={{ background: `${tier.color}22`, border: `1px solid ${tier.color}55` }}
                    >
                      {tier.icon}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white">{b.neighborhood}</p>
                      <p className="text-[11px] text-zinc-500">
                        {tier.label} · {b.count} {b.count === 1 ? "noche" : "noches"}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {LEVELS.map((level, i) => {
            const perks = PERKS[level.key] || { active: [], soon: [] }
            const isCurrent = currentKey === level.key
            const nextLevel = LEVELS[i + 1]
            return (
              <div
                key={level.key}
                className={`rounded-[28px] p-[1px] ${
                  isCurrent
                    ? "bg-gradient-to-br from-white/50 via-white/15 to-white/0"
                    : "bg-gradient-to-br from-white/15 via-white/[0.04] to-white/0"
                }`}
              >
                <div className="rounded-[27px] bg-[#0b0912]/95 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl"
                        style={{ background: `${level.color}22`, border: `1px solid ${level.color}55` }}
                      >
                        {level.icon}
                      </span>
                      <div>
                        <p className="text-lg font-black text-white">{t(`levels.${level.key}`)}</p>
                        <p className="text-xs text-zinc-500">
                          {level.min === 0 ? "Desde el primer XP" : `A partir de ${level.min} XP`}
                          {nextLevel ? ` · hasta ${nextLevel.min - 1} XP` : ""}
                        </p>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wider text-black">
                        Tu nivel actual
                      </span>
                    )}
                  </div>

                  {(perks.active.length > 0 || perks.soon.length > 0) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {perks.active.map((p) => (
                        <span key={p} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300">
                          {p}
                        </span>
                      ))}
                      {perks.soon.map((p) => (
                        <span
                          key={p}
                          className="flex items-center gap-1.5 rounded-full border border-dashed border-white/15 bg-transparent px-3 py-1.5 text-xs text-zinc-500"
                        >
                          {p}
                          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                            Próximamente
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}
