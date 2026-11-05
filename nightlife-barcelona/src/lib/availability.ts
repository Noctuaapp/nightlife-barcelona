// «Disponible ahora» de los esenciales (05/11/2026). UNA función que dice en qué estado está un sitio,
// en vez de que cada página interprete el horario a su manera.
//
// Seis estados (ver la propuesta de Esenciales):
//   always         siempre accesible, sin horario (fuente, parada de taxi, parking)
//   open_verified  abierto, y alguien de Noctua o una fuente oficial ha confirmado el horario hace poco
//   open_listed    abierto según el horario del directorio (OpenStreetMap, Google) sin verificar por
//                  nosotros. Solo en categorías con trust «directory»: es lo que se hacía hasta hoy
//   on_call        solo por llamada (urgencias veterinarias por cita o derivación)
//   unverified     horario desconocido, ilegible o caducado; o abierto según un horario sin verificar en
//                  una categoría «strict». NO cuenta como disponible: «llama antes de ir»
//   closed         horario conocido y fuera de franja
//
// El horario de texto de siempre (open_hours, en inglés) lo sigue interpretando openStatus.ts: aquí
// solo se añade la confianza en el dato. Así las categorías de siempre se ven igual que antes.

import { getOpenStatus } from "./openStatus"
import { categoryInfo } from "./essentialCategories"

export type AvailabilityState = "always" | "open_verified" | "open_listed" | "on_call" | "unverified" | "closed"
export type AvailabilityTone = "open" | "warn" | "neutral" | "closed"

export type AvailabilityInput = {
  category: string | null | undefined
  open_hours?: string | null
  is_24h?: boolean | null
  phone?: string | null // con teléfono se dice «llama antes de ir»; sin él, solo «sin confirmar»
  verification_status?: string | null
  last_verified_at?: string | null
  attrs?: Record<string, unknown> | null
}

export type Availability = {
  state: AvailabilityState
  label: string // vacío = no hay nada útil que decir
  tone: AvailabilityTone
  soon: boolean // abierto pero cierra en menos de una hora
  counts: boolean // entra en «Disponible ahora»
  verified: boolean // la verificación existe y no ha caducado
}

type Translate = (key: string) => string

const ES: Record<string, string> = {
  unverified: "Horario sin confirmar · llama antes de ir",
  unverifiedShort: "Horario sin confirmar",
  onCall: "Urgencias por llamada",
}
function L(tr: Translate | undefined, key: string): string {
  const k = `availability.${key}`
  const v = tr ? tr(k) : ES[key]
  return v === k ? ES[key] : v
}

const DAY_MS = 86_400_000

// ¿La verificación existe, es de «verified» y no ha pasado el plazo de su categoría?
export function isVerificationCurrent(input: Pick<AvailabilityInput, "category" | "verification_status" | "last_verified_at">, now: Date = new Date()): boolean {
  if (input.verification_status !== "verified" || !input.last_verified_at) return false
  const at = Date.parse(input.last_verified_at)
  if (!isFinite(at)) return false
  const ageDays = (now.getTime() - at) / DAY_MS
  if (ageDays < 0) return true // fecha en el futuro por desfase de reloj: no se penaliza
  return ageDays <= categoryInfo(input.category || "").expiryDays
}

// Días desde la última verificación (null si no hay).
export function verificationAgeDays(last_verified_at: string | null | undefined, now: Date = new Date()): number | null {
  if (!last_verified_at) return null
  const at = Date.parse(last_verified_at)
  if (!isFinite(at)) return null
  return Math.max(0, Math.floor((now.getTime() - at) / DAY_MS))
}

export function availabilityOf(input: AvailabilityInput, tr?: Translate, now: Date = new Date()): Availability {
  const info = categoryInfo(input.category || "")
  const verified = isVerificationCurrent(input, now)
  // «Llama antes de ir» solo si hay a quién llamar (un aseo o una máquina no tienen teléfono).
  const unverifiedLabel = L(tr, input.phone && input.phone.trim() ? "unverified" : "unverifiedShort")

  if ((input.attrs as { service?: unknown } | null | undefined)?.service === "on_call" || info.availability === "on_call") {
    return { state: "on_call", label: L(tr, "onCall"), tone: "warn", soon: false, counts: false, verified }
  }

  if (info.availability === "always") {
    return { state: "always", label: "", tone: "neutral", soon: false, counts: true, verified }
  }

  const raw = getOpenStatus(input.is_24h ? "Open 24 hours" : input.open_hours, tr)

  if (raw.state === "closed") {
    return { state: "closed", label: raw.label, tone: "closed", soon: false, counts: false, verified }
  }

  if (raw.state === "open") {
    if (verified) return { state: "open_verified", label: raw.label, tone: raw.soon ? "warn" : "open", soon: raw.soon, counts: true, verified }
    if (info.trust === "directory") return { state: "open_listed", label: raw.label, tone: raw.soon ? "warn" : "open", soon: raw.soon, counts: true, verified }
    return { state: "unverified", label: unverifiedLabel, tone: "warn", soon: false, counts: false, verified }
  }

  // Horario desconocido o ilegible. En las categorías de siempre no se dice nada (como hasta ahora);
  // en las estrictas sí: no sabemos si está abierto y se dice.
  if (info.trust === "strict") return { state: "unverified", label: unverifiedLabel, tone: "warn", soon: false, counts: false, verified }
  return { state: "unverified", label: raw.label, tone: "neutral", soon: false, counts: false, verified }
}

// Clase de color para la etiqueta de estado (mismos tokens que el resto de la web).
export function availabilityClass(a: Availability): string {
  if (a.tone === "open") return "text-open"
  if (a.tone === "warn") return "text-warn"
  return "text-zinc-400"
}
