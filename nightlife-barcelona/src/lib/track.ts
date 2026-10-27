import { supabase } from "./supabase"
import { isAdminEmail } from "./admin"

// Analítica propia de Noctua. Todo se guarda en la tabla `analytics`. No se guarda nada personal
// aparte de user_id (si hay sesión). El session_id es un valor aleatorio que vive solo en memoria
// mientras la página está abierta: antes se guardaba en sessionStorage, y guardar un identificador
// de analítica en el navegador exige consentimiento previo (LSSI, art. 22.2). En memoria no se
// almacena nada en el dispositivo. Dura mientras se navega por la web; una recarga empieza otra.
//
// Desde el 27/10/2026 también acaba tras 30 minutos sin actividad: una web instalada como app en
// el móvil puede quedar horas o días en segundo plano SIN recargarse, y sin este corte todo ese
// tiempo contaba como una sola visita (duraciones larguísimas, falsas). Ahora, el primer evento
// después de un parón largo abre una visita nueva, con su propio "session_start".

let sessionId: string | null = null
let trafficSource: string | null = null
let sessionStarted = false
let lastActivity = 0
const SESSION_IDLE_MS = 30 * 60 * 1000

export function getSessionId(): string | null {
  if (typeof window === "undefined") return null
  if (!sessionId) sessionId = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()
  return sessionId
}

// true solo la primera vez por carga de página (para registrar un único "session_start").
export function markSessionStart(): boolean {
  if (sessionStarted) return false
  sessionStarted = true
  return true
}

// Clasifica de dónde llega la visita: enlace de invitación (?ref=), campaña (utm_source),
// buscador, red social o directo. Se calcula una vez por carga de página (en memoria).
function isStandalone(): boolean {
  try {
    return (
      (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches) ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    )
  } catch {
    return false
  }
}

// ignoreReferrer: tras un parón largo el referrer sigue siendo el de la primera carga (p. ej. Google),
// que ya no dice de dónde viene la persona ahora: solo cuentan los parámetros de la dirección.
export function getTrafficSource(ignoreReferrer = false): string {
  if (typeof window === "undefined") return "direct"
  if (trafficSource) return trafficSource

  const params = new URLSearchParams(window.location.search)
  let source = "direct"
  const utm = params.get("utm_source")
  if (params.get("ref")) source = "invite"
  else if (utm) source = utm.toLowerCase().slice(0, 40)
  // Abierta desde el icono de la app instalada (también cuando se reanuda tras un parón y la
  // dirección ya no lleva ?utm_source=pwa).
  else if (isStandalone()) source = "pwa"
  else if (document.referrer && !ignoreReferrer) {
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
  trafficSource = source
  return source
}

function deviceType(): string {
  if (typeof window === "undefined") return "unknown"
  return window.matchMedia && window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop"
}

// Robots y navegadores automatizados (Googlebot ejecuta JavaScript y disparaba eventos como si
// fuera una visita real, inflando las cifras que luego se quieren enseñar o vender).
const BOT_UA = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link|whatsapp|telegrambot|discordbot|preview|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime/i

function isAutomated(): boolean {
  try {
    if (navigator.webdriver) return true
    return BOT_UA.test(navigator.userAgent || "")
  } catch {
    return false
  }
}

// Lo que hace Jordi (el admin) no cuenta en las métricas (25/10/2026): ni búsquedas, ni clicks, ni
// visitas. Si hay sesión de admin no se registra nada, y además ese navegador queda marcado para
// que tampoco cuente cuando entra sin sesión (por ejemplo para ver la web "como un usuario").
// La marca es solo una exclusión de la analítica, no identifica a nadie.
const ADMIN_DEVICE_KEY = "noctua_no_analytics"

function isAdminDevice(): boolean {
  try {
    return window.localStorage.getItem(ADMIN_DEVICE_KEY) === "1"
  } catch {
    return false
  }
}

function markAdminDevice() {
  try {
    window.localStorage.setItem(ADMIN_DEVICE_KEY, "1")
  } catch {
    /* modo privado: da igual, con sesión ya se excluye */
  }
}

type TrackOptions = {
  itemType?: string | null
  itemId?: number | string | null
  itemName?: string | null
  resultsCount?: number | null
  meta?: Record<string, unknown> | null
}

// Solo cuenta la web publicada (26/10/2026). Antes también se registraba lo que se hacía en el
// ordenador de desarrollo (npm run dev, localhost) y en las versiones de prueba de Vercel
// (*.vercel.app), porque usan la misma base de datos: todo eso eran visitas de Jordi.
function isProductionSite(): boolean {
  try {
    return /(^|\.)noctuaapp\.com$/i.test(window.location.hostname)
  } catch {
    return false
  }
}

// Registra un evento. Nunca lanza error ni bloquea la interfaz: si falla, se ignora.
export async function track(eventType: string, opts: TrackOptions = {}) {
  try {
    if (typeof window === "undefined" || !isProductionSite() || isAutomated() || isAdminDevice()) return
    // getSession lee la sesión guardada en el navegador; getUser hacía una llamada de red extra a
    // Supabase por cada evento registrado.
    const { data } = await supabase.auth.getSession()
    if (isAdminEmail(data.session?.user.email)) {
      markAdminDevice()
      return
    }
    // Parón de más de 30 minutos: visita nueva (ver arriba). Se anota su entrada antes del evento.
    const now = Date.now()
    const resumed = lastActivity !== 0 && now - lastActivity > SESSION_IDLE_MS
    lastActivity = now
    if (resumed) {
      sessionId = null
      trafficSource = null
      getTrafficSource(true)
    }
    const write = (type: string, o: TrackOptions) =>
      supabase.from("analytics").insert({
        event_type: type,
        item_type: o.itemType ?? null,
        item_id: o.itemId ?? null,
        item_name: o.itemName ?? null,
        user_id: data.session?.user.id || null,
        session_id: getSessionId(),
        source: getTrafficSource(),
        device: deviceType(),
        locale: (document.documentElement.lang || navigator.language || "").slice(0, 8),
        path: window.location.pathname.slice(0, 120),
        results_count: o.resultsCount ?? null,
        meta: o.meta ?? null,
      })
    if (resumed && eventType !== "session_start") await write("session_start", { itemType: "site" })
    await write(eventType, opts)
  } catch {
    /* la analítica nunca debe romper la página */
  }
}
