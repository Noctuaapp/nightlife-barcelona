import { describe, it, expect } from "vitest"
import { homeStyleCards, HOME_STYLE_MAX } from "../homeStyles"

let n = 0
const club = (music: string, image: string | null = null, extra: Record<string, unknown> = {}) => ({ id: ++n, music, image, ...extra })
const many = (k: number, music: string, image: (i: number) => string | null = () => null) => Array.from({ length: k }, (_, i) => club(music, image(i)))

describe("homeStyleCards", () => {
  it("ordena los estilos por número de locales", () => {
    const cards = homeStyleCards([...many(2, "Techno"), ...many(5, "Reggaeton"), ...many(3, "Latin")])
    expect(cards.map((c) => c.slug)).toEqual(["reggaeton", "latina", "techno"])
    expect(cards.map((c) => c.count)).toEqual([5, 3, 2])
  })

  it("no enseña estilos con un solo local ni la «música electrónica» (repite techno y house)", () => {
    const cards = homeStyleCards([...many(4, "Techno"), club("House"), club("Jazz")])
    expect(cards.map((c) => c.slug)).toEqual(["techno"])
  })

  it("elige la foto del mejor local del estilo y no repite foto entre estilos si puede evitarlo", () => {
    const shared = "https://x/shared.jpg"
    const cards = homeStyleCards([
      club("Techno · House", shared, { verified: true }),
      club("Techno", "https://x/techno2.jpg"),
      club("House", "https://x/house2.jpg"),
    ])
    const techno = cards.find((c) => c.slug === "techno")!
    const house = cards.find((c) => c.slug === "house")!
    expect(techno.image).toBe(shared)
    expect(house.image).toBe("https://x/house2.jpg")
  })

  it("si todos los locales de un estilo ya usaron su foto, la repite antes que dejar la tarjeta sin imagen", () => {
    const only = "https://x/only.jpg"
    const cards = homeStyleCards([club("Techno · House", only), club("Techno · House", only)])
    expect(cards.map((c) => c.image)).toEqual([only, only])
  })

  it("sin ninguna foto, la tarjeta sale sin imagen", () => {
    expect(homeStyleCards(many(3, "Jazz"))[0].image).toBeNull()
  })

  it("ignora los locales cerrados temporalmente", () => {
    const cards = homeStyleCards([...many(2, "Techno"), club("Techno", null, { temporarily_closed: true })])
    expect(cards[0].count).toBe(2)
  })

  it("devuelve los ids de los locales de cada estilo", () => {
    const list = many(3, "Hip hop")
    expect(homeStyleCards(list)[0].ids.sort()).toEqual(list.map((c) => c.id).sort())
  })

  it("respeta el máximo y sin datos devuelve vacío", () => {
    const all = ["Techno", "House", "Reggaeton", "Latin", "Hip hop", "Rock", "Comercial", "Jazz"].flatMap((m) => many(2, m))
    expect(homeStyleCards(all)).toHaveLength(HOME_STYLE_MAX)
    expect(homeStyleCards(all, 3)).toHaveLength(3)
    expect(homeStyleCards([])).toEqual([])
  })
})
