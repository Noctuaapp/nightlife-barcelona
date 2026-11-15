import { describe, expect, it } from "vitest"
import { BUHO_LINES, BUHO_STOPS } from "../madridBuhos"
import { nearbyBuhos } from "../buhos"

describe("búhos de Madrid (datos de la EMT)", () => {
  it("tiene las 32 líneas nocturnas, sin repetir", () => {
    const codes = BUHO_LINES.map((l) => l.code)
    expect(codes).toHaveLength(32)
    expect(new Set(codes).size).toBe(32)
    for (let n = 1; n <= 28; n++) expect(codes, `N${n}`).toContain(`N${n}`)
    for (const c of ["N31", "N32", "NC1", "NC2"]) expect(codes).toContain(c)
  })

  it("cada línea recorre varias paradas en cada sentido y todos los índices existen", () => {
    for (const l of BUHO_LINES) {
      for (const dir of [0, 1] as const) {
        expect(l.stops[dir].length, `${l.code} sentido ${dir}`).toBeGreaterThanOrEqual(5)
        for (const i of l.stops[dir]) expect(BUHO_STOPS[i], `${l.code} #${i}`).toBeDefined()
      }
    }
  })

  it("todas las paradas están en Madrid y se usan en alguna línea", () => {
    const used = new Set(BUHO_LINES.flatMap((l) => [...l.stops[0], ...l.stops[1]]))
    BUHO_STOPS.forEach((s, i) => {
      expect(used.has(i), s[1]).toBe(true)
      expect(s[2], s[1]).toBeGreaterThan(40.2)
      expect(s[2], s[1]).toBeLessThan(40.7)
      expect(s[3], s[1]).toBeGreaterThan(-4.0)
      expect(s[3], s[1]).toBeLessThan(-3.4)
    })
  })

  it("N1–N24 y N27 salen de Cibeles, N25 y N26 de Alonso Martínez; el sentido «home» sale del centro", () => {
    const first = (code: string) => {
      const l = BUHO_LINES.find((x) => x.code === code)!
      return BUHO_STOPS[l.stops[l.home as 0 | 1][0]]
    }
    const cibeles = { lat: 40.4194, lon: -3.6928 }
    for (const code of ["N1", "N10", "N24", "N27"]) {
      const s = first(code)
      expect(Math.abs(s[2] - cibeles.lat), code).toBeLessThan(0.004)
      expect(Math.abs(s[3] - cibeles.lon), code).toBeLessThan(0.004)
    }
    expect(BUHO_LINES.find((l) => l.code === "N1")!.home).toBe(0)
    expect(BUHO_LINES.find((l) => l.code === "NC1")!.home).toBeNull()
    expect(BUHO_LINES.find((l) => l.code === "NC2")!.home).toBeNull()
  })

  it("los destinos y las paradas llevan su ortografía (sin «De», «La»… en mayúscula a mitad de nombre)", () => {
    for (const l of BUHO_LINES) {
      expect(l.heads[0].length, l.code).toBeGreaterThan(2)
      expect(l.heads[1].length, l.code).toBeGreaterThan(2)
      expect(l.name, l.code).not.toMatch(/ (De|Del|La|Las|Los|El) /)
    }
    expect(BUHO_LINES.find((l) => l.code === "N13")!.heads[0]).toBe("Colonia San Cristóbal de los Ángeles")
    // Tras un « - » empieza otro nombre (Pedroñeras - El Provencio), así que se mira cada segmento por separado.
    for (const s of BUHO_STOPS) {
      for (const seg of s[1].split(" - ")) expect(seg.split(" ").slice(1), s[1]).not.toContain("De")
      for (const seg of s[1].split(" - ")) expect(seg.split(" ").slice(1).filter((w) => ["Del", "La", "Las", "Los", "El", "Y"].includes(w)), s[1]).toEqual([])
    }
  })

  it("las frecuencias son minutos razonables: el finde pasa más seguido que entre semana", () => {
    for (const l of BUHO_LINES) {
      for (const r of [l.weekend, l.weeknight]) {
        expect(r, l.code).not.toBeNull()
        expect(r![0], l.code).toBeGreaterThanOrEqual(10)
        expect(r![1], l.code).toBeLessThanOrEqual(60)
        expect(r![0], l.code).toBeLessThanOrEqual(r![1])
      }
    }
    const n1 = BUHO_LINES.find((l) => l.code === "N1")!
    expect(n1.weekend![0]).toBeLessThan(n1.weeknight![0])
  })
})

describe("búhos cercanos", () => {
  const cibeles = { lat: 40.4194, lon: -3.6928 }
  it("en pleno centro salen líneas y solo en el sentido que se aleja del centro", () => {
    const rows = nearbyBuhos(cibeles.lat, cibeles.lon, 700, 40)
    expect(rows.length).toBeGreaterThan(10)
    for (const r of rows) {
      const line = BUHO_LINES.find((l) => l.code === r.code)!
      if (line.home !== null) expect(r.toward, r.code).toBe(line.heads[line.home])
    }
    expect(rows.every((r) => r.distanceMeters <= 700)).toBe(true)
  })

  it("devuelve como mucho 6 filas por defecto, ordenadas por distancia", () => {
    const rows = nearbyBuhos(cibeles.lat, cibeles.lon)
    expect(rows.length).toBeLessThanOrEqual(6)
    for (let i = 1; i < rows.length; i++) expect(rows[i].distanceMeters).toBeGreaterThanOrEqual(rows[i - 1].distanceMeters)
  })

  it("lejos del centro enseña los dos sentidos de cada línea", () => {
    // Una parada de la N1 en su extremo (Sanchinarro), a más de 4 km del centro.
    const n1 = BUHO_LINES.find((l) => l.code === "N1")!
    const end = BUHO_STOPS[n1.stops[0][n1.stops[0].length - 1]]
    const rows = nearbyBuhos(end[2], end[3], 300, 40).filter((r) => r.code === "N1")
    expect(rows.map((r) => r.toward).sort()).toEqual([n1.heads[0], n1.heads[1]].sort())
  })

  it("lejos de cualquier parada (Barcelona) no sale nada", () => {
    expect(nearbyBuhos(41.3869, 2.1701)).toEqual([])
  })
})
