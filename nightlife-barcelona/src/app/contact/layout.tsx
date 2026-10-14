import type { Metadata } from "next"
import { Suspense } from "react"

// /contact se abre con parámetros (?type=report_issue&subject=...) desde los botones "Reportar"
// de cada ficha; Google los trataba como miles de páginas duplicadas. Es un formulario que además
// exige login, así que no aporta nada indexado.
export const metadata: Metadata = {
  title: "Contacto | Noctua",
  robots: { index: false, follow: true },
}

// La página lee los parámetros de la URL (useSearchParams), y Next.js exige un <Suspense> alrededor
// para poder generarla. Antes lo ponía sin querer la pantalla de carga global (app/loading.tsx).
export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}
