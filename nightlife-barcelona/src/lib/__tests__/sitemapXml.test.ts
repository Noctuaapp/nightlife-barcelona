import { describe, expect, it } from "vitest"
import type { MetadataRoute } from "next"
import { escapeXmlText, withXmlSafeImages } from "../sitemapXml"

const UNSPLASH = "https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=800&q=80"

describe("escapeXmlText", () => {
  it("escapa el & de las fotos de Unsplash", () => {
    expect(escapeXmlText(UNSPLASH)).toBe("https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&amp;fit=crop&amp;w=800&amp;q=80")
  })

  it("no escapa dos veces lo que ya está escapado", () => {
    const once = escapeXmlText(UNSPLASH)
    expect(escapeXmlText(once)).toBe(once)
    expect(escapeXmlText("a&#38;b&#x26;c&lt;d")).toBe("a&#38;b&#x26;c&lt;d")
  })

  it("escapa < y >, y deja intacta una dirección sin caracteres especiales", () => {
    expect(escapeXmlText("https://x.test/a<b>c")).toBe("https://x.test/a&lt;b&gt;c")
    expect(escapeXmlText("https://x.test/foto.jpg")).toBe("https://x.test/foto.jpg")
  })

  it("escapa un & seguido de algo que parece entidad pero no lo es", () => {
    expect(escapeXmlText("https://x.test/?a=1&amp=2")).toBe("https://x.test/?a=1&amp;amp=2")
  })
})

describe("withXmlSafeImages", () => {
  const entries: MetadataRoute.Sitemap = [
    { url: "https://www.noctuaapp.com/clubs/a", images: [UNSPLASH, "https://x.test/b.jpg"], priority: 0.7 },
    { url: "https://www.noctuaapp.com/clubs/b", priority: 0.7 },
    { url: "https://www.noctuaapp.com/clubs/c", images: [], priority: 0.7 },
  ]

  it("escapa todas las imágenes y conserva el resto de campos", () => {
    const out = withXmlSafeImages(entries)
    expect(out[0].images).toEqual([escapeXmlText(UNSPLASH), "https://x.test/b.jpg"])
    expect(out[0].url).toBe("https://www.noctuaapp.com/clubs/a")
    expect(out[0].priority).toBe(0.7)
  })

  it("no toca las entradas sin imágenes", () => {
    const out = withXmlSafeImages(entries)
    expect(out[1]).toBe(entries[1])
    expect(out[2]).toBe(entries[2])
  })

  it("no cambia las entradas originales", () => {
    withXmlSafeImages(entries)
    expect(entries[0].images?.[0]).toBe(UNSPLASH)
  })

  it("el XML que genera Next con estas imágenes ya no tiene ningún & suelto", async () => {
    const { resolveSitemap } = await import("next/dist/build/webpack/loaders/metadata/resolve-route-data")
    const xml = resolveSitemap(withXmlSafeImages(entries))
    expect(xml.match(/&(?!amp;|lt;|gt;|quot;|apos;|#)/g)).toBeNull()
    expect(xml).toContain("auto=format&amp;fit=crop&amp;w=800&amp;q=80")
  })
})
