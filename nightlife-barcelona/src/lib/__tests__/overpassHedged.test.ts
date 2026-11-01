import { describe, it, expect } from "vitest"
import { hedgedOverpass, type OverpassFetch } from "../overpassHedged"

const MIRRORS = ["https://a.example/api", "https://b.example/api", "https://c.example/api"]

// Servidor falso: cada URL se comporta como diga `plan` (tarda `ms` y devuelve lo que toque).
type Behaviour = { ms: number; status?: number; remark?: string; elements?: any[]; hang?: boolean }
function fakeFetch(plan: Record<string, Behaviour>, calls: string[] = []): OverpassFetch {
  return (url, init) =>
    new Promise((resolve, reject) => {
      calls.push(url)
      const b = plan[url]
      init.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })))
      if (b.hang) return
      setTimeout(() => {
        resolve({
          ok: (b.status ?? 200) < 400,
          status: b.status ?? 200,
          json: async () => ({ elements: b.elements ?? [], ...(b.remark ? { remark: b.remark } : {}) }),
        })
      }, b.ms)
    })
}

describe("hedgedOverpass", () => {
  it("devuelve la respuesta del primer servidor si contesta a tiempo", async () => {
    const calls: string[] = []
    const errors: string[] = []
    const els = await hedgedOverpass({
      mirrors: MIRRORS, query: "q", totalMs: 500, staggerMs: 100, errors,
      fetchImpl: fakeFetch({ [MIRRORS[0]]: { ms: 10, elements: [{ id: 1 }] }, [MIRRORS[1]]: { ms: 10 }, [MIRRORS[2]]: { ms: 10 } }, calls),
    })
    expect(els).toEqual([{ id: 1 }])
    expect(calls).toEqual([MIRRORS[0]])
    expect(errors).toEqual([])
  })

  it("si el primero se cuelga, el segundo contesta sin esperar al tiempo total", async () => {
    const errors: string[] = []
    const t0 = Date.now()
    const els = await hedgedOverpass({
      mirrors: MIRRORS, query: "q", totalMs: 1000, staggerMs: 50, errors,
      fetchImpl: fakeFetch({ [MIRRORS[0]]: { ms: 0, hang: true }, [MIRRORS[1]]: { ms: 10, elements: [{ id: 2 }] }, [MIRRORS[2]]: { ms: 10 } }),
    })
    expect(els).toEqual([{ id: 2 }])
    expect(Date.now() - t0).toBeLessThan(400)
  })

  it("pasa al siguiente en cuanto uno falla, sin esperar el escalonado", async () => {
    const errors: string[] = []
    const t0 = Date.now()
    const els = await hedgedOverpass({
      mirrors: MIRRORS, query: "q", totalMs: 2000, staggerMs: 1000, errors,
      fetchImpl: fakeFetch({ [MIRRORS[0]]: { ms: 5, status: 429 }, [MIRRORS[1]]: { ms: 5, elements: [{ id: 3 }] }, [MIRRORS[2]]: { ms: 5 } }),
    })
    expect(els).toEqual([{ id: 3 }])
    expect(Date.now() - t0).toBeLessThan(500)
    expect(errors).toEqual(["a.example: 429"])
  })

  it("trata un «timed out» de Overpass como fallo y prueba otro servidor", async () => {
    const errors: string[] = []
    const els = await hedgedOverpass({
      mirrors: MIRRORS, query: "q", totalMs: 1000, staggerMs: 500, errors,
      fetchImpl: fakeFetch({ [MIRRORS[0]]: { ms: 5, remark: "runtime error: Query timed out" }, [MIRRORS[1]]: { ms: 5, elements: [] }, [MIRRORS[2]]: { ms: 5 } }),
    })
    expect(els).toEqual([])
    expect(errors[0]).toMatch(/^a\.example: runtime error/)
  })

  it("devuelve null y no pasa del tiempo total si todos se cuelgan", async () => {
    const errors: string[] = []
    const t0 = Date.now()
    const els = await hedgedOverpass({
      mirrors: MIRRORS, query: "q", totalMs: 200, staggerMs: 50, errors,
      fetchImpl: fakeFetch({ [MIRRORS[0]]: { ms: 0, hang: true }, [MIRRORS[1]]: { ms: 0, hang: true }, [MIRRORS[2]]: { ms: 0, hang: true } }),
    })
    expect(els).toBeNull()
    expect(Date.now() - t0).toBeLessThan(600)
    expect(errors).toHaveLength(3)
    expect(errors.every((e) => e.endsWith("tiempo agotado"))).toBe(true)
  })

  it("cancela a los demás cuando uno gana y no apunta sus errores", async () => {
    const errors: string[] = []
    const els = await hedgedOverpass({
      mirrors: MIRRORS, query: "q", totalMs: 1000, staggerMs: 20, errors,
      fetchImpl: fakeFetch({ [MIRRORS[0]]: { ms: 0, hang: true }, [MIRRORS[1]]: { ms: 60, elements: [{ id: 4 }] }, [MIRRORS[2]]: { ms: 0, hang: true } }),
    })
    expect(els).toEqual([{ id: 4 }])
    await new Promise((r) => setTimeout(r, 50))
    expect(errors).toEqual([])
  })
})
