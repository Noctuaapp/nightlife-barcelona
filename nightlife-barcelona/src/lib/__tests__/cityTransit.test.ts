import { afterEach, describe, expect, it, vi } from "vitest"
import { CITY_TRANSIT, cityTransit, madridL6EarlyClose } from "../cityTransit"
import { getMetroTonight, madridMetroAt } from "../transitHours"
import { TAXI_PHONES, telHref } from "../taxiOptions"

afterEach(() => vi.useRealTimers())

describe("transporte por ciudad", () => {
  it("Barcelona conserva sus radio taxis de siempre y Madrid trae los suyos, distintos", () => {
    expect(cityTransit("barcelona").taxiPhones).toBe(TAXI_PHONES)
    expect(telHref(cityTransit("barcelona").taxiPhones[0].phone)).toBe("tel:933033033")
    expect(cityTransit("madrid").taxiPhones.map((p) => p.phone)).toEqual(["915478200", "913712131", "914051213"])
    expect(telHref(cityTransit("madrid").taxiPhones[0].phone)).toBe("tel:915478200")
    const bcn = new Set(cityTransit("barcelona").taxiPhones.map((p) => p.phone))
    for (const p of cityTransit("madrid").taxiPhones) expect(bcn.has(p.phone)).toBe(false)
  })

  it("el punto donde converge el bus nocturno cae en su ciudad (Plaça Catalunya / Cibeles)", () => {
    const { lat: bl, lon: bo } = CITY_TRANSIT.barcelona.nightBusHub
    const { lat: ml, lon: mo } = CITY_TRANSIT.madrid.nightBusHub
    expect(bl).toBeCloseTo(41.3869, 3)
    expect(bo).toBeCloseTo(2.1701, 3)
    expect(ml).toBeCloseTo(40.4194, 3)
    expect(mo).toBeCloseTo(-3.6928, 3)
  })
})

describe("horario del metro de Madrid", () => {
  it("abre de 06:00 a 01:30, todos los días", () => {
    expect(madridMetroAt(0)).toMatchObject({ state: "open", closes: "01:30" })
    expect(madridMetroAt(89).state).toBe("open")
    expect(madridMetroAt(90).state).toBe("closed")
    expect(madridMetroAt(5 * 60 + 59).state).toBe("closed")
    expect(madridMetroAt(6 * 60).state).toBe("open")
    expect(madridMetroAt(23 * 60 + 59).state).toBe("open")
  })

  it("getMetroTonight('madrid') lee la hora de Madrid; sin ciudad sigue siendo Barcelona", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-14T04:00:00Z")) // 05:00 en Madrid
    expect(getMetroTonight("madrid").state).toBe("closed")
    vi.setSystemTime(new Date("2026-11-14T00:00:00Z")) // 01:00 en Madrid
    expect(getMetroTonight("madrid")).toMatchObject({ state: "open", closes: "01:30" })
    expect(getMetroTonight()).toEqual(getMetroTonight("barcelona"))
  })
})

describe("aviso de la L6 de Madrid", () => {
  const dentro = new Date("2026-11-14T20:00:00Z")
  it("sale si se enseña la L6 y estamos dentro de la ventana", () => {
    expect(madridL6EarlyClose(["L1", "L6"], dentro)).toBe(true)
    expect(madridL6EarlyClose([" l6 "], dentro)).toBe(true)
  })
  it("no sale sin L6", () => {
    expect(madridL6EarlyClose(["L1", "L3"], dentro)).toBe(false)
    expect(madridL6EarlyClose([], dentro)).toBe(false)
  })
  it("se apaga solo fuera de la ventana (antes del 11/01/2026 y desde el 01/03/2027)", () => {
    expect(madridL6EarlyClose(["L6"], new Date("2026-01-10T12:00:00Z"))).toBe(false)
    expect(madridL6EarlyClose(["L6"], new Date("2026-01-11T12:00:00Z"))).toBe(true)
    expect(madridL6EarlyClose(["L6"], new Date("2027-02-28T12:00:00Z"))).toBe(true)
    expect(madridL6EarlyClose(["L6"], new Date("2027-03-01T12:00:00Z"))).toBe(false)
  })
})
