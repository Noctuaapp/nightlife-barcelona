import type { Metadata } from "next"
import { Suspense } from "react"
import { cityRobots } from "../../../lib/citySeo"

// Igual que el de Barcelona: título propio y el <Suspense> que Next.js exige porque la página lee parámetros de la URL.
export const metadata: Metadata = {
  title: "Mapa de la noche en Madrid | Noctua",
  description: "Clubs y servicios nocturnos de Madrid en un mapa: qué hay cerca, qué está abierto y cómo llegar.",
  alternates: { canonical: "https://www.noctuaapp.com/madrid/map" },
  ...cityRobots("madrid"),
}

export default function MadridMapLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-night" />}>{children}</Suspense>
}
