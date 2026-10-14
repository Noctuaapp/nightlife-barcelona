import type { Metadata } from "next"

// La página es un componente de cliente (cambia de idioma al vuelo) y no puede exportar metadata
// propia. Sin este layout heredaba el título genérico de la portada.
export const metadata: Metadata = {
  title: "Política de privacidad | Noctua",
  description:
    "Qué datos recoge Noctua, para qué los usa, cuánto tiempo los guarda y cómo ejercer tus derechos (RGPD).",
  alternates: { canonical: "https://www.noctuaapp.com/privacy" },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
