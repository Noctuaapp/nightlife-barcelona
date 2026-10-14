"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import NocOwl from "./NocOwl"
import { BADGES } from "../../lib/badges"
import { badgeIcon } from "../gamification/badgeIcons"
import { useLanguage } from "../../context/LanguageContext"

// Aviso de insignia nueva con Noc celebrando. Se pinta en document.body para quedar por encima
// de cabecera y barra inferior.
export default function BadgeToast({ keys, onDone }: { keys: string[]; onDone: () => void }) {
  const [mounted, setMounted] = useState(false)
  const { t } = useLanguage()
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (keys.length === 0) return
    const id = setTimeout(onDone, 5000)
    return () => clearTimeout(id)
  }, [keys, onDone])

  if (!mounted || keys.length === 0) return null
  const list = keys.filter((k) => BADGES[k]).map((k) => ({ key: k, ...BADGES[k] }))
  if (list.length === 0) return null

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[1100] flex justify-center px-4" role="status" aria-live="polite">
      <div
        className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-card border border-brand/40 bg-surface p-3 pr-4 shadow-xl"
        style={{ animation: "badgeIn 0.4s cubic-bezier(.2,1.3,.4,1)" }}
        onClick={onDone}
      >
        <NocOwl size={48} mood="party" />
        <div>
          <p className="text-xs font-semibold text-brand-soft">{t("badges.unlocked")}</p>
          {list.map((b) => {
            const BIcon = badgeIcon(b.key)
            return (
              <p key={b.key} className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <BIcon size={16} className="text-brand-soft" /> {t(`badges.${b.key}_name`)} <span className="text-xs font-semibold text-open">+{b.xp} XP</span>
              </p>
            )
          })}
        </div>
      </div>
      <style>{`@keyframes badgeIn{from{opacity:0;transform:translateY(-16px) scale(.9)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){@keyframes badgeIn{from{opacity:0}to{opacity:1}}}`}</style>
    </div>,
    document.body
  )
}
