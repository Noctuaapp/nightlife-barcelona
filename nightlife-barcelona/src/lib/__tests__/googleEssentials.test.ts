import { describe, it, expect } from "vitest"
import {
  GOOGLE_CATEGORIES,
  buildSearchBody,
  collectPlaces,
  estimateCostUsd,
  googleCategoriesFor,
  judgeGooglePlace,
  matchesCategory,
  periodsToWeek,
  type GooglePeriod,
  type GooglePlace,
  type PageResult,
} from "../googleEssentials"
import { isNightEssentialHours, isOpen24h, isOpenAt, toNoctuaHours } from "../osmHours"

// Google: día 0 = domingo. Aquí: lunes = 0.
const p = (od: number, oh: number, om: number, cd: number, ch: number, cm: number): GooglePeriod => ({
  open: { day: od, hour: oh, minute: om },
  close: { day: cd, hour: ch, minute: cm },
})

describe("periodsToWeek", () => {
  it("siempre abierto: un solo periodo del domingo a las 0:00 sin cierre", () => {
    const w = periodsToWeek([{ open: { day: 0, hour: 0, minute: 0 } }])!
    expect(isOpen24h(w)).toBe(true)
    expect(toNoctuaHours(w)).toBe("Open 24 hours")
  })

  it("24 h todos los días dados como siete periodos de 0:00 a 0:00", () => {
    const w = periodsToWeek([0, 1, 2, 3, 4, 5, 6].map((d) => p(d, 0, 0, (d + 1) % 7, 0, 0)))!
    expect(isOpen24h(w)).toBe(true)
  })

  it("cierre pasada la medianoche: viernes 20:00 – sábado 2:00 se guarda en el viernes", () => {
    const w = periodsToWeek([p(5, 20, 0, 6, 2, 0)])!
    expect(w[4]).toEqual([[1200, 1560]]) // viernes = 4
    expect(isNightEssentialHours(w)).toBe(true)
    expect(isOpenAt(w, 5, 60)).toBe(true) // sábado 1:00 sigue abierto
    expect(isOpenAt(w, 5, 150)).toBe(false) // sábado 2:30 ya no
    expect(toNoctuaHours(w)).toBe("Friday 8:00 PM – 2:00 AM")
  })

  it("domingo 22:00 – lunes 2:00 da la vuelta a la semana", () => {
    const w = periodsToWeek([p(0, 22, 0, 1, 2, 0)])!
    expect(w[6]).toEqual([[1320, 1560]])
    expect(isOpenAt(w, 0, 90)).toBe(true) // lunes 1:30
  })

  it("horario de día normal no es de noche", () => {
    const w = periodsToWeek([1, 2, 3, 4, 5].map((d) => p(d, 9, 0, d, 21, 0)))!
    expect(isNightEssentialHours(w)).toBe(false)
    expect(toNoctuaHours(w)).toBe("Monday to Friday 9:00 AM – 9:00 PM")
  })

  it("cierra justo a medianoche: no cuenta como de noche (el criterio empieza a la 1:00)", () => {
    const w = periodsToWeek([p(1, 10, 0, 2, 0, 0)])!
    expect(w[0]).toEqual([[600, 1440]])
    expect(isNightEssentialHours(w)).toBe(false)
  })

  it("cierra a la 1:00 en punto sí cuenta", () => {
    expect(isNightEssentialHours(periodsToWeek([p(5, 12, 0, 6, 1, 0)])!)).toBe(true)
  })

  it("turno partido: junta lo que se toca y deja los dos tramos si no", () => {
    const w = periodsToWeek([p(1, 13, 0, 1, 16, 0), p(1, 20, 0, 2, 1, 30), p(1, 9, 0, 1, 13, 0)])!
    expect(w[0]).toEqual([[540, 960], [1200, 1530]])
  })

  it("más de un día seguido se reparte por los días", () => {
    const w = periodsToWeek([p(1, 18, 0, 4, 6, 0)])! // lunes 18:00 → jueves 6:00
    expect(w[0]).toEqual([[1080, 1440]])
    expect(w[1]).toEqual([[0, 1440]])
    expect(w[2]).toEqual([[0, 1440]])
    expect(w[3]).toEqual([[0, 360]])
  })

  it("lo raro devuelve null en vez de inventar", () => {
    expect(periodsToWeek(undefined)).toBeNull()
    expect(periodsToWeek([])).toBeNull()
    expect(periodsToWeek([{ open: { day: 2, hour: 10, minute: 0 } }])).toBeNull() // sin cierre y no es el 24/7
    expect(periodsToWeek([{ open: { day: 0, hour: 0, minute: 0 } }, { open: { day: 1, hour: 0, minute: 0 } }])).toBeNull()
    expect(periodsToWeek([p(1, 25, 0, 1, 26, 0)])).toBeNull()
    expect(periodsToWeek([p(1, 10, 0, 1, 10, 0)])).toBeNull() // periodo vacío
    expect(periodsToWeek([{ open: { day: 9, hour: 0, minute: 0 }, close: { day: 9, hour: 5, minute: 0 } }])).toBeNull()
  })
})

const place = (over: Partial<GooglePlace> = {}): GooglePlace => ({
  id: "ChIJabc",
  displayName: { text: "  Kebab   Istanbul " },
  formattedAddress: "Carrer Major, 5, 08911 Badalona, España",
  location: { latitude: 41.45, longitude: 2.24 },
  regularOpeningHours: { periods: [0, 1, 2, 3, 4, 5, 6].map((d) => p(d, 12, 0, (d + 1) % 7, 3, 0)) },
  types: ["turkish_restaurant", "restaurant", "food"],
  primaryType: "turkish_restaurant",
  businessStatus: "OPERATIONAL",
  ...over,
})

describe("judgeGooglePlace", () => {
  it("admite un kebab que cierra a las 3:00 y limpia nombre y dirección", () => {
    const v = judgeGooglePlace("food", place())
    expect(v).toEqual({
      ok: true,
      id: "ChIJabc",
      name: "Kebab Istanbul",
      lat: 41.45,
      lon: 2.24,
      address: "Carrer Major, 5, 08911 Badalona",
      openHours: "Monday to Sunday 12:00 PM – 3:00 AM",
    })
  })

  it("descarta lo que está cerrado, sin horario o con horario de día", () => {
    expect(judgeGooglePlace("food", place({ businessStatus: "CLOSED_PERMANENTLY" }))).toEqual({ ok: false, reason: "cerrado" })
    expect(judgeGooglePlace("food", place({ businessStatus: "CLOSED_TEMPORARILY" }))).toEqual({ ok: false, reason: "cerrado" })
    expect(judgeGooglePlace("food", place({ regularOpeningHours: undefined }))).toEqual({ ok: false, reason: "sin_horario" })
    expect(judgeGooglePlace("food", place({ regularOpeningHours: { periods: [p(1, 9, 0, 1, 17, 0)] } }))).toEqual({ ok: false, reason: "no_es_de_noche" })
  })

  it("descarta lo que no tiene id, nombre o coordenadas", () => {
    expect(judgeGooglePlace("food", place({ id: undefined }))).toEqual({ ok: false, reason: "sin_id" })
    expect(judgeGooglePlace("food", place({ displayName: { text: "  " } }))).toEqual({ ok: false, reason: "sin_nombre" })
    expect(judgeGooglePlace("food", place({ location: undefined }))).toEqual({ ok: false, reason: "sin_coordenadas" })
    expect(judgeGooglePlace("food", place({ location: { latitude: 41.4 } }))).toEqual({ ok: false, reason: "sin_coordenadas" })
  })

  it("un bar o una discoteca no es comida aunque abra de madrugada", () => {
    expect(judgeGooglePlace("food", place({ primaryType: "bar", types: ["bar", "restaurant"] }))).toEqual({ ok: false, reason: "no_es_del_tipo" })
    expect(judgeGooglePlace("food", place({ primaryType: "restaurant", types: ["restaurant", "night_club"] }))).toEqual({ ok: false, reason: "no_es_del_tipo" })
  })

  it("un supermercado 24 h entra como supermercado, no como comida", () => {
    const sup = place({
      displayName: { text: "Alimentación 24h" },
      primaryType: "convenience_store",
      types: ["convenience_store", "store", "food"],
      regularOpeningHours: { periods: [{ open: { day: 0, hour: 0, minute: 0 } }] },
    })
    expect(judgeGooglePlace("supermarket", sup)).toMatchObject({ ok: true, openHours: "Open 24 hours" })
    expect(judgeGooglePlace("food", sup)).toEqual({ ok: false, reason: "no_es_del_tipo" })
  })
})

describe("matchesCategory", () => {
  it("manda el tipo principal; sin él, vale cualquier tipo", () => {
    expect(matchesCategory("gas", "gas_station", ["gas_station", "convenience_store"])).toBe(true)
    expect(matchesCategory("supermarket", "gas_station", ["gas_station", "convenience_store"])).toBe(false)
    expect(matchesCategory("pharmacy", undefined, ["pharmacy", "health"])).toBe(true)
    expect(matchesCategory("pharmacy", undefined, ["health"])).toBe(false)
    expect(matchesCategory("gas", "electric_vehicle_charging_station", ["electric_vehicle_charging_station"])).toBe(false)
  })
  it("reconoce tipos de restaurante y de comida rápida", () => {
    for (const t of ["restaurant", "fast_food_restaurant", "pizza_restaurant", "hamburger_restaurant", "meal_takeaway", "sandwich_shop", "cafe"]) {
      expect(matchesCategory("food", t, [t])).toBe(true)
    }
    for (const t of ["bar", "pub", "night_club", "hotel", "supermarket", "clothing_store"]) {
      expect(matchesCategory("food", t, [t])).toBe(false)
    }
  })
})

describe("googleCategoriesFor", () => {
  it("all y vacío = las cuatro; lista con comas; claves malas = nada", () => {
    expect(googleCategoriesFor("all")).toBe(GOOGLE_CATEGORIES)
    expect(googleCategoriesFor("")).toBe(GOOGLE_CATEGORIES)
    expect(googleCategoriesFor("food,supermarket").map((c) => c.key)).toEqual(["supermarket", "food"])
    expect(googleCategoriesFor("food,food").map((c) => c.key)).toEqual(["food"])
    expect(googleCategoriesFor("food,hospital")).toEqual([])
    expect(googleCategoriesFor("zzz")).toEqual([])
  })
  it("las categorías coinciden con las de essentials.category", () => {
    expect(GOOGLE_CATEGORIES.map((c) => c.category)).toEqual(["Supermarket", "Food", "Gas Station", "Pharmacy"])
  })
})

describe("buildSearchBody / coste", () => {
  it("rectángulo del municipio, español y tipo estricto solo si lo hay", () => {
    const b = buildSearchBody({ text: "kebab" }, [41.4, 2.2, 41.5, 2.3])
    expect(b).toEqual({
      textQuery: "kebab",
      languageCode: "es",
      regionCode: "ES",
      pageSize: 20,
      locationRestriction: { rectangle: { low: { latitude: 41.4, longitude: 2.2 }, high: { latitude: 41.5, longitude: 2.3 } } },
    })
    const c = buildSearchBody({ text: "súper", includedType: "supermarket" }, [41.4, 2.2, 41.5, 2.3], "TOKEN")
    expect(c).toMatchObject({ includedType: "supermarket", strictTypeFiltering: true, pageToken: "TOKEN" })
  })
  it("35 $ por cada 1.000 llamadas", () => {
    expect(estimateCostUsd(0)).toBe(0)
    expect(estimateCostUsd(14)).toBe(0.49)
    expect(estimateCostUsd(1000)).toBe(35)
  })
})

describe("collectPlaces", () => {
  const bbox: [number, number, number, number] = [41.4, 2.2, 41.5, 2.3]
  const mk = (n: number, prefix: string): GooglePlace[] => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}` }))

  it("pasa de página mientras vengan páginas llenas y para en la primera incompleta", async () => {
    const bodies: Record<string, unknown>[] = []
    const pages: PageResult[] = [
      { ok: true, places: mk(20, "a"), nextPageToken: "T1" },
      { ok: true, places: mk(7, "b"), nextPageToken: "T2" }, // incompleta: no se pide la tercera
    ]
    const r = await collectPlaces({
      queries: [{ text: "q1" }],
      pages: 3,
      bbox,
      fetchPage: async (body) => { bodies.push(body); return pages[bodies.length - 1] },
    })
    expect(r.llamadas).toBe(2)
    expect(r.places.size).toBe(27)
    expect(bodies[0].pageToken).toBeUndefined()
    expect(bodies[1].pageToken).toBe("T1")
    expect(r.detenido).toBeNull()
    expect(r.pendientes).toEqual([])
  })

  it("respeta el máximo de páginas aunque Google dé más", async () => {
    let calls = 0
    const r = await collectPlaces({
      queries: [{ text: "q1" }],
      pages: 2,
      bbox,
      fetchPage: async () => { calls++; return { ok: true, places: mk(20, `p${calls}-`), nextPageToken: "T" } },
    })
    expect(calls).toBe(2)
    expect(r.places.size).toBe(40)
  })

  it("junta sin repetir los sitios que salen en varias consultas", async () => {
    const r = await collectPlaces({
      queries: [{ text: "q1" }, { text: "q2" }],
      pages: 1,
      bbox,
      fetchPage: async () => ({ ok: true, places: [{ id: "x" }, { id: "y" }] }),
    })
    expect(r.places.size).toBe(2)
    expect(r.devueltos).toBe(4)
    expect(r.llamadas).toBe(2)
  })

  it("al llegar al tope diario se corta y dice qué consultas faltan", async () => {
    let calls = 0
    const r = await collectPlaces({
      queries: [{ text: "q1" }, { text: "q2" }, { text: "q3" }],
      pages: 1,
      bbox,
      fetchPage: async () => {
        if (calls >= 1) throw new Error("Tope diario de llamadas a Google alcanzado (se sigue mañana)")
        calls++
        return { ok: true, places: [{ id: "x" }] }
      },
    })
    expect(r.llamadas).toBe(1)
    expect(r.places.size).toBe(1)
    expect(r.detenido).toMatch(/Tope diario/)
    expect(r.pendientes).toEqual(["q2", "q3"])
  })

  it("un error 4xx (cuota, clave) para todo; un 5xx salta solo esa consulta", async () => {
    const r4 = await collectPlaces({
      queries: [{ text: "q1" }, { text: "q2" }],
      pages: 2,
      bbox,
      fetchPage: async () => ({ ok: false, status: 429, message: "RESOURCE_EXHAUSTED" }),
    })
    expect(r4.llamadas).toBe(1)
    expect(r4.detenido).toMatch(/429/)
    expect(r4.pendientes).toEqual(["q1", "q2"])

    let n = 0
    const r5 = await collectPlaces({
      queries: [{ text: "q1" }, { text: "q2" }],
      pages: 1,
      bbox,
      fetchPage: async () => (n++ === 0 ? { ok: false, status: 503, message: "x" } : { ok: true, places: [{ id: "z" }] }),
    })
    expect(r5.detenido).toBeNull()
    expect(r5.places.size).toBe(1)
    expect(r5.llamadas).toBe(2)
  })
})
