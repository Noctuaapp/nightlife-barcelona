import { describe, expect, it } from "vitest"
import {
  actionIndex, actionsPer100, browseSteps, clickHourSeries, compareValues, hoursSeries, isDeadItem, countryName, countrySummary, languageRows, langName, peakHour,
  pctOf, previousRange, rangeLength, searchRows, signupErrorRows, signupSteps, sourceName, sourceRows, totalActions, weekdaySeries,
} from "../dataInsights"

describe("previousRange", () => {
  it("devuelve el mismo número de días justo antes", () => {
    expect(previousRange("2026-11-01", "2026-11-14")).toEqual({ from: "2026-10-18", to: "2026-10-31" })
    expect(previousRange("2026-11-11", "2026-11-11")).toEqual({ from: "2026-11-10", to: "2026-11-10" })
  })
  it("no se descuadra con el cambio de hora de octubre", () => {
    // 25 de octubre de 2026 es el cambio a horario de invierno
    expect(previousRange("2026-10-26", "2026-11-01")).toEqual({ from: "2026-10-19", to: "2026-10-25" })
    expect(rangeLength("2026-10-19", "2026-10-25")).toBe(7)
  })
  it("el periodo anterior tiene siempre tantos días como el actual", () => {
    for (const [a, b] of [["2026-10-13", "2026-11-11"], ["2026-01-01", "2026-11-11"], ["2026-03-25", "2026-04-02"]]) {
      const p = previousRange(a, b)
      expect(rangeLength(p.from, p.to)).toBe(rangeLength(a, b))
    }
  })
})

describe("compareValues", () => {
  it("sin periodo anterior no hay comparación", () => {
    expect(compareValues(5, null)).toBeNull()
    expect(compareValues(5, undefined)).toBeNull()
    expect(compareValues(5, NaN)).toBeNull()
  })
  it("sube y baja con porcentaje cuando hay cifras de verdad", () => {
    expect(compareValues(118, 100)).toMatchObject({ dir: "up", text: "▲ 18 %", pct: 18 })
    expect(compareValues(80, 100)).toMatchObject({ dir: "down", text: "▼ 20 %", pct: 20 })
  })
  it("con cifras pequeñas no da un porcentaje engañoso", () => {
    expect(compareValues(4, 1)).toMatchObject({ dir: "up", text: "▲ antes 1", pct: null })
    expect(compareValues(0, 3)).toMatchObject({ dir: "down", text: "▼ antes 3", pct: null })
  })
  it("si antes era 0 y ahora hay mucho, es nuevo", () => {
    expect(compareValues(40, 0)).toMatchObject({ dir: "up", text: "▲ nuevo (antes 0)" })
  })
  it("iguales (o casi) es «igual»", () => {
    expect(compareValues(50, 50)).toMatchObject({ dir: "flat" })
    expect(compareValues(0, 0)).toMatchObject({ dir: "flat" })
    expect(compareValues(1001, 1000)).toMatchObject({ dir: "flat" })
  })
})

describe("pctOf", () => {
  it("un decimal y null sin base", () => {
    expect(pctOf(1, 3)).toBe(33.3)
    expect(pctOf(5, 0)).toBeNull()
    expect(pctOf(0, 10)).toBe(0)
  })
})

describe("embudo", () => {
  it("anida los pasos y mide contra el anterior y contra el primero", () => {
    const rows = browseSteps([{ step: "visitors", n: 200 }, { step: "ficha", n: 100 }, { step: "interest", n: 25 }, { step: "intent", n: 5 }])
    expect(rows.map((r) => [r.key, r.n, r.ofPrev, r.ofFirst])).toEqual([
      ["visitors", 200, null, null],
      ["ficha", 100, 50, 50],
      ["interest", 25, 25, 12.5],
      ["intent", 5, 20, 2.5],
    ])
  })
  it("sin datos devuelve ceros y sin porcentajes inventados", () => {
    const rows = browseSteps(undefined)
    expect(rows.every((r) => r.n === 0)).toBe(true)
    expect(rows.every((r) => r.ofPrev === null && r.ofFirst === null)).toBe(true)
  })
  it("el registro se mide contra quienes lo abren", () => {
    const rows = signupSteps([
      { step: "join_view", n: 80 }, { step: "signup_view", n: 40 }, { step: "choose", n: 30 }, { step: "signup_submit", n: 20 },
      { step: "signup_ok", n: 15 }, { step: "signup_error", n: 4 },
    ])
    const by = Object.fromEntries(rows.map((r) => [r.key, r.ofFirst]))
    expect(by).toEqual({ join_view: null, signup_view: null, choose: 75, signup_submit: 50, signup_ok: 37.5, signup_error: 10 })
  })
  it("los errores salen con un nombre entendible y ordenados", () => {
    expect(
      signupErrorRows([
        { step: "form", reason: "weak_password", n: 2 },
        { step: "auth", reason: "email_taken", n: 5 },
        { step: "auth", reason: "rate_limit", n: 1 },
        { step: "form", reason: "sin dato", n: 1 },
      ])
    ).toEqual([
      { label: "el correo ya tiene cuenta", n: 5 },
      { label: "contraseña débil", n: 2 },
      { label: "el servidor dice «rate_limit»", n: 1 },
      { label: "sin motivo guardado", n: 1 },
    ])
  })
})

describe("origen que convierte", () => {
  it("nombres de origen", () => {
    expect(sourceName("search")).toBe("Buscadores (Google...)")
    expect(sourceName("other:blog.example.com")).toBe("Web: blog.example.com")
    expect(sourceName("newsletter")).toBe("newsletter")
    expect(sourceName(null)).toBe("Directo")
  })
  it("calcula las tasas por persona y marca los orígenes con pocas personas", () => {
    const rows = sourceRows([
      { source: "instagram", people: 10, ficha: 5, clicked: 2, intent: 1, signed: 1, bounced: 4 },
      { source: "search", people: 200, ficha: 120, clicked: 40, intent: 10, signed: 6, bounced: 60 },
      { source: "tiktok", people: 0, ficha: 0, clicked: 0, intent: 0, signed: 0, bounced: 0 },
    ])
    expect(rows.map((r) => r.label)).toEqual(["Buscadores (Google...)", "Instagram"])
    expect(rows[0]).toMatchObject({ people: 200, ficha: 60, clicked: 20, intent: 5, signed: 3, bounced: 30, small: false })
    expect(rows[1]).toMatchObject({ people: 10, ficha: 50, small: true })
  })
})

describe("horas y días", () => {
  it("rellena las 24 horas y las suma si se repiten", () => {
    const s = hoursSeries([{ h: 23, n: 4 }, { h: 4, n: 2 }, { h: 23, n: 1 }, { h: 30, n: 9 }])
    expect(s).toHaveLength(24)
    expect(s[23]).toBe(5)
    expect(s[4]).toBe(2)
    expect(s.reduce((a, b) => a + b, 0)).toBe(7)
  })
  it("semana de lunes a domingo", () => {
    expect(weekdaySeries([{ d: 1, n: 3 }, { d: 7, n: 9 }, { d: 0, n: 5 }])).toEqual([3, 0, 0, 0, 0, 0, 9])
  })
  it("taxi/VTC junta las apps y las llamadas al taxi", () => {
    const s = clickHourSeries([{ kind: "ride_click", h: 3, n: 2 }, { kind: "taxi_call", h: 3, n: 1 }, { kind: "tickets_click", h: 3, n: 9 }], ["ride_click", "taxi_call"])
    expect(s[3]).toBe(3)
  })
  it("hora más alta", () => {
    expect(peakHour(hoursSeries([{ h: 2, n: 1 }, { h: 5, n: 7 }]))).toBe(5)
    expect(peakHour(hoursSeries([]))).toBeNull()
  })
})

describe("acciones por ficha", () => {
  const item = { id: 1, views: 50, tickets: 3, directions: 2, shares: 1, favorites: 4, website: 5, attendances: 2 }
  it("suma lo que se hace en la ficha sin contar dos veces el Instagram", () => {
    expect(totalActions(item)).toBe(17)
    expect(totalActions(item, { instagram: 9, tiktok: 1, phone: 2, rides: 3, taxi_calls: 1 })).toBe(24)
  })
  it("acciones por cada 100 visitas", () => {
    expect(actionsPer100(17, 50)).toBe(34)
    expect(actionsPer100(3, 0)).toBeNull()
  })
  it("una ficha con visitas y ninguna acción está «muerta»; con pocas visitas no se juzga", () => {
    expect(isDeadItem(30, 0)).toBe(true)
    expect(isDeadItem(30, 1)).toBe(false)
    expect(isDeadItem(4, 0)).toBe(false)
  })
  it("indexa por tipo", () => {
    const m = actionIndex([
      { item_type: "club", item_id: "7", instagram: 1, tiktok: 0, phone: 0, rides: 2, taxi_calls: 0 },
      { item_type: "event", item_id: "7", instagram: 0, tiktok: 0, phone: 1, rides: 0, taxi_calls: 0 },
    ], "club")
    expect(m.get("7")?.rides).toBe(2)
    expect(m.size).toBe(1)
  })
})

describe("búsquedas", () => {
  it("une el detalle por término, sin distinguir mayúsculas", () => {
    const rows = searchRows(
      [{ term: "Karaoke", n: 4, avg_results: 0, zero: 4 }, { term: "techno", n: 10, avg_results: 8, zero: 0 }, { term: "otra", n: 1, avg_results: 1, zero: 0 }],
      [{ term: "karaoke", n: 4, opened: 1, zero: 4 }, { term: "techno", n: 10, opened: 7, zero: 0 }]
    )
    expect(rows.map((r) => [r.term, r.opened, r.openedPct])).toEqual([["Karaoke", 1, 25], ["techno", 7, 70], ["otra", null, null]])
  })
  it("sin el SQL 88 no hay porcentaje", () => {
    expect(searchRows([{ term: "a", n: 1, avg_results: 1, zero: 0 }], null)[0].openedPct).toBeNull()
  })
})

describe("idioma de los visitantes", () => {
  it("nombres y tasas", () => {
    expect(langName("es")).toBe("Español")
    expect(langName("xx")).toBe("XX")
    expect(langName("unknown")).toBe("Sin idioma guardado")
    const rows = languageRows([{ lang: "en", people: 40, ficha: 20, clicked: 8 }, { lang: "de", people: 3, ficha: 1, clicked: 0 }])
    expect(rows[0]).toMatchObject({ label: "Inglés", ficha: 50, clicked: 20, small: false })
    expect(rows[1]).toMatchObject({ label: "Alemán", small: true })
  })
})

describe("país de los visitantes", () => {
  it("nombres en español y códigos raros", () => {
    expect(countryName("ES")).toBe("España")
    expect(countryName("gb")).toMatch(/Reino Unido/)
    expect(countryName("unknown")).toBe("Sin país guardado")
    expect(countryName(null)).toBe("Sin país guardado")
    expect(countryName("ZZ")).toBe("ZZ")
  })

  it("reparto entre países con país conocido; «sin país» va aparte", () => {
    const r = countrySummary([
      { country: "FR", people: 30, ficha: 15, clicked: 3 },
      { country: "ES", people: 60, ficha: 30, clicked: 12 },
      { country: "unknown", people: 10, ficha: 2, clicked: 0 },
    ])
    expect(r.rows.map((x) => x.label)).toEqual(["España", "Francia"])
    expect(r.rows[0]).toMatchObject({ people: 60, share: 66.7, ficha: 50, clicked: 20, small: false })
    expect(r.rows[1]).toMatchObject({ people: 30, share: 33.3 })
    expect(r.known).toBe(90)
    expect(r.unknown).toBe(10)
    expect(r.unknownPct).toBe(10)
  })

  it("agrupa los países fuera del top y marca los pequeños", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ country: ["ES", "FR", "DE", "IT", "GB", "NL", "PT", "BE", "CH", "AT", "SE", "NO"][i], people: 100 - i * 5, ficha: 10, clicked: 5 }))
    rows[11].people = 3
    const r = countrySummary(rows, 10)
    expect(r.rows).toHaveLength(11)
    expect(r.rows[10].label).toBe("Otros países (2)")
    expect(r.rows[10].people).toBe(50 + 3)
    expect(r.rows[10].ficha).toBeCloseTo(37.7, 1)
    expect(countrySummary([{ country: "ES", people: 5, ficha: 1, clicked: 0 }]).rows[0].small).toBe(true)
  })

  it("todo sin país, vacío o con basura no revienta", () => {
    expect(countrySummary([{ country: "unknown", people: 7, ficha: 1, clicked: 0 }])).toMatchObject({ rows: [], known: 0, unknown: 7, unknownPct: 100 })
    expect(countrySummary([])).toMatchObject({ rows: [], known: 0, unknown: 0, unknownPct: null })
    expect(countrySummary(null).rows).toEqual([])
    expect(countrySummary([{ country: "ES", people: NaN as unknown as number, ficha: 0, clicked: 0 }]).rows).toEqual([])
  })
})
