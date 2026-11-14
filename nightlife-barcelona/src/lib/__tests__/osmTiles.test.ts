import { describe, expect, it } from "vitest"
import { TILE_AREAS, TILE_ONLY_AREAS, tilesOf } from "../osmTiles"
import { AREAS, cityFor, isDuplicateVenue, normalize } from "../osmAreas"

// Las cuadrículas de Barcelona tal y como las calculaba la ruta del importador antes de sacarlas a osmTiles.ts.
function barcelonaDeSiempre(): string[] {
  const S = 41.315, N = 41.470, W = 2.050, E = 2.232
  const rows = 3, cols = 4
  const tiles: string[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const s0 = S + ((N - S) * r) / rows, n0 = S + ((N - S) * (r + 1)) / rows
      const w0 = W + ((E - W) * c) / cols, e0 = W + ((E - W) * (c + 1)) / cols
      tiles.push(`(${s0.toFixed(5)},${w0.toFixed(5)},${n0.toFixed(5)},${e0.toFixed(5)})`)
    }
  }
  return tiles
}

const parse = (t: string) => t.slice(1, -1).split(",").map(Number) as [number, number, number, number] // s, w, n, e

describe("cuadrículas de Barcelona", () => {
  it("salen exactamente las mismas 12 de siempre, en el mismo orden", () => {
    const nuevas = tilesOf(TILE_AREAS.barcelona)
    expect(nuevas).toHaveLength(12)
    expect(nuevas).toEqual(barcelonaDeSiempre())
  })
})

describe("cuadrículas de Madrid", () => {
  const p1 = tilesOf(TILE_AREAS.madrid1)
  const p2 = tilesOf(TILE_AREAS.madrid2)

  it("cada parte tiene 8 cuadrículas y no se repite ninguna entre partes", () => {
    expect(p1).toHaveLength(8)
    expect(p2).toHaveLength(8)
    expect(new Set([...p1, ...p2]).size).toBe(16)
  })

  it("las dos partes juntas cubren el rectángulo entero, sin huecos ni solapes", () => {
    const todas = [...p1, ...p2].map(parse)
    const area = TILE_AREAS.madrid1
    const sumaArea = todas.reduce((a, [s, w, n, e]) => a + (n - s) * (e - w), 0)
    expect(sumaArea).toBeCloseTo((area.north - area.south) * (area.east - area.west), 6)
    for (const [s, w, n, e] of todas) {
      expect(s).toBeGreaterThanOrEqual(area.south - 1e-5)
      expect(n).toBeLessThanOrEqual(area.north + 1e-5)
      expect(w).toBeGreaterThanOrEqual(area.west - 1e-5)
      expect(e).toBeLessThanOrEqual(area.east + 1e-5)
    }
  })

  const dentro = (tiles: string[], lat: number, lon: number) =>
    tiles.map(parse).some(([s, w, n, e]) => lat >= s && lat <= n && lon >= w && lon <= e)

  it("la Puerta del Sol cae en la parte 1 y Chueca, Malasaña y Plaza de Castilla en la 2", () => {
    expect(dentro(p1, 40.4168, -3.7038)).toBe(true)
    expect(dentro(p2, 40.4168, -3.7038)).toBe(false)
    expect(dentro(p2, 40.4226, -3.6975)).toBe(true) // Chueca
    expect(dentro(p2, 40.4265, -3.7044)).toBe(true) // Malasaña
    expect(dentro(p2, 40.4659, -3.689)).toBe(true) // Plaza de Castilla
  })

  it("cada parte tiene su cuadrícula y su ciudad por defecto, y no cuela en las herramientas de esenciales (AREAS)", () => {
    for (const k of ["madrid1", "madrid2"]) {
      expect(TILE_AREAS[k]).toBeDefined()
      expect(TILE_ONLY_AREAS[k].city).toBe("Madrid")
      expect(AREAS[k]).toBeUndefined()
    }
  })
})

describe("cityFor con Madrid", () => {
  it("reconoce Madrid por la ciudad y por el código postal", () => {
    expect(cityFor({ "addr:city": "Madrid" }, "Madrid")).toBe("Madrid")
    expect(cityFor({ "addr:city": "madrid" }, "x")).toBe("Madrid")
    expect(cityFor({ "addr:postcode": "28004" }, "x")).toBe("Madrid")
    expect(cityFor({ "addr:postcode": "28055" }, "x")).toBe("Madrid")
  })

  it("los municipios vecinos conservan su nombre y los códigos de fuera de Madrid no cuentan", () => {
    expect(cityFor({ "addr:city": "Getafe" }, "Madrid")).toBe("Getafe")
    expect(cityFor({ "addr:postcode": "28922" }, "Madrid")).toBe("Madrid") // sin ciudad ni código de la capital: cae al valor por defecto
    expect(cityFor({ "addr:postcode": "28922" }, "fuera")).toBe("fuera")
    expect(cityFor({ "addr:postcode": "28056" }, "fuera")).toBe("fuera")
    expect(cityFor({}, "Madrid")).toBe("Madrid")
  })

  it("lo de Barcelona sigue igual", () => {
    expect(cityFor({ "addr:city": "Barcelona" }, "x")).toBe("Barcelona")
    expect(cityFor({ "addr:postcode": "08820" }, "x")).toBe("El Prat de Llobregat")
    expect(cityFor({ "addr:postcode": "08940" }, "x")).toBe("Cornellà de Llobregat")
    expect(cityFor({ "addr:city": "L'Hospitalet de Llobregat" }, "x")).toBe("L'Hospitalet de Llobregat")
    expect(cityFor({}, "Barcelona")).toBe("Barcelona")
  })
})

describe("isDuplicateVenue", () => {
  const bcn = [{ norm: normalize("Shôko"), lat: 41.3745, lon: 2.1976 }]

  it("el mismo nombre en Madrid no se descarta por existir en Barcelona (cadenas de locales)", () => {
    expect(isDuplicateVenue(bcn, normalize("Shôko"), 40.4297, -3.6836)).toBe(false)
  })

  it("el mismo nombre cerca sí es duplicado, como antes", () => {
    expect(isDuplicateVenue(bcn, normalize("Shôko"), 41.3746, 2.1977)).toBe(true)
    expect(isDuplicateVenue(bcn, normalize("SHOKO"), 41.40, 2.20)).toBe(true) // a unos 3 km: sigue contando (<50 km)
  })

  it("un local sin coordenadas guardadas se sigue comparando solo por nombre", () => {
    expect(isDuplicateVenue([{ norm: normalize("Moby Dick"), lat: null, lon: null }], normalize("Moby Dick"), 40.43, -3.69)).toBe(true)
  })

  it("nombre contenido en otro a menos de 120 m es duplicado; a más distancia no", () => {
    const seen = [{ norm: normalize("Razzmatazz"), lat: 41.3987, lon: 2.1915 }]
    expect(isDuplicateVenue(seen, normalize("Razzmatazz Sala 2"), 41.3988, 2.1916)).toBe(true) // contiene el nombre y está pegado
    expect(isDuplicateVenue(seen, normalize("Razzmatazz Sala 2"), 41.43, 2.22)).toBe(false) // contiene el nombre pero a kilómetros
  })

  it("nombres vacíos nunca son duplicado", () => {
    expect(isDuplicateVenue([{ norm: "", lat: 1, lon: 1 }], "", 1, 1)).toBe(false)
  })
})
