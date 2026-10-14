"use client"

import Link from "next/link"
import { Moon, Compass, Map, User } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"

// Navegación inferior en móvil. Antes flotaba en mitad de la pantalla, se escondía sola a los
// 3 segundos sin tocar (desorientaba, sobre todo a quien navega despacio o con lector de
// pantalla) y también aparecía en escritorio. Ahora: siempre visible, pegada abajo, solo en
// móvil y con 4 destinos claros. Esenciales vive dentro del mapa y en la portada; el admin, en el menú.
export default function BottomNav() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session))
  }, [])

  const items = [
    { label: t("nav.tonight"), href: "/", icon: Moon, match: (p: string) => p === "/" },
    {
      label: t("nav.explore"),
      href: "/clubs",
      icon: Compass,
      match: (p: string) => p.startsWith("/clubs") || p.startsWith("/events") || p.startsWith("/event/") || p.startsWith("/essentials"),
    },
    { label: t("nav.map"), href: "/map", icon: Map, match: (p: string) => p.startsWith("/map") },
    {
      label: t("nav.you"),
      href: loggedIn ? "/profile" : "/login",
      icon: User,
      match: (p: string) => ["/profile", "/login", "/signup", "/favorites", "/club-noctua", "/mi-mes", "/invitar"].some((r) => p.startsWith(r)),
    },
  ]

  return (
    <nav
      aria-label={t("nav.main")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-night/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon
          const active = item.match(pathname)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-xs font-semibold transition ${
                  active ? "text-ink" : "text-zinc-400 hover:text-ink"
                }`}
              >
                <Icon size={20} className={active ? "text-brand-soft" : ""} />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
