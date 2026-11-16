import { describe, expect, it } from "vitest"
import nextConfig from "../../../next.config"

// Las redirecciones de next.config.ts: URLs antiguas que Google sigue rastreando y deben llevar a la página actual.
async function redirects() {
  return (await nextConfig.redirects?.()) ?? []
}

describe("redirecciones de next.config.ts", () => {
  it("las fichas de clubs renombrados van a su ficha actual con redirección permanente", async () => {
    const list = await redirects()
    const find = (source: string) => list.find((r) => r.source === source)
    expect(find("/clubs/juanchito")).toMatchObject({ destination: "/clubs/discoteca-juanchito", permanent: true })
    expect(find("/clubs/discoteca-capitolio")).toMatchObject({ destination: "/clubs/capitolio", permanent: true })
    expect(find("/clubs/two-schmucks-2")).toMatchObject({ destination: "/clubs/two-schmucks", permanent: true })
  })

  it("ninguna redirección se apunta a sí misma ni acaba en otra redirección (nada de cadenas ni bucles)", async () => {
    const list = await redirects()
    const sources = new Set(list.map((r) => r.source))
    for (const r of list) {
      expect(r.destination, r.source).not.toBe(r.source)
      // «/madrid/clubs/:slug» → «/clubs/:slug» es un patrón, no una página concreta: se comprueban las demás.
      if (r.source.includes(":")) continue
      expect(sources.has(r.destination), `${r.source} → ${r.destination}`).toBe(false)
    }
  })
})
