"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Icon from "../ui/Icon"
import NocOwl from "../mascot/NocOwl"
import { useLanguage } from "../../context/LanguageContext"
import { supabase } from "../../lib/supabase"
import { track } from "../../lib/track"

// Bloque de registro de las fichas de club y de evento (27/10/2026). Casi todas las visitas
// llegan desde Google directamente a una ficha, miran el dato que buscaban y se van sin ver nada
// más de Noctua. El bloque enseña qué se pierden (solo funciones que ya existen: favoritos, plan de
// la noche, check-in con notas, "Tu mes en Noctua" y los avisos de eventos) y, para quien aún no
// quiera crear cuenta, deja a un toque los sitios por los que seguir la noche sin registrarse.
// Solo lo ve quien no tiene sesión. Tiene dos tamaños:
//  · "banner": compacto, justo debajo de los datos prácticos (arriba de la ficha, con el mismo
//    ancho y márgenes que el resto de bandas, para que se vea sin tocar el marco de la página).
//  · "full": el bloque grande con las cuatro ventajas, al final del contenido.
// Cada pulsación se anota (join_click, con meta.pos = top|bottom) para ver en Admin › Visitas cuál
// de los dos funciona.

type Kind = "club" | "event"
type Variant = "banner" | "full"

const EXPLORE: { to: string; href: string; icon: string; label: string }[] = [
  { to: "open", href: "/clubs?open=1", icon: "clock", label: "home.openNow" },
  { to: "map", href: "/map", icon: "map", label: "home.quickMap" },
  { to: "plan", href: "/plan", icon: "calendar", label: "home.quickPlan" },
  { to: "events", href: "/events", icon: "ticket", label: "home.quickEvents" },
]

export default function JoinNoctuaCard({
  kind,
  itemId,
  name,
  variant = "full",
}: {
  kind: Kind
  itemId: number
  name: string
  variant?: Variant
}) {
  const { t } = useLanguage()
  const pathname = usePathname()
  const [anon, setAnon] = useState(false)

  useEffect(() => {
    let alive = true
    // getSession lee la sesión guardada en el navegador (sin llamada de red).
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setAnon(!data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setAnon(!session)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  if (!anon) return null

  const pos = variant === "banner" ? "top" : "bottom"
  const click = (to: string) => track("join_click", { itemType: kind, itemId, itemName: name, meta: { to, pos } })
  // Tras registrarse o entrar, vuelve a la ficha en la que estaba.
  const next = pathname ? `?next=${encodeURIComponent(pathname)}` : ""

  const perks = [
    {
      icon: kind === "event" ? "bell" : "heart",
      title: t(kind === "event" ? "joinCard.p1tEvent" : "joinCard.p1tClub"),
      body: kind === "event" ? t("joinCard.p1bEvent") : t("joinCard.p1bClub").replace("{name}", name),
    },
    { icon: "calendar", title: t("joinCard.p2t"), body: t("joinCard.p2b") },
    { icon: "note", title: t("joinCard.p3t"), body: t("joinCard.p3b") },
    { icon: "sparkle", title: t("joinCard.p4t"), body: t("joinCard.p4b") },
  ]

  if (variant === "banner") {
    return (
      <section aria-labelledby="join-noctua-banner-title" className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-card border border-brand/40 bg-gradient-to-br from-[#1b1244] via-surface to-[#2b1038] p-4 sm:p-6">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-fuchsia-500/20 blur-3xl" />

          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3 sm:items-start sm:gap-3.5">
              <div className="shrink-0 rounded-full bg-white/[0.06] p-1.5">
                <NocOwl size={40} mood="party" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-brand-soft">{t("joinCard.kicker")}</p>
                <h2 id="join-noctua-banner-title" className="mt-0.5 text-base font-extrabold leading-snug text-ink sm:text-xl">
                  {t(kind === "event" ? "joinCard.titleEvent" : "joinCard.titleClub")}
                </h2>
                <p className="mt-1 hidden text-sm leading-snug text-zinc-300 sm:block">{t("joinCard.sub")}</p>
              </div>
            </div>

            <div className="shrink-0">
              <div className="grid grid-cols-[1.35fr_1fr] gap-2 sm:flex sm:items-center sm:gap-2.5">
                <Link
                  href={`/signup${next}`}
                  onClick={() => click("signup")}
                  className="flex items-center justify-center rounded-ctl px-4 py-3 text-center text-sm font-bold text-white shadow-[0_10px_30px_-10px_rgba(236,72,153,0.7)] transition hover:opacity-90 sm:px-6"
                  style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
                >
                  {t("joinCard.cta")}
                </Link>
                <Link
                  href={`/login${next}`}
                  onClick={() => click("login")}
                  className="flex items-center justify-center rounded-ctl border border-white/15 px-3 py-3 text-center text-sm font-semibold text-ink transition hover:bg-white/10 sm:px-5"
                >
                  {t("joinCard.login")}
                </Link>
              </div>
              <p className="mt-1.5 text-center text-[11px] text-zinc-400 sm:text-left">{t("joinCard.fine")}</p>
            </div>
          </div>

          <ul className="scrollbar-none relative -mx-4 mt-3.5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {perks.map((p) => (
              <li
                key={p.title}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] py-1.5 pl-2 pr-3 text-xs font-semibold text-ink"
              >
                <Icon name={p.icon} className="h-3.5 w-3.5 text-brand-soft" /> {p.title}
              </li>
            ))}
          </ul>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-labelledby="join-noctua-title"
      className="relative overflow-hidden rounded-card border border-brand/30 bg-gradient-to-br from-[#1b1244] via-surface to-[#2b1038] p-6 sm:p-8"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-fuchsia-500/15 blur-3xl" />

      <div className="relative flex items-start gap-4">
        <div className="shrink-0 rounded-full bg-white/[0.06] p-2">
          <NocOwl size={48} mood="party" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-soft">{t("joinCard.kicker")}</p>
          <h2 id="join-noctua-title" className="mt-1 text-xl font-extrabold leading-snug text-ink sm:text-2xl">
            {t(kind === "event" ? "joinCard.titleEvent" : "joinCard.titleClub")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">{t("joinCard.sub")}</p>
        </div>
      </div>

      <ul className="relative mt-6 grid gap-3 sm:grid-cols-2">
        {perks.map((p) => (
          <li key={p.title} className="flex gap-3 rounded-ctl border border-white/10 bg-white/[0.04] p-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/20 text-brand-soft">
              <Icon name={p.icon} className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{p.title}</span>
              <span className="mt-0.5 block text-xs leading-snug text-zinc-300">{p.body}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="relative mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href={`/signup${next}`}
          onClick={() => click("signup")}
          className="flex items-center justify-center rounded-ctl px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_30px_-10px_rgba(236,72,153,0.7)] transition hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
        >
          {t("joinCard.cta")}
        </Link>
        <Link
          href={`/login${next}`}
          onClick={() => click("login")}
          className="flex items-center justify-center rounded-ctl border border-white/15 px-6 py-3.5 text-sm font-semibold text-ink transition hover:bg-white/10"
        >
          {t("joinCard.login")}
        </Link>
        <p className="text-xs text-zinc-400 sm:ml-1">{t("joinCard.fine")}</p>
      </div>

      <div className="relative mt-6 border-t border-white/10 pt-5">
        <p className="text-xs font-semibold text-zinc-400">{t("joinCard.explore")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXPLORE.map((e) => (
            <Link
              key={e.to}
              href={e.href}
              onClick={() => click(e.to)}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3.5 py-2 text-xs font-semibold text-white transition hover:border-cyan-300/50 hover:bg-black/40"
            >
              <Icon name={e.icon} className="h-3.5 w-3.5 text-cyan-300" /> {t(e.label)}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
