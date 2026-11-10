"use client"

import { useEffect, useRef, useState } from "react"
import { frameAt, planSpin, POCKETS, PITCH, type SpinPlan } from "../../lib/roulette"

// La ruleta del «Sorpréndeme» (10/11/2026): una rueda de casino en los colores de Noctua (violeta de marca,
// noche y dorado; todo plano, sin degradados) con una bola que da vueltas al revés, baja a una casilla y se
// queda quieta. Debajo van pasando los nombres de los locales posibles y el último es el elegido. La
// matemática está en lib/roulette.ts. Se anima con requestAnimationFrame tocando el dibujo directamente
// (sin volver a pintar React en cada fotograma) y se para sola al terminar o al cerrarse.

const C = 120
const R_OUT = 90
const R_IN = 64
const GOLD = "#fbbf24"
const BRAND = "#7c5cff"
const NIGHT = "#0a0910"
const SURFACE = "#16141f"
const SURFACE_2 = "#1e1b29"

const polar = (r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180
  return [C + r * Math.sin(a), C - r * Math.cos(a)]
}
const f = (n: number) => n.toFixed(2)

function wedge(i: number): string {
  const a0 = i * PITCH
  const a1 = (i + 1) * PITCH
  const [x0, y0] = polar(R_OUT, a0)
  const [x1, y1] = polar(R_OUT, a1)
  const [x2, y2] = polar(R_IN, a1)
  const [x3, y3] = polar(R_IN, a0)
  return `M${f(x0)} ${f(y0)} A${R_OUT} ${R_OUT} 0 0 1 ${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} A${R_IN} ${R_IN} 0 0 0 ${f(x3)} ${f(y3)} Z`
}
const WEDGES = Array.from({ length: POCKETS }, (_, i) => wedge(i))
const FRETS = Array.from({ length: POCKETS }, (_, i) => {
  const [x0, y0] = polar(R_IN, i * PITCH)
  const [x1, y1] = polar(R_OUT, i * PITCH)
  return `M${f(x0)} ${f(y0)} L${f(x1)} ${f(y1)}`
}).join(" ")
// Las casillas alternan noche y violeta; solo la que gana se pone dorada, para que no haya dudas de cuál es.
const pocketFill = (i: number) => (i % 2 === 0 ? SURFACE_2 : BRAND)

export default function SurpriseRoulette({ names, durationMs, label }: { names: string[]; durationMs: number; label: string }) {
  const [plan] = useState<SpinPlan>(() => planSpin())
  const wheelRef = useRef<SVGGElement | null>(null)
  const ballRef = useRef<SVGGElement | null>(null)
  const [shown, setShown] = useState(0)
  const [landed, setLanded] = useState(false)

  useEffect(() => {
    const paint = (u: number) => {
      const fr = frameAt(u, plan)
      wheelRef.current?.setAttribute("transform", `rotate(${f(fr.wheel)} ${C} ${C})`)
      const [bx, by] = polar(fr.radius, fr.ball)
      ballRef.current?.setAttribute("transform", `translate(${f(bx)} ${f(by)})`)
      return fr
    }
    paint(0)
    const start = performance.now()
    let raf = 0
    let last = -1
    const step = (now: number) => {
      const u = Math.min(1, (now - start) / durationMs)
      paint(u)
      // Los nombres pasan rápido y frenan con la rueda; el último es el elegido.
      const idx = Math.min(names.length - 1, Math.floor((1 - Math.pow(1 - u, 3)) * names.length))
      if (idx !== last) {
        last = idx
        setShown(idx)
      }
      if (u < 1) raf = requestAnimationFrame(step)
      else {
        setShown(names.length - 1)
        setLanded(true)
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // La tirada es una sola por montaje (el padre cambia la `key` para tirar de nuevo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col items-center gap-4" aria-hidden="true">
      <svg viewBox="0 0 240 240" className="w-full max-w-[15rem]" style={{ overflow: "visible" }}>
        {/* Cuenco y pista de la bola */}
        <circle cx={C} cy={C} r="117" fill={NIGHT} stroke="#2a2540" strokeWidth="3" />
        <circle cx={C} cy={C} r="109" fill={SURFACE} />
        <circle cx={C} cy={C} r="109" fill="none" stroke={GOLD} strokeWidth="1.6" opacity=".85" />
        <circle cx={C} cy={C} r="95" fill="none" stroke="#2a2540" strokeWidth="1" strokeDasharray="2 5" />

        {/* La rueda */}
        <g ref={wheelRef}>
          {WEDGES.map((d, i) => (
            <path key={i} d={d} fill={landed && i === plan.pocket ? GOLD : pocketFill(i)} />
          ))}
          <path d={FRETS} stroke={GOLD} strokeWidth="1.1" opacity=".75" fill="none" />
          <circle cx={C} cy={C} r={R_OUT} fill="none" stroke={GOLD} strokeWidth="2.2" />
          <circle cx={C} cy={C} r={R_IN} fill={NIGHT} stroke={GOLD} strokeWidth="2.2" />
          <path d={`M${C} ${C - R_IN + 6} L${C} ${C + R_IN - 6} M${C - R_IN + 6} ${C} L${C + R_IN - 6} ${C}`} stroke="#2a2540" strokeWidth="3" strokeLinecap="round" />
          <circle cx={C} cy={C} r="20" fill={GOLD} stroke={NIGHT} strokeWidth="2.4" />
          {/* Luna creciente en el centro */}
          <path d="M123 108 A13 13 0 1 0 123 132 A10.5 10.5 0 1 1 123 108 Z" fill={NIGHT} />
        </g>

        {/* La bola */}
        <g ref={ballRef}>
          <circle cx="1.3" cy="2" r="4.6" fill="#000" opacity=".45" />
          <circle r="4.6" fill="#f4f3f7" stroke="#cfcbe0" strokeWidth="0.8" />
          <circle cx="-1.4" cy="-1.6" r="1.4" fill="#fff" />
        </g>
      </svg>

      <div className="flex h-12 w-full flex-col items-center justify-center">
        <span className="max-w-full truncate px-4 font-display text-xl text-white">{names[shown] ?? ""}</span>
      </div>
      <p className="-mt-2 text-center text-sm font-semibold text-zinc-400">{label}</p>
    </div>
  )
}
