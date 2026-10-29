import { describe, it, expect } from "vitest"
import { addDaysYmd, nightDateMadrid, eventHappensOn, eventInHomeWindow } from "../homeEvents"

describe("addDaysYmd", () => {
  it("suma y resta días, también al cambiar de mes y de año", () => {
    expect(addDaysYmd("2026-10-30", 2)).toBe("2026-11-01")
    expect(addDaysYmd("2026-12-31", 1)).toBe("2027-01-01")
    expect(addDaysYmd("2026-03-01", -1)).toBe("2026-02-28")
  })
  it("no se descuadra con el cambio de hora", () => {
    expect(addDaysYmd("2026-10-24", 2)).toBe("2026-10-26")
    expect(addDaysYmd("2026-03-28", 2)).toBe("2026-03-30")
  })
})

describe("nightDateMadrid", () => {
  it("de día y de noche es la fecha de Madrid", () => {
    expect(nightDateMadrid(new Date("2026-10-30T10:00:00Z"))).toBe("2026-10-30")
    expect(nightDateMadrid(new Date("2026-10-30T22:30:00Z"))).toBe("2026-10-30") // 23:30 en Madrid
  })
  it("de madrugada (antes de las 6:00 de Madrid) sigue siendo la noche de ayer", () => {
    expect(nightDateMadrid(new Date("2026-10-30T00:30:00Z"))).toBe("2026-10-29") // 01:30 en Madrid
    expect(nightDateMadrid(new Date("2026-10-30T04:59:00Z"))).toBe("2026-10-29") // 05:59
  })
  it("a las 6:00 ya es el día nuevo", () => {
    expect(nightDateMadrid(new Date("2026-10-30T05:00:00Z"))).toBe("2026-10-30") // 06:00
  })
  it("en verano (UTC+2) también", () => {
    expect(nightDateMadrid(new Date("2026-07-14T22:30:00Z"))).toBe("2026-07-14") // 00:30 del 15 → noche del 14
    expect(nightDateMadrid(new Date("2026-07-15T04:00:00Z"))).toBe("2026-07-15") // 06:00
  })
  it("cerca de la medianoche en UTC no se equivoca de día", () => {
    expect(nightDateMadrid(new Date("2026-10-30T23:30:00Z"))).toBe("2026-10-30") // 00:30 del 31 → noche del 30
  })
})

describe("eventHappensOn", () => {
  it("evento de un día", () => {
    expect(eventHappensOn("2026-10-30", null, "2026-10-30")).toBe(true)
    expect(eventHappensOn("2026-10-30", null, "2026-10-31")).toBe(false)
  })
  it("evento de varios días", () => {
    expect(eventHappensOn("2026-11-12", "2026-11-15", "2026-11-14")).toBe(true)
    expect(eventHappensOn("2026-11-12", "2026-11-15", "2026-11-16")).toBe(false)
  })
  it("sin fecha no ocurre", () => {
    expect(eventHappensOn(null, null, "2026-10-30")).toBe(false)
    expect(eventHappensOn("", null, "2026-10-30")).toBe(false)
  })
})

describe("eventInHomeWindow", () => {
  const today = "2026-10-30"
  it("hoy y los dos días siguientes entran", () => {
    expect(eventInHomeWindow("2026-10-30", null, today)).toBe(true)
    expect(eventInHomeWindow("2026-10-31", null, today)).toBe(true)
    expect(eventInHomeWindow("2026-11-01", null, today)).toBe(true)
  })
  it("a partir del tercer día ya no", () => {
    expect(eventInHomeWindow("2026-11-02", null, today)).toBe(false)
    expect(eventInHomeWindow("2026-11-14", null, today)).toBe(false)
  })
  it("los que ya pasaron no entran", () => {
    expect(eventInHomeWindow("2026-10-29", null, today)).toBe(false)
    expect(eventInHomeWindow("2026-07-01", null, today)).toBe(false)
  })
  it("sin fecha no entra", () => {
    expect(eventInHomeWindow(null, null, today)).toBe(false)
    expect(eventInHomeWindow(undefined, undefined, today)).toBe(false)
  })
  it("un evento de varios días entra si alguno de sus días cae en la ventana", () => {
    expect(eventInHomeWindow("2026-10-28", "2026-10-31", today)).toBe(true) // empezó antes, sigue hoy
    expect(eventInHomeWindow("2026-11-01", "2026-11-05", today)).toBe(true) // empieza dentro de 2 días
    expect(eventInHomeWindow("2026-11-02", "2026-11-05", today)).toBe(false)
    expect(eventInHomeWindow("2026-10-25", "2026-10-29", today)).toBe(false) // ya acabó
  })
  it("una fecha final anterior a la inicial no rompe nada", () => {
    expect(eventInHomeWindow("2026-10-31", "2026-10-20", today)).toBe(true)
    expect(eventInHomeWindow("2026-11-10", "2026-10-20", today)).toBe(false)
  })
  it("cambio de mes y de año", () => {
    expect(eventInHomeWindow("2027-01-01", null, "2026-12-30")).toBe(true)
    expect(eventInHomeWindow("2027-01-02", null, "2026-12-30")).toBe(false)
  })
})
