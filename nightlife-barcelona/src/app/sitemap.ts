import type { MetadataRoute } from "next"
import { supabase } from "../lib/supabase"
import { createSlug } from "../lib/slug"
import type { DbRow } from "../lib/clubQueries"
import { MIN_INDEXABLE, neighborhoodsOf, stylesOf } from "../lib/areas"
import { isCityOpen } from "../lib/cities"
import { zoneLinks, zoneSlugByName } from "../lib/zonePages"
import { zoneOf } from "../lib/zones"
import { EVENTS_HIDDEN } from "../lib/featureFlags"
import { NIGHT_BUS_LINES } from "../lib/nightBuses"
import { METRO_LINE_CODES } from "../lib/metroLines"
import { clubsOfCity, fetchVisibleClubs, LIST_CLUB_FIELDS } from "../lib/clubQueries"
import { buildIntlSitemap, withSpanishAlternates } from "../lib/intl/sitemap"
import { isClubNoctuaOn } from "../lib/clubNoctuaServer"
import { withXmlSafeImages } from "../lib/sitemapXml"
import { selectAllPages } from "../lib/fetchAll"
import { scopeToCity } from "../lib/cityEssentials"
import { sitemapEssentialSlugs } from "../components/city/EssentialsCategoryServer"

const BASE_URL = "https://www.noctuaapp.com"

// Categorías fijas de /essentials/[category] — vienen de categoryConfig en esa página, no de una
// tabla, así que se listan aquí a mano en vez de consultarlas. Casino no se incluye (lleva noindex) y Hotel se
// retiró el 05/11/2026. Veterinario, aseos y máquinas se añaden aquí cuando tengan sitios verificados.
// parking (2/11/2026): parkings públicos gratuitos, con los clubs que quedan a pie desde cada uno.
const ESSENTIAL_CATEGORIES = [
  "pharmacy", "atm", "food", "transport", "metro", "nitbus", "taxi",
  "supermarket", "gas-station", "hospital", "parking",
]

// Antes no existía sitemap.xml: Google tenía que descubrir cada club y cada evento navegando
// enlace a enlace desde la home, lo que tarda semanas y deja fuera páginas nuevas o poco
// enlazadas. Con esto, cada club y evento visible (no oculto) queda declarado explícitamente.
// Se regenera cada hora (revalidate) para no golpear la base de datos en cada rastreo de Google.
// 05/11/2026: antes 3600 s. Subido a 6 h para gastar menos «ISR Writes» de Vercel (ver src/app/clubs/[slug]/page.tsx).
export const revalidate = 21600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/clubs`, changeFrequency: "daily", priority: 0.9 },
    // /events no se declara mientras Eventos esté oculto (ver featureFlags.ts).
    ...(EVENTS_HIDDEN ? [] : [{ url: `${BASE_URL}/events`, changeFrequency: "daily" as const, priority: 0.9 }]),
    { url: `${BASE_URL}/essentials`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/map`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/plan`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/para-locales`, changeFrequency: "monthly", priority: 0.4 },
    // /club-noctua se añade más abajo solo si Club Noctua está activo: en pausa lleva noindex (club-noctua/layout.tsx).
    { url: `${BASE_URL}/faq`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/derechos`, changeFrequency: "monthly", priority: 0.4 },
    // Nitbus: portada y una página por línea, con sus paradas en orden.
    { url: `${BASE_URL}/nitbus`, changeFrequency: "weekly", priority: 0.5 },
    ...Object.keys(NIGHT_BUS_LINES).map((code) => ({
      url: `${BASE_URL}/nitbus/${code}`,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
    // Metro: portada y una página por línea, con sus estaciones en orden.
    { url: `${BASE_URL}/metro`, changeFrequency: "monthly", priority: 0.5 },
    ...METRO_LINE_CODES.map((code) => ({
      url: `${BASE_URL}/metro/${code}`,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
    // /contact lleva noindex (contact/layout.tsx), así que no se declara aquí: Search Console lo avisaba como «excluida por noindex».
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
    // Los clubs llevan también ciudad y coordenadas: así se sabe de qué ciudad es cada uno (Barcelona y Madrid van por separado).
    const place = table === "clubs" ? ", city, latitude, longitude" : ""
    // Página a página: con Barcelona y Madrid hay más de 1.000 locales y una sola consulta se cortaría sin avisar.
    const all = (cols: string) => selectAllPages((from, to) => supabase.from(table).select(cols).eq("hidden", false).order("id").range(from, to))
    // También la foto: así Google indexa las imágenes de cada ficha (sitemap de imágenes).
    const withImage = await all(`${nameField}, slug, image${place}`)
    if (!withImage.error) return (withImage.data || []) as unknown as DbRow[]
    const withSlug = await all(`${nameField}, slug${place}`)
    if (!withSlug.error) return (withSlug.data || []) as unknown as DbRow[]
    const plain = await all(`${nameField}${place}`)
    return (plain.data || []) as unknown as DbRow[]
  }
  const [allClubs, events] = await Promise.all([load("clubs", "name"), load("events", "title")])
  // Fase E: Barcelona y Madrid van aparte. Los locales de Madrid solo entran en el sitemap cuando la ciudad está abierta
  // (mientras tanto sus páginas ni se enlazan ni se indexan). La ficha de cada local es /clubs/[slug] en las dos ciudades.
  const madridOpen = isCityOpen("madrid")
  const clubs = [...clubsOfCity(allClubs, "barcelona"), ...(madridOpen ? clubsOfCity(allClubs, "madrid") : [])]

  // Barrios y estilos para las páginas /barrio y /musica (solo los que tienen contenido suficiente).
  // Con ciudad y dirección (para saber de qué municipio es cada local); si alguna columna no existe,
  // se vuelve a pedir solo barrio y música para no perder las páginas de barrio y estilo.
  const pagedClubs = (cols: string) => selectAllPages((from, to) => supabase.from("clubs").select(cols).eq("hidden", false).order("id").range(from, to))
  const withPlace = await pagedClubs("neighborhood, music, city, address, latitude, longitude")
  const areaRows = withPlace.error ? (await pagedClubs("neighborhood, music")).data : withPlace.data
  const everyAreaClub = (areaRows || []) as DbRow[]
  const areaClubs = clubsOfCity(everyAreaClub, "barcelona")
  const madridAreaClubs = clubsOfCity(everyAreaClub, "madrid")
  const areaRoutes: MetadataRoute.Sitemap = [
    ...neighborhoodsOf(areaClubs)
      // Los municipios de fuera de Barcelona van por /zona (su /barrio redirige allí).
      .filter((n) => n.count >= MIN_INDEXABLE && !zoneSlugByName(zoneOf({ neighborhood: n.name })))
      .map((n) => ({ url: `${BASE_URL}/barrio/${n.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...stylesOf(areaClubs)
      .filter((s) => s.count >= MIN_INDEXABLE)
      .map((s) => ({ url: `${BASE_URL}/musica/${s.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    // Municipios fuera de Barcelona (Hospitalet, Badalona, Sant Feliu...) con locales suficientes.
    ...zoneLinks(areaClubs, MIN_INDEXABLE).map((z) => ({ url: `${BASE_URL}/zona/${z.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
  ]

  // Madrid (solo con la ciudad abierta): portada, listado, esenciales, mapa, plan, y un barrio y un estilo por cada uno con locales suficientes.
  const madridRoutes: MetadataRoute.Sitemap = madridOpen
    ? [
        { url: `${BASE_URL}/madrid`, changeFrequency: "daily", priority: 1 },
        { url: `${BASE_URL}/madrid/clubs`, changeFrequency: "daily", priority: 0.9 },
        { url: `${BASE_URL}/madrid/essentials`, changeFrequency: "weekly", priority: 0.6 },
        { url: `${BASE_URL}/madrid/map`, changeFrequency: "weekly", priority: 0.5 },
        { url: `${BASE_URL}/madrid/plan`, changeFrequency: "weekly", priority: 0.5 },
        ...neighborhoodsOf(madridAreaClubs)
          .filter((n) => n.count >= MIN_INDEXABLE)
          .map((n) => ({ url: `${BASE_URL}/madrid/barrio/${n.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
        ...stylesOf(madridAreaClubs)
          .filter((s) => s.count >= MIN_INDEXABLE)
          .map((s) => ({ url: `${BASE_URL}/madrid/musica/${s.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
      ]
    : []

  // Categorías de esenciales de Madrid con datos suficientes (solo con la ciudad abierta; se cuentan los publicados dentro de su rectángulo).
  if (madridOpen) {
    const placed = await selectAllPages<{ category: string | null }>((from, to) =>
      scopeToCity(supabase.from("essentials").select("category"), "madrid").order("id").range(from, to)
    )
    const counts: Record<string, number> = {}
    for (const r of placed.data || []) {
      const slug = String(r.category || "").trim().toLowerCase().replace(/\s+/g, "-")
      if (slug) counts[slug] = (counts[slug] || 0) + 1
    }
    for (const slug of sitemapEssentialSlugs("madrid", counts))
      madridRoutes.push({ url: `${BASE_URL}/madrid/essentials/${slug}`, changeFrequency: "weekly", priority: 0.5 })
  }

  // Noches de club de hoy en adelante (las pasadas llevan noindex).
  const today = new Date().toISOString().slice(0, 10)
  const { data: nights } = await supabase.from("club_events").select("id, date").gte("date", today)
  const nightRoutes: MetadataRoute.Sitemap = (nights || []).map((n) => ({
    url: `${BASE_URL}/club-event/${n.id}`,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }))

  const clubRoutes: MetadataRoute.Sitemap = clubs
    .filter((c) => c.slug || c.name)
    .map((c) => ({
      url: `${BASE_URL}/clubs/${c.slug || createSlug(c.name)}`,
      ...(typeof c.image === "string" && c.image.startsWith("http") ? { images: [c.image] } : {}),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))

  const eventRoutes: MetadataRoute.Sitemap = (EVENTS_HIDDEN ? ([] as typeof events) : events)
    .filter((e) => e.slug || e.title)
    .map((e) => ({
      url: `${BASE_URL}/event/${e.slug || createSlug(e.title)}`,
      ...(typeof e.image === "string" && e.image.startsWith("http") ? { images: [e.image] } : {}),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }))

  // Páginas en inglés, alemán, francés e italiano (/en, /de, /fr, /it) y su hreflang con las españolas gemelas
  // (lib/intl/sitemap.ts). Si esta consulta falla, el sitemap sigue saliendo sin ellas en vez de romperse.
  let intl: ReturnType<typeof buildIntlSitemap> | null = null
  try {
    const fullClubs = await fetchVisibleClubs(LIST_CLUB_FIELDS)
    intl = buildIntlSitemap({ clubs: fullClubs, busCodes: Object.keys(NIGHT_BUS_LINES), metroCodes: METRO_LINE_CODES })
  } catch {
    intl = null
  }

  const clubNoctuaRoutes: MetadataRoute.Sitemap = (await isClubNoctuaOn())
    ? [{ url: `${BASE_URL}/club-noctua`, changeFrequency: "monthly", priority: 0.4 }]
    : []

  const spanish = [...staticRoutes, ...madridRoutes, ...clubNoctuaRoutes, ...areaRoutes, ...clubRoutes, ...eventRoutes, ...nightRoutes]
  // Las direcciones de imagen se escapan al final (11/11/2026): Next las escribe tal cual y un «&» suelto (las fotos de
  // Unsplash llevan varios) dejaba el XML inválido, con 0 páginas leídas en Search Console. Ver lib/sitemapXml.ts.
  if (!intl) return withXmlSafeImages(spanish)
  return withXmlSafeImages([...withSpanishAlternates(spanish, intl.twins), ...intl.entries])
}
