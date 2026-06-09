import type { Metadata } from "next"
import { NightlifeProvider } from "../context/NightlifeContext"
import "./globals.css"

import { FavoritesProvider } from "../context/FavoritesContext"

export const metadata: Metadata = {

  title: "Nightlife Barcelona",

  description:
    "Discover clubs, nightlife and events in Barcelona.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {

  return (

    <html lang="en">

<body>

<FavoritesProvider>

<NightlifeProvider>

  {children}

</NightlifeProvider>

</FavoritesProvider>

</body>

    </html>
  )
}