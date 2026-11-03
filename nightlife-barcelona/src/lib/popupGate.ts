import { useEffect, useState, useSyncExternalStore } from "react"

// Cola de avisos emergentes (03/11/2026).
//
// Antes, al entrar por primera vez salían a la vez el banner de cookies, la encuesta del día y el aviso
// de registro, cada uno por su cuenta y con su propio reloj. Ahora salen de uno en uno y en este orden:
//
//   1. Cookies (solo la primera vez, mientras no se ha decidido).
//   2. Encuesta del día.
//   3. Aviso de registro.
//
// Reglas:
//   · Nunca hay dos a la vez: la encuesta y el registro esperan a que el otro se cierre.
//   · El registro espera también a la encuesta si esta está a punto de salir («pendiente»).
//   · Entre un aviso que se cierra y el siguiente pasan GAP_MS segundos, para que no parezca una
//     ráfaga.
//   · El banner de cookies manda durante los primeros COOKIES_FIRST_MS segundos desde que sale. Si
//     la persona lo ignora, deja de bloquear: la encuesta o el registro pasan por delante y el
//     banner se esconde mientras tanto (sigue sin decidir, así que vuelve cuando se cierren).
//     Sin esta salida, quien nunca toca el banner no vería jamás ni la encuesta ni el registro.
//
// Cada aviso se anota aquí con setPopupState(); la encuesta y el registro preguntan con
// usePopupSlot() si les toca, y el banner de cookies con useCookiesYield() si debe esconderse.

export type PopupId = "cookies" | "poll" | "join"

export const COOKIES_FIRST_MS = 20_000
export const GAP_MS = 6_000

export type GateEntry = { open: boolean; pending: boolean; since: number }
export type GateState = { cookies: GateEntry; poll: GateEntry; join: GateEntry; lastClosedAt: number }

const emptyEntry = (): GateEntry => ({ open: false, pending: false, since: 0 })
export const emptyGate = (): GateState => ({ cookies: emptyEntry(), poll: emptyEntry(), join: emptyEntry(), lastClosedAt: 0 })

// ¿Puede salir ahora este aviso? Si no puede por culpa del tiempo (cookies recién salidas, pausa entre
// avisos), `retryAt` dice cuándo volver a mirar; si es por otro aviso abierto, es null y se vuelve a
// mirar cuando ese cambie. Función pura: se prueba sin navegador.
export function evaluateSlot(g: GateState, id: "poll" | "join", now: number): { ok: boolean; retryAt: number | null } {
  if (id === "poll" && g.join.open) return { ok: false, retryAt: null }
  if (id === "join" && (g.poll.open || g.poll.pending)) return { ok: false, retryAt: null }

  let retryAt: number | null = null
  if (g.cookies.open) {
    const until = g.cookies.since + COOKIES_FIRST_MS
    if (now < until) retryAt = until
  }
  if (g.lastClosedAt > 0) {
    const gapUntil = g.lastClosedAt + GAP_MS
    if (now < gapUntil) retryAt = Math.max(retryAt ?? 0, gapUntil)
  }
  return retryAt === null ? { ok: true, retryAt: null } : { ok: false, retryAt }
}

// El banner de cookies se esconde mientras la encuesta o el registro están en pantalla.
export const cookiesShouldYield = (g: GateState): boolean => g.poll.open || g.join.open

let gate: GateState = emptyGate()
let version = 0
const listeners = new Set<() => void>()

const notify = () => {
  version += 1
  listeners.forEach((l) => l())
}

export function setPopupState(id: PopupId, patch: { open?: boolean; pending?: boolean }, now: number = Date.now()): void {
  const cur = gate[id]
  const open = patch.open ?? cur.open
  const pending = patch.pending ?? cur.pending
  if (open === cur.open && pending === cur.pending) return
  const entry: GateEntry = { open, pending, since: open && !cur.open ? now : cur.since }
  gate = { ...gate, [id]: entry, lastClosedAt: cur.open && !open ? now : gate.lastClosedAt }
  notify()
}

// Solo para las pruebas.
export function resetPopupGate(): void {
  gate = emptyGate()
  notify()
}
export const readPopupGate = (): GateState => gate

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
const getVersion = () => version

// true cuando a este aviso le toca salir. Se vuelve a calcular solo cuando cambia otro aviso o cuando
// pasa el tiempo de espera.
export function usePopupSlot(id: "poll" | "join"): boolean {
  useSyncExternalStore(subscribe, getVersion, getVersion)
  const [, setTick] = useState(0)
  const { ok, retryAt } = evaluateSlot(gate, id, Date.now())
  useEffect(() => {
    if (ok || retryAt === null) return
    const timer = window.setTimeout(() => setTick((n) => n + 1), Math.max(0, retryAt - Date.now()) + 25)
    return () => window.clearTimeout(timer)
  }, [ok, retryAt])
  return ok
}

export function useCookiesYield(): boolean {
  useSyncExternalStore(subscribe, getVersion, getVersion)
  return cookiesShouldYield(gate)
}
