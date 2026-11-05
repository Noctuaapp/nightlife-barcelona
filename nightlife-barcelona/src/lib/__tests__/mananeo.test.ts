import { describe, expect, it } from "vitest"
import { mananeoDirectionsUrl, mananeoHoursState, mananeoVisible } from "../mananeo"

describe("mananeo", () => {
  it("el apartado oculto solo lo ve el admin", () => {
    expect(mananeoVisible(false, true)).toBe(false)
    expect(mananeoVisible(true, true)).toBe(true)
  })

  it("con el interruptor abierto lo ve todo el mundo", () => {
    expect(mananeoVisible(false, false)).toBe(true)
  })

  it("el enlace para llegar usa las coordenadas si las hay", () => {
    const url = mananeoDirectionsUrl({ name: "A", latitude: 41.38, longitude: 2.17, address: "Calle 1", neighborhood: null })
    expect(url).toContain("destination=41.38,2.17")
  })

  it("sin coordenadas usa la dirección, y sin nada no hay enlace", () => {
    const withAddress = mananeoDirectionsUrl({ name: "Bar Sol", latitude: null, longitude: null, address: "C/ Mar 3", neighborhood: null })
    expect(withAddress).toContain(encodeURIComponent("Bar Sol, C/ Mar 3, Barcelona"))
    expect(mananeoDirectionsUrl({ name: "X", latitude: null, longitude: null, address: null, neighborhood: null })).toBeNull()
    expect(mananeoDirectionsUrl({ name: "X", latitude: 0, longitude: 0, address: null, neighborhood: null })).toBeNull()
  })

  it("un horario ilegible o vacío no dice nada", () => {
    expect(mananeoHoursState(null)).toBeNull()
    expect(mananeoHoursState("  ")).toBeNull()
    expect(mananeoHoursState("cuando sale el sol")).toBeNull()
  })

  it("un horario válido da abierto o cerrado", () => {
    const s = mananeoHoursState("00:00-23:59")
    expect(s?.state === "open" || s?.state === "closed").toBe(true)
  })
})
