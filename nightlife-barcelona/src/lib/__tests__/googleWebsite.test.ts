import { describe, it, expect } from "vitest"
import { classifyGoogleWebsite } from "../googleWebsite"

describe("classifyGoogleWebsite", () => {
  it("una web normal se guarda como web, sin parámetros de seguimiento", () => {
    expect(classifyGoogleWebsite("https://www.razzmatazz.com/es/?utm_source=google&utm_medium=gbp")).toEqual({ website: "https://www.razzmatazz.com/es" })
    expect(classifyGoogleWebsite("https://club.example/agenda/?a=1&fbclid=xx")).toEqual({ website: "https://club.example/agenda?a=1" })
  })
  it("si Google trae el Instagram como web, va a instagram", () => {
    expect(classifyGoogleWebsite("https://www.instagram.com/neocajanegra/")).toEqual({ instagram: "@neocajanegra" })
    expect(classifyGoogleWebsite("https://instagram.com/club.nova_?igshid=abc")).toEqual({ instagram: "@club.nova_" })
  })
  it("enlaces de Instagram que no son un perfil se descartan", () => {
    expect(classifyGoogleWebsite("https://instagram.com/p/AbC123/")).toEqual({})
    expect(classifyGoogleWebsite("https://instagram.com/")).toEqual({})
    expect(classifyGoogleWebsite("https://instagram.com/explore/tags/barcelona")).toEqual({})
  })
  it("TikTok solo si es un perfil (@usuario)", () => {
    expect(classifyGoogleWebsite("https://www.tiktok.com/@miclub")).toEqual({ tiktok: "@miclub" })
    expect(classifyGoogleWebsite("https://www.tiktok.com/discover")).toEqual({})
  })
  it("Facebook y enlaces de Google no cuentan como web", () => {
    expect(classifyGoogleWebsite("https://www.facebook.com/miclub")).toEqual({})
    expect(classifyGoogleWebsite("https://maps.google.com/?cid=1")).toEqual({})
    expect(classifyGoogleWebsite("https://g.page/miclub")).toEqual({})
  })
  it("vacío, roto o raro no devuelve nada", () => {
    expect(classifyGoogleWebsite(null)).toEqual({})
    expect(classifyGoogleWebsite("")).toEqual({})
    expect(classifyGoogleWebsite("javascript:alert(1)")).toEqual({})
    expect(classifyGoogleWebsite("no es un enlace")).toEqual({})
  })
  it("sin esquema se asume https", () => {
    expect(classifyGoogleWebsite("miclub.cat")).toEqual({ website: "https://miclub.cat" })
  })
})
