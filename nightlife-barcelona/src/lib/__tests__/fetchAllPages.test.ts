import { describe, expect, it } from "vitest"
import { fetchAllPages } from "../fetchAll"

// Una tabla falsa con N filas numeradas; cada «consulta» cuenta cuántas veces se la llama.
function table(total: number, failAt: number | null = null) {
  const calls: number[] = []
  const build = async (from: number, to: number) => {
    calls.push(from)
    if (failAt !== null && from === failAt) return { data: null, error: new Error("boom") }
    const rows: number[] = []
    for (let i = from; i <= Math.min(to, total - 1); i++) rows.push(i)
    return { data: rows, error: null }
  }
  return { build, calls }
}

describe("fetchAllPages", () => {
  it("de una en una (por defecto) devuelve todo en orden", async () => {
    const t = table(2500)
    const out = await fetchAllPages(t.build)
    expect(out.length).toBe(2500)
    expect(out[0]).toBe(0)
    expect(out[2499]).toBe(2499)
    expect(t.calls).toEqual([0, 1000, 2000])
  })

  it("en paralelo da el mismo resultado y en el mismo orden", async () => {
    for (const total of [0, 1, 999, 1000, 1001, 2500, 3999, 4000, 4001, 9100]) {
      const seq = await fetchAllPages(table(total).build)
      const par = await fetchAllPages(table(total).build, 1000, 4)
      expect(par).toEqual(seq)
    }
  })

  it("en paralelo no pide de más cuando cabe en una tanda", async () => {
    const t = table(3200)
    await fetchAllPages(t.build, 1000, 4)
    expect(t.calls.length).toBe(4)
  })

  it("si una página falla, se devuelve lo anterior y se para (como antes)", async () => {
    const seq = await fetchAllPages(table(5000, 2000).build)
    const par = await fetchAllPages(table(5000, 2000).build, 1000, 4)
    expect(seq.length).toBe(2000)
    expect(par).toEqual(seq)
  })
})
