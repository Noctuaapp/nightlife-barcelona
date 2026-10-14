import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Esenciales para salir de noche en Barcelona | Noctua",
  description: "Farmacias, cajeros, comida, transporte nocturno y todo lo que necesitas cerca cuando sales de noche en Barcelona.",
  alternates: { canonical: "https://www.noctuaapp.com/essentials" },
}

export default function EssentialsLayout({ children }: { children: React.ReactNode }) {
  return children
}
