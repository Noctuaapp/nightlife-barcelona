"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import NocOwl from "./NocOwl"
import { levelByKey } from "../../lib/xp"
import { useLanguage } from "../../context/LanguageContext"
import { X } from "lucide-react"

// Momento de "subes de nivel" — antes no existía ninguno: se descubría, si acaso, mirando la
// barra de progreso en el perfil. A diferencia de BadgeToast (un aviso pequeño arriba), este es
// un modal a pantalla completa porque subir de nivel es el hito más importante del sistema de XP.
export default function LevelUpModal({ levelKey, onDone }: { levelKey: string | null; onDone: () => void }) {
  const [mounted, setMounted] = useState(false)
  const { t } = useLanguage()
  useEffect(() => setMounted(true), [])

  if (!mounted || !levelKey) return null
  const level = levelByKey(levelKey)

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-night/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      style={{ animation: "levelUpFade 0.3s ease-out" }}
    >
      <button onClick={onDone} aria-label={t("common.close")} className="absolute right-5 top-5 text-zinc-400 hover:text-ink">
        <X className="h-6 w-6" />
      </button>
      <div
        className="flex max-w-sm flex-col items-center rounded-card border border-white/10 bg-surface p-8 text-center shadow-2xl"
        style={{ animation: "levelUpPop 0.5s cubic-bezier(.2,1.3,.4,1)" }}
      >
        <NocOwl size={96} mood="party" levelColor={level.color} />
        <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-zinc-400">{t("levels.levelUpTitle")}</p>
        <h2 className="mt-1 font-display text-3xl" style={{ color: level.color }}>
          {level.icon} {t(`levels.${level.key}`)}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-300">{t(`clubNoctua.perkSoon_${level.key}`) || t("levels.levelUpBody")}</p>
        <Link
          href="/club-noctua"
          onClick={onDone}
          className="mt-6 w-full rounded-ctl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong active:scale-95"
        >
          {t("levels.viewMine")}
        </Link>
      </div>
      <style>{`
        @keyframes levelUpFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes levelUpPop { from { opacity: 0; transform: scale(.85) translateY(12px) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) {
          @keyframes levelUpFade { from, to { opacity: 1 } }
          @keyframes levelUpPop { from, to { opacity: 1; transform: none } }
        }
      `}</style>
    </div>,
    document.body
  )
}
