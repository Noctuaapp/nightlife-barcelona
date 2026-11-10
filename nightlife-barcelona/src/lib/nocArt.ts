// El dibujo de Noc, el búho de Noctua (rediseño del 09/11/2026, y cara nueva el 10/11/2026).
//
// Noc es un búho de noche con actitud, pensado para ocio nocturno y para que se tome en serio:
//   · Cuerpo oscuro; el color del nivel va en el borde, la línea de la ceja y la barriga.
//   · Mirada de búho de verdad: iris ámbar, pupila negra y una ceja pesada y oscura que le da cara de duro
//     (de vuelta de todo, no de enfadado). Pico afilado y una cadena de oro con una luna.
//   · Estilo pegatina: formas planas y un contorno de tinta del mismo grosor en todo el dibujo, para que se
//     pueda llevar igual a la web, a un cartel o a una pulsera.
//   · Simétrico: los dos ojos y las dos orejas iguales (lo pidió Jordi: las asimetrías no se entendían). La
//     única excepción es el guiño, que cierra un ojo a propósito.
//   · Expresiones: duro (por defecto), guiño, medio dormido, de fiesta, sorprendido, de resaca (gafas de sol)
//     y borrachillo (ojos bizcos, mejillas rosas, «hic!» y ladeado).
//   · Poses: Noc puede llevar algo en la mano que cuenta una parte de Noctua (un cóctel para los bares, la
//     señal del NitBus, la cruz de farmacia, la ruta de Planifica…). El de clubs (fiesta) levanta un ala hacia
//     la bola de espejos; el de festival lo da todo, con la cara pintada, gorro y acreditación.
//   · Disfraces de temporada: los 11 de antes, redibujados con este estilo.
//
// Este archivo solo genera el interior del <svg> como texto (no usa React): así el mismo dibujo se puede
// probar con un test, pintar en la web (components/mascot/NocOwl.tsx) y exportar a imagen. Todo lo que entra
// en el texto son constantes de aquí o un color ya validado, nunca texto escrito por un usuario.

// «happy» es la cara por defecto (la de duro); «open» se conserva por compatibilidad y se dibuja igual.
export type OwlMood = "happy" | "wink" | "sleepy" | "party" | "wow" | "open" | "resaca" | "borracho"

export type NocPose =
  | "copa" // bares y coctelerías
  | "fiesta" // clubs: bola de espejos y un ala arriba
  | "festival" // eventos y festivales: gorro, acreditación y cara pintada
  | "mapa" // mapa y «cerca de mí»
  | "pizza" // esenciales: comer de madrugada
  | "farmacia" // esenciales: farmacias de guardia
  | "plan" // Planifica tu noche: la ruta
  | "corazon" // favoritos
  | "ticket" // entradas y listas
  | "dado" // Sorpréndeme
  | "trofeo" // niveles, retos e insignias
  | "paraguas" // aviso de lluvia
  | "frio" // aviso de frío
  | "lupa" // buscador
  | "metro"
  | "nitbus"

export type NocTheme =
  | "sanValentin"
  | "carnaval"
  | "semanaSanta"
  | "feriaAbril"
  | "santJordi"
  | "sanJuan"
  | "pride"
  | "summer"
  | "merce"
  | "halloween"
  | "christmas"

export const NOC_POSES: NocPose[] = [
  "copa", "fiesta", "festival", "mapa", "pizza", "farmacia", "plan", "corazon",
  "ticket", "dado", "trofeo", "paraguas", "frio", "lupa", "metro", "nitbus",
]

// Color de acento cuando no se pasa nivel: el violeta de la marca.
export const NOC_DEFAULT_COLOR = "#7c5cff"

const INK = "#150f24" // contorno
const BODY_FILL = "#2b2150"
const TUFT = "#1a1433"
const WING = "#43357c"
const CREAM = "#fffdf6"
const BEAK = "#ffab1a"
const PINK = "#ff4fa3"
const CYAN = "#6cf2f2"
const GOLD = "#fbbf24"
const AMBER = "#ffb81c" // iris

// Contorno de tinta común a todas las formas.
const S = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`

const BODY =
  "M60 24 C82 24 98 40 98 64 C98 76 96.500 84 95 92 C93 106 80 114 60 114 C40 114 27 106 25 92 C23.500 84 22 76 22 64 C22 40 38 24 60 24 Z"
const TUFT_L = "M33 37 C26 28 24 17 27 7 C38 11 46 19 50 29 Z"
const TUFT_R = "M87 37 C94 28 96 17 93 7 C82 11 74 19 70 29 Z"
const WING_L_DOWN = "M26 68 C13 74 12 93 25 101 C31 95 32 80 30 71 Z"
const WING_R_DOWN = "M94 68 C107 74 108 93 95 101 C89 95 88 80 90 71 Z"
const WING_L_UP =
  "M27 80 C16 78 9 68 9 55 C9 50 15 50 15.500 55 C17 49 23 51 22 56 C25 52 30 55 28 60 C29 66 31 70 34 74 Z"
const WING_R_UP =
  "M90 88 C104 88 115 75 117 56 C117.500 49.500 111 48.500 110 54.500 C109 47.500 102 49 102.500 55 C99.500 50.500 94 54 95.500 59.500 C94 68 90 74 84 78 Z"

// Solo se acepta un color #rrggbb; cualquier otra cosa cae al violeta de la marca.
export function safeColor(value: string | undefined | null): string {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : NOC_DEFAULT_COLOR
}

// Poses y disfraces en los que Noc sujeta algo con el ala derecha (y por tanto la levanta).
const HOLDS_RIGHT_POSE: NocPose[] = [
  "copa", "fiesta", "mapa", "pizza", "farmacia", "plan", "corazon", "ticket", "dado", "trofeo", "paraguas", "lupa", "metro", "nitbus",
]
const HOLDS_RIGHT_THEME: NocTheme[] = ["sanValentin", "semanaSanta", "santJordi", "sanJuan", "pride"]

type EyeState = "open" | "closed" | "heart" | "none"
// Cómo mira: normal (duro), medio dormido, borracho (bizco), a tope (festival) o sorprendido.
type EyeMode = "normal" | "sleepy" | "tipsy" | "hype" | "wide" | "cheeky"

function heartPath(cx: number, cy: number, k: number): string {
  return `M${cx} ${cy + 6 * k} C${cx - 9 * k} ${cy - 1 * k} ${cx - 8.500 * k} ${cy - 8 * k} ${cx - 3.500 * k} ${cy - 8 * k} C${cx - 1.500 * k} ${cy - 8 * k} ${cx} ${cy - 6.500 * k} ${cx} ${cy - 4.500 * k} C${cx} ${cy - 6.500 * k} ${cx + 1.500 * k} ${cy - 8 * k} ${cx + 3.500 * k} ${cy - 8 * k} C${cx + 8.500 * k} ${cy - 8 * k} ${cx + 9 * k} ${cy - 1 * k} ${cx} ${cy + 6 * k} Z`
}

const DARK = "#120d22" // la ceja: casi negro, más oscuro que el cuerpo

// Párpado/ceja: el trozo del ojo que queda por encima de una recta. `deg` la inclina hacia dentro (más bajo
// junto a la nariz), que es lo que da la mirada dura. Devuelve el trazo y los puntos donde la recta corta el ojo.
function lidCap(cx: number, cy: number, R: number, side: -1 | 1, ly: number, deg: number) {
  const m = -side * Math.tan((deg * Math.PI) / 180)
  const k = ly - cy
  const A2 = 1 + m * m
  const B2 = 2 * m * k
  const C2 = k * k - R * R
  const disc = Math.sqrt(B2 * B2 - 4 * A2 * C2)
  const d1 = (-B2 - disc) / (2 * A2)
  const d2 = (-B2 + disc) / (2 * A2)
  const y1 = ly + m * d1
  const y2 = ly + m * d2
  return {
    d: `M${(cx + d1).toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 0 1 ${(cx + d2).toFixed(2)} ${y2.toFixed(2)} Z`,
    x1: cx + d1, y1, x2: cx + d2, y2,
  }
}

function eye(cx: number, state: EyeState, side: -1 | 1, accent: string, mode: EyeMode): string {
  const cy = 56
  if (state === "none") return ""
  if (state === "closed") {
    // Guiño: un arco hacia ARRIBA (∩), grueso, con el color del nivel por encima. Es lo que se lee como un
    // ojo achinado y alegre; la raya curvada hacia abajo (‿) de antes parecía un ojo dormido, no un guiño
    // (lo dijo Jordi el 10/11/2026). Lleva debajo la mejilla subida, y la chispa va en el dibujo (wink()).
    const d = `M${cx - 13} 60 Q${cx} 42.500 ${cx + 13} 60`
    return (
      `<path d="${d}" fill="none" stroke="${INK}" stroke-width="7.200" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M${cx - 8} 66 Q${cx} 70 ${cx + 8} 66" fill="none" stroke="${INK}" stroke-width="2.200" stroke-linecap="round" opacity=".55"/>`
    )
  }
  const wide = mode === "wide"
  const R = wide ? 16 : 14.500
  if (state === "heart") {
    return `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${DARK}" ${S}/><path d="${heartPath(cx, 58, 1.100)}" fill="${PINK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`
  }
  const pr = wide ? 5 : mode === "hype" ? 7.200 : 6.600
  let px = cx - side * 1.200
  let py = cy + 2.600
  if (mode === "sleepy") py = cy + 4.500
  if (mode === "tipsy") {
    px = cx - side * 5.200 // los dos hacia la nariz: bizco
    py = cy + 3
  }
  let out = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${AMBER}" ${S}/><circle cx="${cx}" cy="${cy}" r="${R - 3.800}" fill="none" stroke="#e8820c" stroke-width="1.800" opacity=".75"/>`
  out += `<circle cx="${px}" cy="${py}" r="${pr}" fill="${INK}"/><circle cx="${px + 2.400}" cy="${py - 2.600}" r="2" fill="#fff"/>`
  if (!wide) {
    let ly = 52
    let deg = 7
    if (mode === "sleepy") { ly = 58.500; deg = 0 } // casi cerrado
    if (mode === "tipsy") { ly = 54; deg = 0 } // párpados caídos y rectos
    if (mode === "hype") { ly = 47.500; deg = 12 } // ojos abiertos y ceño de «vamos»
    if (mode === "cheeky") { ly = 45; deg = 0 } // el ojo que queda abierto en el guiño: ceja levantada, pícaro
    const c = lidCap(cx, cy, R, side, ly, deg)
    const ox = side === -1 ? c.x1 : c.x2
    const oy = side === -1 ? c.y1 : c.y2
    const ix = side === -1 ? c.x2 : c.x1
    const iy = side === -1 ? c.y2 : c.y1
    const ex = side === -1 ? -3.200 : 3.200
    out += `<path d="${c.d}" fill="${DARK}" ${S}/>`
    // La ceja se alarga un poco por fuera y por dentro del ojo, y lleva una línea del color del nivel.
    out += `<path d="M${(ox + ex).toFixed(2)} ${(oy - 0.4).toFixed(2)} L${(ix - ex * 0.6).toFixed(2)} ${(iy + 0.4).toFixed(2)}" stroke="${INK}" stroke-width="4.200" stroke-linecap="round"/>`
    out += `<path d="M${(ox + ex * 0.3).toFixed(2)} ${(oy + 0.9).toFixed(2)} L${(ix - ex * 0.3).toFixed(2)} ${(iy + 0.9).toFixed(2)}" stroke="${accent}" stroke-width="1.600" stroke-linecap="round"/>`
  }
  if (mode === "sleepy") {
    out += `<path d="M${cx - 9} 73 Q${cx} 76.500 ${cx + 9} 73" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity=".55"/>` // ojeras
  }
  return out
}

// Gafas de sol de resaca: dos lentes oscuras con el aro del color del nivel.
function shades(accent: string): string {
  const lens = (x: number) =>
    `<rect x="${x}" y="45" width="30" height="22.500" rx="9" fill="#0b0818" stroke="${INK}" stroke-width="4.400"/><rect x="${x}" y="45" width="30" height="22.500" rx="9" fill="none" stroke="${accent}" stroke-width="1.700"/>`
  return (
    `<path d="M28 52 L22.500 50 M92 52 L97.500 50" stroke="${INK}" stroke-width="3.400" stroke-linecap="round"/>` +
    `<path d="M58 52 Q60 50 62 52" fill="none" stroke="${INK}" stroke-width="3.400" stroke-linecap="round"/>` +
    lens(28) +
    lens(62) +
    `<path d="M34 63 L40.500 49.500 M68 63 L74.500 49.500" stroke="#fff" stroke-width="2.600" stroke-linecap="round" opacity=".32"/><path d="M42 64 L44.500 58.500 M76 64 L78.500 58.500" stroke="#fff" stroke-width="1.600" stroke-linecap="round" opacity=".28"/>`
  )
}

// Estrella de 5 puntas centrada en (cx, cy).
function star(cx: number, cy: number, k: number): string {
  const p = [
    [0, -6], [1.900, -2], [6.200, -1.500], [3, 1.500], [3.900, 5.800], [0, 3.600], [-3.900, 5.800], [-3, 1.500], [-6.200, -1.500], [-1.900, -2],
  ]
  return "M" + p.map(([x, y]) => `${(cx + x * k).toFixed(1)} ${(cy + y * k).toFixed(1)}`).join(" L") + " Z"
}

// Un petardo de fuegos artificiales: 8 chispas (largas y cortas) rematadas con un punto.
function burst(cx: number, cy: number, len: number, color: string): string {
  let out = ""
  for (let k = 0; k < 8; k++) {
    const a = (Math.PI * 2 * k) / 8
    const l = k % 2 === 0 ? len : len * 0.62
    const x1 = cx + Math.cos(a) * 3.200
    const y1 = cy + Math.sin(a) * 3.200
    const x2 = cx + Math.cos(a) * l
    const y2 = cy + Math.sin(a) * l
    out += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${color}" stroke-width="2.400" stroke-linecap="round"/>`
  }
  return out + `<circle cx="${cx}" cy="${cy}" r="1.800" fill="#fff"/>`
}

// Lo que Noc lleva en cada pose. Se pinta por encima del cuerpo.
function poseArt(pose: NocPose, accent: string): string {
  switch (pose) {
    case "copa":
      return `<g transform="translate(111 51) scale(1.320) translate(-111 -51)"><g ${S}><path d="M98 22 L124 22 L111 40 Z" fill="#e9fbff"/><path d="M111 40 L111 51"/></g><path d="M102.500 27 L119.500 27 L111 38.500 Z" fill="${PINK}"/><circle cx="119" cy="20" r="4.200" fill="${GOLD}" ${S}/><path d="M104 20 L96 12" ${S}/></g>`
    case "fiesta":
      return `<path d="M60 -14 L60 -2" ${S}/><circle cx="60" cy="6" r="9" fill="#e9e6ff" ${S}/><path d="M51.500 4 h17 M52.500 9.500 h15 M57 -2.500 v17 M63 -2.500 v17" stroke="${INK}" stroke-width="1.200" opacity=".55"/><path d="M44 -9 v7 M40.500 -5.500 h7 M80 -6 v6 M77 -3 h6" stroke="${CREAM}" stroke-width="1.700" stroke-linecap="round" opacity=".9"/>`
    case "festival":
      return `<path d="M42 27 L46 10 C52 6 68 6 74 10 L78 27 Z" fill="${CYAN}" ${S}/><path d="M33 29 C40 23 80 23 87 29 C80 34 40 34 33 29 Z" fill="${CYAN}" ${S}/><path d="M46.500 20 L73.500 20" stroke="${PINK}" stroke-width="3.200"/><path d="M40 78 L60 97 L80 78" fill="none" stroke="${PINK}" stroke-width="2.600" stroke-linejoin="round" stroke-linecap="round"/><rect x="53" y="94" width="14" height="17" rx="2.500" fill="${CREAM}" ${S}/><path d="M56.500 100 h7 M56.500 105 h4.500" stroke="${INK}" stroke-width="1.800" stroke-linecap="round"/><path d="M29 68 l7 2.500 M29.500 73 l7 2.500 M91 68 l-7 2.500 M90.500 73 l-7 2.500" stroke="${CYAN}" stroke-width="2.300" stroke-linecap="round"/>`
    case "mapa":
      return `<path d="M110 50 C102 40 99 34 99 29 A11 11 0 1 1 121 29 C121 34 118 40 110 50 Z" fill="${PINK}" ${S}/><circle cx="110" cy="29" r="4" fill="#fff"/>`
    case "pizza":
      return `<path d="M96 15 C105 10 117 10 126 15 L111 48 Z" fill="${GOLD}" ${S}/><path d="M96 15 C105 10 117 10 126 15" fill="none" stroke="#b45309" stroke-width="5" stroke-linecap="round"/><path d="M96 15 C105 10 117 10 126 15 L111 48 Z" fill="none" ${S}/><circle cx="106" cy="23" r="3.200" fill="#dc2626"/><circle cx="116" cy="26" r="3.200" fill="#dc2626"/><circle cx="111" cy="35" r="2.800" fill="#dc2626"/>`
    case "farmacia":
      return `<path d="M111 40 V52" ${S}/><path d="M103 6 h16 v10 h10 v16 h-10 v10 h-16 v-10 h-10 v-16 h10 Z" fill="#22c55e" ${S}/><path d="M107 10 h8 v10 h10 v8 h-10 v10 h-8 v-10 h-10 v-8 h10 Z" fill="none" stroke="#bbf7d0" stroke-width="1.600" stroke-linejoin="round"/>`
    case "plan":
      return `<g transform="rotate(8 111 26)"><rect x="93" y="2" width="36" height="46" rx="5" fill="#1d1638" ${S}/><rect x="93" y="2" width="36" height="46" rx="5" fill="none" stroke="${accent}" stroke-width="1.400"/><path d="M101 39 C101 28 121 33 121 22 C121 13 104 18 103 10" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-dasharray=".5 4.200" opacity=".85"/><circle cx="101" cy="39" r="4.200" fill="${CYAN}" stroke="${INK}" stroke-width="1.600"/><circle cx="121" cy="24" r="4.200" fill="#a855f7" stroke="${INK}" stroke-width="1.600"/><path d="${star(103, 10.500, 1)}" fill="${PINK}" stroke="${INK}" stroke-width="1.400" stroke-linejoin="round"/></g>`
    case "corazon":
      return `<path d="${heartPath(110, 33, 2.050)}" fill="${PINK}" ${S}/><path d="M101 24 C101 21.500 103 20 105 20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`
    case "ticket":
      return `<g transform="rotate(-14 110 30)"><path d="M94 20 h32 v6.500 a3.500 3.500 0 0 0 0 7 v6.500 h-32 v-6.500 a3.500 3.500 0 0 0 0 -7 Z" fill="${GOLD}" ${S}/><path d="M117 22 v16" stroke="${INK}" stroke-width="1.600" stroke-dasharray="2 2.500"/><path d="${star(105, 30, 1)}" fill="${INK}"/></g>`
    case "dado":
      return `<g transform="rotate(12 110 28)"><rect x="97" y="14" width="27" height="27" rx="6" fill="${CREAM}" ${S}/><g fill="${INK}"><circle cx="104" cy="21" r="2.300"/><circle cx="117" cy="21" r="2.300"/><circle cx="110.500" cy="27.500" r="2.300"/><circle cx="104" cy="34" r="2.300"/><circle cx="117" cy="34" r="2.300"/></g></g>`
    case "trofeo":
      return `<g transform="translate(116 50) scale(1.180) translate(-111 -50)"><path d="M100 18 C93 18 93 29 102 30 M122 18 C129 18 129 29 120 30" fill="none" ${S}/><path d="M99 11 H123 V22 C123 33 117 38 111 38 C105 38 99 33 99 22 Z" fill="${GOLD}" ${S}/><path d="M111 38 V44 M103 46 H119" ${S}/><path d="M104 15 V23" stroke="#fff" stroke-width="2.400" stroke-linecap="round" opacity=".7"/></g>`
    case "paraguas":
      return `<g transform="translate(111 52) scale(1.280) translate(-111 -52)"><path d="M111 30 V52" ${S}/><path d="M92 31 C93 16 102 9 111 9 C120 9 129 16 130 31 C127 27 123 27 120.500 31 C118 27 113.500 27 111 31 C108.500 27 104 27 101.500 31 C99 27 95 27 92 31 Z" fill="${CYAN}" ${S}/><path d="M111 9 V5" ${S}/></g><g stroke="${CYAN}" stroke-width="2.400" stroke-linecap="round"><path d="M84 -8 l-2 5"/><path d="M138 -2 l-2 5"/><path d="M142 22 l-2 5"/></g>`
    case "frio":
      return `<path d="M39 29 C40 10 80 10 81 29 Z" fill="${PINK}" ${S}/><rect x="35" y="23" width="50" height="10" rx="5" fill="${CREAM}" ${S}/><circle cx="60" cy="8" r="6.500" fill="${CREAM}" ${S}/><path d="M29 77 C45 86 75 86 91 77 L92 89 C75 98 45 98 28 89 Z" fill="${CYAN}" ${S}/><path d="M68 91 L80 88 L82 108 L70 110 Z" fill="${CYAN}" ${S}/><path d="M70.500 99 L81 97 M71 104.500 L81.500 102.500 M40 84.500 L41 93.500 M54 87.500 L54.500 96.500" stroke="${INK}" stroke-width="1.800" opacity=".55"/><g fill="none" stroke="#bff6ff" stroke-width="2.400" stroke-linecap="round" stroke-linejoin="round"><path d="M8 52 l4 3 l-4 3 l4 3"/><path d="M112 52 l-4 3 l4 3 l-4 3"/><path d="M4 74 l3 2.500 l-3 2.500"/><path d="M116 74 l-3 2.500 l3 2.500"/></g>`
    case "lupa":
      return `<path d="M116 35 L111 51" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M116 35 L111 51" stroke="${GOLD}" stroke-width="2.600" stroke-linecap="round"/><circle cx="112" cy="22" r="13" fill="#d6f9ff" fill-opacity=".9" ${S}/><circle cx="112" cy="22" r="10.500" fill="none" stroke="${GOLD}" stroke-width="1.600"/><path d="M105 18 C106.500 14.500 109 13 112 12.500" fill="none" stroke="#fff" stroke-width="2.400" stroke-linecap="round"/>`
    case "metro":
      return `<path d="M-4 -12 H124" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M-4 -12 H124" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/><path d="M108 -12 V34" stroke="${INK}" stroke-width="6.500"/><path d="M108 -12 V34" stroke="${GOLD}" stroke-width="2.800"/><path d="M99 34 H117 L114.500 57 H101.500 Z" fill="none" stroke="${INK}" stroke-width="7.500" stroke-linejoin="round"/><path d="M99 34 H117 L114.500 57 H101.500 Z" fill="none" stroke="${GOLD}" stroke-width="3.400" stroke-linejoin="round"/><circle cx="14" cy="12" r="12.500" fill="#e11d48" ${S}/><path d="M8 18 V7 L14 14 L20 7 V18" fill="none" stroke="#fff" stroke-width="2.800" stroke-linejoin="round" stroke-linecap="round"/>`
    case "nitbus":
      return `<path d="M111 36 V52" ${S}/><rect x="94" y="-2" width="34" height="40" rx="6" fill="#3b82ff" ${S}/><rect x="100" y="14" width="22" height="16" rx="3.500" fill="#fff"/><rect x="102.500" y="16.500" width="17" height="6" rx="1.500" fill="#3b82ff"/><circle cx="104.500" cy="26.500" r="1.600" fill="${GOLD}"/><circle cx="117.500" cy="26.500" r="1.600" fill="${GOLD}"/><path d="M103 31 v2.500 M119 31 v2.500" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M114.500 2.500 a5 5 0 1 0 5.500 6.500 a4 4 0 0 1 -5.500 -6.500 Z" fill="${GOLD}"/><circle cx="102" cy="5" r="1" fill="#fff"/><circle cx="106.500" cy="8.500" r=".8" fill="#fff"/>`
  }
}

// Disfraz de temporada: lo que va DETRÁS del búho (fuegos, sol…).
function themeBack(theme: NocTheme): string {
  switch (theme) {
    case "sanJuan":
      return burst(12, 12, 13, GOLD) + burst(60, -8, 11, CYAN) + burst(22, 44, 8, PINK)
    case "summer":
      return `<circle cx="108" cy="6" r="10" fill="${GOLD}" ${S}/><g stroke="${GOLD}" stroke-width="3" stroke-linecap="round"><path d="M108 -10 v-4"/><path d="M124 6 h4"/><path d="M119.500 -5.500 l3 -3"/><path d="M96.500 -5.500 l-3 -3"/><path d="M119.500 17.500 l3 3"/></g>`
    default:
      return ""
  }
}

// Disfraz de temporada: lo que va sobre el cuerpo pero DEBAJO de los ojos (vestido, antifaz).
function themeUnderEyes(theme: NocTheme, id: string): string {
  switch (theme) {
    case "feriaAbril":
      return `<g clip-path="url(#${id}c)"><path d="M20 84 C40 76 80 76 100 84 L100 120 L20 120 Z" fill="#dc2626"/><g fill="#fff"><circle cx="38" cy="92" r="2.600"/><circle cx="52" cy="88" r="2.600"/><circle cx="68" cy="88" r="2.600"/><circle cx="82" cy="92" r="2.600"/><circle cx="45" cy="101" r="2.600"/><circle cx="60" cy="98" r="2.600"/><circle cx="75" cy="101" r="2.600"/><circle cx="34" cy="108" r="2.600"/><circle cx="86" cy="108" r="2.600"/></g><path d="M22 84 C40 77 80 77 98 84" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M24 106 Q31 113 38 106 Q45 113 52 106 Q60 113 68 106 Q75 113 82 106 Q89 113 96 106" fill="none" stroke="#7f1d1d" stroke-width="3" stroke-linecap="round"/></g>`
    case "carnaval":
      return `<defs><linearGradient id="${id}cn" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${PINK}"/><stop offset=".5" stop-color="#a855f7"/><stop offset="1" stop-color="#3b82ff"/></linearGradient></defs><path d="M12 30 C22 34 30 34 40 36 C48 30 54 34 60 42 C66 34 72 30 80 36 C90 34 98 34 108 30 C106 50 100 66 86 76 C76 80 66 76 60 68 C54 76 44 80 34 76 C20 66 14 50 12 30 Z" fill="url(#${id}cn)" ${S}/><circle cx="60" cy="38" r="3" fill="${GOLD}" stroke="${INK}" stroke-width="1.600"/>`
    default:
      return ""
  }
}

// Disfraz de temporada: lo que va por ENCIMA de todo (gorros, gafas, lo que sujeta).
function themeFront(theme: NocTheme, id: string): string {
  switch (theme) {
    case "sanValentin":
      return `<path d="${heartPath(110, 33, 2.050)}" fill="${PINK}" ${S}/><path d="M101 24 C101 21.500 103 20 105 20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/><path d="${heartPath(12, 26, 0.900)}" fill="${PINK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="${heartPath(22, 6, 0.600)}" fill="#ff9cc9" stroke="${INK}" stroke-width="1.600" stroke-linejoin="round"/>`
    case "carnaval":
      return `<g stroke-width="2.600" stroke-linecap="round"><path d="M10 12 l4 4" stroke="${CYAN}"/><path d="M110 12 l-4 4" stroke="${GOLD}"/><path d="M60 2 v5" stroke="${PINK}"/></g><circle cx="24" cy="2" r="2.400" fill="${GOLD}"/><circle cx="98" cy="0" r="2.400" fill="${CYAN}"/><rect x="40" y="-4" width="4.500" height="4.500" fill="${PINK}" transform="rotate(20 42 -2)"/><rect x="76" y="-6" width="4.500" height="4.500" fill="#22c55e" transform="rotate(-15 78 -4)"/>`
    case "semanaSanta":
      return `<path d="M106.500 6 h9 v11 h10 v9 h-10 v26 h-9 v-26 h-10 v-9 h10 Z" fill="#92400e" ${S}/><path d="M109 9 v40" stroke="#fff" stroke-width="1.600" stroke-linecap="round" opacity=".3"/>`
    case "feriaAbril":
      return `<g ${S}><circle cx="24" cy="30" r="6" fill="#ef4444"/><circle cx="32" cy="24" r="6" fill="#ef4444"/><circle cx="34" cy="34" r="6" fill="#ef4444"/><circle cx="26" cy="38" r="5.500" fill="#dc2626"/></g><circle cx="29.500" cy="31" r="3.400" fill="${GOLD}" stroke="${INK}" stroke-width="1.800"/>`
    case "santJordi":
      return `<path d="M111 52 C112 44 111 38 110 32" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M111 52 C112 44 111 38 110 32" fill="none" stroke="#16a34a" stroke-width="2.800" stroke-linecap="round"/><path d="M111 44 C118 44 122 40 122 35 C115 35 111 39 111 44 Z" fill="#16a34a" ${S}/><g ${S}><circle cx="104" cy="22" r="7" fill="#dc2626"/><circle cx="116" cy="22" r="7" fill="#dc2626"/><circle cx="110" cy="14" r="7" fill="#ef4444"/><circle cx="110" cy="25" r="6.500" fill="#ef4444"/></g><path d="M107 19 C109 16.500 112 17 113 19.500 C113.500 22 110 23 109.500 21" fill="none" stroke="#7f1d1d" stroke-width="1.800" stroke-linecap="round"/><g transform="rotate(-8 14 100)"><rect x="2" y="90" width="25" height="19" rx="2.500" fill="#1d4ed8" ${S}/><rect x="6.500" y="93" width="17" height="13" rx="1" fill="${CREAM}"/><path d="M6.500 90.500 v18" stroke="${INK}" stroke-width="2.400"/></g>`
    case "sanJuan":
      return `<path d="M110 52 L110 24" stroke="${INK}" stroke-width="5.500" stroke-linecap="round"/><path d="M110 52 L110 24" stroke="#94a3b8" stroke-width="2.200" stroke-linecap="round"/>${burst(110, 20, 12, GOLD)}`
    case "pride":
      return `<defs><clipPath id="${id}fl"><path d="M110 4 C118 8 124 0 136 4 L136 28 C124 24 118 32 110 28 Z"/></clipPath></defs><path d="M110 52 V2" ${S}/><g clip-path="url(#${id}fl)"><rect x="108" y="-2" width="30" height="5.800" fill="#ef4444"/><rect x="108" y="3.800" width="30" height="5.200" fill="#f97316"/><rect x="108" y="9" width="30" height="5.200" fill="#facc15"/><rect x="108" y="14.200" width="30" height="5.200" fill="#22c55e"/><rect x="108" y="19.400" width="30" height="5.200" fill="#3b82f6"/><rect x="108" y="24.600" width="30" height="8" fill="#8b5cf6"/></g><path d="M110 4 C118 8 124 0 136 4 L136 28 C124 24 118 32 110 28 Z" fill="none" ${S}/>`
    case "summer":
      return `<path d="M22 46 H98" ${S}/><path d="M24 44 H58 C58 62 54 72 42 72 C30 72 24 62 24 44 Z" fill="#0b0812" ${S}/><path d="M62 44 H96 C96 62 90 72 78 72 C66 72 62 62 62 44 Z" fill="#0b0812" ${S}/><path d="M58 48 Q60 45 62 48" fill="none" ${S}/><path d="M30 50 L38 50 L31 60 Z" fill="#fff" opacity=".28"/><path d="M68 50 L76 50 L69 60 Z" fill="#fff" opacity=".28"/>`
    case "merce":
      // Un gegant (gigante de fiesta mayor) al lado de Noc.
      return `<ellipse cx="14" cy="117.500" rx="13" ry="2.400" fill="#000" opacity=".35"/><path d="M4 116 C2 92 6 78 14 74 C22 78 26 92 24 116 Z" fill="#1d4ed8" ${S}/><path d="M4.500 100 H23.500" stroke="${GOLD}" stroke-width="4"/><path d="M14 76 V116" stroke="${GOLD}" stroke-width="2.400" opacity=".9"/><circle cx="14" cy="64" r="10" fill="#f3d4ae" ${S}/><circle cx="10.500" cy="63" r="1.500" fill="${INK}"/><circle cx="17.500" cy="63" r="1.500" fill="${INK}"/><path d="M10.500 68.500 Q14 71 17.500 68.500" fill="none" stroke="${INK}" stroke-width="1.600" stroke-linecap="round"/><path d="M5 56 L5 46 L9.500 51 L14 44 L18.500 51 L23 46 L23 56 Z" fill="${GOLD}" ${S}/>`
    case "halloween":
      return `<path d="M26 31 C40 24 80 24 94 31 C86 37 34 37 26 31 Z" fill="#241238" ${S}/><path d="M41 28 L56 -6 L76 -14 L67 0 L79 28 Z" fill="#3b2168" ${S}/><path d="M43.500 22 L76.500 22 L79 28.500 L41 28.500 Z" fill="#f97316"/><rect x="55.500" y="20.500" width="9" height="9" rx="1.500" fill="none" stroke="${GOLD}" stroke-width="2"/><path d="M41 28 L56 -6 L76 -14 L67 0 L79 28" fill="none" ${S}/><ellipse cx="107" cy="117.500" rx="13" ry="2.400" fill="#000" opacity=".35"/><path d="M107 92 C122 90 126 102 124 108 C122 116 114 118 107 118 C100 118 92 116 90 108 C88 102 92 90 107 92 Z" fill="#f97316" ${S}/><path d="M107 92 C104 100 104 110 107 118 M107 92 C110 100 110 110 107 118" fill="none" stroke="#c2410c" stroke-width="1.600"/><path d="M105 92 L106 86 L110 86 L109 92 Z" fill="#15803d" ${S}/><path d="M98 101 L103 105 L98 107 Z M116 101 L111 105 L116 107 Z" fill="${INK}"/><path d="M99 110 L103 112 L107 110 L111 112 L115 110 L113 114 L101 114 Z" fill="${INK}"/>`
    case "christmas":
      return `<path d="M38 30 C44 12 66 6 92 -8 C88 8 86 20 82 30 Z" fill="#dc2626" ${S}/><circle cx="93" cy="-9" r="7.500" fill="${CREAM}" ${S}/><rect x="33" y="24" width="54" height="11" rx="5.500" fill="${CREAM}" ${S}/><path d="M29 75 C40 81 52 83 60 83 C68 83 80 81 91 75 C93 88 87 98 79 100 C75 107 66 107 60 103 C54 107 45 107 41 100 C33 98 27 88 29 75 Z" fill="${CREAM}" ${S}/><path d="M44 90 q4 3 8 0 M68 90 q4 3 8 0" fill="none" stroke="${INK}" stroke-width="1.600" stroke-linecap="round" opacity=".3"/><ellipse cx="12" cy="117.500" rx="13" ry="2.400" fill="#000" opacity=".35"/><path d="M2 110 C0 98 6 92 12 92 C18 92 24 98 22 110 C21 116 3 116 2 110 Z" fill="#b45309" ${S}/><path d="M7 92 Q12 88 17 92" fill="none" ${S}/><rect x="9" y="84" width="7" height="7" rx="1.200" fill="#16a34a" stroke="${INK}" stroke-width="2" transform="rotate(12 12.500 87.500)"/>`
  }
}

export type NocOptions = {
  /** Color del nivel (#rrggbb). Sin él, el violeta de la marca. */
  color?: string | null
  mood?: OwlMood
  pose?: NocPose | null
  /** Disfraz de temporada. Si hay pose, la pose manda y el disfraz no se pinta. */
  theme?: NocTheme | null
  /** Identificador único por dibujo (para los recortes internos). Solo letras y números. */
  id?: string
}

/** Interior del <svg viewBox="0 0 120 120"> de Noc, como texto. */
export function nocSvg({ color, mood = "happy", pose = null, theme = null, id = "noc" }: NocOptions = {}): string {
  const accent = safeColor(color)
  const uid = id.replace(/[^a-zA-Z0-9_-]/g, "")
  const activeTheme = pose ? null : theme

  const party = mood === "party"
  const sunnies = mood === "resaca"
  const tipsy = mood === "borracho"
  // En el festival Noc lo da todo: ojos a tope, ceño de «vamos» y la cabeza echada hacia atrás.
  const hype = party && pose === "festival"
  const rightUp =
    party ||
    mood === "wink" ||
    (pose ? HOLDS_RIGHT_POSE.includes(pose) : false) ||
    (activeTheme ? HOLDS_RIGHT_THEME.includes(activeTheme) : false)
  const leftUp = party

  let eyeL: EyeState = "open"
  let eyeR: EyeState = mood === "wink" ? "closed" : "open"
  if (activeTheme === "sanValentin" && mood !== "sleepy") {
    eyeL = "heart"
    if (mood !== "wink") eyeR = "heart"
  }
  // Con las gafas de sol los ojos no se ven: no se pintan.
  if (activeTheme === "summer") {
    eyeL = "none"
    eyeR = "none"
  }
  const eyeMode: EyeMode = mood === "sleepy" ? "sleepy" : tipsy ? "tipsy" : hype ? "hype" : mood === "wow" ? "wide" : mood === "wink" ? "cheeky" : "normal"

  const beak =
    mood === "wow"
      ? `<ellipse cx="60" cy="76" rx="5.500" ry="7" fill="${BEAK}" ${S}/><ellipse cx="60" cy="77.500" rx="2.400" ry="3.400" fill="${INK}"/>`
      : party
        ? `<path d="M54 68.500 Q60 65 66 68.500 Q67 77 60 85 Q53 77 54 68.500 Z" fill="${BEAK}" ${S}/><path d="M56.500 72.500 Q60 71 63.500 72.500 Q63.500 80 60 82.500 Q56.500 80 56.500 72.500 Z" fill="${INK}"/><ellipse cx="60" cy="80" rx="2.600" ry="1.800" fill="${PINK}"/>`
        : `<path d="M54.500 68.500 Q60 65 65.500 68.500 Q66 76 60 84 Q54 76 54.500 68.500 Z" fill="${BEAK}" ${S}/><path d="M60 69 L60 79" stroke="#c2680a" stroke-width="1.400" stroke-linecap="round" opacity=".7"/>`

  const wingL = leftUp ? WING_L_UP : WING_L_DOWN
  const wingR = rightUp ? WING_R_UP : WING_R_DOWN

  const parts: string[] = []
  parts.push(`<defs><clipPath id="${uid}c"><path d="${BODY}"/></clipPath></defs>`)
  parts.push(`<ellipse cx="60" cy="117.500" rx="26" ry="2.800" fill="#000" opacity=".4"/>`)
  if (activeTheme) parts.push(themeBack(activeTheme))
  // Halo del color del nivel alrededor de toda la silueta.
  parts.push(
    `<g fill="none" stroke="${accent}" stroke-width="6.500" stroke-linejoin="round" opacity=".95"><path d="${BODY}"/><path d="${TUFT_L}"/><path d="${TUFT_R}"/><path d="${wingL}"/><path d="${wingR}"/></g>`
  )
  // Patas
  parts.push(
    `<path d="M40 110 h14 a4 4 0 0 1 0 8 h-14 a4 4 0 0 1 0 -8 Z" fill="${BEAK}" ${S}/><path d="M66 110 h14 a4 4 0 0 1 0 8 h-14 a4 4 0 0 1 0 -8 Z" fill="${BEAK}" ${S}/>`
  )
  // Penachos y alas
  parts.push(`<path d="${TUFT_L}" fill="${TUFT}" ${S}/><path d="${TUFT_R}" fill="${TUFT}" ${S}/>`)
  parts.push(`<path d="${wingL}" fill="${WING}" ${S}/><path d="${wingR}" fill="${WING}" ${S}/>`)
  // Cuerpo, sombra lateral, barriga y brillo
  parts.push(`<path d="${BODY}" fill="${BODY_FILL}"/>`)
  parts.push(
    `<g clip-path="url(#${uid}c)"><path d="M80 20 C100 44 102 92 82 118 L112 118 L112 16 Z" fill="${INK}" opacity=".2"/><path d="M58 78 C73 78 82 87 82 98 C82 110 72 117 58 117 C44 117 34 110 34 98 C34 87 43 78 58 78 Z" fill="${accent}" opacity=".75"/><g fill="none" stroke="${BODY_FILL}" stroke-width="2.400" stroke-linecap="round" stroke-linejoin="round"><path d="M46 95 l4 3.500 l4 -3.500"/><path d="M60 95 l4 3.500 l4 -3.500"/><path d="M53 103.500 l4 3.500 l4 -3.500"/></g><path d="M31 50 C34 38 44 31 55 30" fill="none" stroke="#fff" stroke-width="2.600" stroke-linecap="round" opacity=".35"/></g>`
  )
  // Disco facial (el «antifaz» claro de los búhos), la cadena de oro con la luna y, si va borracho, los coloretes.
  parts.push(
    `<path d="M60 47 C57 38 44 36 35 43 C26 51 27 68 39 76 C46 80.500 55 80 60 83 C65 80 74 80.500 81 76 C93 68 94 51 85 43 C76 36 63 38 60 47 Z" fill="#3a2e72" opacity=".95"/>`
  )
  parts.push(
    `<g clip-path="url(#${uid}c)"><path d="M27 82 Q60 112 93 82" fill="none" stroke="${INK}" stroke-width="5.500" stroke-linecap="round"/><path d="M27 82 Q60 112 93 82" fill="none" stroke="${GOLD}" stroke-width="2.800" stroke-linecap="round" stroke-dasharray="3.600 1.200"/></g><path d="M60 97.500 a6.500 6.500 0 1 0 5 8 a5.200 5.200 0 1 1 -5 -8 Z" fill="${GOLD}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`
  )
  if (tipsy) {
    parts.push(`<ellipse cx="33" cy="73" rx="7" ry="4.200" fill="${PINK}" opacity=".55"/><ellipse cx="87" cy="73" rx="7" ry="4.200" fill="${PINK}" opacity=".55"/>`)
  }
  if (activeTheme) parts.push(themeUnderEyes(activeTheme, uid))
  parts.push(`<path d="${BODY}" fill="none" ${S}/>`)
  // Cara
  if (sunnies) {
    parts.push(shades(accent))
  } else {
    parts.push(eye(43, eyeL, -1, accent, eyeMode))
    parts.push(eye(77, eyeR, 1, accent, eyeMode))
  }
  parts.push(beak)
  if (mood === "sleepy") {
    // Las «z» van donde no tapen lo que sujeta con el ala derecha (la señal del metro sale por la izquierda).
    const zs =
      pose === "metro"
        ? `<text x="4" y="58" font-size="13">z</text><text x="-5" y="45" font-size="9">z</text>`
        : pose
          ? `<text x="8" y="30" font-size="13">z</text><text x="0" y="17" font-size="9">z</text>`
          : `<text x="96" y="30" font-size="13">z</text><text x="105" y="18" font-size="9">z</text>`
    parts.push(`<g fill="${accent}" font-family="Arial Black,Arial,sans-serif" font-weight="900">${zs}</g>`)
  }
  if (mood === "wink" && !sunnies && !pose) {
    // La chispa del guiño, junto al ojo cerrado (con una pose en la mano no se pinta: se pisaría con ella).
    parts.push(
      `<path d="M104 28.500 Q105.400 35.600 112.500 37 Q105.400 38.400 104 45.500 Q102.600 38.400 95.500 37 Q102.600 35.600 104 28.500 Z" fill="${GOLD}" stroke="${INK}" stroke-width="1.800" stroke-linejoin="round"/>`
    )
  }
  if (tipsy) {
    parts.push(
      `<text x="-6" y="24" font-size="10" fill="${GOLD}" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-style="italic">hic!</text>`
    )
  }
  if (party) {
    // De fiesta: rayitas de energía y dos gotas de sudor.
    parts.push(
      `<g stroke="${CREAM}" stroke-width="2.400" stroke-linecap="round" opacity=".85"><path d="M12 24 l6 4"/><path d="M5 38 l7 1"/><path d="M108 22 l-5 5"/><path d="M115 36 l-7 1"/></g><path d="M19 46 q-3.500 5 0 8 q3.500 -3 0 -8 z" fill="${CYAN}" stroke="${INK}" stroke-width="1.400" stroke-linejoin="round"/><path d="M103 50 q-3.500 5 0 8 q3.500 -3 0 -8 z" fill="${CYAN}" stroke="${INK}" stroke-width="1.400" stroke-linejoin="round"/>`
    )
  }
  if (pose) parts.push(poseArt(pose, accent))
  if (activeTheme) parts.push(themeFront(activeTheme, uid))
  // Borrachillo: ladeado hacia un lado. Festival: echado un poco hacia atrás.
  const tilt = tipsy ? 6 : hype ? -3 : 0
  const all = parts.join("")
  return tilt ? `<g transform="rotate(${tilt} 60 112)">${all}</g>` : all
}
