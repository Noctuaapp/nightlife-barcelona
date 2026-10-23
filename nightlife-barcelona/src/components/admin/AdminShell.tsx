"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, BarChart3, Disc3, BadgeCheck, CalendarDays, Headphones, MapPin, Users,
  MessageSquare, Ban, Wrench, Flag, Star, Repeat, Activity, Menu, X, ExternalLink, type LucideIcon,
} from "lucide-react"
import { supabase } from "../../lib/supabase"

// Rediseño del admin (24/10/2026, tras el análisis completo del panel). Antes: 13 pestañas en una
// sola fila horizontal que había que deslizar, sin orden, con dos pantallas que existían pero no
// salían en el menú (/admin/club-sessions y /admin/analytics) y sin ninguna señal de qué tenía
// cosas pendientes. Ahora:
//   - Secciones agrupadas por para qué sirven (contenido, comunidad, datos, sistema), como en
//     cualquier panel de administración serio (Shopify, Stripe, Supabase...).
//   - Barra lateral fija en ordenador; en móvil, un botón "Menú" que abre la lista completa.
//   - Contadores de lo que pide atención (mensajes nuevos, notas denunciadas sin revisar)
//     directamente en el menú, visibles desde cualquier pantalla del admin.
type NavItem = { href: string; label: string; icon: LucideIcon; badge?: "messages" | "reports" }
type NavGroup = { label: string; items: NavItem[] }

const ADMIN_NAV: NavGroup[] = [
  {
    label: "General",
    items: [{ href: "/admin/dashboard", label: "Resumen", icon: LayoutDashboard }],
  },
  {
    label: "Contenido",
    items: [
      { href: "/admin", label: "Clubs", icon: Disc3 },
      { href: "/admin/club-sessions", label: "Sesiones semanales", icon: Repeat },
      { href: "/admin/club-events", label: "Noches de club", icon: Headphones },
      { href: "/admin/events", label: "Eventos y festivales", icon: CalendarDays },
      { href: "/admin/essentials", label: "Esenciales", icon: MapPin },
      { href: "/admin/calidad", label: "Calidad de fichas", icon: BadgeCheck },
    ],
  },
  {
    label: "Comunidad",
    items: [
      { href: "/admin/users", label: "Usuarios", icon: Users },
      { href: "/admin/messages", label: "Mensajes", icon: MessageSquare, badge: "messages" },
      { href: "/admin/notas", label: "Notas denunciadas", icon: Flag, badge: "reports" },
      { href: "/admin/entry-denials", label: "No dejan entrar", icon: Ban },
      { href: "/admin/opinion", label: "Opiniones", icon: Star },
    ],
  },
  {
    label: "Datos",
    items: [
      { href: "/admin/datos", label: "Datos de negocio", icon: BarChart3 },
      { href: "/admin/actividad", label: "Actividad por usuario", icon: Activity },
    ],
  },
  {
    label: "Sistema",
    items: [{ href: "/admin/herramientas", label: "Ajustes y herramientas", icon: Wrench }],
  },
]

type Badges = { messages: number; reports: number }

// Contadores del menú. Dos consultas que solo cuentan filas (no traen datos), compartidas entre
// todas las pantallas durante un minuto para no repetirlas en cada cambio de sección.
let badgeCache: { at: number; value: Badges } | null = null
const BADGE_TTL_MS = 60_000

async function loadBadges(): Promise<Badges> {
  if (badgeCache && Date.now() - badgeCache.at < BADGE_TTL_MS) return badgeCache.value
  const [msgs, reports] = await Promise.all([
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new").or("is_spam.is.null,is_spam.eq.false"),
    supabase.from("club_checkin_reports").select("id", { count: "exact", head: true }).is("reviewed_at", null),
  ])
  const value = { messages: msgs.count || 0, reports: reports.count || 0 }
  badgeCache = { at: Date.now(), value }
  return value
}

// Las pantallas pueden llamar a esto cuando cambian algo que afecta a los contadores (p. ej.
// marcar un mensaje como leído), para que el menú no enseñe un número viejo.
export function invalidateAdminBadges() {
  badgeCache = null
}

function NavList({ pathname, badges, onNavigate }: { pathname: string; badges: Badges; onNavigate?: () => void }) {
  return (
    <nav aria-label="Secciones del admin" className="flex flex-col gap-6">
      {ADMIN_NAV.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-3 text-xs font-semibold text-zinc-500">{group.label}</p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href
              const Icon = item.icon
              const count = item.badge ? badges[item.badge] : 0
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-ctl px-3 py-2 text-sm font-semibold transition ${
                      active ? "bg-white/[0.09] text-ink" : "text-zinc-400 hover:bg-white/[0.05] hover:text-ink"
                    }`}
                  >
                    <Icon size={17} aria-hidden="true" className={active ? "text-brand-soft" : ""} />
                    <span className="flex-1">{item.label}</span>
                    {count > 0 && (
                      <span className="min-w-[22px] rounded-full bg-warn px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-night tabular-nums">
                        {count > 99 ? "99+" : count}
                        <span className="sr-only"> pendientes</span>
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

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
  const pathname = usePathname() || ""
  const [badges, setBadges] = useState<Badges>(badgeCache?.value || { messages: 0, reports: 0 })
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let alive = true
    loadBadges().then((b) => { if (alive) setBadges(b) }).catch(() => {})
    return () => { alive = false }
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false) }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [menuOpen])

  const pending = badges.messages + badges.reports

  const brand = (
    <Link href="/admin/dashboard" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-ctl bg-brand text-base font-black text-white">N</span>
      <span className="leading-tight">
        <span className="block text-sm font-black tracking-tight text-ink">Noctua</span>
        <span className="block text-xs text-zinc-400">Admin</span>
      </span>
    </Link>
  )

  return (
    <div className="min-h-screen bg-night text-ink lg:grid lg:grid-cols-[264px_1fr]">
      {/* Barra lateral (ordenador) */}
      <aside className="hidden lg:block">
        <div className="sticky top-0 flex h-screen flex-col border-r border-white/[0.06] px-3 py-5">
          <div className="px-3">{brand}</div>
          <div className="mt-8 flex-1 overflow-y-auto pb-6">
            <NavList pathname={pathname} badges={badges} />
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-ctl px-3 py-2 text-sm font-semibold text-zinc-400 transition hover:bg-white/[0.05] hover:text-ink"
          >
            <ExternalLink size={16} aria-hidden="true" /> Ver la web
          </Link>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Barra superior (móvil y tablet) */}
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-white/[0.06] bg-night/90 px-4 py-3 backdrop-blur-xl lg:hidden">
          {brand}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            className="relative flex items-center gap-2 rounded-ctl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-ink"
          >
            <Menu size={18} aria-hidden="true" /> Menú
            {pending > 0 && (
              <span className="absolute -right-1.5 -top-1.5 min-w-[20px] rounded-full bg-warn px-1 py-0.5 text-center text-[11px] font-bold leading-none text-night">
                {pending > 99 ? "99+" : pending}
              </span>
            )}
          </button>
        </header>

        {menuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú del admin">
            <button type="button" aria-label="Cerrar menú" className="absolute inset-0 bg-night/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-[min(320px,86vw)] flex-col border-r border-white/10 bg-surface px-3 py-4 shadow-2xl">
              <div className="flex items-center justify-between px-3">
                {brand}
                <button type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" className="rounded-full p-1.5 text-zinc-400 hover:text-ink">
                  <X size={20} />
                </button>
              </div>
              <div className="mt-6 flex-1 overflow-y-auto pb-4">
                <NavList pathname={pathname} badges={badges} onNavigate={() => setMenuOpen(false)} />
              </div>
              <Link href="/" className="flex items-center gap-2 rounded-ctl px-3 py-2 text-sm font-semibold text-zinc-400 hover:text-ink">
                <ExternalLink size={16} aria-hidden="true" /> Ver la web
              </Link>
            </div>
          </div>
        )}

        <main className="mx-auto max-w-[1200px] px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pt-10">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl tracking-tight md:text-4xl">{title}</h1>
              {subtitle && <p className="mt-2 max-w-2xl text-sm text-zinc-400">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>

          {children}
        </main>
      </div>
    </div>
  )
}
