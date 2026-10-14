import type { Metadata } from "next"

// Igual que /privacy: el título propio vive aquí porque la página es de cliente.
export const metadata: Metadata = {
  title: "Términos de servicio | Noctua",
  description: "Condiciones de uso de Noctua: cuentas, uso aceptable, programa de puntos (XP) y responsabilidad.",
  alternates: { canonical: "https://www.noctuaapp.com/terms" },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
