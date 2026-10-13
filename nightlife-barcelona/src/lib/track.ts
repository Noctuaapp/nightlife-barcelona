import { supabase } from "./supabase"

// Analítica propia de Noctua. Todo se guarda en la tabla `analytics`. No se guarda nada personal
// aparte de user_id (si hay sesión): el session_id es un valor aleatorio que vive solo mientras
// la pestaña está abierta (sessionStorage), sin cookies ni identificadores permanentes.

const SESSION_KEY = "noctua_session"
const SOURCE_KEY = "noctua_source"

function safeGet(store: Storage | undefined, key: string): string | null {
  try { return store ? store.getItem(key) : null } catch { return null }
}
function safeSet(store: Storage | undefined, key: string, value: string) {
  try { store?.setItem(key, value) } catch { /* modo privado: se ignora */ }
}

export function getSessionId(): string | null {
  if (typeof window === "undefined") return null
  let id = safeGet(window.sessionStorage, SESSION_KEY)
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now())
    safeSet(window.sessionStorage, SESSION_KEY, id)
  }
  return id
}

// Clasifica de dónde llega la visita: enlace de invitación (?ref=), campaña (utm_source),
// buscador, red social o directo. Se calcula una vez por sesión y se guarda.
export function getTrafficSource(): string {
  if (typeof window === "undefined") return "direct"
  const saved = safeGet(window.sessionStorage, SOURCE_KEY)
  if (saved) return saved

  const params = new URLSearchParams(window.location.search)
  let source = "direct"
  const utm = params.get("utm_source")
  if (params.get("ref")) source = "invite"
  else if (utm) source = utm.toLowerCase().slice(0, 40)
  else if (document.referrer) {
    try {
      const host = new URL(document.referrer).hostname.replace(/^www\./, "")
      if (host.endsWith("noctuaapp.com")) source = "direct"
      else if (/google\.|bing\.|duckduckgo\.|ecosia\.|yahoo\./.test(host)) source = "search"
      else if (/instagram\.|l\.instagram\./.test(host)) source = "instagram"
      else if (/tiktok\./.test(host)) source = "tiktok"
      else if (/facebook\.|fb\.|t\.co|twitter\.|x\.com/.test(host)) source = "social"
      else if (/whatsapp\.|wa\.me|telegram\./.test(host)) source = "messaging"
      else source = "other:" + host.slice(0, 40)
    } catch { /* referrer inválido */ }
  }
  safeSet(window.sessionStorage, SOURCE_KEY, source)
  return source
}

function deviceType(): string {
  if (typeof window === "undefined") return "unknown"
  return window.matchMedia && window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop"
}

type TrackOptions = {
  itemType?: string | null
  itemId?: number | string | null
  itemName?: string | null
  resultsCount?: number | null
  meta?: Record<string, unknown> | null
}

// Registra un evento. Nunca lanza error ni bloquea la interfaz: si falla, se ignora.
export async function track(eventType: string, opts: TrackOptions = {}) {
  try {
    if (typeof window === "undefined") return
    const { data } = await supabase.auth.getUser()
    await supabase.from("analytics").insert({
      event_type: eventType,
      item_type: opts.itemType ?? null,
      item_id: opts.itemId ?? null,
      item_name: opts.itemName ?? null,
      user_id: data.user?.id || null,
      session_id: getSessionId(),
      source: getTrafficSource(),
      device: deviceType(),
      locale: (document.documentElement.lang || navigator.language || "").slice(0, 8),
      path: window.location.pathname.slice(0, 120),
      results_count: opts.resultsCount ?? null,
      meta: opts.meta ?? null,
    })
  } catch {
    /* la analítica nunca debe romper la página */
  }
}
