// Mensajes de la portada (12/11/2026). Antes eran frases sueltas que rotaban en un chip («Sube de nivel en Club
// Noctua…»), sin título, sin enlace y sin sitio para nada que no fuera un consejo. Ahora cada mensaje tiene un TIPO
// y una forma común, para que el mismo bloque sirva mañana para otras cosas:
//
//   · tip     — consejo sobre algo que Noctua ya hace (lo de siempre). Con enlace a esa parte de la web.
//   · promo   — publicidad de temporada. Se enseña siempre con la etiqueta «Publi» y el nombre de quien la paga.
//   · vip     — mesas VIP: reservar mesa desde Noctua.
//   · notice  — aviso (algo que cambia, un local cerrado, una obra…).
//
// Para añadir uno que NO sea un consejo: se escribe en ANNOUNCEMENTS (más abajo) con su texto literal, fechas de
// inicio y fin y, si quieres, un botón. Sale solo entre esas fechas y va el primero de la rotación. Ejemplo:
//   { id: "vip-nochevieja", kind: "vip", title: "Mesas VIP para Nochevieja", text: { literal: "Reserva tu mesa…" },
//     cta: { label: "Reservar", href: "/vip" }, startsAt: "2026-12-01", endsAt: "2026-12-31" }
// Los consejos propios llevan su texto en las traducciones (homeTicker.*); los anuncios, texto literal (un idioma).

export type HomeMessageKind = "tip" | "promo" | "vip" | "notice"

export type HomeMessageText = { key: string } | { literal: string }

export type HomeMessage = {
  id: string
  kind: HomeMessageKind
  /** Texto principal: clave de traducción (consejos) o texto literal (anuncios). */
  text: HomeMessageText
  /** Título corto en negrita (solo anuncios; los consejos no lo llevan). */
  title?: string
  /** Botón: a dónde lleva. `external` abre en pestaña nueva. */
  cta?: { label?: HomeMessageText; href: string; external?: boolean }
  /** Nombre de quien paga el anuncio. Sale como «Publi · Nombre». */
  sponsor?: string
  /** Fechas (YYYY-MM-DD, hora de Madrid) entre las que se enseña. Sin fechas: siempre. */
  startsAt?: string
  endsAt?: string
  /** Solo se enseña si Club Noctua (niveles y XP) está activo para los visitantes. */
  needsClubNoctua?: boolean
  /** Días de la semana (hora de Madrid) en que se enseña: 0 = domingo … 6 = sábado. Sin esto: todos los días. */
  days?: number[]
}

const tip = (n: number, href?: string, needsClubNoctua = false, days?: number[]): HomeMessage => ({
  id: `tip-${n}`,
  kind: "tip",
  text: { key: `homeTicker.msg${n}` },
  ...(href ? { cta: { href } } : {}),
  ...(needsClubNoctua ? { needsClubNoctua: true } : {}),
  ...(days ? { days } : {}),
})

// Lunes a jueves: «entre semana». El viernes y el fin de semana la salida ya se da por hecha y el mensaje sobra.
const ENTRE_SEMANA = [1, 2, 3, 4]

// Consejos propios. Revisados el 12/11/2026: fuera los que ya no valían (eventos y agenda están cerrados,
// «Noctua está en construcción», «instala Noctua», que ahora tiene su propia franja arriba) y los repetidos.
export const TIPS: HomeMessage[] = [
  tip(1, "/club-noctua", true), // niveles y ventajas
  tip(2), // notas al hacer check-in
  tip(3, "/plan"), // planificar la noche
  tip(4), // Sorpréndeme (el botón está en la propia portada)
  tip(5, "/favorites"),
  tip(8), // el tiempo de esta noche
  tip(9, "/map"),
  tip(12, "/nitbus"),
  tip(27, "/nitbus"), // «mi trayecto»: dónde subo y dónde bajo
  tip(28, "/metro"), // a qué hora cierra el metro hoy
  tip(29, "/clubs", false, ENTRE_SEMANA), // «entre semana también apetece tomar algo»: solo de lunes a jueves
  tip(13), // abiertos ahora
  tip(14, "/derechos"),
  tip(15),
  tip(16, "/clubs"),
  tip(17, "/essentials"),
  tip(18),
  tip(19, "/para-locales"),
  tip(20, "/invitar", true),
  tip(22),
  tip(23, "/profile", true),
  tip(24, "/contact"),
  tip(26, "/essentials/sugerir"),
]

// Publicidad, mesas VIP y avisos. VACÍO a propósito: no se enseña nada que no se haya puesto aquí.
export const ANNOUNCEMENTS: HomeMessage[] = []

// Hora de Madrid como YYYY-MM-DD (las fechas de inicio y fin se escriben así).
function madridDay(now: Date): string {
  return now.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" })
}

// Día de la semana en Madrid: 0 = domingo … 6 = sábado.
export function madridWeekday(now: Date): number {
  const w = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", weekday: "short" }).format(now)
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(w)
}

export function isInWindow(m: Pick<HomeMessage, "startsAt" | "endsAt">, now: Date): boolean {
  const day = madridDay(now)
  if (m.startsAt && day < m.startsAt) return false
  if (m.endsAt && day > m.endsAt) return false
  return true
}

/**
 * Mensajes que toca enseñar ahora, en orden: primero los anuncios (avisos, mesas VIP, publi) y luego los
 * consejos. `shuffle` reparte los consejos (la portada lo usa con un aleatorio para que cada visita empiece
 * por uno distinto); los anuncios conservan el orden en que se escribieron.
 */
export function activeMessages(
  now: Date,
  opts: { clubNoctua: boolean; announcements?: HomeMessage[]; tips?: HomeMessage[]; shuffle?: <T>(items: T[]) => T[] }
): HomeMessage[] {
  const weekday = madridWeekday(now)
  const ok = (m: HomeMessage) =>
    isInWindow(m, now) && (!m.needsClubNoctua || opts.clubNoctua) && (!m.days || m.days.includes(weekday))
  const ann = (opts.announcements ?? ANNOUNCEMENTS).filter(ok)
  const tips = (opts.tips ?? TIPS).filter(ok)
  return [...ann, ...(opts.shuffle ? opts.shuffle(tips) : tips)]
}

export function shuffled<T>(items: T[], random: () => number = Math.random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
