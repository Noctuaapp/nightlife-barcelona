import { describe, expect, it } from "vitest"
import { buhoLineNumber, byBuhoLine, loadBuhoMapData } from "../buhoMapData"
import { BUHO_LINES, BUHO_STOPS } from "../madridBuhos"
import { CITIES } from "../cities"

// Datos del mapa de los búhos de Madrid (16/11/2026): cada parada con las líneas que paran en ella.
describe("mapa de los búhos de Madrid", () => {
  it("los códigos de línea salen en orden: N1…N32 y al final las circulares", async () => {
    const { codes } = await loadBuhoMapData()
    expect(codes).toHaveLength(BUHO_LINES.length)
    expect(codes[0]).toBe("N1")
    expect(codes.slice(-2)).toEqual(["NC1", "NC2"])
    const nums = codes.map(buhoLineNumber)
    expect(nums).toEqual([...nums].sort((a, b) => a - b))
    expect(["N10", "N2", "NC1", "N1"].sort(byBuhoLine)).toEqual(["N1", "N2", "N10", "NC1"])
  })

  it("cada parada de una línea sale una sola vez, con todas las líneas que paran en ella", async () => {
    const { stops } = await loadBuhoMapData()
    const ids = stops.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    const used = new Set<number>()
    for (const l of BUHO_LINES) for (const dir of l.stops) for (const i of dir) used.add(i)
    expect(stops).toHaveLength(used.size)
    for (const s of stops) {
      expect(s.lines.length).toBeGreaterThan(0)
      expect([...s.lines].sort(byBuhoLine)).toEqual(s.lines)
    }
    // Una parada de la N1 lleva la N1 entre sus líneas.
    const n1 = BUHO_LINES.find((l) => l.code === "N1")!
    for (const i of n1.stops[0]) expect(stops.find((s) => s.id === i)!.lines).toContain("N1")
  })

  it("el nombre y las coordenadas son los de la parada", async () => {
    const { stops } = await loadBuhoMapData()
    for (const s of stops.slice(0, 50)) {
      expect(s.name).toBe(BUHO_STOPS[s.id][1])
      expect(s.lat).toBe(BUHO_STOPS[s.id][2])
      expect(s.lon).toBe(BUHO_STOPS[s.id][3])
    }
  })

  it("todas las paradas caen en la zona de Madrid (ninguna con coordenadas rotas)", async () => {
    const { stops } = await loadBuhoMapData()
    const c = CITIES.madrid.center
    for (const s of stops) {
      expect(Number.isFinite(s.lat) && Number.isFinite(s.lon), s.name).toBe(true)
      // Los búhos llegan a los municipios de alrededor (Alcobendas, Getafe, Leganés…): un margen de ~0,5° es de sobra.
      expect(Math.abs(s.lat - c.lat), `${s.name} lat`).toBeLessThan(0.5)
      expect(Math.abs(s.lon - c.lng), `${s.name} lon`).toBeLessThan(0.5)
    }
  })
})
