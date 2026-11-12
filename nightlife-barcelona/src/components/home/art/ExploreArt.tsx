import { Banknote, Cross, Martini, Music, Utensils } from "lucide-react"
import type { LucideIcon } from "lucide-react"

// Capas de interfaz que van SOBRE las fotos de «Explora Noctua» (12/11/2026, tercera versión). El fondo de cada puerta
// es un recorte de la foto de Barcelona de la portada, con su propio tono (ver public/home/); encima va lo que hace
// cada puerta: el mapa con sus sitios y la ruta, la cronología de una noche, y el rótulo de farmacia de guardia con el
// cajero y la comida. Son dibujos de ejemplo, no datos: van ocultos para lector de pantalla.

// ---------------------------------------------------------------------------------------------------------
// MAPA: sitios y ruta sobre la foto de la bahía
// ---------------------------------------------------------------------------------------------------------
type Tone = "violet" | "green" | "amber"
const TONES: Record<Tone, { ring: string; glow: string }> = {
  violet: { ring: "rgba(160,139,255,.95)", glow: "rgba(124,92,255,.75)" },
  green: { ring: "rgba(62,230,168,.95)", glow: "rgba(52,211,153,.7)" },
  amber: { ring: "rgba(255,190,92,.95)", glow: "rgba(255,170,60,.6)" },
}

// Posiciones en % de la pieza. Se quedan por encima del texto (que va abajo a la izquierda).
const PINS: { x: number; y: number; Icon: LucideIcon; tone: Tone; hot?: boolean }[] = [
  { x: 22, y: 44, Icon: Music, tone: "violet" },
  { x: 40, y: 24, Icon: Cross, tone: "green" },
  { x: 58, y: 47, Icon: Martini, tone: "violet", hot: true },
  { x: 82, y: 30, Icon: Utensils, tone: "amber" },
]

export function MapOverlay({ chipLabel }: { chipLabel: string }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1]">
      {/* Ruta entre los sitios */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false" className="absolute inset-0 h-full w-full overflow-visible">
        <path
          d="M22 44 C 28 36, 33 25, 40 24 C 48 23, 50 44, 58 47 C 67 50, 75 40, 82 30"
          fill="none"
          stroke="#6cf2f2"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeDasharray="0.1 9"
          vectorEffect="non-scaling-stroke"
          style={{ filter: "drop-shadow(0 0 6px rgba(108,242,242,.9))" }}
        />
      </svg>

      {PINS.map(({ x, y, Icon, tone, hot }, i) => {
        const c = TONES[tone]
        const size = hot ? "h-12 w-12" : "h-9 w-9"
        return (
          <span key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
            {hot && <span className="absolute inset-0 rounded-full motion-safe:animate-ping" style={{ boxShadow: `0 0 0 2px ${c.ring}` }} />}
            <span
              className={`relative grid place-items-center rounded-full border backdrop-blur-md ${size}`}
              style={{
                borderColor: c.ring,
                background: hot ? "linear-gradient(145deg,#8f74ff,#5b3fe0)" : "rgba(10,9,16,.55)",
                boxShadow: `0 0 0 4px ${c.glow.replace(/[\d.]+\)$/, ".18)")}, 0 0 26px ${c.glow}`,
              }}
            >
              <Icon size={hot ? 21 : 16} strokeWidth={2.2} className="text-white" />
            </span>
            {hot && (
              <span className="absolute bottom-full left-1/2 mb-3 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/25 bg-night/85 px-3 py-1.5 text-xs font-bold text-ink shadow-[0_8px_24px_-6px_rgba(0,0,0,.7)] backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-open shadow-[0_0_8px_rgba(52,211,153,.9)]" />
                {chipLabel}
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}

// ---------------------------------------------------------------------------------------------------------
// PLAN: la cronología de una noche, en cristal
// ---------------------------------------------------------------------------------------------------------
const STOPS = [
  { Icon: Utensils, time: "21:00" },
  { Icon: Martini, time: "23:30" },
  { Icon: Music, time: "01:00" },
]

export function PlanOverlay() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 z-[1] -translate-y-1/2 sm:right-6">
      <span className="relative flex flex-col items-end gap-2.5">
        <span className="absolute bottom-4 right-[17px] top-4 border-l-2 border-dashed border-white/35" />
        {STOPS.map(({ Icon, time }, i) => {
          const last = i === STOPS.length - 1
          return (
            <span
              key={time}
              className="relative flex items-center gap-2.5 rounded-full border border-white/25 bg-night/45 py-1 pl-3.5 pr-1 backdrop-blur-md transition-transform duration-500 motion-safe:group-hover:-translate-x-1"
              style={last ? { boxShadow: "0 0 26px rgba(124,92,255,.6)", borderColor: "rgba(160,139,255,.8)" } : undefined}
            >
              <span className={`text-xs font-bold tabular-nums ${last ? "text-ink" : "text-zinc-200"}`}>{time}</span>
              <span className="grid h-8 w-8 place-items-center rounded-full" style={{ background: last ? "linear-gradient(145deg,#8f74ff,#5b3fe0)" : "rgba(255,255,255,.14)" }}>
                <Icon size={15} strokeWidth={2.2} className="text-white" />
              </span>
            </span>
          )
        })}
      </span>
    </span>
  )
}

// ---------------------------------------------------------------------------------------------------------
// ESENCIALES: rótulo de farmacia de guardia, cajero y comida
// ---------------------------------------------------------------------------------------------------------
function Ring({ className, color, glow, children }: { className: string; color: string; glow: string; children: React.ReactNode }) {
  return (
    <span
      className={`absolute grid place-items-center rounded-full border-2 backdrop-blur-sm ${className}`}
      style={{ borderColor: color, color, boxShadow: `0 0 24px ${glow}, inset 0 0 18px ${glow}`, background: "rgba(3,18,16,.55)" }}
    >
      {children}
    </span>
  )
}

export function EssentialsOverlay() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 z-[1] h-[7.75rem] w-[8.75rem] -translate-y-1/2 transition-transform duration-500 motion-safe:group-hover:scale-105 sm:right-6">
      <Ring className="right-[2.6rem] top-0 h-[4.6rem] w-[4.6rem]" color="#4ff0b8" glow="rgba(52,211,153,.55)">
        <Cross size={34} strokeWidth={2.4} />
      </Ring>
      <Ring className="right-0 top-[2.1rem] h-11 w-11" color="#e6fff4" glow="rgba(52,211,153,.3)">
        <Banknote size={20} strokeWidth={2} />
      </Ring>
      <Ring className="bottom-0 right-[3.6rem] h-10 w-10" color="#e6fff4" glow="rgba(52,211,153,.3)">
        <Utensils size={17} strokeWidth={2} />
      </Ring>
    </span>
  )
}
