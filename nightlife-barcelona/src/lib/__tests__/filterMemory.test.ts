import { describe, it, expect } from "vitest"
import { FILTER_MEMORY_TTL_MS, loadFilterMemory, onlyKnown, saveFilterMemory, type StorageLike } from "../filterMemory"

function fakeStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

describe("saveFilterMemory / loadFilterMemory", () => {
  it("guarda y devuelve lo mismo", () => {
    const s = fakeStorage()
    saveFilterMemory(s, "k", { genres: ["Techno"], search: "gracia" }, 1000)
    expect(loadFilterMemory(s, "k", 2000)).toEqual({ genres: ["Techno"], search: "gracia" })
  })

  it("lo antiguo se ignora", () => {
    const s = fakeStorage()
    saveFilterMemory(s, "k", { a: 1 }, 0)
    expect(loadFilterMemory(s, "k", FILTER_MEMORY_TTL_MS + 1)).toBeNull()
    expect(loadFilterMemory(s, "k", FILTER_MEMORY_TTL_MS)).toEqual({ a: 1 })
  })

  it("una hora guardada en el futuro (reloj raro) se ignora", () => {
    const s = fakeStorage()
    saveFilterMemory(s, "k", { a: 1 }, 5000)
    expect(loadFilterMemory(s, "k", 1000)).toBeNull()
  })

  it("sin nada guardado, con basura o sin almacenamiento devuelve null", () => {
    const s = fakeStorage()
    expect(loadFilterMemory(s, "k")).toBeNull()
    s.setItem("k", "no es json")
    expect(loadFilterMemory(s, "k")).toBeNull()
    s.setItem("k", JSON.stringify({ savedAt: "ayer", state: {} }))
    expect(loadFilterMemory(s, "k")).toBeNull()
    expect(loadFilterMemory(null, "k")).toBeNull()
    expect(() => saveFilterMemory(null, "k", {})).not.toThrow()
  })

  it("si el almacenamiento falla, no rompe nada", () => {
    const broken: StorageLike = {
      getItem: () => { throw new Error("bloqueado") },
      setItem: () => { throw new Error("lleno") },
      removeItem: () => { throw new Error("bloqueado") },
    }
    expect(() => saveFilterMemory(broken, "k", {})).not.toThrow()
    expect(loadFilterMemory(broken, "k")).toBeNull()
  })
})

describe("onlyKnown", () => {
  it("se queda solo con los valores que siguen existiendo", () => {
    expect(onlyKnown(["Techno", "Antiguo", 3, null], ["Techno", "Karaoke"])).toEqual(["Techno"])
    expect(onlyKnown(["Gràcia", "Raval"], new Set(["Gràcia"]))).toEqual(["Gràcia"])
  })

  it("lo que no es una lista da lista vacía", () => {
    expect(onlyKnown(undefined, ["a"])).toEqual([])
    expect(onlyKnown("Techno", ["Techno"])).toEqual([])
  })
})
