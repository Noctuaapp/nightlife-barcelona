import { describe, it, expect } from "vitest"
import { boundaryAreaKm2, insideBoundary } from "../osmBoundary"
import { EXPECTED_AREA_KM2, RAW_BOUNDARIES, staticBoundary } from "../osmBoundaries"
import { AREAS } from "../osmAreas"

// Control de copia: cuenta, suma y suma ponderada de los números de cada contorno tal como salieron
// de OpenStreetMap. Si alguien toca un dígito por error, aquí salta.
const CHECKSUMS: Record<string, [number, number, number]> = {
  badalona: [386, 4366228, 4559598],
  barcelona: [1826, 13046073, 314417336], // tres anillos, separados por «|»
  cornella: [150, 4345180, 4728350],
  elprat: [384, 4339486, 4495411],
  esplugues: [160, 4349171, 4642513],
  hospitalet: [186, 4349844, 4688477],
  santacoloma: [142, 4368673, 4661790],
  santadria: [254, 4363922, 4590769],
  santboi: [374, 4335434, 4470810],
  santfeliu: [274, 4345199, 4750160],
}

describe("contornos guardados", () => {
  it("hay uno por cada municipio importable, Barcelona incluida", () => {
    expect(Object.keys(RAW_BOUNDARIES).sort()).toEqual(Object.keys(AREAS).sort())
    expect(staticBoundary("zona-que-no-existe")).toBeNull()
  })

  it.each(Object.keys(CHECKSUMS))("%s se ha copiado entero y sin errores", (k: string) => {
    const n = RAW_BOUNDARIES[k].split(/[,|]/).map(Number)
    let sum = 0, weighted = 0
    n.forEach((x, i) => { sum += x; weighted += x * ((i % 97) + 1) })
    expect([n.length, sum, weighted]).toEqual(CHECKSUMS[k])
  })

  it.each(Object.keys(EXPECTED_AREA_KM2))("%s: anillo cerrado y superficie razonable", (k: string) => {
    const b = staticBoundary(k)!
    expect(b.outer).toHaveLength(k === "barcelona" ? 3 : 1)
    for (const r of b.outer) expect(r[0]).toEqual(r[r.length - 1])
    expect(boundaryAreaKm2(b)).toBeCloseTo(EXPECTED_AREA_KM2[k], 1)
  })

  it("el centro de cada municipio cae dentro de su contorno", () => {
    const centro: Record<string, [number, number]> = {
      badalona: [41.45, 2.2474], barcelona: [41.387, 2.17], cornella: [41.3556, 2.075], elprat: [41.3277, 2.0945], esplugues: [41.377, 2.0886],
      hospitalet: [41.3596, 2.1002], santacoloma: [41.4515, 2.208], santadria: [41.43, 2.219], santboi: [41.3438, 2.0364],
      santfeliu: [41.3836, 2.0453],
    }
    for (const [k, [lat, lon]] of Object.entries(centro)) expect([k, insideBoundary(staticBoundary(k)!, lat, lon)]).toEqual([k, true])
  })

  it("Barcelona: la ciudad dentro y los municipios vecinos fuera", () => {
    const b = staticBoundary("barcelona")!
    const dentro: Record<string, [number, number]> = {
      "plaça de Catalunya": [41.387, 2.17], "Sants Estació": [41.3791, 2.1405], "Montjuïc": [41.3636, 2.1659], "Poblenou": [41.4036, 2.2],
      "Zona Franca": [41.347, 2.142], "Sagrada Família": [41.4036, 2.1744], "Tibidabo": [41.4225, 2.119], "Vall d'Hebron": [41.4262, 2.1478],
    }
    const fuera: Record<string, [number, number]> = {
      "Bellvitge": [41.3446, 2.1074], "Fira Gran Via": [41.3544, 2.1274], "Badalona": [41.45, 2.2474], "Sant Adrià": [41.43, 2.219],
      "Esplugues": [41.377, 2.0886], "Cornellà": [41.3556, 2.075], "Santa Coloma": [41.4515, 2.208], "El Prat": [41.3277, 2.0945],
    }
    for (const [k, [lat, lon]] of Object.entries(dentro)) expect([k, insideBoundary(b, lat, lon)]).toEqual([k, true])
    for (const [k, [lat, lon]] of Object.entries(fuera)) expect([k, insideBoundary(b, lat, lon)]).toEqual([k, false])
  })

  it("lo de Barcelona y los vecinos queda fuera (L'Hospitalet)", () => {
    const h = staticBoundary("hospitalet")!
    expect(insideBoundary(h, 41.3446, 2.1074)).toBe(true) // Bellvitge
    expect(insideBoundary(h, 41.3544, 2.1274)).toBe(true) // Fira Gran Via
    expect(insideBoundary(h, 41.387, 2.17)).toBe(false) // plaça de Catalunya
    expect(insideBoundary(h, 41.3791, 2.1405)).toBe(false) // Sants Estació
    expect(insideBoundary(h, 41.3556, 2.075)).toBe(false) // Cornellà
  })
})
