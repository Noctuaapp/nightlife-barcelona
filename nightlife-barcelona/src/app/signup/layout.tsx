import type { Metadata } from "next"

// Pantalla sin contenido propio para Google (27/10/2026): no tiene sentido que salga en el
// buscador y, al ser casi idéntica a otras pantallas de la app, Search Console la contaba como
// "duplicada". Con noindex deja de salir en ese informe.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
