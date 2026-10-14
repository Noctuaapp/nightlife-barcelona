import type { MetadataRoute } from "next"
import { supabase } from "../lib/supabase"
import { createSlug } from "../lib/slug"
import type { DbRow } from "../lib/clubQueries"

const BASE_URL = "https://www.noctuaapp.com"

// Categorías fijas de /essentials/[category] — vienen de categoryConfig en esa página, no de una
// tabla, así que se listan aquí a mano en vez de consultarlas.
const ESSENTIAL_CATEGORIES = [
  "pharmacy", "atm", "food", "transport", "metro", "nitbus", "taxi",
  "supermarket", "hotel", "casino", "gas-station", "hospital",
]

// Antes no existía sitemap.xml: Google tenía que descubrir cada club y cada evento navegando
// enlace a enlace desde la home, lo que tarda semanas y deja fuera páginas nuevas o poco
// enlazadas. Con esto, cada club y evento visible (no oculto) queda declarado explícitamente.
// Se regenera cada hora (revalidate) para no golpear la base de datos en cada rastreo de Google.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/clubs`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/events`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/essentials`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/map`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/club-noctua`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/faq`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/contact`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    ...ESSENTIAL_CATEGORIES.map((cat) => ({
      url: `${BASE_URL}/essentials/${cat}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ]

  // Se usa el slug guardado en la base de datos (la URL canónica). Si la columna aún no existe,
  // la consulta falla y se vuelve a pedir solo el nombre, como antes.
  const load = async (table: "clubs" | "events", nameField: "name" | "title") => {
    const withSlug = await supabase.from(table).select(`${nameField}, slug`).eq("hidden", false)
    if (!withSlug.error) return (withSlug.data || []) as unknown as DbRow[]
    const plain = await supabase.from(table).select(nameField).eq("hidden", false)
    return (plain.data || []) as unknown as DbRow[]
  }
  const [clubs, events] = await Promise.all([load("clubs", "name"), load("events", "title")])

  const clubRoutes: MetadataRoute.Sitemap = clubs
    .filter((c) => c.slug || c.name)
    .map((c) => ({
      url: `${BASE_URL}/clubs/${c.slug || createSlug(c.name)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))

  const eventRoutes: MetadataRoute.Sitemap = events
    .filter((e) => e.slug || e.title)
    .map((e) => ({
      url: `${BASE_URL}/event/${e.slug || createSlug(e.title)}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }))

  return [...staticRoutes, ...clubRoutes, ...eventRoutes]
}
