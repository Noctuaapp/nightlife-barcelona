import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/react"
import { NightlifeProvider } from "../context/NightlifeContext"
import { FavoritesProvider } from "../context/FavoritesContext"
import { LanguageProvider } from "../context/LanguageContext"
import MaintenanceGate from "../components/system/MaintenanceGate"
import "./globals.css"

// Antes el título, la descripción y el "locale" de esta página (la que Google indexa como
// portada del sitio) estaban en inglés, mientras que /clubs, /events y el resto de páginas ya
// usan español ("es_ES") — una inconsistencia que confunde a Google sobre en qué idioma está
// realmente el sitio, justo cuando el público objetivo (Barcelona) busca en español. Ahora todo
// el sitio declara el mismo idioma.
export const metadata: Metadata = {
  metadataBase: new URL("https://noctuaapp.com"),
  title: "Noctua — Vida nocturna en Barcelona",
  description: "Descubre las mejores discotecas, eventos y fiestas de Barcelona. Colas en directo, horarios, precios y todo lo que necesitas para salir de noche.",
  keywords: "vida nocturna Barcelona, discotecas Barcelona, clubs Barcelona, eventos Barcelona, fiesta Barcelona, ocio nocturno Barcelona",
  alternates: { canonical: "https://noctuaapp.com" },
  openGraph: {
    title: "Noctua — Vida nocturna en Barcelona",
    description: "Descubre las mejores discotecas, eventos y fiestas de Barcelona.",
    url: "https://noctuaapp.com",
    siteName: "Noctua",
    images: [
      {
        url: "https://noctuaapp.com/hero/skyline_barcelona.jpeg",
        width: 1535,
        height: 1024,
        alt: "Vida nocturna de Barcelona — Noctua",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Noctua — Vida nocturna en Barcelona",
    description: "Descubre las mejores discotecas, eventos y fiestas de Barcelona.",
    images: ["https://noctuaapp.com/hero/skyline_barcelona.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" translate="no">
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body>
        <LanguageProvider>
          <FavoritesProvider>
            <NightlifeProvider>
              <MaintenanceGate>{children}</MaintenanceGate>
            </NightlifeProvider>
          </FavoritesProvider>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  )
}