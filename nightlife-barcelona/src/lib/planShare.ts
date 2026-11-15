// Datos que se mandan al servidor al compartir un plan o una votación, y el reparto del mensaje.
// Antes vivía dentro de SharePlanButton; se saca aquí para que la votación (PlanPollButton) use
// exactamente la misma limpieza: nada de enlaces ajenos ni textos kilométricos.

export type ShareStop = {
  kind: "club" | "event"
  title: string
  subtitle?: string
  time?: string
  image?: string | null
  href: string
}

export type CleanStop = {
  kind: "club" | "event"
  title: string
  subtitle: string
  time: string
  image: string | null
  href: string
}

/** Recorta y limpia las paradas (máx. `max`): solo enlaces internos, solo imágenes https. */
export function cleanShareStops(stops: ShareStop[], max = 8): CleanStop[] {
  return stops.slice(0, max).map((s) => ({
    kind: s.kind === "event" ? "event" : "club",
    title: String(s.title).slice(0, 80),
    subtitle: s.subtitle ? String(s.subtitle).slice(0, 80) : "",
    time: s.time ? String(s.time).slice(0, 12) : "",
    image: s.image && s.image.startsWith("https://") ? s.image.slice(0, 300) : null,
    // "//" sería un enlace a otra web disfrazado de ruta interna.
    href: s.href.startsWith("/") && !s.href.startsWith("//") ? s.href.slice(0, 200) : "",
  }))
}

/** Fecha de hoy en España (AAAA-MM-DD), que es la que lleva el plan. */
export function madridToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(now)
}
