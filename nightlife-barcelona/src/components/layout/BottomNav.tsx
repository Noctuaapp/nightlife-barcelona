"use client"

import Link from "next/link"
import { Home, Shield, type LucideIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import { useIdleVisible } from "../../lib/useIdleVisible"
import { ADMIN_EMAIL } from "../../lib/admin"
import { useViewAsUser } from "../../lib/viewAsUser"
import { EVENTS_HIDDEN } from "../../lib/featureFlags"
import { SECTION_ICONS } from "../../lib/sectionIcons"

// Colores de la barra (06/11/2026). Antes todo era gris y blanco: la sección activa solo cambiaba a fondo blanco.
// Ahora cada sección tiene su acento neón (el icono lo lleva siempre, apagado cuando no está activa) y la sección
// activa se enciende con su color: fondo teñido, aro, brillo en el icono y una línea luminosa arriba. La activa
// no depende solo del color: también cambia a letra blanca, más peso y la línea de arriba.
type Accent = "violet" | "pink" | "coral" | "cyan" | "gold"
const ACCENT: Record<Accent, { icon: string; active: string; glow: string; line: string }> = {
  violet: {
    icon: "text-brand-soft/80",
    active: "bg-linear-to-b from-brand/30 to-brand/5 ring-1 ring-inset ring-brand/50",
    glow: "text-brand-soft drop-shadow-[0_0_8px_rgba(160,139,255,0.95)]",
    line: "bg-brand-soft shadow-[0_0_10px_rgba(160,139,255,0.9)]",
  },
  pink: {
    icon: "text-[#ff86bf]/80",
    active: "bg-linear-to-b from-[#ff4fa3]/30 to-[#ff4fa3]/5 ring-1 ring-inset ring-[#ff4fa3]/50",
    glow: "text-[#ff86bf] drop-shadow-[0_0_8px_rgba(255,79,163,0.95)]",
    line: "bg-[#ff86bf] shadow-[0_0_10px_rgba(255,79,163,0.9)]",
  },
  coral: {
    icon: "text-orange-300/80",
    active: "bg-linear-to-b from-orange-400/30 to-orange-400/5 ring-1 ring-inset ring-orange-400/50",
    glow: "text-orange-300 drop-shadow-[0_0_8px_rgba(251,146,60,0.95)]",
    line: "bg-orange-300 shadow-[0_0_10px_rgba(251,146,60,0.9)]",
  },
  cyan: {
    icon: "text-cyan-300/80",
    active: "bg-linear-to-b from-cyan-400/30 to-cyan-400/5 ring-1 ring-inset ring-cyan-400/50",
    glow: "text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.95)]",
    line: "bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.9)]",
  },
  gold: {
    icon: "text-amber-300/80",
    active: "bg-linear-to-b from-amber-300/30 to-amber-300/5 ring-1 ring-inset ring-amber-300/50",
    glow: "text-amber-200 drop-shadow-[0_0_8px_rgba(252,211,77,0.95)]",
    line: "bg-amber-200 shadow-[0_0_10px_rgba(252,211,77,0.9)]",
  },
}

export default function BottomNav() {
  const pathname = usePathname()
  const [isAdminAccount, setIsAdmin] = useState(false)
  // «Ver como usuario»: sin la pestaña Admin.
  const viewAsUser = useViewAsUser()
  const isAdmin = isAdminAccount && !viewAsUser
  const { t } = useLanguage()

  useEffect(() => {
    const checkAdmin = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user?.email === ADMIN_EMAIL) {
        setIsAdmin(true)
      }
    }
    checkAdmin()
  }, [])

  // Se esconde a 1,5 s sin interactuar y reaparece al tocar, mover el ratón, hacer scroll o
  // pulsar una tecla.
  const visible = useIdleVisible(1500, pathname)

  const navItems: { label: string; href: string; icon: LucideIcon; accent: Accent }[] = [
    { label: t("nav.home"), href: "/", icon: Home, accent: "violet" },
    { label: t("nav.clubs"), href: "/clubs", icon: SECTION_ICONS.clubs, accent: "pink" },
    // Con Eventos cerrado (lib/featureFlags.ts) el botón sigue ahí, con la etiqueta «Próximamente», y lleva al aviso.
    { label: t("nav.events"), href: "/events", icon: SECTION_ICONS.events, accent: "coral" },
    { label: t("nav.essentials"), href: "/essentials", icon: SECTION_ICONS.essentials, accent: "cyan" },
    // Al entrar en admin se va directo al dashboard, no a la gestión de clubs (que sigue en /admin).
    ...(isAdmin ? [{ label: "Admin", href: "/admin/dashboard", icon: Shield, accent: "gold" as Accent }] : []),
  ]

  return (
    <div className={`fixed bottom-4 left-1/2 z-50 flex w-[92%] max-w-md -translate-x-1/2 items-center justify-around rounded-2xl border border-white/10 bg-black/70 px-3 py-2 shadow-[0_12px_40px_-10px_rgba(124,92,255,0.55)] backdrop-blur-2xl transition-all duration-300 before:pointer-events-none before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-brand-soft/80 before:to-transparent ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-24 opacity-0"}`}>
      {navItems.map((item) => {
        const Icon = item.icon
        const active = pathname === item.href
        const a = ACCENT[item.accent]
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs transition ${
              active ? `${a.active} font-bold text-white` : "font-medium text-zinc-400 hover:text-white"
            }`}
          >
            {active && <span aria-hidden="true" className={`absolute inset-x-3 -top-px h-0.5 rounded-full ${a.line}`} />}
            <Icon size={18} className={active ? a.glow : a.icon} />
            <span>{item.label}</span>
            {item.href === "/events" && EVENTS_HIDDEN && (
              <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-warn px-1.5 py-px text-[8px] font-bold leading-tight text-night">
                {t("nav.soon")}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
