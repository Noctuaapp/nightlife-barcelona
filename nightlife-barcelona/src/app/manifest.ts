import type { MetadataRoute } from "next"

// Noctua como app instalable (27/10/2026): con esto el navegador del móvil ofrece "Instalar" /
// "Añadir a pantalla de inicio" y la web se abre sin la barra del navegador, con su icono. Es el
// atajo más corto para el momento de "¿dónde salimos hoy?". start_url lleva utm_source=pwa para
// ver en Admin › Visitas cuánta gente entra desde la app instalada.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Noctua — Vida nocturna en Barcelona",
    short_name: "Noctua",
    description: "Discotecas, bares, eventos y planes de noche en Barcelona, con horarios y qué está abierto ahora.",
    lang: "es",
    start_url: "/?utm_source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0910",
    theme_color: "#0a0910",
    categories: ["lifestyle", "entertainment", "travel"],
    // Permite a Chrome (Android) contestar «¿está instalada?» desde una pestaña normal
    // (getInstalledRelatedApps), para no enseñar el botón de instalar a quien ya la tiene.
    related_applications: [{ platform: "webapp", url: "https://www.noctuaapp.com/manifest.webmanifest" }],
    prefer_related_applications: false,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
