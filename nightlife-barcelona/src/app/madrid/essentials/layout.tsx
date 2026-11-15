import type { Metadata } from "next"
import { cityRobots } from "../../../lib/citySeo"

export const metadata: Metadata = {
  title: "Esenciales para salir de noche en Madrid | Noctua",
  description: "Farmacias, cajeros, comida, transporte nocturno y todo lo que necesitas cerca cuando sales de noche en Madrid.",
  alternates: { canonical: "https://www.noctuaapp.com/madrid/essentials" },
  ...cityRobots("madrid"),
}

export default function MadridEssentialsLayout({ children }: { children: React.ReactNode }) {
  return children
}
