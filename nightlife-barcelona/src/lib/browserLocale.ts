// Idioma inicial de quien entra por primera vez (10/11/2026). Antes la web arrancaba siempre en español y el
// turista tenía que encontrar el selector de idioma del menú; ahora se mira el idioma del navegador:
//   · uno de los 8 que tiene la web → ese;
//   · euskera, gallego, aranés… (gente que entiende el español) → español;
//   · cualquier otro (japonés, ruso, árabe, chino…) → inglés, que es lo que más turistas entienden;
//   · sin dato → español, como siempre.
// Solo se usa cuando la persona NO ha elegido idioma a mano: lo elegido (guardado en este dispositivo) manda siempre.
export type SiteLocale = "es" | "en" | "ca" | "fr" | "de" | "it" | "nl" | "pt"

export const SITE_LOCALES: SiteLocale[] = ["es", "en", "ca", "fr", "de", "it", "nl", "pt"]

// Lenguas de España cuyos hablantes se manejan en español.
const SPANISH_SPEAKING = new Set(["eu", "gl", "oc", "an", "ast"])

export function pickLocaleFromBrowser(languages: readonly string[] | null | undefined): SiteLocale {
  if (!languages || languages.length === 0) return "es"
  for (const lang of languages) {
    const primary = String(lang || "").toLowerCase().split(/[-_]/)[0]
    if (!primary) continue
    if ((SITE_LOCALES as string[]).includes(primary)) return primary as SiteLocale
    if (SPANISH_SPEAKING.has(primary)) return "es"
  }
  return "en"
}

// Robots y navegadores automatizados se quedan en español: Googlebot ejecuta JavaScript con «en-US», y si
// la página cambiara de idioma al cargar, lo que indexa no sería lo que se sirve (y las capturas de pruebas
// tampoco cambiarían de idioma de un día para otro).
const BOT_UA = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link|whatsapp|telegrambot|discordbot|preview|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime/i

export function detectBrowserLocale(): SiteLocale {
  try {
    if (typeof navigator === "undefined") return "es"
    if (navigator.webdriver || BOT_UA.test(navigator.userAgent || "")) return "es"
    return pickLocaleFromBrowser(navigator.languages && navigator.languages.length > 0 ? navigator.languages : [navigator.language])
  } catch {
    return "es"
  }
}
