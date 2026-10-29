import type { Metadata, Viewport } from "next"
import { Unbounded, Plus_Jakarta_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import { FavoritesProvider } from "../context/FavoritesContext"
import { LanguageProvider } from "../context/LanguageContext"
import MaintenanceGate from "../components/system/MaintenanceGate"
import TrafficSource from "../components/system/TrafficSource"
import InstallCapture from "../components/system/InstallCapture"
import ToastHost from "../components/ui/Toast"
import PartyPollPopup from "../components/fun/PartyPollPopup"
import CookieBanner from "../components/system/CookieBanner"
import "./globals.css"
import { safeJsonLd } from "../lib/structuredData"

// Antes toda la app caía en Arial/Helvetica (la fuente por defecto del sistema, sin declarar
// ninguna propia) — probablemente lo que más "delata" que una app no tiene identidad propia.
// Unbounded es la display para títulos grandes (nombre del club, titulares) — tiene ese carácter
// geométrico y contundente de cartel/flyer de club que encaja con la vida nocturna, no es una
// sans neutra más. Plus Jakarta Sans es la que lleva todo el texto funcional (botones, UI,
// párrafos): limpia y muy legible en tamaños pequeños, sin competir con la display.
const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["800"],
  variable: "--font-display",
  display: "swap",
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--font-sans",
  display: "swap",
})

// Antes el título, la descripción y el "locale" de esta página (la que Google indexa como
// portada del sitio) estaban en inglés, mientras que /clubs, /events y el resto de páginas ya
// usan español ("es_ES") — una inconsistencia que confunde a Google sobre en qué idioma está
// realmente el sitio, justo cuando el público objetivo (Barcelona) busca en español. Ahora todo
// el sitio declara el mismo idioma.
// Color de la barra del navegador y de la app instalada (el fondo de la web, "night"). La web ya se
// puede instalar como app: ver app/manifest.ts.
export const viewport: Viewport = {
  themeColor: "#0a0910",
}

export const metadata: Metadata = {
  metadataBase: new URL("https://www.noctuaapp.com"),
  title: "Noctua — Vida nocturna en Barcelona",
  description: "Descubre las mejores discotecas, eventos y fiestas de Barcelona. Colas en directo, horarios, precios y todo lo que necesitas para salir de noche.",
  keywords: "vida nocturna Barcelona, discotecas Barcelona, clubs Barcelona, eventos Barcelona, fiesta Barcelona, ocio nocturno Barcelona",
  // "./" = cada página se declara canónica a sí misma (sin parámetros ?...). Antes aquí había la
  // URL de la portada fija, y toda página sin canonical propio (faq, privacy, essentials/*, map...)
  // heredaba "soy una copia de la home", lo que confunde a Google y frena su indexación.
  alternates: { canonical: "./" },
  openGraph: {
    title: "Noctua — Vida nocturna en Barcelona",
    description: "Descubre las mejores discotecas, eventos y fiestas de Barcelona.",
    url: "https://www.noctuaapp.com",
    siteName: "Noctua",
    images: [
      {
        url: "https://www.noctuaapp.com/hero/skyline_barcelona.jpeg",
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
    images: ["https://www.noctuaapp.com/hero/skyline_barcelona.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  // Al "Añadir a pantalla de inicio" en iPhone se abre como app, con su nombre (el icono es
  // app/apple-icon.png).
  appleWebApp: { capable: true, title: "Noctua", statusBarStyle: "black" },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" translate="no" className={`${unbounded.variable} ${plusJakarta.variable}`}>
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body>
        <LanguageProvider>
          <FavoritesProvider>
            <MaintenanceGate>
              {children}
              {/* Juego "¿Qué prefieres?" — popup diario para todos; sin cuenta, solo con permiso de cookies (ver el componente) */}
              <PartyPollPopup />
              {/* Permiso para lo opcional que se guarda en el dispositivo (ver lib/consent.ts) */}
              <CookieBanner />
            </MaintenanceGate>
          </FavoritesProvider>
        </LanguageProvider>
        {/* Quién es Noctua para Google: nombre, logo y web oficial (ficha de marca en los
            resultados). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://www.noctuaapp.com/#org",
                  name: "Noctua",
                  url: "https://www.noctuaapp.com",
                  logo: "https://www.noctuaapp.com/noctua_logo.png",
                  email: "info@noctuaapp.com",
                  areaServed: "Barcelona",
                },
                {
                  "@type": "WebSite",
                  "@id": "https://www.noctuaapp.com/#website",
                  name: "Noctua",
                  url: "https://www.noctuaapp.com",
                  inLanguage: "es-ES",
                  publisher: { "@id": "https://www.noctuaapp.com/#org" },
                },
              ],
            }),
          }}
        />
        <TrafficSource />
        <InstallCapture />
        <ToastHost />
        <Analytics />
      </body>
    </html>
  )
}