import { describe, expect, it } from "vitest"
import { displayHours, displayMusic, displayPrice, clubLangOf } from "../clubDisplay"
import { CLUB_LANGS, lexCoreOf } from "../intl/clubLexExtra"
import { CLUB_LEX } from "../intl/clubLex"

describe("horario, precio y música en el idioma de la web", () => {
  it("en español no se toca nada", () => {
    expect(displayHours("es", "V/S 23:00-06:00")).toBe("V/S 23:00-06:00")
    expect(displayPrice("es", "15€ con copa")).toEqual({ text: "15€ con copa", translated: true })
    expect(displayMusic("es", "Techno, Comercial")).toBe("Techno, Comercial")
    expect(clubLangOf("es")).toBeNull()
    expect(clubLangOf("xx")).toBeNull()
  })

  it("reconoce los 7 idiomas", () => {
    for (const l of ["en", "de", "fr", "it", "nl", "pt", "ca"]) expect(clubLangOf(l), l).toBe(l)
    expect([...CLUB_LANGS].sort()).toEqual(["ca", "de", "en", "fr", "it", "nl", "pt"])
  })

  it("horario por idioma", () => {
    expect(displayHours("en", "V/S 23:00-06:00")).toBe("Fri, Sat 23:00–06:00")
    expect(displayHours("de", "V/S 23:00-06:00")).toBe("Fr, Sa 23:00–06:00")
    expect(displayHours("nl", "V/S 23:00-06:00")).toBe("vr, za 23:00–06:00")
    expect(displayHours("pt", "V/S 23:00-06:00")).toBe("sex, sáb 23:00–06:00")
    expect(displayHours("ca", "V/S 23:00-06:00")).toBe("dv, ds 23:00–06:00")
    // Varias franjas y sin días (usa los días abiertos del local)
    expect(displayHours("en", "J 23:00-05:00, V/S 23:00-06:00")).toBe("Thu 23:00–05:00 · Fri, Sat 23:00–06:00")
    expect(displayHours("en", "22:00-03:00", ["L", "M", "X", "J", "V", "S", "D"])).toBe("Every night 22:00–03:00")
    expect(displayHours("nl", "22:00-03:00", ["L", "M", "X", "J", "V", "S", "D"])).toBe("Elke nacht 22:00–03:00")
  })

  it("un horario que no se entiende se deja como está", () => {
    expect(displayHours("en", "Consultar en el local")).toBe("Consultar en el local")
    expect(displayHours("fr", "")).toBe("")
    expect(displayHours("fr", null)).toBe("")
  })

  it("precio: traduce solo si entiende todas las palabras", () => {
    expect(displayPrice("en", "15€ con copa")).toEqual({ text: "15€ with a drink", translated: true })
    expect(displayPrice("de", "Gratis")).toEqual({ text: "Kostenlos", translated: true })
    expect(displayPrice("nl", "15€ con copa")).toEqual({ text: "15€ met een drankje", translated: true })
    expect(displayPrice("pt", "Gratis hasta las 1:00")).toEqual({ text: "Grátis até 1:00", translated: true })
    expect(displayPrice("ca", "10€ con copa")).toEqual({ text: "10€ amb copa", translated: true })
    expect(displayPrice("fr", "Entrada gratis").translated).toBe(true)
    // palabra desconocida → original y translated:false (para pedir traducción del texto libre)
    expect(displayPrice("en", "Depende del DJ invitado")).toEqual({ text: "Depende del DJ invitado", translated: false })
    expect(displayPrice("it", "")).toEqual({ text: "", translated: true })
  })

  it("música", () => {
    expect(displayMusic("en", "Techno, Comercial")).toBe("Techno, Commercial")
    expect(displayMusic("de", "Reggaeton / Latina")).toBe("Reggaeton, Latin")
    expect(displayMusic("nl", "Comercial")).toBe("Commercieel")
    expect(displayMusic("pt", "Electrónica")).toBe("Eletrónica")
    expect(displayMusic("ca", "Hip hop")).toBe("Hip hop")
    // estilo que no conoce: se queda como está
    expect(displayMusic("en", "Hyperpop experimental")).toBe("Hyperpop experimental")
    expect(displayMusic("en", null)).toBe("")
  })

  it("los tres idiomas nuevos tienen el mismo conjunto de palabras que los de las páginas de Google", () => {
    const ref = lexCoreOf("en")
    for (const l of ["nl", "pt", "ca"] as const) {
      const lex = lexCoreOf(l)
      expect(Object.keys(lex.musicLabel).sort(), `música ${l}`).toEqual(Object.keys(ref.musicLabel).sort())
      expect(Object.keys(lex.priceWords).sort(), `precio ${l}`).toEqual(Object.keys(ref.priceWords).sort())
      expect(lex.days).toHaveLength(7)
      expect(new Set(lex.days).size, `días ${l}`).toBe(7)
      expect(lex.pricePhrases).toHaveLength(ref.pricePhrases.length)
      // nada en español sin traducir (salvo nombres que se escriben igual)
      for (const [k, v] of Object.entries(lex.priceWords)) {
        if (["de", "la", "el", "las", "los"].includes(k)) expect(v).toBe("")
      }
    }
  })

  it("los idiomas con página propia siguen igual", () => {
    expect(lexCoreOf("fr")).toBe(CLUB_LEX.fr)
  })
})
