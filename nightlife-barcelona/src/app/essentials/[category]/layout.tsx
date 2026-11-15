import type { Metadata } from "next"
import EssentialsCategoryServer, { essentialCategoryParams, essentialsCategoryMetadata } from "../../../components/city/EssentialsCategoryServer"

// Título, descripción y texto de servidor de cada categoría de esenciales de Barcelona: viven en
// src/components/city/EssentialsCategoryServer.tsx (compartido con /madrid/essentials/[category]).

// Las categorías se generan al compilar (antes cada visita se renderizaba de cero) y cualquier otra URL
// (/essentials/loquesea) da un 404 real en vez de una página vacía con código 200.
export function generateStaticParams() {
  return essentialCategoryParams("barcelona")
}
export const dynamicParams = false

// La lista de cada categoría la pinta el navegador después de cargar, así que Google veía una página
// casi vacía ("Cargando…"). El texto de abajo se genera en el servidor con los datos reales y se
// refresca cada hora.
// 05/11/2026: antes 3600 s. Subido a 6 h para gastar menos «ISR Writes» de Vercel (ver src/app/clubs/[slug]/page.tsx).
export const revalidate = 21600

export async function generateMetadata(props: { params: Promise<{ category: string }> }): Promise<Metadata> {
  return essentialsCategoryMetadata("barcelona", props)
}

export default function EssentialsCategoryLayout({ children, params }: { children: React.ReactNode; params: Promise<{ category: string }> }) {
  return (
    <EssentialsCategoryServer city="barcelona" params={params}>
      {children}
    </EssentialsCategoryServer>
  )
}
