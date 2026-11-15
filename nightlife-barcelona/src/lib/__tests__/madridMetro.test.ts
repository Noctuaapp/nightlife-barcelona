import { describe, expect, it } from "vitest"
import { MADRID_METRO_LINES, MADRID_METRO_STATIONS } from "../madridMetro"
import { nearestMetroStations } from "../metroStations"
import { metroLineColor } from "../transitColors"

describe("Metro de Madrid (datos del CRTM)", () => {
  it("tiene las 12 líneas y el ramal, con las estaciones que dice Metro", () => {
    const count = Object.fromEntries(MADRID_METRO_LINES.map((l) => [l.code, l.stations.length]))
    expect(count).toEqual({ L1: 33, L2: 20, L3: 18, L4: 23, L5: 32, L6: 28, L7: 31, L8: 8, L9: 29, L10: 31, L11: 7, L12: 28, R: 2 })
  })

  it("L6 y L12 son circulares; el resto no", () => {
    expect(MADRID_METRO_LINES.filter((l) => l.circular).map((l) => l.code)).toEqual(["L6", "L12"])
  })

  it("cada línea nombra solo estaciones que existen, sin repetir ninguna", () => {
    const names = new Set(MADRID_METRO_STATIONS.map((s) => s.name))
    for (const line of MADRID_METRO_LINES) {
      expect(new Set(line.stations).size, line.code).toBe(line.stations.length)
      for (const n of line.stations) expect(names.has(n), `${line.code}: ${n}`).toBe(true)
    }
  })

  it("las líneas de cada estación coinciden con las líneas que la listan, en los dos sentidos", () => {
    for (const s of MADRID_METRO_STATIONS) {
      const fromLines = MADRID_METRO_LINES.filter((l) => l.stations.includes(s.name)).map((l) => l.code)
      expect([...(s.lines ?? [])].sort(), s.name).toEqual([...fromLines].sort())
      expect(fromLines.length, `${s.name} sin línea`).toBeGreaterThan(0)
    }
  })

  it("no hay estaciones repetidas y todas caen dentro de la Comunidad de Madrid", () => {
    expect(new Set(MADRID_METRO_STATIONS.map((s) => s.name)).size).toBe(MADRID_METRO_STATIONS.length)
    for (const s of MADRID_METRO_STATIONS) {
      expect(s.lat, s.name).toBeGreaterThan(40.2)
      expect(s.lat, s.name).toBeLessThan(40.62)
      expect(s.lon, s.name).toBeGreaterThan(-3.95)
      expect(s.lon, s.name).toBeLessThan(-3.4)
    }
  })

  it("los nombres llevan su ortografía (nada en mayúsculas) y los transbordos clave están", () => {
    for (const s of MADRID_METRO_STATIONS) expect(s.name, s.name).not.toBe(s.name.toUpperCase())
    const byName = new Map(MADRID_METRO_STATIONS.map((s) => [s.name, s.lines]))
    expect(byName.get("Sol")).toEqual(["L1", "L2", "L3"])
    expect(byName.get("Avenida de América")).toEqual(["L4", "L6", "L7", "L9"])
    expect(byName.get("Príncipe Pío")).toEqual(["L6", "L10", "R"])
    expect(byName.get("Atocha")).toEqual(["L1"])
    expect(byName.has("Atocha Renfe")).toBe(false)
  })

  it("la estación más cercana a la Puerta del Sol es Sol, y la lista de Barcelona sigue igual", () => {
    const near = nearestMetroStations(40.41694, -3.70333, 900, 2, "madrid")
    expect(near[0].name).toBe("Sol")
    expect(near[0].distanceMeters).toBeLessThan(150)
    expect(nearestMetroStations(41.3869, 2.1701)[0].lines?.length).toBeGreaterThan(0)
    // Con las coordenadas de Madrid y la red de Barcelona no sale nada: están a 500 km.
    expect(nearestMetroStations(40.41694, -3.70333)).toEqual([])
  })

  it("los colores de las líneas son los del CRTM y los de Barcelona no cambian", () => {
    expect(metroLineColor("L1", "madrid").bg).toBe("#2DBEF0")
    expect(metroLineColor("L12", "madrid")).toEqual({ bg: "#A49800", fg: "#ffffff" })
    expect(metroLineColor("R", "madrid").fg).toBe("#16141f")
    expect(metroLineColor("L1").bg).toBe("#E4032E")
    expect(metroLineColor("L1", "barcelona").bg).toBe("#E4032E")
  })
})
