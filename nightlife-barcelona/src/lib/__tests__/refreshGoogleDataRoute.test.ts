import { beforeEach, describe, expect, it, vi } from "vitest"

// Pruebas de /api/cron/refresh-google-data con Supabase y Google falsos: lo que se comprueba es QUÉ pide a la base de datos y a
// Google (filtros de ciudad, tamaño de tanda, búsqueda «en Madrid», descarte de lo que cae fuera) y qué escribe.

const state = vi.hoisted(() => ({
  limit: 4000,
  rich: true,
  builders: [] as any[],
  googleCalls: [] as { url: string; init?: any }[],
  googleReply: (_url: string, _init?: any): { status: number; body: any } => ({ status: 200, body: {} }),
  // Qué devuelve la «base de datos» para cada consulta: por tabla y tipo (lista de clubs, recuento…).
  clubsToRefresh: [] as any[],
  clubsWithoutPlace: [] as any[],
}))

vi.mock("@/lib/adminAuth", () => ({ isAuthorizedCronRequest: async () => true }))
vi.mock("@/lib/googleWebsite", () => ({ classifyGoogleWebsite: () => ({}) }))
vi.mock("@/lib/googlePlacesBudget", () => ({
  dailyLimit: () => state.limit,
  fetchRichData: () => state.rich,
  startJobBudget: async () => ({ over: false, used: 0, counter: { count: 0 } }),
  recordGoogleCalls: async () => {},
  googleFetch: async (counter: { count: number }, url: string, init?: any) => {
    counter.count++
    state.googleCalls.push({ url, init })
    const r = state.googleReply(url, init)
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body, arrayBuffer: async () => new ArrayBuffer(8) }
  },
}))

// Constructor de consultas falso: apunta cada llamada encadenada y, al esperarlo, responde según la tabla y los filtros.
function makeBuilder(table: string) {
  const b: any = { table, ops: [] as [string, ...any[]][] }
  for (const m of ["select", "is", "or", "not", "ilike", "order", "limit", "eq", "update", "delete", "insert"]) {
    b[m] = (...args: any[]) => {
      b.ops.push([m, ...args])
      return b
    }
  }
  b.then = (resolve: any) => {
    const selectsCount = b.ops.some((o: any[]) => o[0] === "select" && o[2]?.head)
    const wantsNoPlace = b.ops.some((o: any[]) => o[0] === "is" && o[1] === "google_place_id")
    const isWrite = b.ops.some((o: any[]) => ["update", "delete", "insert"].includes(o[0]))
    let out: any
    if (isWrite || table !== "clubs") out = { data: null, error: null }
    else if (selectsCount) out = { count: wantsNoPlace ? state.clubsWithoutPlace.length : state.clubsToRefresh.length, error: null }
    else out = { data: wantsNoPlace ? state.clubsWithoutPlace : state.clubsToRefresh, error: null }
    return Promise.resolve(out).then(resolve)
  }
  state.builders.push(b)
  return b
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => makeBuilder(table),
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        getPublicUrl: (name: string) => ({ data: { publicUrl: `https://storage.test/${name}` } }),
      }),
    },
  }),
}))

import { GET } from "../../app/api/cron/refresh-google-data/route"
import { EXCLUDE_PRELAUNCH_OR } from "../cities"

const call = (qs = "") => GET(new Request(`https://noctua.test/api/cron/refresh-google-data${qs}`))
const opsOf = (pred: (b: any) => boolean) => state.builders.filter(pred).map((b) => b.ops)
const hasOp = (ops: any[][], name: string, ...args: any[]) =>
  ops.some((o) => o[0] === name && args.every((a, i) => JSON.stringify(o[i + 1]) === JSON.stringify(a)))
const clubReads = () => state.builders.filter((b) => b.table === "clubs" && !b.ops.some((o: any[]) => ["update", "delete", "insert"].includes(o[0])))
const clubWrites = () => state.builders.filter((b) => b.table === "clubs" && b.ops.some((o: any[]) => o[0] === "update"))

const MADRID = { latitude: 40.4168, longitude: -3.7038 }
const BARNA = { latitude: 41.3874, longitude: 2.1686 }

beforeEach(() => {
  state.limit = 4000
  state.rich = true
  state.builders = []
  state.googleCalls = []
  state.clubsToRefresh = []
  state.clubsWithoutPlace = []
  state.googleReply = () => ({ status: 200, body: {} })
})

describe("refresh-google-data · tamaño de tanda", () => {
  it("con el tope diario subido y fotos activas, procesa 6 clubs por tanda; con el tope normal, 2", async () => {
    await call()
    const mainHigh = clubReads().find((b) => b.ops.some((o: any[]) => o[0] === "order"))!
    expect(hasOp(mainHigh.ops, "limit", 6)).toBe(true)

    state.builders = []
    state.limit = 100
    await call()
    const mainLow = clubReads().find((b) => b.ops.some((o: any[]) => o[0] === "order"))!
    expect(hasOp(mainLow.ops, "limit", 2)).toBe(true)
  })

  it("sin fotos activas: 8 con el tope alto y 4 con el normal", async () => {
    state.rich = false
    await call()
    expect(hasOp(clubReads().find((b) => b.ops.some((o: any[]) => o[0] === "order"))!.ops, "limit", 8)).toBe(true)
    state.builders = []
    state.limit = 20
    await call()
    expect(hasOp(clubReads().find((b) => b.ops.some((o: any[]) => o[0] === "order"))!.ops, "limit", 4)).toBe(true)
  })
})

describe("refresh-google-data · alcance por ciudad", () => {
  it("sin ?city= deja fuera las ciudades en prelaunch y no filtra por ciudad (como siempre)", async () => {
    await call()
    for (const b of clubReads()) {
      expect(hasOp(b.ops, "or", EXCLUDE_PRELAUNCH_OR)).toBe(true)
      expect(b.ops.some((o: any[]) => o[0] === "ilike")).toBe(false)
    }
    // El paso 0 de siempre no mira la fecha de intento.
    const step0 = clubReads().find((b) => hasOp(b.ops, "is", "google_place_id", null) && !b.ops.some((o: any[]) => o[1]?.head))!
    expect(step0.ops.some((o: any[]) => o[0] === "is" && o[1] === "google_last_refreshed_at")).toBe(false)
  })

  it("?city=barcelona o una ciudad desconocida se comporta como sin parámetro", async () => {
    await call("?city=barcelona")
    await call("?city=toString")
    for (const b of clubReads()) expect(b.ops.some((o: any[]) => o[0] === "ilike")).toBe(false)
  })

  it("?city=madrid mira SOLO los clubs de Madrid, sin el filtro de prelaunch", async () => {
    await call("?city=madrid")
    expect(clubReads().length).toBeGreaterThan(0)
    for (const b of clubReads()) {
      expect(hasOp(b.ops, "ilike", "city", "Madrid")).toBe(true)
      expect(hasOp(b.ops, "or", EXCLUDE_PRELAUNCH_OR)).toBe(false)
    }
  })

  it("?city=madrid en el paso 0 solo toma los que aún no se han intentado", async () => {
    await call("?city=madrid")
    const step0 = clubReads().find((b) => hasOp(b.ops, "is", "google_place_id", null) && !b.ops.some((o: any[]) => o[1]?.head))!
    expect(hasOp(step0.ops, "is", "google_last_refreshed_at", null)).toBe(true)
  })
})

describe("refresh-google-data · búsqueda de ficha en Madrid", () => {
  const club = { id: "c1", name: "Teatro Barceló", address: "Calle de Barceló 11", neighborhood: "Malasaña" }

  it("busca «en Madrid» con sesgo hacia Madrid y pide la ubicación", async () => {
    state.clubsWithoutPlace = [club]
    await call("?city=madrid")
    const search = state.googleCalls.find((c) => c.url.endsWith(":searchText"))!
    const body = JSON.parse(search.init.body)
    expect(body.textQuery).toBe("Teatro Barceló Calle de Barceló 11 Madrid")
    expect(body.locationBias.circle.center.latitude).toBeCloseTo(40.4168, 3)
    expect(search.init.headers["X-Goog-FieldMask"]).toContain("places.location")
  })

  it("en Barcelona sigue buscando «… Barcelona» y NO pide la ubicación", async () => {
    state.clubsWithoutPlace = [club]
    await call()
    const search = state.googleCalls.find((c) => c.url.endsWith(":searchText"))!
    const body = JSON.parse(search.init.body)
    expect(body.textQuery.endsWith("Barcelona")).toBe(true)
    expect(body.locationBias.circle.center.latitude).toBeCloseTo(41.3874, 3)
    expect(search.init.headers["X-Goog-FieldMask"]).not.toContain("places.location")
  })

  it("asigna la ficha si cae dentro de Madrid y el nombre cuadra", async () => {
    state.clubsWithoutPlace = [club]
    state.googleReply = (url) =>
      url.endsWith(":searchText")
        ? { status: 200, body: { places: [{ id: "PLACE_MAD", displayName: { text: "Teatro Barceló" }, types: ["night_club"], location: MADRID }] } }
        : { status: 200, body: {} }
    const res = await call("?city=madrid")
    const json = await res.json()
    expect(json.newlyAssigned[0]).toMatchObject({ status: "assigned", placeId: "PLACE_MAD" })
    expect(clubWrites().some((b) => hasOp(b.ops, "update", { google_place_id: "PLACE_MAD" }))).toBe(true)
  })

  it("descarta una ficha que cae fuera de Madrid (p. ej. un local de Barcelona con el mismo nombre) y marca el club como intentado", async () => {
    state.clubsWithoutPlace = [club]
    state.googleReply = (url) =>
      url.endsWith(":searchText")
        ? { status: 200, body: { places: [{ id: "PLACE_BCN", displayName: { text: "Teatro Barceló" }, types: ["night_club"], location: BARNA }] } }
        : { status: 200, body: {} }
    const res = await call("?city=madrid")
    const json = await res.json()
    expect(json.newlyAssigned[0]).toMatchObject({ status: "rejected_outside_city" })
    const writes = clubWrites().map((b) => b.ops.find((o: any[]) => o[0] === "update")[1])
    expect(writes.some((w: any) => "google_place_id" in w)).toBe(false) // no se le asigna nada
    expect(writes.some((w: any) => typeof w.google_last_refreshed_at === "string")).toBe(true) // y no se vuelve a buscar
  })

  it("si Google no devuelve ubicación, también descarta (no se fía)", async () => {
    state.clubsWithoutPlace = [club]
    state.googleReply = (url) =>
      url.endsWith(":searchText")
        ? { status: 200, body: { places: [{ id: "P", displayName: { text: "Teatro Barceló" }, types: ["night_club"] }] } }
        : { status: 200, body: {} }
    const json = await (await call("?city=madrid")).json()
    expect(json.newlyAssigned[0].status).toBe("rejected_outside_city")
  })

  it("los que Google no encuentra se marcan para no repetir la búsqueda", async () => {
    state.clubsWithoutPlace = [club]
    state.googleReply = () => ({ status: 200, body: {} })
    const json = await (await call("?city=madrid")).json()
    expect(json.newlyAssigned[0].status).toBe("not_found")
    expect(clubWrites().some((b) => typeof b.ops.find((o: any[]) => o[0] === "update")[1].google_last_refreshed_at === "string")).toBe(true)
  })

  it("«quedan» cuenta también los que aún no tienen ficha ni se han intentado (para que el botón siga hasta el final)", async () => {
    state.clubsWithoutPlace = [club, { ...club, id: "c2" }]
    state.googleReply = () => ({ status: 200, body: {} }) // no encuentra: se marcan
    const json = await (await call("?city=madrid")).json()
    expect(json.remaining).toBe(2) // el recuento de «sin ficha y sin intentar» lo da la base de datos (falsa) tras el paso 0
    expect(json.city).toBe("Madrid")
  })
})

describe("refresh-google-data · detalles de la ficha", () => {
  const withPlace = { id: "c9", name: "Teatro Barceló", image: null, gallery: null, google_place_id: "PLACE", website: null, instagram: null, tiktok: null }

  it("una respuesta 429 de Google no escribe nada en el club y se devuelve como error 429", async () => {
    state.clubsToRefresh = [withPlace]
    state.googleReply = () => ({ status: 429, body: { error: { code: 429 } } })
    const res = await call()
    expect(res.status).toBe(429)
    expect((await res.json()).error).toMatch(/tope diario/i)
    expect(clubWrites().length).toBe(0)
  })

  it("una ficha caducada (404) pasa al final de la cola sin tocar la valoración", async () => {
    state.clubsToRefresh = [withPlace]
    state.googleReply = () => ({ status: 404, body: { error: { code: 404 } } })
    const res = await call()
    expect(res.status).toBe(200)
    const writes = clubWrites().map((b) => b.ops.find((o: any[]) => o[0] === "update")[1])
    expect(writes).toHaveLength(1)
    expect(Object.keys(writes[0])).toEqual(["google_last_refreshed_at"])
  })

  it("en Madrid pide la ubicación de la ficha y, si cae fuera, la desasigna dejando la fecha puesta (sin bucle)", async () => {
    state.clubsToRefresh = [withPlace]
    state.googleReply = () => ({ status: 200, body: { displayName: { text: "Teatro Barceló" }, types: ["night_club"], location: BARNA, rating: 4.5 } })
    await call("?city=madrid")
    const details = state.googleCalls.find((c) => c.url.includes("/places/PLACE"))!
    expect(details.init.headers["X-Goog-FieldMask"]).toContain("location")
    const w = clubWrites().map((b) => b.ops.find((o: any[]) => o[0] === "update")[1])[0]
    expect(w.google_place_id).toBeNull()
    expect(typeof w.google_last_refreshed_at).toBe("string")
    expect(w.google_rating).toBeUndefined()
  })

  it("en Barcelona NO pide la ubicación y mantiene el comportamiento de siempre (rating + fecha)", async () => {
    state.clubsToRefresh = [withPlace]
    state.googleReply = () => ({ status: 200, body: { displayName: { text: "Teatro Barceló" }, types: ["night_club"], rating: 4.5, userRatingCount: 120 } })
    await call()
    const details = state.googleCalls.find((c) => c.url.includes("/places/PLACE"))!
    expect(details.init.headers["X-Goog-FieldMask"]).not.toContain("location")
    const w = clubWrites().map((b) => b.ops.find((o: any[]) => o[0] === "update")[1]).find((x: any) => "google_rating" in x)
    expect(w).toMatchObject({ google_rating: 4.5, google_review_count: 120 })
  })
})
