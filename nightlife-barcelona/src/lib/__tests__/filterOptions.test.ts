import { describe, it, expect } from "vitest"
import { optionsWithData } from "../filterOptions"
import { hasOffer, OFFERS_FILTER } from "../offers"

const clubs = [
  { id: 1, music: "Techno", terrace: true },
  { id: 2, music: "Commercial", terrace: false },
]
const match = (c: { music: string; terrace: boolean }, o: string) => (o === "Terraza" ? c.terrace : c.music === o)

describe("optionsWithData", () => {
  it("enseña solo las opciones que cumple algún elemento", () => {
    expect(optionsWithData(["Techno", "Karaoke", "Terraza"], clubs, match)).toEqual(["Techno", "Terraza"])
  })

  it("mantiene las ya elegidas aunque no tengan datos", () => {
    expect(optionsWithData(["Techno", "Karaoke"], clubs, match, new Set(["Karaoke"]))).toEqual(["Techno", "Karaoke"])
  })

  it("sin ningún dato cargado no esconde nada", () => {
    expect(optionsWithData(["Techno", "Karaoke"], [], match)).toEqual(["Techno", "Karaoke"])
  })

  it("si nada cumple, la lista queda vacía", () => {
    expect(optionsWithData(["Karaoke"], clubs, match)).toEqual([])
  })
})

describe("hasOffer", () => {
  it("hay oferta con promoción o con entrada gratis", () => {
    expect(hasOffer({ discount_info: "2x1 hasta la 1:00" })).toBe(true)
    expect(hasOffer({ free_entry_info: "Gratis antes de las 00:30" })).toBe(true)
  })

  it("texto vacío, solo espacios u otro tipo de dato no cuentan", () => {
    expect(hasOffer({})).toBe(false)
    expect(hasOffer({ discount_info: "", free_entry_info: "   " })).toBe(false)
    expect(hasOffer({ discount_info: null, free_entry_info: 5 })).toBe(false)
  })

  it("el filtro se llama Ofertas", () => {
    expect(OFFERS_FILTER).toBe("Ofertas")
  })
})
