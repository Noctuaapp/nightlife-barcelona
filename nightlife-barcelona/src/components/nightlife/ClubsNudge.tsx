"use client"

import Link from "next/link"
import { ArrowUpRight, MapPin, Sparkles, type LucideIcon } from "lucide-react"
import { SECTION_ICONS } from "../../lib/sectionIcons"
import { useLanguage } from "../../context/LanguageContext"
import { track } from "../../lib/track"

// Accesos para seguir navegando desde /clubs (03/11/2026). Una lista de clubs es un callejón sin
// salida si lo que busca la persona no está ahí: estos avisos la llevan a las otras tres cosas que
// Noctua sabe hacer —proponerle un plan, enseñarle los locales en el mapa y decirle dónde comer,
// comprar o sacar dinero a esas horas— sin pedir cuenta. Salen cada 8 tarjetas dentro de la lista y,
// de tres en tres, al final de ella. Cada pulsación se anota como «next_click» (Admin › Visitas).

export type NudgeKind = "plan" | "map" | "essentials"

const NUDGES: Record<NudgeKind, { href: string; Icon: LucideIcon; title: string; sub: string }> = {
  plan: { href: "/plan", Icon: Sparkles, title: "clubs.nudgePlanTitle", sub: "clubs.nudgePlanSub" },
  map: { href: "/map", Icon: MapPin, title: "clubs.nudgeMapTitle", sub: "clubs.nudgeMapSub" },
  essentials: { href: "/essentials", Icon: SECTION_ICONS.essentials, title: "clubs.nudgeEssentialsTitle", sub: "clubs.nudgeEssentialsSub" },
}

export const NUDGE_ORDER: NudgeKind[] = ["plan", "map", "essentials"]

// source: de qué página sale el aviso, para «next_click» en Admin › Visitas (por defecto, el listado /clubs).
export function ClubsNudge({ kind, compact = false, source = "clubs_list" }: { kind: NudgeKind; compact?: boolean; source?: string }) {
  const { t } = useLanguage()
  const n = NUDGES[kind]
  return (
    <Link
      href={n.href}
      onClick={() => track("next_click", { itemType: source, itemName: kind, meta: { to: kind } })}
      className={`group flex items-center gap-3.5 rounded-card border border-brand/30 bg-brand/10 transition hover:border-brand/60 hover:bg-brand/15 ${
        compact ? "p-3.5" : "p-4"
      }`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl bg-brand/20 text-brand-soft">
        <n.Icon size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-ink">{t(n.title)}</span>
        <span className={`mt-0.5 block text-xs leading-snug text-zinc-400 ${compact ? "line-clamp-2" : "line-clamp-1 sm:line-clamp-2"}`}>{t(n.sub)}</span>
      </span>
      <ArrowUpRight size={18} aria-hidden="true" className="shrink-0 text-zinc-400 transition group-hover:text-ink" />
    </Link>
  )
}

// Los tres juntos, al final de la lista.
export function ClubsNudgeRow({
  source = "clubs_list",
  kinds = NUDGE_ORDER,
  className = "mt-10 max-w-7xl px-4",
}: {
  source?: string
  kinds?: NudgeKind[]
  className?: string
}) {
  const { t } = useLanguage()
  return (
    <section aria-label={t("clubs.nudgeKeep")} className={`mx-auto ${className}`}>
      <h2 className="mb-3 text-sm font-semibold text-zinc-300">{t("clubs.nudgeKeep")}</h2>
      <div className={`grid gap-3 ${kinds.length === 2 ? "md:grid-cols-2" : kinds.length >= 3 ? "md:grid-cols-3" : ""}`}>
        {kinds.map((k) => (
          <ClubsNudge key={k} kind={k} compact source={source} />
        ))}
      </div>
    </section>
  )
}
