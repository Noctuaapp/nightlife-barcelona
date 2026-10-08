"use client"

import NocOwl from "./NocOwl"

// Aviso "+XP" con Noc celebrando. Sustituye a la pastilla morada de texto de antes.
export default function XpBurst({ show, amount }: { show: boolean; amount: number }) {
  if (!show) return null
  return (
    <div
      className="pointer-events-none absolute -top-14 right-0 z-20 flex items-center gap-1 rounded-full bg-purple-500 py-1 pl-1 pr-3 text-xs font-black text-white shadow-lg"
      style={{ animation: "xpPop 0.45s cubic-bezier(.2,1.4,.4,1)" }}
      role="status"
    >
      <NocOwl size={30} mood="party" />
      +{amount} XP
      <style jsx global>{`
        @keyframes xpPop {
          0% { transform: translateY(8px) scale(0.6); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes xpPop { 0%, 100% { transform: none; opacity: 1; } }
        }
      `}</style>
    </div>
  )
}
