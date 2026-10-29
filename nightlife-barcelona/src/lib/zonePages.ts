import { ZONES, zoneOf } from "./zones"
import type { AreaLink } from "./areas"

// Páginas de zona (/zona/[slug]): una por municipio del área de Barcelona fuera de la ciudad
// (L'Hospitalet, Badalona, Sant Feliu...). La gente busca "discotecas en Hospitalet" o "bares en
// Badalona", y hasta ahora esos locales solo salían dentro del filtro de /clubs, que Google no ve.
// Las zonas salen de lib/zones.ts (la misma lógica que usan los filtros de la web).

// Slug corto y legible → nombre de la zona tal y como lo devuelve zoneOf().
export const ZONE_SLUGS: Record<string, string> = {
  hospitalet: "L'Hospitalet de Llobregat",
  badalona: "Badalona",
  "el-prat": "El Prat de Llobregat",
  cornella: "Cornellà de Llobregat",
  "sant-adria": "Sant Adrià de Besòs",
  "santa-coloma": "Santa Coloma de Gramenet",
  esplugues: "Esplugues de Llobregat",
  "sant-feliu": "Sant Feliu de Llobregat",
}

export function zoneNameBySlug(slug: string): string | null {
  return ZONE_SLUGS[slug] || null
}

export function zoneSlugByName(name: string): string | null {
  const hit = Object.entries(ZONE_SLUGS).find(([, zone]) => zone === name)
  return hit ? hit[0] : null
}

// Las zonas que tienen página (todas menos Barcelona, que es la web entera).
export const ZONE_PAGES = ZONES.filter((z) => z !== "Barcelona")

// Zonas fuera de Barcelona con locales suficientes para tener página propia, con su número de
// locales. Sirve para enlazarlas desde barrios, estilos y otras zonas (y para el sitemap).
export function zoneLinks(
  clubs: { city?: string | null; neighborhood?: string | null; address?: string | null }[],
  minClubs = 1
): AreaLink[] {
  const counts = new Map<string, number>()
  for (const c of clubs) {
    const z = zoneOf(c)
    if (z !== "Barcelona") counts.set(z, (counts.get(z) || 0) + 1)
  }
  const out: AreaLink[] = []
  for (const [slug, name] of Object.entries(ZONE_SLUGS)) {
    const count = counts.get(name) || 0
    if (count >= minClubs) out.push({ slug, name, count })
  }
  return out.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"))
}
