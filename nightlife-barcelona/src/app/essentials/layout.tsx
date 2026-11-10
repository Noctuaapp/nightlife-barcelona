import type { Metadata } from "next"
import { spanishAlternates } from "../../lib/intl/site"

export const metadata: Metadata = {
  title: "Esenciales para salir de noche en Barcelona | Noctua",
  description: "Farmacias, cajeros, comida, transporte nocturno y todo lo que necesitas cerca cuando sales de noche en Barcelona.",
  alternates: spanishAlternates("/essentials", "/essentials"),
}

export default function EssentialsLayout({ children }: { children: React.ReactNode }) {
  return children
}
