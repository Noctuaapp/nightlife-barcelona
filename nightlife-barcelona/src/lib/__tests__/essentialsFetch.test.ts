import { describe, expect, it } from "vitest"
import { ESSENTIAL_LIST_COLUMNS, fetchEssentialsList } from "../essentialsFetch"

// Cliente falso que apunta qué columnas se piden y qué filtros se aplican.
function fakeClient(opts: { rejectNarrow?: boolean; rows?: number } = {}) {
  const calls: { cols: string; filters: string[]; range: [number, number] }[] = []
  const total = opts.rows ?? 2500
  const client = {
    from: (_t: string) => ({
      select: (cols: string) => {
        const call = { cols, filters: [] as string[], range: [0, 0] as [number, number] }
        calls.push(call)
        const q: any = {
          eq: (c: string, v: unknown) => { call.filters.push(`${c}=${v}`); return q },
          order: () => q,
          range: (a: number, b: number) => { call.range = [a, b]; return q },
          then: (ok: (r: any) => any) => {
            if (cols !== "*" && opts.rejectNarrow) return Promise.resolve({ data: null, error: { message: "column does not exist" } }).then(ok)
            const n = Math.max(0, Math.min(call.range[1] + 1, total) - call.range[0])
            return Promise.resolve({ data: Array.from({ length: n }, (_, i) => ({ id: call.range[0] + i })), error: null }).then(ok)
          },
        }
        return q
      },
    }),
  }
  return { client, calls }
}

describe("fetchEssentialsList", () => {
  it("pide solo las columnas de la lista, no `*`, y trae todas las filas", async () => {
    const { client, calls } = fakeClient()
    const rows = await fetchEssentialsList(client, "barcelona")
    expect(rows).toHaveLength(2500)
    expect(calls.every((c) => c.cols === ESSENTIAL_LIST_COLUMNS)).toBe(true)
    expect(calls.every((c) => c.filters.includes("hidden=false"))).toBe(true)
  })
  it("si Supabase rechaza una columna, repite con `*` y no se queda sin esenciales", async () => {
    const { client, calls } = fakeClient({ rejectNarrow: true })
    const rows = await fetchEssentialsList(client, "barcelona")
    expect(rows).toHaveLength(2500)
    expect(calls.some((c) => c.cols === "*")).toBe(true)
  })
  it("las columnas incluyen todo lo que leen la lista, la búsqueda, «cerca de ti» y «abierto ahora»", () => {
    for (const c of ["id", "name", "category", "neighborhood", "address", "image", "latitude", "longitude", "open_hours", "is_24h", "phone", "verification_status", "last_verified_at", "attrs"]) {
      expect(ESSENTIAL_LIST_COLUMNS.split(",").map((s) => s.trim())).toContain(c)
    }
    // Lo pesado que la portada nunca enseña no se pide.
    for (const c of ["description", "maps_link", "website", "hours_note", "kitchen_hours", "source_url"]) {
      expect(ESSENTIAL_LIST_COLUMNS.split(",").map((s) => s.trim())).not.toContain(c)
    }
  })
})
