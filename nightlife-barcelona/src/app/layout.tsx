import type { Metadata } from "next"
import { NightlifeProvider } from "../context/NightlifeContext"
import { FavoritesProvider } from "../context/FavoritesContext"
import BackButton from "../components/ui/BackButton"
import "./globals.css"

export const metadata: Metadata = {
  title: "Noctua — Barcelona Nightlife",
  description: "Discover the best clubs, events and nightlife experiences in Barcelona. Real-time venue discovery, live queues and the best nights out.",
  keywords: "Barcelona nightlife, clubs Barcelona, events Barcelona, discotecas Barcelona, fiesta Barcelona",
  openGraph: {
    title: "Noctua — Barcelona Nightlife",
    description: "Discover the best clubs, events and nightlife in Barcelona.",
    url: "https://noctuaapp.com",
    siteName: "Noctua",
    images: [
      {
        url: "https://noctuaapp.com/hero/skyline_barcelona.jpeg",
        width: 1535,
        height: 1024,
        alt: "Barcelona Nightlife — Noctua",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Noctua — Barcelona Nightlife",
    description: "Discover the best clubs, events and nightlife in Barcelona.",
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
    <html lang="en" translate="no">
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body>
        <FavoritesProvider>
          <NightlifeProvider>
            <BackButton />
            {children}
          </NightlifeProvider>
        </FavoritesProvider>
      </body>
    </html>
  )
}