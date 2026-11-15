// Votación del plan en grupo («Elegid entre estos sitios»). Funciones puras (sin red ni pantalla) para
// poder probarlas: leer lo que devuelve el servidor, decidir quién va ganando, el código de voto de
// cada móvil y la lista de sitios entre los que se puede elegir.
//
// El servidor es supabase/119_plan_votacion_en_grupo.sql: night_plan_poll_state() y vote_night_plan().

import type { ShareStop } from "./planShare"

export const POLL_MIN = 2
export const POLL_MAX = 5
export const POLL_NAME_MAX = 30

export type PollOption = { idx: number; votes: number; voters: string[] }
export type PollState = {
  total: number
  /** Opción que ha votado esta persona (por el código de su móvil), o null. */
  mine: number | null
  options: PollOption[]
}

const toInt = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
}

/** Lee la respuesta del servidor. Devuelve null si no es una votación (plan de siempre, o error). */
export function parsePollState(raw: unknown): PollState | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  if (r.mode !== "vote" || !Array.isArray(r.options)) return null
  const options: PollOption[] = r.options.map((o, i) => {
    const x = (o && typeof o === "object" ? o : {}) as Record<string, unknown>
    return {
      idx: x.idx === undefined ? i : toInt(x.idx),
      votes: toInt(x.votes),
      voters: Array.isArray(x.voters) ? x.voters.filter((n): n is string => typeof n === "string").slice(0, 12) : [],
    }
  })
  const mine = r.mine === null || r.mine === undefined ? null : toInt(r.mine)
  return { total: toInt(r.total), mine: mine !== null && mine < options.length ? mine : null, options }
}

/** Posiciones que van ganando (más de uno si hay empate). Vacío si todavía no ha votado nadie. */
export function leadingIdx(state: PollState): number[] {
  const max = Math.max(0, ...state.options.map((o) => o.votes))
  if (max === 0) return []
  return state.options.filter((o) => o.votes === max).map((o) => o.idx)
}

/** Porcentaje de votos de una opción (0 si no ha votado nadie). */
export function votePercent(votes: number, total: number): number {
  return total > 0 ? Math.round((votes / total) * 100) : 0
}

/** Nombre como lo acepta el servidor: sin caracteres de control, recortado, máx. 30. */
export function cleanVoterName(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, POLL_NAME_MAX)
}

// --- Código de voto del móvil -------------------------------------------------------------------------
// Una persona = un voto, sin cuenta: cada móvil guarda un código al azar (no sale de nada suyo) que solo
// sirve para cambiar su propio voto. Se guarda porque la persona lo pide al votar (igual que el nombre al
// apuntarse). Si el móvil no deja guardar, el código vale solo para esa visita.

const TOKEN_KEY = "noctua_voter"
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export function newToken(): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined
  if (c && typeof c.randomUUID === "function") return c.randomUUID()
  const b = new Uint8Array(16)
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(b)
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

let memoryToken: string | null = null

/** El código que ya tiene este móvil, sin crear uno (para ver el recuento y saber qué votó antes). */
export function peekVoterToken(): string | null {
  try {
    const saved = localStorage.getItem(TOKEN_KEY)
    if (saved && UUID_RE.test(saved)) return saved
  } catch {
    /* almacenamiento bloqueado */
  }
  return memoryToken
}

/** El código de este móvil; si no tiene, lo crea y lo guarda (solo se llama al votar). */
export function getVoterToken(): string {
  try {
    const saved = localStorage.getItem(TOKEN_KEY)
    if (saved && UUID_RE.test(saved)) return saved
    const fresh = newToken()
    localStorage.setItem(TOKEN_KEY, fresh)
    return fresh
  } catch {
    if (!memoryToken) memoryToken = newToken()
    return memoryToken
  }
}

// --- Sitios entre los que se puede elegir --------------------------------------------------------------

/** Quita repetidos (por enlace) y se queda con `max` sitios, respetando el orden. */
export function pollCandidates(lists: ShareStop[][], max = 8): ShareStop[] {
  const seen = new Set<string>()
  const out: ShareStop[] = []
  for (const list of lists) {
    for (const s of list) {
      const key = s.href || s.title
      if (!s.title || seen.has(key)) continue
      seen.add(key)
      out.push(s)
      if (out.length >= max) return out
    }
  }
  return out
}

/** Primeros sitios marcados al abrir el selector (3 si hay, o los que haya). */
export function defaultPick(total: number): number[] {
  return Array.from({ length: Math.min(3, total) }, (_, i) => i)
}
