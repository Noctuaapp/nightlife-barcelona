import { describe, it, expect } from "vitest"
import { boundaryAreaKm2, insideBoundary } from "../osmBoundary"
import { EXPECTED_AREA_KM2, RAW_BOUNDARIES, staticBoundary } from "../osmBoundaries"
import { AREAS } from "../osmAreas"

// Control de copia: cuenta, suma y suma ponderada de los números de cada contorno tal como salieron
// de OpenStreetMap. Si alguien toca un dígito por error, aquí salta.
const CHECKSUMS: Record<string, [number, number, number]> = {
  badalona: [386, 4366228, 4559598],
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
  it("hay uno por cada municipio importable salvo Barcelona", () => {
    const keys = Object.keys(AREAS).filter((k) => k !== "barcelona").sort()
    expect(Object.keys(RAW_BOUNDARIES).sort()).toEqual(keys)
    expect(staticBoundary("barcelona")).toBeNull()
  })

  it.each(Object.keys(CHECKSUMS))("%s se ha copiado entero y sin errores", (k: string) => {
    const n = RAW_BOUNDARIES[k].split(",").map(Number)
    let sum = 0, weighted = 0
    n.forEach((x, i) => { sum += x; weighted += x * ((i % 97) + 1) })
    expect([n.length, sum, weighted]).toEqual(CHECKSUMS[k])
  })

  it.each(Object.keys(EXPECTED_AREA_KM2))("%s: anillo cerrado y superficie razonable", (k: string) => {
    const b = staticBoundary(k)!
    expect(b.outer).toHaveLength(1)
    const r = b.outer[0]
    expect(r[0]).toEqual(r[r.length - 1])
    expect(boundaryAreaKm2(b)).toBeCloseTo(EXPECTED_AREA_KM2[k], 1)
  })

  it("el centro de cada municipio cae dentro de su contorno", () => {
    const centro: Record<string, [number, number]> = {
      badalona: [41.45, 2.2474], cornella: [41.3556, 2.075], elprat: [41.3277, 2.0945], esplugues: [41.377, 2.0886],
      hospitalet: [41.3596, 2.1002], santacoloma: [41.4515, 2.208], santadria: [41.43, 2.219], santboi: [41.3438, 2.0364],
      santfeliu: [41.3836, 2.0453],
    }
    for (const [k, [lat, lon]] of Object.entries(centro)) expect([k, insideBoundary(staticBoundary(k)!, lat, lon)]).toEqual([k, true])
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
