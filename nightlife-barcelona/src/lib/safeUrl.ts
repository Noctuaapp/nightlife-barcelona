// Enlaces que escribe el admin o un dueño (entradas, web...): solo se aceptan http(s). Así un
// enlace tipo "javascript:..." metido en la ficha nunca llega a ejecutarse al pulsarlo
// (26/10/2026, revisión de seguridad). Sin "http" delante, se le añade "https://".
export function safeUrl(raw: string | null | undefined): string | null {
  const v = (raw || "").trim()
  if (!v) return null
  if (/^https?:\/\//i.test(v)) return v
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return null // otro esquema (javascript:, data:, mailto:...)
  return `https://${v.replace(/^\/+/, "")}`
}
