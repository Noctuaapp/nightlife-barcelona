import type { Metadata } from "next"
import { NightlifeProvider } from "../context/NightlifeContext"
import { FavoritesProvider } from "../context/FavoritesContext"
import BackButton from "../components/ui/BackButton"
import "./globals.css"

export const metadata: Metadata = {
  title: "Nightlife Barcelona",
  description: "Discover clubs, nightlife and events in Barcelona.",
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