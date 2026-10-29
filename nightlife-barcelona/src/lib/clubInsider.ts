// Bloque «Antes de ir» de la ficha del club (29/10/2026): lo mejor, ojo con esto, consejo, hora
// punta y público. Son cinco campos de texto de la tabla clubs (ver supabase/52_antes_de_ir.sql),
// vacíos hasta que el admin o el dueño del local los escribe. Regla de la casa: si no hay nada
// escrito, no se enseña nada.

export const INSIDER_MAX_LINES = 5
export const INSIDER_MAX_CHARS = 220

type Row = Record<string, unknown>

// «Una frase por línea». Quita viñetas escritas a mano («- », «• »…) pero no un guion pegado al
// texto («-18 años»), recorta cada frase y se queda con las primeras cinco.
export function insiderLines(raw: unknown): string[] {
  if (typeof raw !== "string") return []
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-–—•*·]\s+/, "").trim())
    .filter(Boolean)
    .map((line) => (line.length > INSIDER_MAX_CHARS ? `${line.slice(0, INSIDER_MAX_CHARS - 1).trimEnd()}…` : line))
    .slice(0, INSIDER_MAX_LINES)
}

// Texto suelto (consejo, hora punta, público): una sola línea de texto limpia.
export function insiderText(raw: unknown): string {
  if (typeof raw !== "string") return ""
  const text = raw.replace(/\s+/g, " ").trim()
  return text.length > INSIDER_MAX_CHARS ? `${text.slice(0, INSIDER_MAX_CHARS - 1).trimEnd()}…` : text
}

export type ClubInsiderData = {
  best: string[]
  watch: string[]
  tip: string
  peak: string
  audience: string
}

export function clubInsider(club: Row | null | undefined): ClubInsiderData {
  const c = club || {}
  return {
    best: insiderLines(c.highlights),
    watch: insiderLines(c.watchouts),
    tip: insiderText(c.tip),
    peak: insiderText(c.peak_hours),
    audience: insiderText(c.audience),
  }
}

export function hasInsider(club: Row | null | undefined): boolean {
  const d = clubInsider(club)
  return d.best.length > 0 || d.watch.length > 0 || !!d.tip || !!d.peak || !!d.audience
}
