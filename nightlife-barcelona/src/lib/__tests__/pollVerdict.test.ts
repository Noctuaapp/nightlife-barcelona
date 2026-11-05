import { describe, it, expect } from "vitest"
import { DOTS, MIN_VOTES, VERDICTS, dotsFilled, shareText, verdictBucket, verdictOwlMood, verdictPct, verdictText, type VerdictBucket } from "../pollVerdict"

const BUCKETS: VerdictBucket[] = ["early", "rare", "minor", "split", "major", "crush"]

describe("veredicto de la encuesta", () => {
  it("con pocos votos solo dice que eres de los primeros", () => {
    expect(verdictBucket(1, 1)).toBe("early")
    expect(verdictBucket(3, MIN_VOTES - 1)).toBe("early")
    expect(verdictBucket(1, MIN_VOTES)).not.toBe("early")
  })

  it("reparte los porcentajes en tramos sin huecos", () => {
    const total = 100
    const bucket = (mine: number) => verdictBucket(mine, total)
    expect(bucket(0)).toBe("rare")
    expect(bucket(20)).toBe("rare")
    expect(bucket(21)).toBe("minor")
    expect(bucket(39)).toBe("minor")
    expect(bucket(40)).toBe("split")
    expect(bucket(60)).toBe("split")
    expect(bucket(61)).toBe("major")
    expect(bucket(79)).toBe("major")
    expect(bucket(80)).toBe("crush")
    expect(bucket(100)).toBe("crush")
  })

  it("calcula el porcentaje y no divide por cero", () => {
    expect(verdictPct(17, 100)).toBe(17)
    expect(verdictPct(1, 3)).toBe(33)
    expect(verdictPct(0, 0)).toBe(0)
  })

  it("enciende entre 1 y 20 puntos", () => {
    expect(dotsFilled(0)).toBe(1)
    expect(dotsFilled(5)).toBe(1)
    expect(dotsFilled(17)).toBe(3)
    expect(dotsFilled(50)).toBe(10)
    expect(dotsFilled(100)).toBe(DOTS)
    expect(dotsFilled(140)).toBe(DOTS)
  })

  it("tiene frases para todos los tramos e idiomas, y al menos dos para variar", () => {
    for (const locale of ["es", "ca", "en"] as const) {
      for (const b of BUCKETS) {
        const list = VERDICTS[locale][b]
        expect(list.length, `${locale}/${b}`).toBeGreaterThanOrEqual(2)
        for (const v of list) {
          expect(v.title.trim().length).toBeGreaterThan(0)
          expect(v.line.trim().length).toBeGreaterThan(0)
        }
      }
    }
  })

  it("rellena los huecos y no deja llaves sueltas", () => {
    for (const locale of ["es", "ca", "en", "fr"]) {
      for (const [mine, total] of [[2, 10], [3, 10], [5, 10], [7, 10], [9, 10], [1, 3]]) {
        const v = verdictText(locale, mine, total, "cubata-golpe")
        expect(`${v.title} ${v.line}`).not.toMatch(/[{}]/)
      }
    }
    const v = verdictText("es", 17, 100, "x")
    expect(v.bucket).toBe("rare")
    expect(v.pct).toBe(17)
  })

  it("la misma pregunta enseña siempre la misma frase", () => {
    const a = verdictText("es", 50, 100, "zapatos")
    const b = verdictText("es", 50, 100, "zapatos")
    expect(a).toEqual(b)
  })

  it("el idioma desconocido usa el inglés", () => {
    expect(verdictText("de", 90, 100, "z").title).toBe(verdictText("en", 90, 100, "z").title)
  })

  it("el texto para compartir lleva la opción y el porcentaje", () => {
    const t = shareText("es", "Bailar", "rare", 17)
    expect(t).toContain("Bailar")
    expect(t).toContain("17%")
    expect(shareText("en", "Dance", "early", 100)).not.toContain("100")
  })

  it("el búho cambia de cara según el tramo", () => {
    expect(new Set(BUCKETS.map(verdictOwlMood)).size).toBeGreaterThan(2)
  })
})
