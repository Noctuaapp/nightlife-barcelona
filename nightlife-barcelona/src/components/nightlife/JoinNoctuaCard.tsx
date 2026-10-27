"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Icon from "../ui/Icon"
import NocOwl from "../mascot/NocOwl"
import { useLanguage } from "../../context/LanguageContext"
import { supabase } from "../../lib/supabase"
import { track } from "../../lib/track"
import { useInstallPrompt } from "../../lib/useInstallPrompt"
import InstallAppButton from "../system/InstallAppButton"

// Bloque de registro de las fichas de club y de evento (27/10/2026). Casi todas las visitas
// llegan desde Google directamente a una ficha, miran el dato que buscaban y se van sin ver nada
// más de Noctua. El bloque enseña qué se pierden (solo funciones que ya existen: favoritos, plan de
// la noche, check-in con notas, "Tu mes en Noctua" y los avisos de eventos) y deja a un toque crear
// la cuenta o entrar. Va justo debajo de los datos prácticos, con el mismo ancho y márgenes que el
// resto de bandas de la ficha (no toca el marco de la página). Solo lo ve quien no tiene sesión.
// Se anota cuándo se ve (join_view) y cada pulsación (join_click) para medir el embudo en
// Admin › Visitas.

type Kind = "club" | "event"

export default function JoinNoctuaCard({ kind, itemId, name }: { kind: Kind; itemId: number; name: string }) {
  const { t } = useLanguage()
  const pathname = usePathname()
  const [anon, setAnon] = useState(false)
  const ref = useRef<HTMLElement | null>(null)
  const install = useInstallPrompt()
  // En móvil sale siempre el botón de instalar, en cian y de contorno para no competir con «Crear
  // cuenta gratis» (con el aviso de Chrome abre el cuadro de instalar; sin él, enseña los pasos del
  // menú ⋮). En ordenador no se puede instalar desde aquí: solo queda la etiqueta, también en cian.
  // Si la app ya está instalada, no sale nada.
  const canInstall = !install.installed && install.isMobile

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

  // «Bloque visto»: una sola vez por visita, cuando la mitad del bloque entra en pantalla.
  useEffect(() => {
    const el = ref.current
    if (!anon || !el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          track("join_view", { itemType: kind, itemId, itemName: name })
          io.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [anon, kind, itemId, name])

  if (!anon) return null

  const click = (to: string) => track("join_click", { itemType: kind, itemId, itemName: name, meta: { to } })
  // Tras registrarse o entrar, vuelve a la ficha en la que estaba.
  const next = pathname ? `?next=${encodeURIComponent(pathname)}` : ""

  const perks: { icon: string; title: string; accent?: boolean }[] = [
    { icon: kind === "event" ? "bell" : "heart", title: t(kind === "event" ? "joinCard.p1tEvent" : "joinCard.p1tClub") },
    { icon: "calendar", title: t("joinCard.p2t") },
    { icon: "note", title: t("joinCard.p3t") },
    { icon: "sparkle", title: t("joinCard.p4t") },
    // Que se puede instalar en el móvil (en móvil lo sustituye el botón de instalar de debajo).
    ...(canInstall || install.installed ? [] : [{ icon: "smartphone", title: t("joinCard.p5t"), accent: true }]),
  ]

  return (
    <section ref={ref} aria-labelledby="join-noctua-title" className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
      <div className="relative overflow-hidden rounded-card border border-brand/40 bg-gradient-to-br from-[#1b1244] via-surface to-[#2b1038] p-4 sm:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-fuchsia-500/20 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:items-start sm:gap-3.5">
            <div className="shrink-0 rounded-full bg-white/[0.06] p-1.5">
              <NocOwl size={40} mood="party" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-brand-soft">{t("joinCard.kicker")}</p>
              <h2 id="join-noctua-title" className="mt-0.5 text-base font-extrabold leading-snug text-ink sm:text-xl">
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
              className={`flex shrink-0 items-center gap-1.5 rounded-full border py-1.5 pl-2 pr-3 text-xs font-semibold text-ink ${
                p.accent ? "border-cyan-300/40 bg-cyan-400/10" : "border-white/10 bg-white/[0.05]"
              }`}
            >
              <Icon name={p.icon} className={`h-3.5 w-3.5 ${p.accent ? "text-cyan-300" : "text-brand-soft"}`} /> {p.title}
            </li>
          ))}
        </ul>

        <InstallAppButton from="join" variant="inline" />
      </div>
    </section>
  )
}
