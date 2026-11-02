import { describe, it, expect } from "vitest"
import { nightDays, qualifiesOnDay, tonightIndex } from "../essentialNight"

// L M X J V S D = lunes … domingo; «·» = esa noche NO cumple.
const L = ["L", "M", "X", "J", "V", "S", "D"]
const mask = (raw: string | null) => {
  const n = nightDays(raw)
  return n ? n.map((b, i) => (b ? L[i] : "·")).join("") : null
}

describe("nightDays · formato de siempre", () => {
  it("24 horas todos los días", () => {
    expect(mask("Open 24 hours")).toBe("LMXJVSD")
    expect(mask("Monday to Sunday: Open 24 hours")).toBe("LMXJVSD")
    expect(mask("24h")).toBe("LMXJVSD")
    expect(mask("Abierto 24 horas")).toBe("LMXJVSD")
  })

  it("solo cuentan los días que cumplen", () => {
    expect(mask("Friday 9:00 AM – 1:00 AM | Saturday 9:00 AM – 1:00 AM")).toBe("····VS·")
    expect(mask("Monday to Thursday 9:00 AM – 11:00 PM | Friday to Saturday 9:00 AM – 3:00 AM")).toBe("····VS·")
    expect(mask("Monday to Sunday 12:00 PM – 3:00 AM")).toBe("LMXJVSD")
  })

  it("cerrar a medianoche NO es de noche; a la 1:00 en punto sí", () => {
    expect(mask("Monday to Sunday 10:00 AM – 12:00 AM")).toBe("·······")
    expect(mask("Monday to Sunday 10:00 AM – 12:30 AM")).toBe("·······")
    expect(mask("Monday to Sunday 10:00 AM – 1:00 AM")).toBe("LMXJVSD")
  })

  it("un día de 24 h cuenta ese día (y la noche anterior, porque a la 1:00 ya está abierto)", () => {
    expect(mask("Monday: Open 24 hours | Tuesday: 9:00 AM – 9:00 PM")).toBe("L·····D")
  })

  it("horario de día no es de noche, ni el que abre de madrugada y cierra por la tarde", () => {
    expect(mask("Monday to Friday 9:00 AM – 9:00 PM")).toBe("·······")
    expect(mask("6:00 AM – 10:00 PM")).toBe("·······")
    expect(mask("Monday to Friday 5:30 AM – 9:30 PM")).toBe("·······")
  })

  it("entiende los espacios raros de Google y las horas en 24 h", () => {
    expect(mask("Friday: 6:00 PM – 2:30 AM")).toBe("····V··")
    expect(mask("Friday 21:00 - 03:00")).toBe("····V··")
  })

  it("abrir y cerrar a la misma hora es 24 h", () => {
    expect(mask("Monday to Sunday 12:00 AM – 12:00 AM")).toBe("LMXJVSD")
  })

  it("abierto a la 1:00 de la madrugada del día siguiente cuenta para la noche anterior", () => {
    expect(mask("Saturday 12:00 AM – 6:00 AM")).toBe("····V··")
  })
})

describe("nightDays · solo la hora de cierre, escrita a mano (horarios reales de la base de datos)", () => {
  it("todos los días", () => {
    expect(mask("Open until 3:00 AM daily")).toBe("LMXJVSD")
    expect(mask("Open until 2:00 AM daily")).toBe("LMXJVSD")
    expect(mask("1:00 AM")).toBe("LMXJVSD")
    expect(mask("2:30 AM")).toBe("LMXJVSD")
  })

  it("antes de la 1:00 no cuenta", () => {
    for (const h of ["11:30 PM", "11:00 PM", "10:00 PM", "12:30 AM", "Medianoche"]) expect(mask(h)).toBe("·······")
  })

  it("solo algunos días", () => {
    expect(mask("Hasta 1:30 AM viernes-domingo")).toBe("····VSD")
    expect(mask("Hasta 2:00 AM viernes-sábado")).toBe("····VS·")
  })

  it("con excepción entre paréntesis", () => {
    expect(mask("2:30 AM (3:00 AM sábado)")).toBe("LMXJVSD")
    expect(mask("Medianoche (1:00 AM viernes-sábado)")).toBe("····VS·")
    expect(mask("12:30 AM (1:30 AM sábado-domingo)")).toBe("·····SD")
    expect(mask("10:00 AM – 12:00 AM (viernes-sábado hasta las 2:00 AM)")).toBe("····VS·")
  })
})

describe("nightDays · lo que no entiende", () => {
  it("vacío o texto sin horario → null (no se inventa nada)", () => {
    expect(nightDays(null)).toBeNull()
    expect(nightDays("")).toBeNull()
    expect(nightDays("   ")).toBeNull()
    expect(nightDays("Cerrado")).toBeNull()
    expect(nightDays("Consultar en el local")).toBeNull()
  })
  it("qualifiesOnDay es false cuando no se entiende", () => {
    expect(qualifiesOnDay("Cerrado", 4)).toBe(false)
    expect(qualifiesOnDay("Hasta 2:00 AM viernes-sábado", 4)).toBe(true)
    expect(qualifiesOnDay("Hasta 2:00 AM viernes-sábado", 2)).toBe(false)
  })
})

describe("tonightIndex", () => {
  it("jueves a mediodía es la noche del jueves", () => {
    expect(tonightIndex(new Date("2026-11-05T11:00:00Z"))).toBe(3)
  })
  it("a las 2:00 del viernes todavía es la noche del jueves", () => {
    expect(tonightIndex(new Date("2026-11-06T01:00:00Z"))).toBe(3)
  })
  it("el límite son las 6:00 de Madrid", () => {
    expect(tonightIndex(new Date("2026-11-02T04:59:00Z"))).toBe(6) // lunes 5:59 → noche del domingo
    expect(tonightIndex(new Date("2026-11-02T05:00:00Z"))).toBe(0) // lunes 6:00 → lunes
  })
})
