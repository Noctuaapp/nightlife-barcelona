// Fondo de noche para la cabecera de las páginas (06/11/2026). Las páginas de música, barrio, zona, metro,
// nitbus, favoritos, contacto, FAQ… abrían con el título sobre negro liso y quedaban frías al lado de la
// portada. Este fondo se pone detrás de lo que haya arriba de la página y le da vida de ocio nocturno:
//   · Luces desenfocadas («bokeh») que flotan despacio, algunas con un parpadeo suave.
//   · Dos o tres rayos de luz, como los láser de una pista, que barren muy despacio desde arriba.
//   · Resplandores grandes y quietos del color de la sección.
// Es la misma familia visual que SectionHero (Clubs, Eventos, Esenciales): sin fotos, todo CSS, y las luces se
// colocan con un generador con semilla fija, así que salen idénticas en el servidor y en el navegador (no hay
// saltos al hidratar) y en cada visita. Solo mueve `transform` y `opacity` (no repinta) y con «reducir
// movimiento» activado queda quieto (la regla global de globals.css ya lo para).
//
// Uso: ponerlo como primer hijo de un contenedor a todo el ancho con `relative isolate`; se pinta detrás del
// contenido (z negativo), arriba del todo, y se funde con transparencia hacia abajo (no depende del color
// de fondo de la página).
import type { CSSProperties } from "react"

export type NightTone = "violet" | "blue" | "pink" | "amber" | "teal"

type Beam = { x: number; color: string; a0: number; a1: number; dur: number; delay: number }

type Theme = {
  seed: number
  // Resplandores grandes y suaves: [x %, y %, tamaño px, color, opacidad]
  glows: [number, number, number, string, number][]
  discs: string[]
  beams: Beam[]
}

const THEMES: Record<NightTone, Theme> = {
  violet: {
    seed: 11,
    glows: [
      [16, 18, 460, "#6d28d9", 0.5],
      [86, 70, 420, "#be185d", 0.34],
      [58, -4, 340, "#4338ca", 0.4],
    ],
    discs: ["#c084fc", "#f0abfc", "#818cf8", "#f9a8d4", "#a78bfa"],
    beams: [
      { x: 64, color: "#a78bfa", a0: -22, a1: -6, dur: 17, delay: 0 },
      { x: 80, color: "#f0abfc", a0: 8, a1: 24, dur: 21, delay: -6 },
      { x: 92, color: "#818cf8", a0: -10, a1: 6, dur: 14, delay: -3 },
    ],
  },
  blue: {
    seed: 29,
    glows: [
      [14, 16, 460, "#1d4ed8", 0.46],
      [88, 74, 420, "#0369a1", 0.4],
      [60, -6, 340, "#4338ca", 0.36],
    ],
    discs: ["#7dd3fc", "#6cf2f2", "#93c5fd", "#a5b4fc", "#fde68a"],
    beams: [
      { x: 62, color: "#6cf2f2", a0: -20, a1: -4, dur: 19, delay: -2 },
      { x: 79, color: "#3b82ff", a0: 6, a1: 22, dur: 16, delay: -8 },
      { x: 93, color: "#a5b4fc", a0: -12, a1: 4, dur: 22, delay: -4 },
    ],
  },
  pink: {
    seed: 43,
    glows: [
      [18, 16, 440, "#9d174d", 0.46],
      [86, 76, 420, "#6d28d9", 0.4],
      [56, -6, 340, "#be185d", 0.38],
    ],
    discs: ["#f9a8d4", "#fb7185", "#f0abfc", "#fbbf24", "#c084fc"],
    beams: [
      { x: 63, color: "#ec4899", a0: -20, a1: -4, dur: 18, delay: -1 },
      { x: 80, color: "#f0abfc", a0: 10, a1: 26, dur: 20, delay: -9 },
      { x: 92, color: "#fb923c", a0: -8, a1: 8, dur: 15, delay: -5 },
    ],
  },
  amber: {
    seed: 23,
    glows: [
      [84, 14, 460, "#b45309", 0.42],
      [14, 80, 400, "#9d174d", 0.4],
      [52, 102, 360, "#6d28d9", 0.34],
    ],
    discs: ["#fbbf24", "#fb923c", "#fb7185", "#f0abfc", "#fde68a"],
    beams: [
      { x: 64, color: "#fbbf24", a0: -20, a1: -4, dur: 18, delay: -2 },
      { x: 80, color: "#fb7185", a0: 8, a1: 24, dur: 21, delay: -7 },
      { x: 92, color: "#f0abfc", a0: -10, a1: 6, dur: 15, delay: -4 },
    ],
  },
  teal: {
    seed: 37,
    glows: [
      [18, 18, 440, "#0f766e", 0.44],
      [88, 70, 420, "#0369a1", 0.4],
      [54, 104, 340, "#047857", 0.32],
    ],
    discs: ["#5eead4", "#7dd3fc", "#86efac", "#99f6e4", "#bae6fd"],
    beams: [
      { x: 63, color: "#5eead4", a0: -22, a1: -6, dur: 19, delay: -3 },
      { x: 80, color: "#7dd3fc", a0: 8, a1: 24, dur: 17, delay: -8 },
      { x: 92, color: "#86efac", a0: -8, a1: 8, dur: 23, delay: -5 },
    ],
  },
}

// Generador pseudoaleatorio con semilla (mulberry32): mismos números siempre para la misma semilla.
function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DISC_COUNT = 15

function discsFor(theme: Theme) {
  const rand = rng(theme.seed)
  return Array.from({ length: DISC_COUNT }, () => {
    // Más hacia la derecha: el texto va a la izquierda y tiene que leerse limpio.
    const x = 34 + rand() * 70
    const y = rand() * 100
    const size = Math.round(14 + Math.pow(rand(), 2) * 84)
    const color = theme.discs[Math.floor(rand() * theme.discs.length)]
    const opacity = 0.14 + rand() * 0.3
    // Cuanto más grande, más desenfocado (como una luz fuera de foco de verdad).
    const blur = size > 60 ? 5 : size > 34 ? 2.5 : 1
    const ring = rand() > 0.55
    // Movimiento: deriva lenta de un lado a otro y, en las pequeñas, un parpadeo suave.
    const dx = Math.round((rand() - 0.5) * 44)
    const dy = Math.round((rand() - 0.5) * 36)
    const drift = 9 + rand() * 10
    const driftDelay = -rand() * 18
    const twinkle = size < 36 ? 3.5 + rand() * 4 : 0
    return { x, y, size, color, opacity, blur, ring, dx, dy, drift, driftDelay, twinkle }
  })
}

export default function NightBackdrop({
  tone = "violet",
  soft = false,
  className = "",
}: {
  tone?: NightTone
  // Más discreto, para páginas de lectura (FAQ, privacidad, condiciones…).
  soft?: boolean
  className?: string
}) {
  const theme = THEMES[tone]
  const discs = discsFor(theme)
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_42%,transparent)] ${soft ? "opacity-55" : "opacity-80 sm:opacity-100"} ${className}`}
    >
      {theme.glows.map(([x, y, size, color, opacity], i) => (
        <span
          key={`g${i}`}
          className="absolute rounded-full"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: size,
            height: size,
            marginLeft: -size / 2,
            marginTop: -size / 2,
            background: color,
            opacity,
            filter: "blur(90px)",
          }}
        />
      ))}

      {/* Rayos de luz: barren despacio desde arriba, como los láser de una pista */}
      {theme.beams.map((b, i) => (
        <span
          key={`b${i}`}
          className="nb-beam absolute -top-8 origin-top opacity-[0.16] sm:opacity-[0.22]"
          style={
            {
              left: `${b.x}%`,
              width: 64,
              height: 520,
              marginLeft: -32,
              background: `linear-gradient(to bottom, ${b.color} 0%, transparent 80%)`,
              filter: "blur(14px)",
              mixBlendMode: "screen",
              transform: `rotate(${b.a0}deg)`,
              "--a0": `${b.a0}deg`,
              "--a1": `${b.a1}deg`,
              animation: `nb-sweep ${b.dur}s ease-in-out ${b.delay}s infinite`,
            } as CSSProperties
          }
        />
      ))}

      {discs.map((d, i) => (
        <span
          key={`d${i}`}
          className="nb-disc absolute rounded-full"
          style={
            {
              left: `${d.x}%`,
              top: `${d.y}%`,
              width: d.size,
              height: d.size,
              marginLeft: -d.size / 2,
              marginTop: -d.size / 2,
              background: `radial-gradient(circle at 35% 30%, ${d.color} 0%, ${d.color} 45%, transparent 100%)`,
              opacity: d.opacity,
              filter: `blur(${d.blur}px)`,
              boxShadow: d.ring ? "inset 0 0 0 1px rgba(255,255,255,0.35)" : undefined,
              "--o": d.opacity,
              "--dx": `${d.dx}px`,
              "--dy": `${d.dy}px`,
              animation:
                `nb-drift ${d.drift.toFixed(1)}s ease-in-out ${d.driftDelay.toFixed(1)}s infinite` +
                (d.twinkle ? `, nb-twinkle ${d.twinkle.toFixed(1)}s ease-in-out ${(-d.drift).toFixed(1)}s infinite` : ""),
            } as CSSProperties
          }
        />
      ))}

      {/* Lectura del texto: oscurece la izquierda en pantallas grandes */}
      <div
        className="absolute inset-0 hidden md:block"
        style={{ background: "linear-gradient(90deg, rgba(10,9,16,0.5) 0%, rgba(10,9,16,0.16) 42%, rgba(10,9,16,0) 70%)" }}
      />
    </div>
  )
}

// Envoltorio para páginas cuyo <main> es estrecho (max-w-3xl…): da el contenedor a todo el ancho y se
// queda con el alto que sobre, igual que antes (flex-1) para que el pie de página siga abajo.
export function NightPage({
  tone = "violet",
  soft = false,
  children,
}: {
  tone?: NightTone
  soft?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="relative isolate flex flex-1 flex-col">
      <NightBackdrop tone={tone} soft={soft} />
      {children}
    </div>
  )
}
