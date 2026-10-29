// Permiso para guardar cosas opcionales en el dispositivo (banner de cookies, 30/10/2026).
//
// Qué se guarda SIN pedir permiso (es imprescindible o lo ha elegido la propia persona): la sesión
// de la cuenta, el idioma, y la propia decisión de este banner. La analítica de Noctua tampoco
// guarda nada en el dispositivo (ver lib/track.ts).
//
// Qué solo se guarda CON permiso: la marca que recuerda qué se votó en la encuesta del día
// («¿Qué prefieres?») cuando no hay cuenta, para no repetirla (lib/partyPollLocal.ts). Si hay que
// añadir otra cosa opcional en el futuro, su clave va en OPTIONAL_KEYS: al rechazar o retirar el
// permiso se borran todas.
//
// Hay una sola categoría opcional a propósito: con una sola, «Aceptar» y «Rechazar» son todo lo que
// hace falta, sin pantallas de configuración.

export const CONSENT_KEY = "noctua_consent"
export const POLL_VOTES_KEY = "noctua_poll_votes"
export const OPTIONAL_KEYS: string[] = [POLL_VOTES_KEY]

// Se emite al guardar una decisión (para que banner y encuesta se enteren) y, la segunda, para que
// el enlace del pie de página vuelva a abrir el banner.
export const CONSENT_CHANGE_EVENT = "noctua-consent-change"
export const OPEN_CONSENT_EVENT = "noctua-open-consent"

const CONSENT_VERSION = 1

export type Consent = { v: 1; optional: boolean; at: string }
export type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">

export function parseConsent(raw: string | null | undefined): Consent | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw)
    if (o && typeof o === "object" && o.v === CONSENT_VERSION && typeof o.optional === "boolean") {
      return { v: CONSENT_VERSION, optional: o.optional, at: typeof o.at === "string" ? o.at : "" }
    }
  } catch {
    /* texto roto: se trata como "sin decidir" */
  }
  return null
}

// Si el navegador no deja guardar (modo privado, sitio bloqueado), la decisión vive en memoria
// mientras la pestaña esté abierta; al recargar se vuelve a preguntar.
let memory: Consent | null = null

function defaultStore(): KeyValueStore | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null
  } catch {
    return null
  }
}

// store: solo para pruebas. Sin él se usa el almacenamiento del navegador (con la memoria de respaldo).
export function readConsent(store?: KeyValueStore | null): Consent | null {
  try {
    const c = parseConsent((store ?? defaultStore())?.getItem(CONSENT_KEY))
    if (c) return c
  } catch {
    /* sin acceso al almacenamiento */
  }
  return store ? null : memory
}

export function hasOptionalConsent(store?: KeyValueStore | null): boolean {
  return readConsent(store)?.optional === true
}

export function saveConsent(optional: boolean, store?: KeyValueStore | null, now: Date = new Date()): Consent {
  const consent: Consent = { v: CONSENT_VERSION, optional, at: now.toISOString() }
  if (!store) memory = consent
  const s = store ?? defaultStore()
  try {
    s?.setItem(CONSENT_KEY, JSON.stringify(consent))
  } catch {
    /* sin acceso al almacenamiento: queda la copia en memoria */
  }
  // Sin permiso no se queda nada opcional guardado (tampoco lo que hubiera de antes).
  if (!optional) {
    for (const key of OPTIONAL_KEYS) {
      try {
        s?.removeItem(key)
      } catch {
        /* ídem */
      }
    }
  }
  if (!store && typeof window !== "undefined") window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT))
  return consent
}
