import type { Metadata } from "next"

// Formulario, no contenido: que Google no lo indexe.
export const metadata: Metadata = {
  title: "Sugiere un esencial | Noctua",
  robots: { index: false, follow: true },
}

export default function SuggestEssentialLayout({ children }: { children: React.ReactNode }) {
  return children
}
