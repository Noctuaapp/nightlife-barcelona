import type { Metadata } from "next"
import { supabase } from "../../../lib/supabase"
import { cleanEssential } from "../../../lib/essentials"
import { ESSENTIAL_CATEGORIES } from "../../../lib/essentialCategories"

// Título y descripción propios por categoría. Antes las 12 páginas de esenciales compartían el
// título de la portada, y Google las veía como duplicadas (parte de "Rastreada: sin indexar").
const META: Record<string, { title: string; description: string }> = {
  pharmacy: { title: "Farmacias de guardia y 24 h en Barcelona", description: "Farmacias abiertas ahora y de guardia por la noche en Barcelona, con mapa y cómo llegar." },
  atm: { title: "Cajeros automáticos en Barcelona", description: "Cajeros cerca de ti en Barcelona y cuáles evitar por sus comisiones." },
  food: { title: "Comer de madrugada en Barcelona", description: "Sitios para comer abiertos tarde en Barcelona: kebabs, pizzerías y comida rápida nocturna." },
  transport: { title: "Transporte nocturno en Barcelona", description: "Cómo moverte de noche por Barcelona: metro, NitBus, taxi y aeropuerto." },
  metro: { title: "Horario del metro de Barcelona por la noche", description: "Hasta qué hora funciona hoy el metro de Barcelona y estaciones cerca de ti." },
  nitbus: { title: "NitBus: autobuses nocturnos de Barcelona", description: "Líneas y paradas del NitBus para volver a casa de noche en Barcelona." },
  taxi: { title: "Taxi de noche en Barcelona", description: "Paradas de taxi, teléfonos y apps para pedir un taxi de noche en Barcelona." },
  // 29/10/2026: era la página con más impresiones en Google (2.456) y solo 8 clics; la gente busca
  // "supermercado 24 horas", y el título no lo decía.
  supermarket: { title: "Supermercados 24 h y abiertos de noche en Barcelona", description: "Supermercados abiertos 24 horas y hasta tarde en Barcelona, con mapa, horarios y cuáles están abiertos ahora." },
  hotel: { title: "Hoteles cerca de la fiesta en Barcelona", description: "Hoteles cerca de las zonas de ocio nocturno de Barcelona." },
  casino: { title: "Casinos en Barcelona", description: "Casinos y salas de juego en Barcelona: horarios y cómo llegar." },
  "gas-station": { title: "Gasolineras 24 h en Barcelona", description: "Gasolineras abiertas por la noche en Barcelona." },
  hospital: { title: "Urgencias y hospitales en Barcelona", description: "Hospitales con urgencias 24 h en Barcelona y cómo llegar." },
}

// Las 12 categorías se generan al compilar (antes cada visita se renderizaba de cero) y cualquier
// otra URL (/essentials/loquesea) da un 404 real en vez de una página vacía con código 200.
export function generateStaticParams() {
  return Object.keys(META).map((category) => ({ category }))
}
export const dynamicParams = false

// La lista de cada categoría la pinta el navegador después de cargar, así que Google veía una página
// casi vacía ("Cargando…"). El texto de abajo se genera en el servidor con los datos reales y se
// refresca cada hora.
export const revalidate = 3600

// Hoteles y casinos se mantienen accesibles, pero no se promocionan ni se piden indexar: no son
// "esenciales" de la noche y diluyen la relevancia del resto para Google.
const NOINDEX = new Set(["hotel", "casino"])

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params
  const meta = META[category]
  if (!meta) return { title: "Esenciales | Noctua" }
  return {
    title: `${meta.title} | Noctua`,
    description: meta.description,
    alternates: { canonical: `https://www.noctuaapp.com/essentials/${category}` },
    ...(NOINDEX.has(category) ? { robots: { index: false, follow: true } } : {}),
  }
}

// Categorías donde tiene sentido el texto de abajo (las que la gente busca como "X 24 horas").
type Block = {
  h2: string
  noun: string // plural, para la frase de introducción
  intro: string // qué hacer con la lista de arriba
  listTitle: string
  faqQuestion: string
  faqTail: string // aviso final de la respuesta
}
const BLOCKS: Record<string, Block> = {
  supermarket: {
    h2: "Supermercados 24 horas y abiertos de noche en Barcelona",
    noun: "supermercados y tiendas de alimentación",
    intro: "Sirven para comprar bebida, hielo o algo de picar antes o después de salir. El listado de arriba marca cuáles están abiertos ahora y cuáles te quedan cerca.",
    listTitle: "Supermercados abiertos 24 horas",
    faqQuestion: "¿Hay supermercados abiertos 24 horas en Barcelona?",
    faqTail: "Los horarios pueden cambiar: mira siempre el estado «abierto ahora» del listado.",
  },
  pharmacy: {
    h2: "Farmacias de guardia y 24 horas en Barcelona",
    noun: "farmacias",
    intro: "Si te hace falta algo de madrugada, el listado de arriba te dice cuáles están abiertas ahora y cuál te queda más cerca.",
    listTitle: "Farmacias abiertas 24 horas",
    faqQuestion: "¿Qué farmacias abren las 24 horas en Barcelona?",
    faqTail: "Las farmacias de guardia rotan por turnos: confirma el horario antes de ir.",
  },
  "gas-station": {
    h2: "Gasolineras 24 horas en Barcelona",
    noun: "gasolineras",
    intro: "Para repostar o comprar algo de madrugada. El listado de arriba marca cuáles están abiertas ahora y cuál te queda más cerca.",
    listTitle: "Gasolineras abiertas 24 horas",
    faqQuestion: "¿Dónde repostar de madrugada en Barcelona?",
    faqTail: "Los horarios pueden cambiar: mira siempre el estado «abierto ahora» del listado.",
  },
  food: {
    h2: "Dónde comer de madrugada en Barcelona",
    noun: "sitios para comer",
    intro: "Kebabs, pizzerías y comida rápida para después de la fiesta. El listado de arriba marca cuáles están abiertos ahora y cuáles te quedan cerca.",
    listTitle: "Abiertos 24 horas",
    faqQuestion: "¿Qué sitios para comer abren las 24 horas en Barcelona?",
    faqTail: "Los horarios pueden cambiar: mira siempre el estado «abierto ahora» del listado.",
  },
}

type Row = {
  id: number
  name: string | null
  category: string | null
  address: string | null
  neighborhood: string | null
  open_hours: string | null
}

// «Open 24 hours» sin más, o «Monday to Sunday: Open 24 hours». Un horario de un solo día
// («Monday: Open 24 hours») no vale: ese sitio no abre 24 horas toda la semana.
function isOpen24hAllWeek(raw: string | null): boolean {
  if (!raw) return false
  const lower = raw.trim().toLowerCase()
  if (!/24\s*hours/.test(lower)) return false
  const day = "(monday|tuesday|wednesday|thursday|friday|saturday|sunday)"
  const withDay = lower.match(new RegExp(`^${day}(?:\\s+to\\s+${day})?`))
  if (!withDay) return true
  return withDay[1] === "monday" && withDay[2] === "sunday"
}

async function loadBlockData(key: string): Promise<{ total: number; n24: number; rows: { id: number; name: string; where: string }[] } | null> {
  try {
    const [totalRes, h24Res] = await Promise.all([
      supabase.from("essentials").select("id", { count: "exact", head: true }).ilike("category", key).eq("hidden", false),
      supabase
        .from("essentials")
        .select("id,name,category,address,neighborhood,open_hours")
        .ilike("category", key)
        .eq("hidden", false)
        .ilike("open_hours", "%24 hours%")
        .order("name")
        .range(0, 499),
    ])
    if (totalRes.error || h24Res.error) return null
    const all = ((h24Res.data || []) as Row[])
      .filter((r) => isOpen24hAllWeek(r.open_hours))
      .map((r) => cleanEssential({ ...r, name: r.name || "" }))
      .filter((r) => r.name)
    const rows = all.slice(0, 12).map((r) => ({
      id: r.id,
      name: r.name as string,
      where: [r.address, r.neighborhood].filter((x): x is string => !!x && !!x.trim()).slice(0, 2).join(", "),
    }))
    return { total: totalRes.count || 0, n24: all.length, rows }
  } catch {
    return null
  }
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] || ""
  return names.slice(0, -1).join(", ") + " y " + names[names.length - 1]
}

export default async function EssentialsCategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const block = BLOCKS[category]
  const key = ESSENTIAL_CATEGORIES.find((c) => c.slug === category)?.key
  const data = block && key ? await loadBlockData(key) : null

  // Sin datos (o sin nada que contar) no se añade nada: es mejor que un texto vacío.
  if (!block || !data || data.total === 0) return children

  const first3 = data.rows.slice(0, 3).map((r) => r.name)
  return (
    <>
      {children}
      {/* -mt-28: la página de arriba deja 160 px libres para el menú inferior; así el texto queda
          pegado a su contenido en vez de a media pantalla de distancia. */}
      <section aria-labelledby="essentials-seo-title" className="relative -mt-28 bg-night px-4 pb-36 text-ink">
        <div className="mx-auto max-w-3xl border-t border-white/10 pt-8">
          <h2 id="essentials-seo-title" className="font-display text-xl leading-tight text-ink">
            {block.h2}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Noctua reúne {data.total} {block.noun} en Barcelona
            {data.n24 > 0 ? ` y ${data.n24} abren las 24 horas` : ""}. {block.intro}
          </p>

          {data.rows.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-semibold text-zinc-200">{block.listTitle}</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-zinc-400">
                {data.rows.map((r) => (
                  <li key={r.id}>
                    <span className="text-zinc-200">{r.name}</span>
                    {r.where ? ` · ${r.where}` : ""}
                  </li>
                ))}
              </ul>
              {data.n24 > data.rows.length && (
                <p className="mt-2 text-sm text-zinc-500">Y {data.n24 - data.rows.length} más en el listado de arriba.</p>
              )}

              <h3 className="mt-6 text-sm font-semibold text-zinc-200">{block.faqQuestion}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                En Noctua figuran {data.n24} con horario de 24 horas, como {joinNames(first3)}. {block.faqTail}
              </p>
            </>
          )}
        </div>
      </section>
    </>
  )
}
