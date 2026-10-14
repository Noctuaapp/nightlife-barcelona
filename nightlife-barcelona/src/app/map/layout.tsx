import type { Metadata } from "next"
import { Suspense } from "react"

// Título propio (antes heredaba el de la portada) y el <Suspense> que Next.js exige porque la
// página lee parámetros de la URL (useSearchParams).
export const metadata: Metadata = {
  title: "Mapa de la noche en Barcelona | Noctua",
  description: "Clubs, eventos y servicios nocturnos de Barcelona en un mapa: qué hay cerca, qué está abierto y cómo llegar.",
  alternates: { canonical: "https://www.noctuaapp.com/map" },
}

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-[#0d0a1c]" />}>{children}</Suspense>
}
