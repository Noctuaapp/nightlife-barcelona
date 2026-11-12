import { METRO_LINE_COLORS } from "../../../lib/transitColors"

// Fondo de «Cómo volver a casa esta noche» (12/11/2026, cuarta versión). Las anteriores usaban fotografía y luego un amanecer
// dibujado, y no funcionaban. Esto es un plano de metro esquemático (no geográfico): líneas con los colores oficiales de TMB
// que se cruzan en un intercambiador, con las paradas marcadas y un brillo de neón. Es dibujo de ejemplo, no datos: va oculto
// para lector de pantalla y no se descarga nada (es SVG en línea). Se pinta con `slice`, así que cubre cualquier proporción;
// lo importante (el intercambiador) está en el centro.

type Pt = [number, number]
type Line = { color: string; pts: Pt[] }

// Tres líneas viajan juntas por el centro (y 352 / 380 / 408) y se separan a los lados; una cuarta las cruza en vertical y una
// quinta pasa por debajo. Las diagonales son siempre de 45°, como en un plano de verdad.
const LINES: Line[] = [
  { color: METRO_LINE_COLORS.L3, pts: [[-40, 560], [170, 560], [340, 352], [700, 352], [840, 212], [1040, 212]] }, // arriba en el centro
  { color: METRO_LINE_COLORS.L1, pts: [[-40, 130], [100, 130], [250, 280], [250, 380], [250, 380], [760, 380], [860, 280], [1040, 280]] },
  { color: METRO_LINE_COLORS.L5, pts: [[-40, 700], [60, 700], [60, 640], [180, 520], [180, 408], [720, 408], [860, 548], [1040, 548]] },
  { color: METRO_LINE_COLORS.L4, pts: [[440, -40], [440, 120], [510, 190], [510, 800]] },
  { color: METRO_LINE_COLORS.L2, pts: [[-40, 690], [380, 690], [470, 600], [760, 600], [850, 690], [1040, 690]] },
]

const INTERCHANGES: { x: number; y1: number; y2: number }[] = [
  { x: 510, y1: 352, y2: 408 }, // las tres líneas del centro con la amarilla
  { x: 510, y1: 600, y2: 600 }, // la amarilla con la lila
]

// Camino con las esquinas redondeadas.
function roundedPath(pts: Pt[], r = 38): string {
  const clean = pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1])
  let d = `M${clean[0][0]} ${clean[0][1]}`
  for (let i = 1; i < clean.length - 1; i++) {
    const [px, py] = clean[i - 1]
    const [x, y] = clean[i]
    const [nx, ny] = clean[i + 1]
    const l1 = Math.hypot(x - px, y - py)
    const l2 = Math.hypot(nx - x, ny - y)
    const k1 = Math.min(r, l1 / 2) / l1
    const k2 = Math.min(r, l2 / 2) / l2
    d += ` L${(x - (x - px) * k1).toFixed(1)} ${(y - (y - py) * k1).toFixed(1)} Q${x} ${y} ${(x + (nx - x) * k2).toFixed(1)} ${(y + (ny - y) * k2).toFixed(1)}`
  }
  const last = clean[clean.length - 1]
  return d + ` L${last[0]} ${last[1]}`
}

// Paradas: repartidas por cada tramo recto, lejos de las esquinas y de los intercambiadores.
function stationsOf(pts: Pt[]): Pt[] {
  const out: Pt[] = []
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]
    const [bx, by] = pts[i]
    const len = Math.hypot(bx - ax, by - ay)
    const n = Math.floor(len / 84)
    for (let k = 1; k <= n; k++) {
      const t = k / (n + 1)
      const x = ax + (bx - ax) * t
      const y = ay + (by - ay) * t
      const nearHub = INTERCHANGES.some((h) => Math.abs(x - h.x) < 26 && y > h.y1 - 30 && y < h.y2 + 30)
      if (!nearHub) out.push([x, y])
    }
  }
  return out
}

export default function TransitNetwork({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1000 760" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <filter id="tn-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      {/* Brillo */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="18" opacity=".55" filter="url(#tn-glow)">
        {LINES.map((l, i) => (
          <path key={i} d={roundedPath(l.pts)} stroke={l.color} />
        ))}
      </g>
      {/* Líneas */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="11">
        {LINES.map((l, i) => (
          <path key={i} d={roundedPath(l.pts)} stroke={l.color} />
        ))}
      </g>
      {/* Paradas */}
      <g fill="#0a0910" stroke="#fff" strokeWidth="3">
        {LINES.flatMap((l, i) => stationsOf(l.pts).map(([x, y], j) => <circle key={`${i}-${j}`} cx={x} cy={y} r="5.5" />))}
      </g>
      {/* Intercambiadores */}
      <g fill="#0a0910" stroke="#fff" strokeWidth="4">
        {INTERCHANGES.map((h, i) => (
          <rect key={i} x={h.x - 12} y={h.y1 - 14} width="24" height={h.y2 - h.y1 + 28} rx="12" />
        ))}
      </g>
    </svg>
  )
}
