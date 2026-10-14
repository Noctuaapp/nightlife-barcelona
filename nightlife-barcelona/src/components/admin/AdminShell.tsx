"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, BarChart3, Disc3, BadgeCheck, CalendarDays, Headphones, MapPin, Users,
  MessageSquare, Ban, Wrench, ChevronLeft, ChevronRight, type LucideIcon,
} from "lucide-react"

// Navegación única y completa del admin: todas las pantallas comparten esta lista.
const ADMIN_NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/datos", label: "Datos", icon: BarChart3 },
  { href: "/admin", label: "Clubs", icon: Disc3 },
  { href: "/admin/calidad", label: "Calidad", icon: BadgeCheck },
  { href: "/admin/events", label: "Eventos", icon: CalendarDays },
  { href: "/admin/club-events", label: "Noches de club", icon: Headphones },
  { href: "/admin/essentials", label: "Esenciales", icon: MapPin },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/messages", label: "Mensajes", icon: MessageSquare },
  { href: "/admin/entry-denials", label: "No dejan entrar", icon: Ban },
  { href: "/admin/herramientas", label: "Herramientas", icon: Wrench },
]

export default function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const navRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  // La barra de secciones no cabe entera en pantallas estrechas (ni en un portátil): se desliza
  // en horizontal, con barra de desplazamiento visible, flechas a los lados y la rueda del ratón.
  useEffect(() => {
    const el = navRef.current
    if (!el) return

    const update = () => {
      setCanLeft(el.scrollLeft > 4)
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }

    // La sección abierta queda siempre a la vista al entrar.
    const active = el.querySelector<HTMLElement>("[aria-current='page']")
    if (active) {
      el.scrollLeft = Math.max(0, active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2)
    }
    const raf = requestAnimationFrame(update)

    // Rueda vertical del ratón → desplazamiento horizontal (solo si hay algo que desplazar).
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }

    el.addEventListener("scroll", update, { passive: true })
    el.addEventListener("wheel", onWheel, { passive: false })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener("scroll", update)
      el.removeEventListener("wheel", onWheel)
      ro.disconnect()
    }
  }, [pathname])

  const scrollBy = (dir: 1 | -1) => {
    const el = navRef.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: "smooth" })
  }

  const arrow =
    "absolute top-0 z-10 flex h-[42px] w-10 items-center justify-center text-ink transition hover:text-white"

  return (
    <div className="min-h-screen bg-night text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-night/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-ctl bg-brand text-base font-black">N</span>
            <div className="leading-tight">
              <p className="text-sm font-black tracking-tight">Noctua</p>
              <p className="text-xs text-zinc-400">Admin</p>
            </div>
          </Link>
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white hover:text-black"
          >
            Ver web
          </Link>
        </div>

        <div className="relative mx-auto max-w-[1400px]">
          {canLeft && (
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Ver secciones anteriores"
              className={`${arrow} left-0 bg-gradient-to-r from-night via-night/90 to-transparent`}
            >
              <ChevronLeft size={20} />
            </button>
          )}

          <nav ref={navRef} aria-label="Secciones del admin" className="admin-nav-scroll flex gap-1 overflow-x-auto px-5 pb-2">
            {ADMIN_NAV.map((item) => {
              const active = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-[42px] shrink-0 items-center gap-2 rounded-ctl px-4 text-sm font-bold transition ${
                    active ? "bg-white text-black" : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <Icon size={16} aria-hidden="true" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {canRight && (
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Ver más secciones"
              className={`${arrow} right-0 bg-gradient-to-l from-night via-night/90 to-transparent`}
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 pb-32 pt-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-brand-soft">Admin</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">{title}</h1>
            {subtitle && <p className="mt-2 max-w-xl text-sm text-zinc-400">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>

        {children}
      </main>
    </div>
  )
}
