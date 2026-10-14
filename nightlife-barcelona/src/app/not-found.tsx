import type { Metadata } from "next"
import Header from "../components/layout/Header"
import BottomNav from "../components/layout/BottomNav"
import NotFoundContent from "../components/system/NotFoundContent"

// Página 404 propia. Antes Next.js mostraba su pantalla por defecto (fondo blanco, en inglés),
// que rompía por completo la estética y no ofrecía ninguna salida útil.
export const metadata: Metadata = {
  title: "Página no encontrada | Noctua",
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <>
      <Header />
      <NotFoundContent />
      <BottomNav />
    </>
  )
}
