"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

// Navegación única y completa del admin. Antes cada pantalla tenía su propia lista de enlaces
// (distinta en cada una — a alguna le faltaba "Dashboard", a otra "Tickets" o "Analytics"), así
// que había botones a los que solo se llegaba entrando primero en otra pantalla. Ahora todas las
// pantallas comparten esta misma lista, siempre completa.
const ADMIN_NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/admin", label: "Clubs", icon: "🏛️" },
  { href: "/admin/events", label: "Events", icon: "🎉" },
  { href: "/admin/club-events", label: "Club nights", icon: "🎧" },
  { href: "/admin/essentials", label: "Essentials", icon: "📍" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/messages", label: "Messages", icon: "💬" },
  { href: "/admin/analytics", label: "Analytics", icon: "📈" },
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

  return (
    <div className="min-h-screen bg-[#08070b] text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#08070b]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-base font-black">
              N
            </span>
            <div className="leading-tight">
              <p className="text-sm font-black tracking-tight">Noctua</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Admin</p>
            </div>
          </Link>
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white hover:text-black"
          >
            ← Ver web
          </Link>
        </div>

        <nav className="scrollbar-none mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-5 pb-3">
          {ADMIN_NAV.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  active ? "bg-white text-black" : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 pb-32 pt-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-purple-400">Admin</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">{title}</h1>
            {subtitle && <p className="mt-2 max-w-xl text-sm text-zinc-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>

        {children}
      </main>

      <style jsx global>{`
        .scrollbar-none {
          scrollbar-width: none;
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}
