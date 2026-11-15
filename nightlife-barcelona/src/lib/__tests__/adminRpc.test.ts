import { describe, expect, it, vi } from "vitest"
import { CITY_SQL_MISSING, cityFlags, cityFlagsNote, isCitySqlMissing, isMissingFunction, mergeCityFlags, NO_CITY_FLAGS, rpcByCity } from "../adminRpc"

const missing = { code: "PGRST202", message: "Could not find the function public.admin_funnel(p_city, p_from, p_to) in the schema cache" }

const clientOf = (impl: (fn: string, args?: Record<string, unknown>) => { data: unknown; error: unknown }) => ({
  rpc: vi.fn(async (fn: string, args?: Record<string, unknown>) => impl(fn, args) as { data: unknown; error: { message?: string; code?: string } | null }),
})

describe("isMissingFunction", () => {
  it("reconoce el error de función no encontrada", () => {
    expect(isMissingFunction(missing)).toBe(true)
    expect(isMissingFunction({ message: "Could not find the function public.x in the schema cache" })).toBe(true)
    expect(isMissingFunction({ message: 'function public.x(date) does not exist' })).toBe(true)
  })
  it("otros errores no lo son", () => {
    expect(isMissingFunction(null)).toBe(false)
    expect(isMissingFunction({ message: "No autorizado" })).toBe(false)
    expect(isMissingFunction({ message: 'relation "public.foo" does not exist' })).toBe(false)
  })
})

describe("rpcByCity", () => {
  it("pasa la ciudad como p_city", async () => {
    const c = clientOf(() => ({ data: { ok: 1 }, error: null }))
    const res = await rpcByCity(c, "admin_funnel", { p_from: "a", p_to: "b" }, "madrid")
    expect(c.rpc).toHaveBeenCalledWith("admin_funnel", { p_from: "a", p_to: "b", p_city: "madrid" })
    expect(res).toEqual({ data: { ok: 1 }, error: null, cityReady: true })
  })

  it("Barcelona sin SQL: vuelve a la versión de siempre", async () => {
    const c = clientOf((_fn, args) => (args && "p_city" in args ? { data: null, error: missing } : { data: { todo: true }, error: null }))
    const res = await rpcByCity(c, "admin_funnel", { p_from: "a" }, "barcelona")
    expect(c.rpc).toHaveBeenCalledTimes(2)
    expect(c.rpc).toHaveBeenLastCalledWith("admin_funnel", { p_from: "a" })
    expect(res.data).toEqual({ todo: true })
    expect(res.cityReady).toBe(false)
    expect(res.error).toBeNull()
  })

  it("Madrid sin SQL: no enseña nada de Barcelona y dice qué falta", async () => {
    const c = clientOf((_fn, args) => (args && "p_city" in args ? { data: null, error: missing } : { data: { todo: true }, error: null }))
    const res = await rpcByCity(c, "admin_funnel", { p_from: "a" }, "madrid", "105_x.sql")
    expect(c.rpc).toHaveBeenCalledTimes(1) // no se pide la versión sin ciudad
    expect(res.data).toBeNull()
    expect(isCitySqlMissing(res.error)).toBe(true)
    expect(res.error?.code).toBe(CITY_SQL_MISSING)
    expect(res.error?.message).toContain("supabase/105_x.sql")
  })

  it("un error de verdad (p. ej. no autorizado) no se disfraza de «falta el SQL»", async () => {
    const c = clientOf(() => ({ data: null, error: { message: "No autorizado", code: "P0001" } }))
    const res = await rpcByCity(c, "admin_funnel", {}, "madrid")
    expect(c.rpc).toHaveBeenCalledTimes(1)
    expect(isCitySqlMissing(res.error)).toBe(false)
    expect(res.error?.message).toBe("No autorizado")
  })
})

const ok = { error: null, cityReady: true }
const legacy = { error: null, cityReady: false }
const gone = { error: { code: CITY_SQL_MISSING, message: "falta" }, cityReady: false }
const broken = { error: { code: "P0001", message: "No autorizado" }, cityReady: true }

describe("cityFlags", () => {
  it("todo listo: sin avisos", () => {
    const f = cityFlags([ok, ok], [ok])
    expect(f).toEqual(NO_CITY_FLAGS)
    expect(cityFlagsNote(f)).toBeNull()
  })

  it("Barcelona con una función antigua: avisa de qué SQL falta", () => {
    expect(cityFlags([legacy, ok], [ok])).toEqual({ m104: false, m105: false, l104: true, l105: false })
    expect(cityFlags([ok], [legacy])).toEqual({ m104: false, m105: false, l104: false, l105: true })
  })

  it("Madrid sin SQL: marca «falta», no «toda la web»", () => {
    expect(cityFlags([gone], [gone, ok])).toEqual({ m104: true, m105: true, l104: false, l105: false })
  })

  it("un error de verdad no cuenta como falta de SQL", () => {
    expect(cityFlags([broken], [broken])).toEqual(NO_CITY_FLAGS)
  })

  it("une las cargas de una pantalla", () => {
    const a = cityFlags([ok], [legacy])
    const b = cityFlags([legacy], [ok])
    expect(mergeCityFlags(a, b)).toEqual({ m104: false, m105: false, l104: true, l105: true })
    expect(mergeCityFlags()).toEqual(NO_CITY_FLAGS)
  })
})

describe("cityFlagsNote", () => {
  it("en Madrid dice que no se enseñan cifras y nombra el SQL", () => {
    const n = cityFlagsNote({ m104: true, m105: false, l104: false, l105: false })
    expect(n?.kind).toBe("madrid")
    expect(n?.text).toContain("supabase/104_analitica_por_ciudad.sql")
    expect(n?.text).not.toContain("105")
    expect(n?.text).toContain("no se enseñan")
  })

  it("nombra los dos SQL cuando faltan los dos", () => {
    const n = cityFlagsNote({ m104: true, m105: true, l104: false, l105: false })
    expect(n?.text).toContain("104_analitica_por_ciudad.sql y supabase/105_datos_por_ciudad.sql")
  })

  it("en Barcelona dice que se ve toda la web junta", () => {
    const n = cityFlagsNote({ m104: false, m105: false, l104: false, l105: true })
    expect(n?.kind).toBe("barcelona")
    expect(n?.text).toContain("toda la web junta")
    expect(n?.text).toContain("105_datos_por_ciudad.sql")
  })

  it("si algo falta en Madrid, manda sobre el aviso de Barcelona", () => {
    expect(cityFlagsNote({ m104: false, m105: true, l104: true, l105: false })?.kind).toBe("madrid")
  })
})
