"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useNocSeasonalOverride } from "../../lib/nocSeasonal"

// Decoración de Navidad (pedida el 05/11/2026: «decorar para navidad la web con detalles navideños»).
// Dos detalles discretos, sin colores chillones: una tira de luces cálidas (blanco cálido y rojo) pegada
// al borde de arriba y una nevada fina. No tapan nada ni reciben toques (pointer-events: none) y con
// «reducir movimiento» activado en el dispositivo se quedan quietos (las luces) o no salen (la nieve).
//
// Cuándo sale: del 1 de diciembre al 6 de enero, solo con la fecha. Desde /admin/herramientas, forzando la
// temporada «Navidad» (la misma anulación que usa Noc), se ve antes para probarla; con «ninguna» se apaga.
// Noc ya lleva su propio gorro por su lado (lib/nocSeasonal.ts, desde el 15 de diciembre).

export function inChristmasWindow(d: Date = new Date()): boolean {
  const m = d.getMonth() + 1
  const day = d.getDate()
  return m === 12 || (m === 1 && day <= 6)
}

const FLAKES = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 2 + ((i * 5) % 4),
  dur: 11 + ((i * 7) % 9),
  delay: -((i * 13) % 19),
  sway: (i % 2 === 0 ? 1 : -1) * (14 + ((i * 3) % 22)),
  alpha: 0.35 + ((i * 11) % 5) * 0.1,
}))

export default function ChristmasDecor() {
  const pathname = usePathname() || ""
  const override = useNocSeasonalOverride()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const on = override === "christmas" || (override === "auto" && inChristmasWindow())
  if (!mounted || !on || pathname.startsWith("/admin")) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      <svg className="absolute left-0 top-0 h-[26px] w-full" preserveAspectRatio="none">
        <defs>
          <pattern id="xmas-a" width="96" height="26" patternUnits="userSpaceOnUse">
            <path d="M0 3 Q48 20 96 3" fill="none" stroke="#3a3544" strokeWidth="1.5" />
            <g fill="#ffe2a8">
              <ellipse cx="24" cy="13.4" rx="2.6" ry="3.6" />
              <ellipse cx="72" cy="13.4" rx="2.6" ry="3.6" />
            </g>
          </pattern>
          <pattern id="xmas-b" width="96" height="26" patternUnits="userSpaceOnUse">
            <ellipse cx="48" cy="15.5" rx="2.6" ry="3.6" fill="#e5484d" />
          </pattern>
        </defs>
        <rect className="xmas-a" width="100%" height="26" fill="url(#xmas-a)" />
        <rect className="xmas-b" width="100%" height="26" fill="url(#xmas-b)" />
      </svg>

      {FLAKES.map((f, i) => (
        <span
          key={i}
          className="xmas-flake absolute top-0 rounded-full bg-white"
          style={{
            left: `${f.left}%`,
            width: f.size,
            height: f.size,
            opacity: f.alpha,
            animationDuration: `${f.dur}s`,
            animationDelay: `${f.delay}s`,
            ["--sway" as string]: `${f.sway}px`,
          }}
        />
      ))}

      <style>{`
        .xmas-flake { animation-name: xmasFall; animation-timing-function: linear; animation-iteration-count: infinite; will-change: transform; }
        .xmas-a { animation: xmasTwinkleA 3.2s ease-in-out infinite; }
        .xmas-b { animation: xmasTwinkleB 3.2s ease-in-out infinite; }
        @keyframes xmasFall { from { transform: translate3d(0, -4vh, 0) } 50% { transform: translate3d(var(--sway), 50vh, 0) } to { transform: translate3d(0, 106vh, 0) } }
        @keyframes xmasTwinkleA { 0%, 100% { opacity: 1 } 50% { opacity: 0.55 } }
        @keyframes xmasTwinkleB { 0%, 100% { opacity: 0.6 } 50% { opacity: 1 } }
        @media (prefers-reduced-motion: reduce) {
          .xmas-flake { display: none }
          .xmas-a, .xmas-b { animation: none }
        }
      `}</style>
    </div>
  )
}
