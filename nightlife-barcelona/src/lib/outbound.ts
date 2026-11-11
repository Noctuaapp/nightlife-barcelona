// Dominio al que lleva un enlace de salida (entradas, web del local...), sin «www.» y en minúsculas, para saber
// a qué webs va la gente cuando sale de Noctua (11/11/2026, Admin › Datos › Clics y tiempo). Solo el dominio:
// nunca la dirección completa, que puede llevar códigos de compra o de sesión. null si no es una dirección válida.
export function outboundHost(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.protocol !== "http:" && u.protocol !== "https:") return null
    const host = u.hostname.toLowerCase().replace(/^www\./, "")
    return host ? host.slice(0, 80) : null
  } catch {
    return null
  }
}
