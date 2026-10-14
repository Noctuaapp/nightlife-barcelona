"use client"

import Link from "next/link"
import { useLanguage } from "../../context/LanguageContext"

// Selector Clubs · Eventos · Esenciales en lo alto de cada listado: son las tres secciones de
// "Explorar" en la barra inferior, y antes no había forma de pasar de una a otra sin volver atrás.
export default function ExploreSwitch({ active }: { active: "clubs" | "events" | "essentials" }) {
  const { t } = useLanguage()
  const items = [
    { key: "clubs", href: "/clubs", label: t("nav.clubs") },
    { key: "events", href: "/events", label: t("nav.events") },
    { key: "essentials", href: "/essentials", label: t("nav.essentials") },
  ] as const
  return (
    <nav aria-label={t("nav.explore")} className="inline-flex rounded-full border border-white/10 bg-surface p-1">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          aria-current={active === it.key ? "page" : undefined}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            active === it.key ? "bg-white text-night" : "text-zinc-300 hover:text-ink"
          }`}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  )
}
