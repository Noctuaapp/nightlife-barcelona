"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, BarChart3, BadgeCheck, Headphones, Users, Vote,
  MessageSquare, Ban, Wrench, Flag, Star, Activity, Menu, X, ExternalLink, Trophy, History, Bell, Footprints, TrendingUp, Inbox, Lightbulb, Moon, Sunrise, MapPin, type LucideIcon,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { SECTION_ICONS } from "../../lib/sectionIcons"
import { AccentContext, type Accent } from "./ui"
import { AdminCityBadge, AdminCitySwitch } from "./AdminCity"

// Rediseño del admin (24/10/2026, tras el análisis completo del panel). Antes: 13 pestañas en una
// sola fila horizontal que había que deslizar, sin orden, con dos pantallas que existían pero no
// salían en el menú (/admin/club-sessions y /admin/analytics) y sin ninguna señal de qué tenía
// cosas pendientes. Ahora:
//   - Secciones agrupadas por para qué sirven (contenido, comunidad, datos, sistema), como en
//     cualquier panel de administración serio (Shopify, Stripe, Supabase...).
//   - Barra lateral fija en ordenador; en móvil, un botón "Menú" que abre la lista completa.
//   - Contadores de lo que pide atención (mensajes nuevos, notas denunciadas sin revisar)
//     directamente en el menú, visibles desde cualquier pantalla del admin.
//   - (25/10/2026) Avisos: bandeja con todo lo importante que pasa (campana arriba en el móvil).
//   - (30/10/2026) Buzón de propietarios: contador de mensajes de dueños sin leer.
//   - (06/11/2026) Mismo diseño que el Resumen en todo el admin: cada sección del menú tiene su acento
//     (General violeta, Contenido rosa, Comunidad cian, Datos coral), el icono de la pantalla activa se
//     tiñe de ese color y la cabecera de cada pantalla lleva su icono y un brillo suave del acento.
//   - (19/11/2026) «Sesiones semanales» y «Noches de club» eran lo mismo (qué pasa en cada club): ahora una sola entrada, «Programación de clubs».
//   - (15/11/2026) Ciudad: selector Barcelona | Madrid arriba del menú. Los apartados marcados con `city` enseñan y gestionan
//     solo la ciudad elegida (se marcan con un pin en el menú y con la ciudad en la cabecera); el resto es común.
//     Mismo día: Visitas, Retención y Cuándo sale la gente también (analítica por ciudad, supabase/104). El Resumen mezcla las dos cosas:
//     tráfico y contenido son de la ciudad elegida (lo dice su etiqueta) y pendientes, estado de la web y usuarios son comunes.
type NavItem = { href: string; label: string; icon: LucideIcon; badge?: "messages" | "reports" | "notices" | "owners"; city?: boolean }
type NavGroup = { label: string; accent: Accent; items: NavItem[] }

const ADMIN_NAV: NavGroup[] = [
  {
    label: "General",
    accent: "violet",
    items: [
      { href: "/admin/dashboard", label: "Resumen", icon: LayoutDashboard },
      { href: "/admin/avisos", label: "Avisos", icon: Bell, badge: "notices" },
    ],
  },
  {
    // Las secciones van en el mismo orden que la web (Clubs, Eventos, Esenciales) y cada una lleva pegadas las
    // pantallas que dependen de ella.
    label: "Contenido",
    accent: "pink",
    items: [
      { href: "/admin", label: "Clubs", icon: SECTION_ICONS.clubs, city: true },
      { href: "/admin/programacion", label: "Programación de clubs", icon: Headphones, city: true },
      { href: "/admin/calidad", label: "Calidad de fichas", icon: BadgeCheck, city: true },
      { href: "/admin/recomendados", label: "Top 3 de Noctua", icon: Trophy, city: true },
      { href: "/admin/events", label: "Eventos y festivales", icon: SECTION_ICONS.events, city: true },
      { href: "/admin/mananeo", label: "Mañaneo", icon: Sunrise, city: true },
      { href: "/admin/essentials", label: "Esenciales", icon: SECTION_ICONS.essentials, city: true },
      { href: "/admin/sugerencias", label: "Sugerencias de esenciales", icon: Lightbulb, city: true },
    ],
  },
  {
    // Primero las personas (cuentas y lo que hacen), luego lo que mandan (mensajes y buzón), luego la moderación
    // y por último las valoraciones.
    label: "Comunidad",
    accent: "cyan",
    items: [
      { href: "/admin/users", label: "Usuarios", icon: Users },
      { href: "/admin/actividad", label: "Actividad por usuario", icon: Activity },
      { href: "/admin/messages", label: "Mensajes", icon: MessageSquare, badge: "messages" },
      { href: "/admin/buzon", label: "Buzón de propietarios", icon: Inbox, badge: "owners" },
      { href: "/admin/notas", label: "Notas denunciadas", icon: Flag, badge: "reports" },
      { href: "/admin/entry-denials", label: "No dejan entrar", icon: Ban },
      { href: "/admin/opinion", label: "Opiniones", icon: Star },
    ],
  },
  {
    // Datos agregados, de lo que pasa en la web a lo que se puede enseñar a clubs y compradores de datos.
    label: "Datos",
    accent: "coral",
    items: [
      { href: "/admin/visitas", label: "Visitas", icon: Footprints, city: true },
      { href: "/admin/retencion", label: "Retención", icon: TrendingUp, city: true },
      { href: "/admin/afluencia", label: "Cuándo sale la gente", icon: Moon, city: true },
      { href: "/admin/encuestas", label: "Encuestas", icon: Vote },
      { href: "/admin/datos", label: "Datos de negocio", icon: BarChart3, city: true },
    ],
  },
  {
    label: "Sistema",
    accent: "violet",
    items: [
      { href: "/admin/herramientas", label: "Ajustes y herramientas", icon: Wrench, city: true },
      { href: "/admin/cambios", label: "Registro de cambios", icon: History },
    ],
  },
]

type Badges = { messages: number; reports: number; notices: number; owners: number }

// Contadores del menú. Dos consultas que solo cuentan filas (no traen datos), compartidas entre
// todas las pantallas durante un minuto para no repetirlas en cada cambio de sección.
let badgeCache: { at: number; value: Badges } | null = null
const BADGE_TTL_MS = 60_000

async function loadBadges(): Promise<Badges> {
  if (badgeCache && Date.now() - badgeCache.at < BADGE_TTL_MS) return badgeCache.value
  const [msgs, reports, notices, owners] = await Promise.all([
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new").or("is_spam.is.null,is_spam.eq.false"),
    supabase.from("club_checkin_reports").select("id", { count: "exact", head: true }).is("reviewed_at", null),
    // Avisos sin leer (supabase/38). Si la tabla aún no existe, cuenta 0.
    supabase.from("admin_notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    // Mensajes de dueños sin leer (supabase/59). Si la tabla aún no existe, cuenta 0.
    supabase.from("owner_messages").select("id", { count: "exact", head: true }).eq("sender", "owner").is("read_at", null),
  ])
  const value = { messages: msgs.count || 0, reports: reports.count || 0, notices: notices.count || 0, owners: owners.count || 0 }
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
      {ADMIN_NAV.map((group) => {
        return (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[11px] font-bold tracking-wide text-zinc-500">{group.label}</p>
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
                      className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        active ? "ui-nav-on" : "text-zinc-400 hover:bg-white/[0.04] hover:text-ink"
                      }`}
                    >
                      {active && <span aria-hidden="true" className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-soft shadow-[0_0_12px_rgba(160,139,255,0.9)]" />}
                      <Icon size={16} aria-hidden="true" className={`shrink-0 transition ${active ? "text-brand-soft" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                      <span className="flex-1">{item.label}</span>
                      {item.city && (
                        <>
                          <MapPin size={12} aria-hidden="true" className="shrink-0 text-zinc-500" />
                          <span className="sr-only"> (cambia con la ciudad)</span>
                        </>
                      )}
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
        )
      })}
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
  const [badges, setBadges] = useState<Badges>(badgeCache?.value || { messages: 0, reports: 0, notices: 0, owners: 0 })
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let alive = true
    loadBadges().then((b) => { if (alive) setBadges(b) }).catch(() => {})
    return () => { alive = false }
  }, [pathname])

  // Con el admin abierto, los contadores (y la campana de avisos) se refrescan solos cada minuto.
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState !== "visible") return
      badgeCache = null
      loadBadges().then(setBadges).catch(() => {})
    }, BADGE_TTL_MS)
    return () => window.clearInterval(t)
  }, [])

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

  const pending = badges.messages + badges.reports + badges.owners

  // Sección y icono de la pantalla actual (para el acento y la cabecera). Pantallas que no salen en el
  // menú (p. ej. /admin/analytics) usan el acento del Resumen.
  const current = (() => {
    for (const g of ADMIN_NAV) for (const item of g.items) if (item.href === pathname) return { accent: g.accent, city: !!item.city }
    return { accent: "violet" as Accent, city: false }
  })()

  const brand = (
    <Link href="/admin/dashboard" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-b from-[#8f73ff] to-[#6a46f5] text-base font-black text-white shadow-[0_0_0_1px_rgba(106,70,245,0.95),inset_0_1px_0_rgba(255,255,255,0.34),0_8px_20px_-8px_rgba(124,92,255,0.8)]">N</span>
      <span className="leading-tight">
        <span className="block text-sm font-black tracking-tight text-ink">Noctua</span>
        <span className="block text-xs text-zinc-400">Admin</span>
      </span>
    </Link>
  )

  return (
    <div className="min-h-screen bg-night bg-[radial-gradient(60%_45%_at_28%_-8%,rgba(124,92,255,0.13),transparent_72%)] bg-fixed bg-no-repeat text-ink lg:grid lg:grid-cols-[272px_1fr]">
      {/* Barra lateral (ordenador) */}
      <aside className="hidden lg:block">
        <div className="sticky top-0 flex h-screen flex-col border-r border-white/[0.06] px-3 py-5">
          <div className="px-3">{brand}</div>
          <div className="mt-6 px-1">
            <AdminCitySwitch />
          </div>
          <div className="mt-6 flex-1 overflow-y-auto pb-6">
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
          <div className="flex items-center gap-2">
          <Link
            href="/admin/avisos"
            aria-label={badges.notices > 0 ? `Avisos: ${badges.notices} sin leer` : "Avisos"}
            className="ui-btn ui-btn-secondary relative h-10 w-10 p-0"
          >
            <Bell size={18} aria-hidden="true" />
            {badges.notices > 0 && (
              <span className="absolute -right-1.5 -top-1.5 min-w-[20px] rounded-full bg-brand px-1 py-0.5 text-center text-[11px] font-bold leading-none text-white">
                {badges.notices > 99 ? "99+" : badges.notices}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            className="ui-btn ui-btn-secondary relative h-10 px-3.5 py-0"
          >
            <Menu size={18} aria-hidden="true" /> Menú
            {pending > 0 && (
              <span className="absolute -right-1.5 -top-1.5 min-w-[20px] rounded-full bg-warn px-1 py-0.5 text-center text-[11px] font-bold leading-none text-night">
                {pending > 99 ? "99+" : pending}
              </span>
            )}
          </button>
          </div>
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
              <div className="mt-5 px-1">
                <AdminCitySwitch />
              </div>
              <div className="mt-5 flex-1 overflow-y-auto pb-4">
                <NavList pathname={pathname} badges={badges} onNavigate={() => setMenuOpen(false)} />
              </div>
              <Link href="/" className="flex items-center gap-2 rounded-ctl px-3 py-2 text-sm font-semibold text-zinc-400 hover:text-ink">
                <ExternalLink size={16} aria-hidden="true" /> Ver la web
              </Link>
            </div>
          </div>
        )}

        <main className="mx-auto max-w-[1200px] px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pt-10">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-white/[0.06] pb-6">
            <div className="min-w-0">
              <h1 className="font-display text-2xl tracking-tight md:text-[28px]">{title}</h1>
              {subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">{subtitle}</p>}
              {current.city && (
                <div className="mt-3">
                  <AdminCityBadge />
                </div>
              )}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>

          <AccentContext.Provider value={current.accent}>{children}</AccentContext.Provider>
        </main>
      </div>
    </div>
  )
}
