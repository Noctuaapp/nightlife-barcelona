import type { Metadata } from "next"

// /contact se abre con parámetros (?type=report_issue&subject=...) desde los botones "Reportar"
// de cada ficha; Google los trataba como miles de páginas duplicadas. Es un formulario que además
// exige login, así que no aporta nada indexado.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
