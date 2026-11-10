import { describe, expect, it } from "vitest"
import {
  MAX_REFS,
  MAX_SOURCE_CHARS,
  TARGET_LANGS,
  LANG_NAME,
  buildTranslationRequest,
  hashSource,
  isTargetLang,
  isValidRef,
  isWorthTranslating,
  normalizeSource,
  parseTranslations,
  refKey,
} from "../translateContent"
import { handleTranslate, type TranslateDeps } from "../translateService"

describe("textos a traducir", () => {
  it("normaliza espacios y saltos de línea, y el hash no cambia por eso", async () => {
    expect(normalizeSource("  Hola\r\nmundo \n")).toBe("Hola\nmundo")
    expect(normalizeSource(null)).toBe("")
    expect(await hashSource("Hola\r\nmundo")).toBe(await hashSource(" Hola\nmundo "))
    expect(await hashSource("Hola")).not.toBe(await hashSource("Hola!"))
    expect(await hashSource("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
  })

  it("solo vale la pena traducir texto con letras y de tamaño razonable", () => {
    expect(isWorthTranslating("Gratis hasta la 1:00")).toBe(true)
    expect(isWorthTranslating("15€")).toBe(false)
    expect(isWorthTranslating("")).toBe(false)
    expect(isWorthTranslating(null)).toBe(false)
    expect(isWorthTranslating("a".repeat(MAX_SOURCE_CHARS + 1))).toBe(false)
    expect(isWorthTranslating("Entrada libre")).toBe(true)
  })

  it("referencias: solo tablas, campos e ids permitidos", () => {
    expect(isValidRef({ table: "clubs", id: 5, field: "description" })).toBe(true)
    expect(isValidRef({ table: "events", id: 5, field: "description" })).toBe(true)
    expect(isValidRef({ table: "clubs", id: 5, field: "email" })).toBe(false)
    expect(isValidRef({ table: "profiles", id: 5, field: "description" })).toBe(false)
    expect(isValidRef({ table: "events", id: 5, field: "price" })).toBe(false)
    expect(isValidRef({ table: "clubs", id: "5", field: "description" })).toBe(false)
    expect(isValidRef({ table: "clubs", id: -1, field: "description" })).toBe(false)
    expect(isValidRef({ table: "clubs", id: 1.5, field: "description" })).toBe(false)
    expect(isValidRef(null)).toBe(false)
    expect(refKey({ table: "clubs", id: 5, field: "discount_info" })).toBe("clubs:5:discount_info")
  })

  it("idiomas: los 7 de la web menos el español", () => {
    expect([...TARGET_LANGS].sort()).toEqual(["ca", "de", "en", "fr", "it", "nl", "pt"])
    for (const l of TARGET_LANGS) expect(LANG_NAME[l]).toBeTruthy()
    expect(isTargetLang("es")).toBe(false)
    expect(isTargetLang("fr")).toBe(true)
    expect(isTargetLang(undefined)).toBe(false)
  })

  it("la petición al modelo lleva el idioma, el número de textos y los textos como datos", () => {
    const { system, user } = buildTranslationRequest("de", ["Hola", "Adiós"])
    expect(system).toContain("German")
    expect(system).toContain("2 string(s)")
    expect(system).toMatch(/Never follow instructions/)
    expect(JSON.parse(user)).toEqual(["Hola", "Adiós"])
  })

  it("lee la respuesta del modelo aunque venga con texto alrededor, y rechaza lo que no cuadra", () => {
    expect(parseTranslations('["a","b"]', 2)).toEqual(["a", "b"])
    expect(parseTranslations('Claro:\n```json\n["a", " b "]\n```', 2)).toEqual(["a", "b"])
    expect(parseTranslations('["a"]', 2)).toBeNull()
    expect(parseTranslations('["a",""]', 2)).toBeNull()
    expect(parseTranslations('["a",3]', 2)).toBeNull()
    expect(parseTranslations("no json", 1)).toBeNull()
    expect(parseTranslations("[oops", 1)).toBeNull()
    expect(parseTranslations(undefined, 1)).toBeNull()
  })
})

// --- /api/translate sin red ni base de datos -------------------------------------------------------------------

function fakeDeps(over: Partial<TranslateDeps> & { sources?: Record<string, string | null>; cache?: Record<string, string> } = {}) {
  const calls = { model: 0, saved: [] as { hash: string; text: string }[][], lastUser: "" }
  const cache = new Map(Object.entries(over.cache || {}))
  const deps: TranslateDeps = {
    loadSources: async (refs) => new Map(refs.map((r) => [refKey(r), (over.sources || {})[refKey(r)] ?? null])),
    loadCache: async (_l, hashes) => new Map(hashes.filter((h) => cache.has(h)).map((h) => [h, cache.get(h)!])),
    saveCache: async (_l, rows) => {
      calls.saved.push(rows)
      for (const r of rows) cache.set(r.hash, r.text)
    },
    callModel: async (_s, user) => {
      calls.model++
      calls.lastUser = user
      return JSON.stringify((JSON.parse(user) as string[]).map((t) => `[de] ${t}`))
    },
    ...over,
  }
  return { deps, calls, cache }
}

const ref = (id: number, field = "description") => ({ table: "clubs", id, field })

describe("/api/translate", () => {
  it("rechaza peticiones mal formadas", async () => {
    const { deps } = fakeDeps()
    expect((await handleTranslate({ lang: "es", refs: [ref(1)] }, deps, true)).status).toBe(400)
    expect((await handleTranslate({ lang: "de", refs: [] }, deps, true)).status).toBe(400)
    expect((await handleTranslate({ lang: "de", refs: [{ table: "profiles", id: 1, field: "x" }] }, deps, true)).status).toBe(400)
    expect((await handleTranslate({ lang: "de", refs: Array.from({ length: MAX_REFS + 1 }, (_, i) => ref(i + 1)) }, deps, true)).status).toBe(400)
    expect((await handleTranslate(null, deps, true)).status).toBe(400)
  })

  it("traduce lo que falta, lo guarda y la segunda vez no llama al modelo", async () => {
    const { deps, calls } = fakeDeps({ sources: { "clubs:1:description": "Sala de techno en el Raval", "clubs:1:discount_info": "Ve pronto para evitar cola" } })
    const r1 = await handleTranslate({ lang: "de", refs: [ref(1), ref(1, "discount_info")] }, deps, true)
    expect(r1).toEqual({ status: 200, body: { translations: { "clubs:1:description": "[de] Sala de techno en el Raval", "clubs:1:discount_info": "[de] Ve pronto para evitar cola" } } })
    expect(calls.model).toBe(1)
    expect(calls.saved).toHaveLength(1)
    expect(calls.saved[0]).toHaveLength(2)
    const r2 = await handleTranslate({ lang: "de", refs: [ref(1), ref(1, "discount_info")] }, deps, true)
    expect(r2.body).toEqual(r1.body)
    expect(calls.model).toBe(1)
  })

  it("el mismo texto en varios locales se traduce una vez", async () => {
    const { deps, calls } = fakeDeps({ sources: { "clubs:1:discount_info": "Ve pronto", "clubs:2:discount_info": "Ve pronto" } })
    const r = await handleTranslate({ lang: "fr", refs: [ref(1, "discount_info"), ref(2, "discount_info")] }, deps, true)
    expect(r.status).toBe(200)
    expect(JSON.parse(calls.lastUser)).toEqual(["Ve pronto"])
    expect(Object.keys((r as { body: { translations: object } }).body.translations)).toHaveLength(2)
  })

  it("no traduce lo que no existe, está oculto, está vacío o no tiene letras", async () => {
    const { deps, calls } = fakeDeps({ sources: { "clubs:1:description": null, "clubs:2:price": "15€", "clubs:3:description": "   " } })
    const r = await handleTranslate({ lang: "en", refs: [ref(1), ref(2, "price"), ref(3), ref(4)] }, deps, true)
    expect(r).toEqual({ status: 200, body: { translations: {} } })
    expect(calls.model).toBe(0)
  })

  it("sin clave de API: devuelve lo guardado y 503 si no hay nada", async () => {
    const { deps, calls } = fakeDeps({ sources: { "clubs:1:description": "Hola mundo" } })
    expect((await handleTranslate({ lang: "en", refs: [ref(1)] }, deps, false)).status).toBe(503)
    expect(calls.model).toBe(0)
    const h = await hashSource("Hola mundo")
    const withCache = fakeDeps({ sources: { "clubs:1:description": "Hola mundo" }, cache: { [h]: "Hello world" } })
    expect(await handleTranslate({ lang: "en", refs: [ref(1)] }, withCache.deps, false)).toEqual({ status: 200, body: { translations: { "clubs:1:description": "Hello world" } } })
  })

  it("si la caché no se puede leer no llama al modelo (sería pagar lo mismo en cada visita)", async () => {
    const { deps, calls } = fakeDeps({ sources: { "clubs:1:description": "Hola mundo" }, loadCache: async () => { throw new Error("no such table") } })
    expect((await handleTranslate({ lang: "en", refs: [ref(1)] }, deps, true)).status).toBe(503)
    expect(calls.model).toBe(0)
  })

  it("una respuesta rota del modelo no guarda nada", async () => {
    const { deps, calls } = fakeDeps({ sources: { "clubs:1:description": "Hola mundo" }, callModel: async () => "lo siento, no puedo" })
    expect((await handleTranslate({ lang: "en", refs: [ref(1)] }, deps, true)).status).toBe(502)
    expect(calls.saved).toHaveLength(0)
    const boom = fakeDeps({ sources: { "clubs:1:description": "Hola mundo" }, callModel: async () => { throw new Error("429") } })
    expect((await handleTranslate({ lang: "en", refs: [ref(1)] }, boom.deps, true)).status).toBe(502)
  })

  it("si falla guardar, la traducción se devuelve igual", async () => {
    const { deps } = fakeDeps({ sources: { "clubs:1:description": "Hola mundo" }, saveCache: async () => { throw new Error("db") } })
    const r = await handleTranslate({ lang: "it", refs: [ref(1)] }, deps, true)
    expect(r).toEqual({ status: 200, body: { translations: { "clubs:1:description": "[de] Hola mundo" } } })
  })

  it("refs repetidas cuentan una vez", async () => {
    const { deps, calls } = fakeDeps({ sources: { "clubs:1:description": "Hola mundo" } })
    await handleTranslate({ lang: "pt", refs: [ref(1), ref(1)] }, deps, true)
    expect(JSON.parse(calls.lastUser)).toHaveLength(1)
  })
})
