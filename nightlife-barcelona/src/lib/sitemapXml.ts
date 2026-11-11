import type { MetadataRoute } from "next"

// Next.js escribe las direcciones de imagen de sitemap.xml tal cual, sin escapar. Las fotos de Unsplash llevan
// «?auto=format&fit=crop&w=800&q=80»: ese «&» suelto deja el XML inválido y Google no lee ni una página del sitemap
// (Search Console: «1 error» y 0 páginas descubiertas, 11/11/2026). Aquí se escapan antes de entregarlas.

/** Escapa lo que no puede ir suelto en el texto de un elemento XML. No toca un «&» que ya forma parte de una entidad. */
export function escapeXmlText(s: string): string {
  return s
    .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/gi, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/** Las mismas entradas con las direcciones de imagen listas para el XML. */
export function withXmlSafeImages(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  return entries.map((e) => (e.images && e.images.length > 0 ? { ...e, images: e.images.map(escapeXmlText) } : e))
}
