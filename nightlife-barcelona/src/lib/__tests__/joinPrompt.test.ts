import { describe, it, expect } from "vitest"
import { joinPromptApplies } from "../joinPrompt"

describe("joinPromptApplies", () => {
  it("sale en la portada, la lista de clubs y las secciones de barrio, zona y música", () => {
    for (const p of ["/", "/clubs", "/barrio", "/barrio/gracia", "/zona/eixample", "/musica/techno"]) {
      expect(joinPromptApplies(p), p).toBe(true)
    }
  })

  it("no sale en Esenciales: ahí la gente busca ayuda y la tarjeta tapaba los accesos", () => {
    for (const p of ["/essentials", "/essentials/pharmacy", "/essentials/taxi"]) {
      expect(joinPromptApplies(p), p).toBe(false)
    }
  })

  it("no sale en el mapa, el asistente, el perfil, el login ni el registro", () => {
    for (const p of ["/map", "/planifica", "/profile", "/login", "/signup", "/confirm-age"]) {
      expect(joinPromptApplies(p), p).toBe(false)
    }
  })

  it("no confunde rutas que solo empiezan igual", () => {
    expect(joinPromptApplies("/barriosur")).toBe(false)
    expect(joinPromptApplies("/clubs/algo")).toBe(false)
  })
})
