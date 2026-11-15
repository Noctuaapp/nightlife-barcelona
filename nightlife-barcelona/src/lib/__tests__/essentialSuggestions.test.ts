import { describe, expect, it } from "vitest"
import {
  cityFromSuggestSearch, suggestBackHref, suggestHref, suggestionAddress, suggestionCity, suggestionCityField, suggestionCopyText,
  suggestionMapsUrl, suggestionsOfCity,
} from "../essentialSuggestions"

describe("suggestionCity", () => {
  it("solo «madrid» es Madrid; todo lo demás, Barcelona", () => {
    expect(suggestionCity("madrid")).toBe("madrid")
    expect(suggestionCity(" Madrid ")).toBe("madrid")
    expect(suggestionCity("barcelona")).toBe("barcelona")
    expect(suggestionCity("paris")).toBe("barcelona")
    expect(suggestionCity(null)).toBe("barcelona")
    expect(suggestionCity(undefined)).toBe("barcelona")
    expect(suggestionCity(7)).toBe("barcelona")
  })
})

describe("cityFromSuggestSearch", () => {
  it("lee ?ciudad=", () => {
    expect(cityFromSuggestSearch("?ciudad=madrid")).toBe("madrid")
    expect(cityFromSuggestSearch("ciudad=madrid")).toBe("madrid")
    expect(cityFromSuggestSearch("?x=1&ciudad=madrid")).toBe("madrid")
  })
  it("sin ciudad o con otra, Barcelona", () => {
    expect(cityFromSuggestSearch("")).toBe("barcelona")
    expect(cityFromSuggestSearch(null)).toBe("barcelona")
    expect(cityFromSuggestSearch("?ciudad=barcelona")).toBe("barcelona")
    expect(cityFromSuggestSearch("?ciudad=lisboa")).toBe("barcelona")
    expect(cityFromSuggestSearch("?city=madrid")).toBe("barcelona")
  })
})

describe("enlaces", () => {
  it("el formulario de Barcelona es el de siempre", () => {
    expect(suggestHref("barcelona")).toBe("/essentials/sugerir")
  })
  it("el de Madrid lleva la ciudad y se lee de vuelta", () => {
    expect(suggestHref("madrid")).toBe("/essentials/sugerir?ciudad=madrid")
    expect(cityFromSuggestSearch(suggestHref("madrid").split("?")[1])).toBe("madrid")
  })
  it("«Volver» va a los esenciales de la ciudad", () => {
    expect(suggestBackHref("barcelona")).toBe("/essentials")
    expect(suggestBackHref("madrid")).toBe("/madrid/essentials")
  })
})

describe("suggestionCityField", () => {
  it("en Barcelona no manda nada (como antes del SQL 106)", () => {
    expect(suggestionCityField("barcelona")).toEqual({})
  })
  it("en Madrid manda la ciudad", () => {
    expect(suggestionCityField("madrid")).toEqual({ city: "madrid" })
  })
})

describe("suggestionsOfCity", () => {
  const rows = [
    { id: 1, city: "barcelona" },
    { id: 2, city: "madrid" },
    { id: 3 }, // de antes del SQL 106
    { id: 4, city: null },
    { id: 5, city: "MADRID" },
  ]
  it("Barcelona incluye las que no tienen ciudad", () => {
    expect(suggestionsOfCity(rows, "barcelona").map((r) => r.id)).toEqual([1, 3, 4])
  })
  it("Madrid solo las de Madrid", () => {
    expect(suggestionsOfCity(rows, "madrid").map((r) => r.id)).toEqual([2, 5])
  })
  it("entre las dos suman todas, sin repetir", () => {
    expect(suggestionsOfCity(rows, "barcelona").length + suggestionsOfCity(rows, "madrid").length).toBe(rows.length)
  })
})

describe("Google Maps y copiar", () => {
  const r = { name: "Farmacia Sol", street: "Calle Mayor", street_number: "12", city: "madrid" }
  it("la dirección lleva el número si lo hay", () => {
    expect(suggestionAddress(r)).toBe("Calle Mayor 12")
    expect(suggestionAddress({ street: "Carrer d'Aragó", street_number: null })).toBe("Carrer d'Aragó")
  })
  it("Maps busca en la ciudad de la sugerencia", () => {
    const q = decodeURIComponent(suggestionMapsUrl(r).split("query=")[1])
    expect(q).toBe("Farmacia Sol Calle Mayor 12 Madrid")
    const old = decodeURIComponent(suggestionMapsUrl({ ...r, city: undefined }).split("query=")[1])
    expect(old).toBe("Farmacia Sol Calle Mayor 12 Barcelona")
  })
  it("Copiar datos termina con la ciudad", () => {
    expect(suggestionCopyText(r, "Farmacia")).toBe("Farmacia Sol\nFarmacia\nCalle Mayor 12, Madrid")
    expect(suggestionCopyText({ ...r, city: null }, "Farmacia")).toBe("Farmacia Sol\nFarmacia\nCalle Mayor 12, Barcelona")
  })
})
