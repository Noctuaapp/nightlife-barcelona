import { describe, it, expect, vi } from "vitest"
import { METRO_EXTRA, METRO_LINE_CODES, METRO_LINE_SECTIONS, buildMetroLine, isMetroLine, metroLineSummary } from "../metroLines"
import { METRO_STATIONS } from "../metroStations"
import { alightOptions, lineStopNames, resolveSegment } from "../nitbusRoutes"
import { distanceInMeters } from "../geo"

// nitbusRoutes importa el cliente de Supabase (necesita variables de entorno); aquí solo se prueba lo puro.
vi.mock("../supabase", () => ({ supabase: {} }))

const byName = new Map(METRO_STATIONS.map((s) => [s.name, s]))
const allNames = (code: string) => METRO_LINE_SECTIONS[code].flatMap((s) => s.stations)

describe("orden de las líneas de metro", () => {
  it("están las doce líneas y cada una con el nº de estaciones esperado", () => {
    expect(METRO_LINE_CODES).toEqual(["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10", "L11", "L12"])
    const n: Record<string, number> = { L1: 30, L2: 18, L3: 26, L4: 22, L5: 27, L6: 8, L7: 7, L8: 11, L9: 24, L10: 17, L11: 5, L12: 2 }
    for (const c of METRO_LINE_CODES) expect(allNames(c).length, c).toBe(n[c])
  })

  it("no repite una estación dentro de un tramo", () => {
    for (const c of METRO_LINE_CODES)
      for (const s of METRO_LINE_SECTIONS[c]) expect(new Set(s.stations).size, `${c} ${s.name ?? ""}`).toBe(s.stations.length)
  })

  it("cada estación está en metroStations.ts, salvo las tres conocidas", () => {
    for (const c of METRO_LINE_CODES)
      for (const n of allNames(c)) if (!byName.has(n)) expect(METRO_EXTRA, `${c} ${n}`).toContain(n)
    for (const n of METRO_EXTRA) expect(byName.has(n), n).toBe(false)
  })

  it("el orden y las líneas de cada estación coinciden en los dos sentidos", () => {
    for (const c of METRO_LINE_CODES) {
      const inOrder = new Set(allNames(c).filter((n) => byName.has(n)))
      const withLine = new Set(METRO_STATIONS.filter((s) => (s.lines ?? []).includes(c)).map((s) => s.name))
      expect([...inOrder].filter((n) => !withLine.has(n)), `${c}: en el orden pero sin la línea`).toEqual([])
      expect([...withLine].filter((n) => !inOrder.has(n)), `${c}: con la línea pero fuera del orden`).toEqual([])
    }
  })

  it("estaciones consecutivas están cerca (si no, el orden está mal)", () => {
    for (const c of METRO_LINE_CODES)
      for (const s of METRO_LINE_SECTIONS[c])
        for (let i = 1; i < s.stations.length; i++) {
          const a = byName.get(s.stations[i - 1])
          const b = byName.get(s.stations[i])
          if (!a || !b) continue
          expect(distanceInMeters(a.lat, a.lon, b.lat, b.lon), `${c}: ${a.name} → ${b.name}`).toBeLessThan(3000)
        }
  })
})

describe("buildMetroLine", () => {
  it("L1: dos sentidos, uno inverso del otro", () => {
    const l1 = buildMetroLine("l1")!
    expect(l1.ordered).toBe(true)
    expect(l1.stopCount).toBe(30)
    expect(l1.directions).toHaveLength(2)
    expect(l1.directions[0].from).toBe("Hospital de Bellvitge")
    expect(l1.directions[0].to).toBe("Fondo")
    expect(l1.directions[1].stops.map((s) => s.name)).toEqual([...l1.directions[0].stops.map((s) => s.name)].reverse())
  })
  it("transbordos: las demás líneas de la estación, ordenadas", () => {
    const cat = buildMetroLine("L1")!.directions[0].stops.find((s) => s.name === "Catalunya")!
    expect(cat.others).toEqual(["L3", "L6", "L7"])
    const sag = buildMetroLine("L5")!.directions[0].stops.find((s) => s.name === "La Sagrera")!
    expect(sag.others).toEqual(["L1", "L9", "L10"])
  })
  it("las estaciones que faltan en metroStations salen sin coordenadas", () => {
    const sb = buildMetroLine("L8")!.directions[0].stops.find((x) => x.name === "Sant Boi")!
    expect(sb).toMatchObject({ name: "Sant Boi", lat: null, lon: null })
  })
  it("L9 Sud acaba en Aeroport T1, que ya tiene coordenadas (junto a la T2, no encima)", () => {
    const t1 = buildMetroLine("L9")!.directions.find((d) => d.to === "Aeroport T1")!.stops.at(-1)!
    expect(t1.name).toBe("Aeroport T1")
    expect(t1.lat).not.toBeNull()
    expect(t1.others).toEqual([])
    const t2 = byName.get("Aeroport T2")!
    const d = distanceInMeters(t1.lat!, t1.lon!, t2.lat, t2.lon)
    expect(d).toBeGreaterThan(500)
    expect(d).toBeLessThan(2500)
  })
  it("L9 y L10 llevan selector de tramo (Nord y Sud), con sus sentidos y su nº de estaciones", () => {
    const l9 = buildMetroLine("L9")!
    expect(l9.sections).toEqual([
      { name: "Nord", dirs: [0, 1], stopCount: 9 },
      { name: "Sud", dirs: [2, 3], stopCount: 15 },
    ])
    const l10 = buildMetroLine("L10")!
    expect(l10.sections).toEqual([
      { name: "Nord", dirs: [0, 1], stopCount: 6 },
      { name: "Sud", dirs: [2, 3], stopCount: 11 },
    ])
    // Los sentidos de cada tramo son los suyos.
    expect(l9.directions[2].from).toBe("Zona Universitària")
    expect(l10.directions[0].from).toBe("La Sagrera")
  })
  it("las demás líneas (también L11 y L12) no llevan selector de tramo", () => {
    for (const c of METRO_LINE_CODES.filter((x) => x !== "L9" && x !== "L10")) expect(buildMetroLine(c)!.sections, c).toBeUndefined()
    expect(buildMetroLine("L11")!.stopCount).toBe(5)
    expect(buildMetroLine("L12")!.stopCount).toBe(2)
  })
  it("código desconocido", () => {
    expect(buildMetroLine("L99")).toBeNull()
    expect(isMetroLine("l10")).toBe(true)
    expect(isMetroLine("N24")).toBe(false)
  })
  it("resumen de recorrido", () => {
    expect(metroLineSummary("L1")).toBe("Hospital de Bellvitge ↔ Fondo")
    expect(metroLineSummary("L9")).toBe("Nord: La Sagrera ↔ Can Zam · Sud: Zona Universitària ↔ Aeroport T1")
  })
})

describe("«Mi trayecto» en el metro", () => {
  const dist = distanceInMeters
  it("L1: subir en Universitat y bajar en Arc de Triomf = 3 paradas hacia Fondo", () => {
    const l1 = buildMetroLine("L1")!
    const seg = resolveSegment(l1, "Universitat", "Arc de Triomf", dist)!
    expect(seg.dir).toBe(0)
    expect(seg.stops).toBe(3)
    expect(l1.directions[0].stops[seg.from].name).toBe("Universitat")
    expect(l1.directions[0].stops[seg.to].name).toBe("Arc de Triomf")
  })
  it("L1: al revés va en el otro sentido", () => {
    const l1 = buildMetroLine("L1")!
    expect(resolveSegment(l1, "Arc de Triomf", "Universitat", dist)!.dir).toBe(1)
  })
  it("L9: solo se puede bajar en estaciones del mismo tramo", () => {
    const l9 = buildMetroLine("L9")!
    const sud = alightOptions(l9, "Zona Universitària")
    expect(sud).toContain("Aeroport T2")
    expect(sud).not.toContain("Bon Pastor")
    expect(resolveSegment(l9, "Bon Pastor", "Aeroport T2", dist)).toBeNull()
    expect(resolveSegment(l9, "Bon Pastor", "Can Zam", dist)!.stops).toBe(6) // Can Peixauet, Santa Rosa, Fondo, Església Major, Singuerlín, Can Zam
  })
  it("la lista de «Subo en» trae todas las estaciones sin repetir", () => {
    expect(lineStopNames(buildMetroLine("L10")!)).toHaveLength(17)
    expect(lineStopNames(buildMetroLine("L2")!)).toHaveLength(18)
  })
})
