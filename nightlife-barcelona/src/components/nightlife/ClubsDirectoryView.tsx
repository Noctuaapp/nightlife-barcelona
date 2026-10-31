"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { useLanguage } from "../../context/LanguageContext"

// Vista del índice A–Z de /clubs (31/10/2026). Antes era una lista de cientos de locales seguidos,
// larguísima en el móvil. Ahora: una cuadrícula de letras y, debajo, solo los locales de la letra
// elegida (con «Ver los N locales» si son muchos). Todos los enlaces están en el HTML desde el
// principio —los de las letras no elegidas y los que sobran, ocultos con CSS— para que Google los
// siga viendo (ver ClubsDirectory.tsx).

export type DirectoryGroup = {
  letter: string
  items: { id: number; name: string; href: string; hood: string | null }[]
}

const INITIAL_VISIBLE = 12

export default function ClubsDirectoryView({ groups, total }: { groups: DirectoryGroup[]; total: number }) {
  const { t } = useLanguage()
  const [active, setActive] = useState(groups[0]?.letter || "")
  const [expanded, setExpanded] = useState(false)
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({})

  const select = (letter: string, focus = false) => {
    setActive(letter)
    setExpanded(false)
    if (focus) tabs.current[letter]?.focus()
  }

  // Flechas, Inicio y Fin para recorrer las letras con el teclado.
  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const last = groups.length - 1
    const target = e.key === "ArrowRight" ? Math.min(index + 1, last) : e.key === "ArrowLeft" ? Math.max(index - 1, 0) : e.key === "Home" ? 0 : e.key === "End" ? last : -1
    if (target < 0) return
    e.preventDefault()
    select(groups[target].letter, true)
  }

  const countLabel = (n: number) => (n === 1 ? t("directory.one") : t("directory.many").replace("{n}", String(n)))

  return (
    <section aria-labelledby="clubs-az" className="mx-auto max-w-7xl border-t border-white/10 bg-night px-4 pt-10">
      <h2 id="clubs-az" className="text-xl font-semibold text-ink">
        {t("directory.title")}
      </h2>
      <p className="mt-2 text-sm text-zinc-400">{t("directory.count").replace("{n}", String(total))}</p>

      <div role="tablist" aria-label={t("directory.pick")} className="mt-5 grid grid-cols-7 gap-2 sm:flex sm:flex-wrap">
        {groups.map((g, i) => {
          const on = g.letter === active
          return (
            <button
              key={g.letter}
              ref={(el) => {
                tabs.current[g.letter] = el
              }}
              role="tab"
              id={`az-tab-${g.letter === "#" ? "num" : g.letter}`}
              aria-selected={on}
              aria-controls={`az-panel-${g.letter === "#" ? "num" : g.letter}`}
              aria-label={`${g.letter} · ${countLabel(g.items.length)}`}
              tabIndex={on ? 0 : -1}
              onClick={() => select(g.letter)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`flex h-11 items-center justify-center rounded-ctl text-base font-bold transition sm:w-11 ${
                on ? "bg-ink text-night" : "border border-white/10 text-zinc-200 hover:bg-white/5"
              }`}
            >
              {g.letter}
            </button>
          )
        })}
      </div>

      {groups.map((g) => {
        const on = g.letter === active
        const id = g.letter === "#" ? "num" : g.letter
        return (
          <div key={g.letter} role="tabpanel" id={`az-panel-${id}`} aria-labelledby={`az-tab-${id}`} hidden={!on} className="mt-6">
            <h3 className="flex items-baseline gap-3">
              <span className="font-display text-4xl leading-none text-ink">{g.letter}</span>
              <span className="text-sm text-zinc-400">{countLabel(g.items.length)}</span>
            </h3>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((c, i) => (
                <li key={c.id} className={i >= INITIAL_VISIBLE && !expanded ? "hidden" : ""}>
                  <Link
                    href={c.href}
                    className="flex min-h-[3.25rem] items-center justify-between gap-3 rounded-ctl border border-white/10 bg-white/[0.03] px-4 py-2.5 transition hover:border-white/25 hover:bg-white/[0.06]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{c.name}</span>
                      {c.hood && <span className="block truncate text-xs text-zinc-400">{c.hood}</span>}
                    </span>
                    <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-zinc-500" />
                  </Link>
                </li>
              ))}
            </ul>
            {g.items.length > INITIAL_VISIBLE && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="mt-3 w-full rounded-ctl border border-white/15 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/5"
              >
                {expanded ? t("directory.showLess") : t("directory.showAll").replace("{n}", String(g.items.length))}
              </button>
            )}
          </div>
        )
      })}
    </section>
  )
}
