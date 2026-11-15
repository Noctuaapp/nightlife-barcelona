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
  it("fiestas de Madrid: agosto en Centro, San Isidro y el Orgullo", () => {
    expect(classifyEvent({ title: "Fiestas de San Cayetano 2027" })).toEqual({ category: "neighborhood", barrio: "San Cayetano (Embajadores)", hidden: false })
    expect(classifyEvent({ title: "Fiestas de San Lorenzo 2027" }).barrio).toBe("San Lorenzo (Lavapiés)")
    expect(classifyEvent({ title: "Fiestas de la Virgen de la Paloma 2027" }).barrio).toBe("La Paloma (La Latina)")
    expect(classifyEvent({ title: "Fiestas de San Isidro 2027" }).barrio).toBe("San Isidro")
    expect(classifyEvent({ title: "Fiestas del Orgullo de Madrid (MADO) 2027" }).barrio).toBe("Orgullo (Chueca)")
  })
  it("Santa Eulàlia es la fiesta mayor de invierno de Barcelona", () => {
    expect(classifyEvent({ title: "Festes de Santa Eulàlia 2027" })).toEqual({ category: "neighborhood", barrio: "Santa Eulàlia", hidden: false })
  })
  it("fiestas de distrito de Madrid con día fijo: el Carmen y Santiago", () => {
    expect(classifyEvent({ title: "Fiestas del Carmen (Chamberí) 2027" }).barrio).toBe("El Carmen (Chamberí)")
    expect(classifyEvent({ title: "Fiestas del Carmen (Carabanchel) 2027" }).barrio).toBe("El Carmen (Carabanchel)")
    expect(classifyEvent({ title: "Fiestas de Santiago (Carabanchel) 2027" }).barrio).toBe("Santiago (Carabanchel)")
  })
  it("Carnaval y Fin de Año salen en Festivales, no en Conciertos", () => {
    for (const title of ["Carnaval de Madrid 2027", "Fiesta de Fin de Año en la Puerta del Sol 2026", "Nochevieja en Barcelona"]) {
      expect(classifyEvent({ title })).toEqual({ category: "festival", barrio: null, hidden: false })
    }
  })
})
