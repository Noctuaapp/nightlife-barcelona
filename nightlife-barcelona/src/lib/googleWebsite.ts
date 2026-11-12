// Web y redes de un local a partir del enlace que Google tiene en su ficha (`websiteUri`) — 12/11/2026.
// Muchos locales de ocio nocturno ponen en Google su Instagram como «web»: en ese caso el enlace es su
// Instagram y no una web, así que se guarda donde toca. Nunca se inventa nada: solo se aprovecha lo que
// Google devuelve, y quien lo use solo debe rellenar campos que estén vacíos.

export type GoogleSocials = { website?: string; instagram?: string; tiktok?: string }

// Rutas de Instagram que NO son un perfil (publicaciones, explorar, etc.).
const IG_NOT_PROFILE = new Set(["p", "reel", "reels", "tv", "stories", "explore", "accounts", "about", "direct", "s", "web"])

function cleanUrl(u: URL): string {
  // Fuera los parámetros de seguimiento (utm_*, fbclid…) y el «#»; el resto de la dirección se respeta.
  const keep = new URLSearchParams()
  u.searchParams.forEach((v, k) => {
    if (!/^(utm_|fbclid|gclid|igshid|mc_)/i.test(k)) keep.append(k, v)
  })
  const q = keep.toString()
  const path = u.pathname === "/" ? "" : u.pathname.replace(/\/+$/, "")
  return `${u.protocol}//${u.host}${path}${q ? `?${q}` : ""}`
}

export function classifyGoogleWebsite(raw: string | null | undefined): GoogleSocials {
  const v = (raw || "").trim()
  if (!v || v.length > 500) return {}
  let u: URL
  try {
    u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
  } catch {
    return {}
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return {}
  const host = u.hostname.toLowerCase().replace(/^(www\.|m\.)/, "")
  if (!host.includes(".")) return {}

  if (host === "instagram.com" || host === "instagr.am") {
    const handle = u.pathname.split("/").filter(Boolean)[0]
    if (!handle || IG_NOT_PROFILE.has(handle.toLowerCase())) return {}
    if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) return {}
    return { instagram: `@${handle}` }
  }
  if (host === "tiktok.com") {
    const first = u.pathname.split("/").filter(Boolean)[0] || ""
    const handle = first.replace(/^@/, "")
    if (!first.startsWith("@") || !/^[A-Za-z0-9._]{1,30}$/.test(handle)) return {}
    return { tiktok: `@${handle}` }
  }
  // Una página de Facebook no es la web del local: se deja sin guardar en vez de ponerla como «web».
  if (host === "facebook.com" || host === "fb.com" || host === "fb.me") return {}
  // Enlaces de reserva o de mapas de Google no son su web.
  if (host === "google.com" || host.endsWith(".google.com") || host === "goo.gl" || host === "g.page") return {}

  return { website: cleanUrl(u) }
}
