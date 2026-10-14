import type { Metadata } from "next"

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
  supermarket: { title: "Supermercados abiertos de noche en Barcelona", description: "Supermercados y tiendas abiertas tarde o 24 h en Barcelona." },
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

export default function EssentialsCategoryLayout({ children }: { children: React.ReactNode }) {
  return children
}
