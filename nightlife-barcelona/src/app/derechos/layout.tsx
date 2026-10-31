import type { Metadata } from "next"

// Igual que /terms y /faq: el título propio vive aquí porque la página es de cliente (traducida).
export const metadata: Metadata = {
  title: "Tus derechos al salir de fiesta | Noctua",
  description:
    "Qué pueden y qué no pueden hacer los locales de ocio nocturno: entrada, porteros, hojas de reclamaciones y qué hacer si no te dejan entrar. Explicado fácil, para Cataluña.",
  alternates: { canonical: "https://www.noctuaapp.com/derechos" },
}

export default function RightsLayout({ children }: { children: React.ReactNode }) {
  return children
}
