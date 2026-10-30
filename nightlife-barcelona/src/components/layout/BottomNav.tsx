"use client"

import Link from "next/link"
import { Home, Martini, Ticket, Shield, Backpack } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import { useIdleVisible } from "../../lib/useIdleVisible"
import { ADMIN_EMAIL } from "../../lib/admin"
import { EVENTS_COMING_SOON } from "../../lib/featureFlags"

export default function BottomNav() {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
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

  const navItems = [
    { label: t("nav.home"), href: "/", icon: Home },
    { label: t("nav.clubs"), href: "/clubs", icon: Martini },
    { label: t("nav.events"), href: "/events", icon: Ticket },
    { label: t("nav.essentials"), href: "/essentials", icon: Backpack },
    // Al entrar en admin se va directo al dashboard, no a la gestión de clubs (que sigue en /admin).
    ...(isAdmin ? [{ label: "Admin", href: "/admin/dashboard", icon: Shield }] : []),
  ]

  return (
    <div className={`fixed bottom-4 left-1/2 z-50 flex w-[92%] max-w-md -translate-x-1/2 items-center justify-around rounded-2xl border border-white/10 bg-black/70 px-3 py-2 backdrop-blur-2xl transition-all duration-300 ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-24 opacity-0"}`}>
      {navItems.map((item) => {
        const Icon = item.icon
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition ${
              active ? "bg-white text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Icon size={18} />
            <span>{item.label}</span>
            {item.href === "/events" && EVENTS_COMING_SOON && (
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
