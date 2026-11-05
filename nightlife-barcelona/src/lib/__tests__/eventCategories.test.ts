import { describe, it, expect } from "vitest"
import { classifyEvent } from "../eventCategories"

describe("classifyEvent", () => {
  it("las fiestas mayores principales salen como fiesta de barrio con su barrio", () => {
    expect(classifyEvent({ title: "Festa Major de Gràcia" })).toEqual({ category: "neighborhood", barrio: "Gràcia", hidden: false })
    expect(classifyEvent({ title: "FM Carmel 2026" }).barrio).toBe("El Carmel")
    expect(classifyEvent({ title: "Festes del Coll" }).barrio).toBe("El Coll")
    expect(classifyEvent({ title: "Fiesta Mayor de Horta" }).barrio).toBe("Horta")
    expect(classifyEvent({ title: "Festa Major de la Sagrada Família" }).barrio).toBe("Sagrada Família")
  })
  it("una fiesta mayor de un barrio que no está en la lista no se enseña", () => {
    expect(classifyEvent({ title: "Festa Major de Vilassar" }).hidden).toBe(true)
  })
  it("otras «festes de…» no son fiestas de barrio y se quedan visibles", () => {
    const c = classifyEvent({ title: "Festes de Nadal" })
    expect(c.hidden).toBe(false)
    expect(c.category).toBe("concert")
  })
  it("festivales y conciertos", () => {
    expect(classifyEvent({ title: "Primavera Sound" }).category).toBe("festival")
    expect(classifyEvent({ title: "Cruïlla Festival" }).category).toBe("festival")
    expect(classifyEvent({ title: "Concierto de Rosalía" }).category).toBe("concert")
  })
})
