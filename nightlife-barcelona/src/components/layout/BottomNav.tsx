"use client"

import Link from "next/link"
import { Home, Music, Calendar, Shield, Compass } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"

export default function BottomNav() {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const [visible, setVisible] = useState(true)
  const { t } = useLanguage()

  useEffect(() => {
    const checkAdmin = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user?.email === "info@noctuaapp.com") {
        setIsAdmin(true)
      }
    }
    checkAdmin()
  }, [])

  // En el móvil la barra tapaba el final de las páginas. Se esconde tras unos segundos sin
  // tocar la pantalla y reaparece al tocar, hacer scroll o pulsar una tecla. En escritorio
  // (puntero fino) no se esconde nunca.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia("(pointer: coarse)").matches) return
    let timer: ReturnType<typeof setTimeout>
    const arm = () => {
      setVisible(true)
      clearTimeout(timer)
      timer = setTimeout(() => setVisible(false), 3000)
    }
    arm()
    const events = ["touchstart", "touchmove", "scroll", "keydown"] as const
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }))
    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, arm))
    }
  }, [pathname])

  const navItems = [
    { label: t("nav.home"), href: "/", icon: Home },
    { label: t("nav.clubs"), href: "/clubs", icon: Music },
    { label: t("nav.events"), href: "/events", icon: Calendar },
    { label: t("nav.essentials"), href: "/essentials", icon: Compass },
    ...(isAdmin ? [{ label: "Admin", href: "/admin", icon: Shield }] : []),
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
            className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition ${
              active ? "bg-white text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}