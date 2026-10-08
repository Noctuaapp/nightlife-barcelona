"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import NocOwl from "./NocOwl"
import { BADGES } from "../../lib/badges"

// Aviso de insignia nueva con Noc celebrando. Se pinta en document.body para quedar por encima
// de cabecera y barra inferior.
export default function BadgeToast({ keys, onDone }: { keys: string[]; onDone: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (keys.length === 0) return
    const id = setTimeout(onDone, 5000)
    return () => clearTimeout(id)
  }, [keys, onDone])

  if (!mounted || keys.length === 0) return null
  const list = keys.map((k) => BADGES[k]).filter(Boolean)
  if (list.length === 0) return null

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[1100] flex justify-center px-4" role="status" aria-live="polite">
      <div
        className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-purple-400/40 bg-zinc-950/95 p-3 pr-4 shadow-[0_10px_40px_-10px_rgba(168,85,247,0.6)] backdrop-blur"
        style={{ animation: "badgeIn 0.4s cubic-bezier(.2,1.3,.4,1)" }}
        onClick={onDone}
      >
        <NocOwl size={48} mood="party" />
        <div>
          <p className="text-xs font-bold text-purple-300">¡Insignia desbloqueada!</p>
          {list.map((b) => (
            <p key={b.name} className="text-sm font-black text-white">
              {b.emoji} {b.name} <span className="text-xs font-bold text-emerald-300">+{b.xp} XP</span>
            </p>
          ))}
        </div>
      </div>
      <style>{`@keyframes badgeIn{from{opacity:0;transform:translateY(-16px) scale(.9)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){@keyframes badgeIn{from{opacity:0}to{opacity:1}}}`}</style>
    </div>,
    document.body
  )
}
