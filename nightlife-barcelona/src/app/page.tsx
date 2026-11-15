import type { Metadata } from "next"
import { spanishAlternates } from "../lib/intl/site"
import HomeView from "../components/city/HomeView"

// La portada es un Server Component async (components/city/HomeView.tsx): los clubs se piden en el servidor antes de enviar la
// respuesta, así que el HTML que llega de entrada ya trae los datos reales. Barcelona vive aquí; Madrid, en /madrid.
// 05/11/2026: antes 3600 s. Subido a 6 h para gastar menos «ISR Writes» de Vercel (ver src/app/clubs/[slug]/page.tsx).
export const revalidate = 21600

// Título, descripción y Open Graph vienen de layout.tsx. Aquí solo se añade el enlace a la portada en inglés (/en) para Google
// (hreflang, 10/11/2026); el canonical sigue siendo la propia página ("./").
export const metadata: Metadata = {
  alternates: { ...spanishAlternates("", ""), canonical: "./" },
}

export default function Home() {
  return <HomeView city="barcelona" />
}
