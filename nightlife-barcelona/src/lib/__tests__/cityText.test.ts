import { describe, it, expect } from "vitest"
import fs from "node:fs"
import { CITY_TEXT_KEYS, cityTextKey } from "../cityText"

const LANGS = ["es", "en", "ca", "fr", "de", "it", "nl", "pt"]
const load = (l: string) => JSON.parse(fs.readFileSync(`public/messages/${l}.json`, "utf8"))
const get = (d: Record<string, any>, key: string): unknown => key.split(".").reduce((o: any, k) => o?.[k], d)
const placeholders = (s: string) => (s.match(/\{[a-z]+\}/gi) || []).sort().join(",")

describe("cityTextKey", () => {
  it("Barcelona sigue usando la clave de siempre", () => {
    for (const k of CITY_TEXT_KEYS) expect(cityTextKey(k, "barcelona")).toBe(k)
  })
  it("Madrid usa la clave _madrid, solo en los textos que cambian por ciudad", () => {
    expect(cityTextKey("home.subtitle", "madrid")).toBe("home.subtitle_madrid")
    expect(cityTextKey("weatherTip.cold3", "madrid")).toBe("weatherTip.cold3_madrid")
    expect(cityTextKey("home.search", "madrid")).toBe("home.search")
  })
  it("no hay claves repetidas en la lista", () => {
    expect(new Set(CITY_TEXT_KEYS).size).toBe(CITY_TEXT_KEYS.length)
  })
})

describe("textos de Madrid en los 8 idiomas", () => {
  for (const lang of LANGS) {
    const d = load(lang)
    it(`${lang}: cada texto por ciudad tiene su versión de Madrid, sin nombrar Barcelona y con los mismos {huecos}`, () => {
      for (const key of CITY_TEXT_KEYS) {
        const base = get(d, key)
        const mad = get(d, cityTextKey(key, "madrid"))
        expect(typeof base, `${lang} ${key}`).toBe("string")
        expect(typeof mad, `${lang} ${key}_madrid`).toBe("string")
        expect((mad as string).trim().length, `${lang} ${key}_madrid vacío`).toBeGreaterThan(3)
        expect(/barcel+on[ae]?/i.test(mad as string), `${lang} ${key}_madrid nombra Barcelona`).toBe(false)
        expect(placeholders(mad as string), `${lang} ${key}_madrid huecos`).toBe(placeholders(base as string))
      }
    })
    it(`${lang}: el consejo de Madrid (homeTicker.msg30) existe`, () => {
      const m = d.homeTicker.msg30
      expect(typeof m).toBe("string")
      expect(m.length).toBeGreaterThan(10)
    })
  }
})
