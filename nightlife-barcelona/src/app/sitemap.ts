import type { MetadataRoute } from "next"
import { supabase } from "../lib/supabase"
import { createSlug } from "../lib/slug"

const BASE_URL = "https://noctuaapp.com"

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
    ...ESSENTIAL_CATEGORIES.map((cat) => ({
      url: `${BASE_URL}/essentials/${cat}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ]

  const [{ data: clubs }, { data: events }] = await Promise.all([
    supabase.from("clubs").select("name").eq("hidden", false),
    supabase.from("events").select("title").eq("hidden", false),
  ])

  const clubRoutes: MetadataRoute.Sitemap = (clubs || [])
    .filter((c) => c.name)
    .map((c) => ({
      url: `${BASE_URL}/clubs/${createSlug(c.name)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))

  const eventRoutes: MetadataRoute.Sitemap = (events || [])
    .filter((e) => e.title)
    .map((e) => ({
      url: `${BASE_URL}/event/${createSlug(e.title)}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }))

  return [...staticRoutes, ...clubRoutes, ...eventRoutes]
}
