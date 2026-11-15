import { describe, expect, it } from "vitest"
import {
  MADRID_BUHO_CODES,
  MADRID_METRO_CODES,
  buildMadridBuhoLine,
  buildMadridMetroLine,
  isMadridBuhoLine,
  isMadridMetroCircular,
  isMadridMetroLine,
  madridBuhoFrequency,
  madridBuhoSearch,
  madridBuhoSummary,
  madridMetroSearch,
  madridMetroSummary,
} from "../madridTransit"
import { MADRID_METRO_STATIONS } from "../madridMetro"
import { CITIES, inBox } from "../cities"
import { MADRID_BUHO_SAMPLE, MADRID_METRO_SAMPLE, MADRID_METRO_TOTAL } from "../madridTransitSample"
import { metroLineColor } from "../transitColors"

describe("metro de Madrid", () => {
  it("L1 a L12 y el Ramal, en ese orden", () => {
    expect(MADRID_METRO_CODES).toEqual(["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10", "L11", "L12", "R"])
    for (const c of MADRID_METRO_CODES) expect(isMadridMetroLine(c)).toBe(true)
    expect(isMadridMetroLine("l3")).toBe(true) // sin importar mayúsculas
    expect(isMadridMetroLine("L13")).toBe(false)
    expect(buildMadridMetroLine("L13")).toBeNull()
  })

  it("cada línea trae sus estaciones en orden, con coordenadas y los dos sentidos", () => {
    for (const code of MADRID_METRO_CODES) {
      const line = buildMadridMetroLine(code)!
      expect(line.ordered).toBe(true)
      expect(line.directions).toHaveLength(2)
      const [a, b] = line.directions
      expect(a.stops.length).toBeGreaterThanOrEqual(2)
      expect(b.stops.map((s) => s.name)).toEqual([...a.stops.map((s) => s.name)].reverse())
      expect(a.from).toBe(b.to)
      expect(a.to).toBe(b.from)
      expect(line.stopCount).toBe(a.stops.length)
      for (const s of a.stops) {
        expect(s.lat, `${code} ${s.name}`).not.toBeNull()
        expect(s.lon, `${code} ${s.name}`).not.toBeNull()
        expect(inBox(CITIES.madrid.box, s.lat!, s.lon!), `${code} ${s.name}`).toBe(true)
        expect(s.others).not.toContain(code)
      }
    }
  })

  it("los transbordos son simétricos: si A enlaza con B en una estación, B enlaza con A", () => {
    for (const code of MADRID_METRO_CODES) {
      for (const s of buildMadridMetroLine(code)!.directions[0].stops) {
        for (const other of s.others) {
          const there = buildMadridMetroLine(other)!.directions[0].stops.find((x) => x.name === s.name)
          expect(there, `${s.name}: ${code} ↔ ${other}`).toBeDefined()
          expect(there!.others).toContain(code)
        }
      }
    }
  })

  it("solo L6 y L12 son circulares (sin cabeceras ni «Mi trayecto»)", () => {
    for (const code of MADRID_METRO_CODES) {
      expect(isMadridMetroCircular(code)).toBe(code === "L6" || code === "L12")
      expect(!!buildMadridMetroLine(code)!.circular).toBe(code === "L6" || code === "L12")
    }
  })

  it("el resumen de cada línea", () => {
    expect(madridMetroSummary("L1")).toBe("Pinar de Chamartín ↔ Valdecarros")
    expect(madridMetroSummary("R")).toBe("Ópera ↔ Príncipe Pío")
    expect(madridMetroSummary("L6")).toBe("Circular")
    expect(madridMetroSummary("L99")).toBe("")
  })

  it("el buscador trae cada estación una vez, con sus líneas en orden", () => {
    const search = madridMetroSearch()
    const names = search.map((e) => e.name)
    expect(new Set(names).size).toBe(names.length)
    const sol = search.find((e) => e.name === "Sol")!
    expect(sol.lines).toEqual(["L1", "L2", "L3"])
    // Toda estación con línea está en alguna línea de la lista
    const inLines = new Set(MADRID_METRO_CODES.flatMap((c) => buildMadridMetroLine(c)!.directions[0].stops.map((s) => s.name)))
    for (const st of MADRID_METRO_STATIONS) if ((st.lines ?? []).length > 0) expect(inLines.has(st.name), st.name).toBe(true)
  })

  it("las insignias de Madrid tienen color propio (también el Ramal)", () => {
    for (const code of MADRID_METRO_CODES) expect(metroLineColor(code, "madrid").bg).not.toBe("#7c5cff")
  })
})

describe("búhos de Madrid", () => {
  it("32 líneas: N1 a N32 (sin N29 ni N30) y, al final, las circulares NC1 y NC2", () => {
    expect(MADRID_BUHO_CODES).toHaveLength(32)
    expect(MADRID_BUHO_CODES.slice(-2)).toEqual(["NC1", "NC2"])
    expect(MADRID_BUHO_CODES[0]).toBe("N1")
    const nums = MADRID_BUHO_CODES.filter((c) => !c.startsWith("NC")).map((c) => Number(c.slice(1)))
    expect([...nums].sort((a, b) => a - b)).toEqual(nums)
    for (const c of MADRID_BUHO_CODES) expect(isMadridBuhoLine(c)).toBe(true)
    expect(isMadridBuhoLine("N0")).toBe(false) // N0 es del Nitbus de Barcelona
    expect(buildMadridBuhoLine("N0")).toBeNull()
  })

  it("cada línea trae dos sentidos con sus paradas en orden, dentro de Madrid", () => {
    for (const code of MADRID_BUHO_CODES) {
      const line = buildMadridBuhoLine(code)!
      expect(line.ordered).toBe(true)
      expect(line.directions).toHaveLength(2)
      expect(line.stopCount).toBeGreaterThan(3)
      expect(line.directions[0].from).toBe(line.directions[1].to)
      expect(line.directions[0].to).toBe(line.directions[1].from)
      for (const d of line.directions) {
        expect(d.stops.length, code).toBeGreaterThan(2)
        for (const s of d.stops) {
          expect(inBox(CITIES.madrid.box, s.lat!, s.lon!), `${code} ${s.name}`).toBe(true)
          expect(s.others).not.toContain(code)
        }
      }
    }
  })

  it("los transbordos entre búhos son simétricos", () => {
    for (const code of MADRID_BUHO_CODES) {
      for (const d of buildMadridBuhoLine(code)!.directions) {
        for (const s of d.stops) {
          for (const other of s.others) {
            const line = buildMadridBuhoLine(other)!
            const found = line.directions.some((dd) => dd.stops.some((x) => x.name === s.name && x.others.includes(code)))
            expect(found, `${s.name}: ${code} ↔ ${other}`).toBe(true)
          }
        }
      }
    }
  })

  it("resumen, frecuencia y buscador", () => {
    expect(madridBuhoSummary("N1")).toBe("Plaza de Cibeles ↔ Sanchinarro")
    expect(madridBuhoSummary("N99")).toBe("")
    expect(madridBuhoFrequency("N1")?.weekend).toBeTruthy()
    expect(madridBuhoFrequency("N99")).toBeNull()
    const search = madridBuhoSearch()
    const names = search.map((e) => e.name)
    expect(new Set(names).size).toBe(names.length)
    const cibeles = search.find((e) => /cibeles/i.test(e.name))
    expect(cibeles).toBeDefined()
    expect(cibeles!.lines.length).toBeGreaterThan(5)
  })
})

describe("muestras de la portada", () => {
  it("siguen al día con los datos", () => {
    expect(MADRID_METRO_TOTAL).toBe(MADRID_METRO_CODES.length)
    for (const c of MADRID_METRO_SAMPLE) expect(MADRID_METRO_CODES).toContain(c)
    for (const c of MADRID_BUHO_SAMPLE) expect(MADRID_BUHO_CODES).toContain(c)
  })
})
