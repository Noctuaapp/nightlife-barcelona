// Portada de Clubs, Eventos y Esenciales (03/11/2026). Los tres listados abrían con un título sobre
// fondo negro liso. La primera versión usaba la foto del skyline con un tinte por sección y se veía
// mal (la misma imagen con otro color, y el título sobre una foto recortada); la segunda, con
// ilustraciones, peor todavía. Ahora no hay foto: el fondo es luz de noche desenfocada («bokeh»), que
// se dibuja con CSS (sin descargar ninguna imagen) y cambia de color según la sección:
//   · Clubs: violeta y magenta (luces de pista).
//   · Eventos: ámbar y rosa (escenario, foco).
//   · Esenciales: verde azulado y azul cielo (farolas, calle).
// Los círculos se colocan con un generador con semilla fija, así que salen exactamente iguales en el
// servidor y en el navegador (sin saltos al cargar) y en cada visita. Abajo se funde con el negro de la
// página, para que el buscador y los filtros queden pegados a la portada sin corte.
export type HeroSection = "clubs" | "events" | "essentials"

type Theme = {
  seed: number
  // Resplandores grandes y suaves del fondo: [x %, y %, tamaño px, color, opacidad]
  glows: [number, number, number, string, number][]
  // Colores de los círculos pequeños (los «bokeh»)
  discs: string[]
}

const THEME: Record<HeroSection, Theme> = {
  clubs: {
    seed: 11,
    glows: [
      [16, 14, 460, "#6d28d9", 0.5],
      [86, 78, 420, "#be185d", 0.34],
      [60, -6, 340, "#4338ca", 0.4],
    ],
    discs: ["#c084fc", "#f0abfc", "#818cf8", "#f9a8d4", "#a78bfa"],
  },
  events: {
    seed: 23,
    glows: [
      [84, 12, 460, "#b45309", 0.42],
      [14, 80, 400, "#9d174d", 0.4],
      [52, 102, 360, "#6d28d9", 0.34],
    ],
    discs: ["#fbbf24", "#fb923c", "#fb7185", "#f0abfc", "#fde68a"],
  },
  essentials: {
    seed: 37,
    glows: [
      [18, 18, 440, "#0f766e", 0.44],
      [88, 70, 420, "#0369a1", 0.4],
      [54, 104, 340, "#047857", 0.32],
    ],
    discs: ["#5eead4", "#7dd3fc", "#86efac", "#99f6e4", "#bae6fd"],
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

const DISC_COUNT = 18

function discsFor(theme: Theme) {
  const rand = rng(theme.seed)
  return Array.from({ length: DISC_COUNT }, () => {
    // Más hacia la derecha y arriba: el texto va a la izquierda y tiene que leerse limpio.
    const x = 38 + rand() * 66
    const y = rand() * 100
    const size = Math.round(14 + Math.pow(rand(), 2) * 84)
    const color = theme.discs[Math.floor(rand() * theme.discs.length)]
    const opacity = 0.12 + rand() * 0.3
    // Cuanto más grande, más desenfocado (como una luz fuera de foco de verdad).
    const blur = size > 60 ? 5 : size > 34 ? 2.5 : 1
    const ring = rand() > 0.55
    return { x, y, size, color, opacity, blur, ring }
  })
}

export default function SectionHero({
  section,
  title,
  subtitle,
  pill,
  switcher,
  children,
  tall = false,
}: {
  section: HeroSection
  title: string
  subtitle?: string
  // Etiqueta pequeña con punto verde (como la de la portada): «12 locales abiertos ahora», «Esta noche en Barcelona»…
  pill?: string
  // El selector Clubs · Eventos · Esenciales va arriba del todo.
  switcher?: React.ReactNode
  // Lo que va debajo del título (buscador, botón…).
  children?: React.ReactNode
  // Portada de pantalla casi completa (Eventos «Próximamente»).
  tall?: boolean
}) {
  const theme = THEME[section]
  const discs = discsFor(theme)
  return (
    <section className={`relative isolate overflow-hidden bg-[#0a0910] ${tall ? "min-h-[72vh]" : ""}`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
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
        {discs.map((d, i) => (
          <span
            key={`d${i}`}
            className="absolute rounded-full"
            style={{
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
            }}
          />
        ))}
        {/* Lectura del texto y fundido con la página */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(10,9,16,0.25) 0%, rgba(10,9,16,0) 38%, rgba(10,9,16,0.7) 86%, #0a0910 100%)" }}
        />
        <div
          className="absolute inset-0 hidden md:block"
          style={{ background: "linear-gradient(90deg, rgba(10,9,16,0.55) 0%, rgba(10,9,16,0.18) 42%, rgba(10,9,16,0) 70%)" }}
        />
      </div>

      <div className={`mx-auto flex max-w-7xl flex-col items-start px-4 pb-6 pt-6 sm:px-6 sm:pb-10 sm:pt-10 lg:pb-12 lg:pt-12 ${tall ? "min-h-[72vh] justify-center" : ""}`}>
        {switcher}
        {pill && (
          <p className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md sm:text-sm">
            <span aria-hidden="true" className="live-dot h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
            {pill}
          </p>
        )}
        <h1 className={`max-w-3xl break-words font-display text-[1.75rem] leading-[1.04] text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.5)] sm:text-5xl lg:text-6xl ${pill ? "mt-3" : "mt-5"}`}>
          {title}
        </h1>
        {subtitle && <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-200 sm:text-base">{subtitle}</p>}
        {children && <div className="w-full">{children}</div>}
      </div>
    </section>
  )
}
