import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  parsePollState,
  leadingIdx,
  isPollClosed,
  votePercent,
  cleanVoterName,
  newToken,
  getVoterToken,
  peekVoterToken,
  pollCandidates,
  defaultPick,
  POLL_NAME_MAX,
} from "../planPoll"
import { cleanShareStops, madridToday } from "../planShare"

const state = (votes: number[], mine: number | null = null) =>
  parsePollState({
    mode: "vote",
    total: votes.reduce((a, b) => a + b, 0),
    mine,
    options: votes.map((v, i) => ({ idx: i, votes: v, voters: Array.from({ length: v }, (_, k) => `P${i}${k}`) })),
  })!

describe("parsePollState", () => {
  it("lee una votación", () => {
    const s = state([2, 0, 1], 2)
    expect(s.total).toBe(3)
    expect(s.mine).toBe(2)
    expect(s.options.map((o) => o.votes)).toEqual([2, 0, 1])
    expect(s.options[0].voters).toEqual(["P00", "P01"])
  })
  it("un plan de siempre, un error o basura no son votación", () => {
    expect(parsePollState({ mode: "itinerary" })).toBeNull()
    expect(parsePollState(null)).toBeNull()
    expect(parsePollState("hola")).toBeNull()
    expect(parsePollState({ mode: "vote" })).toBeNull()
    expect(parsePollState({ mode: "vote", options: "no" })).toBeNull()
  })
  it("sanea cifras raras y nombres que no son texto", () => {
    const s = parsePollState({
      mode: "vote",
      total: -5,
      mine: 9,
      options: [{ idx: 0, votes: "3", voters: ["Ana", 7, null] }, null, { votes: NaN }],
    })!
    expect(s.total).toBe(0)
    expect(s.mine).toBeNull() // fuera de rango
    expect(s.options[0].votes).toBe(3)
    expect(s.options[0].voters).toEqual(["Ana"])
    expect(s.options[1].votes).toBe(0)
    expect(s.options[2].idx).toBe(2)
    expect(s.options[2].votes).toBe(0)
  })
  it("mine = 0 es un voto válido (no se confunde con «sin voto»)", () => {
    expect(state([1, 0], 0).mine).toBe(0)
  })
  it("recorta a 12 nombres por opción", () => {
    const s = parsePollState({ mode: "vote", options: [{ idx: 0, votes: 30, voters: Array.from({ length: 30 }, (_, i) => `n${i}`) }] })!
    expect(s.options[0].voters).toHaveLength(12)
  })
})

describe("leadingIdx y votePercent", () => {
  it("sin votos no gana nadie", () => {
    expect(leadingIdx(state([0, 0, 0]))).toEqual([])
  })
  it("gana la que más votos tiene", () => {
    expect(leadingIdx(state([1, 3, 2]))).toEqual([1])
  })
  it("en empate salen todas las empatadas", () => {
    expect(leadingIdx(state([2, 2, 1]))).toEqual([0, 1])
  })
  it("porcentajes", () => {
    expect(votePercent(1, 3)).toBe(33)
    expect(votePercent(2, 3)).toBe(67)
    expect(votePercent(0, 0)).toBe(0)
    expect(votePercent(5, 5)).toBe(100)
  })
})

describe("cleanVoterName", () => {
  it("quita caracteres de control y espacios", () => {
    expect(cleanVoterName("  Marc\u0000\n ")).toBe("Marc")
    expect(cleanVoterName("\u0001\u0002")).toBe("")
  })
  it("recorta a 30", () => {
    expect(cleanVoterName("x".repeat(80))).toHaveLength(POLL_NAME_MAX)
  })
  it("deja pasar acentos y emojis", () => {
    expect(cleanVoterName("Núria 🦉")).toBe("Núria 🦉")
  })
})

describe("código de voto", () => {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  beforeEach(() => {
    const store: Record<string, string> = {}
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = v },
    })
  })
  it("newToken es un UUID v4 y cambia cada vez", () => {
    expect(newToken()).toMatch(UUID)
    expect(newToken()).not.toBe(newToken())
  })
  it("sin crypto.randomUUID también sale un UUID v4", () => {
    vi.stubGlobal("crypto", { getRandomValues: (b: Uint8Array) => { for (let i = 0; i < b.length; i++) b[i] = (i * 37 + 11) & 255; return b } })
    expect(newToken()).toMatch(UUID)
    vi.unstubAllGlobals()
  })
  it("se guarda y se reutiliza en el móvil", () => {
    const a = getVoterToken()
    expect(a).toMatch(UUID)
    expect(getVoterToken()).toBe(a)
  })
  it("peekVoterToken no crea nada: solo lee lo que ya hay", () => {
    expect(peekVoterToken()).toBeNull()
    expect(localStorage.getItem("noctua_voter")).toBeNull()
    const a = getVoterToken()
    expect(peekVoterToken()).toBe(a)
  })
  it("un valor guardado que no es un UUID se sustituye", () => {
    localStorage.setItem("noctua_voter", "no-soy-un-uuid")
    expect(getVoterToken()).toMatch(UUID)
  })
  it("si el móvil no deja guardar, vale para la visita", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("bloqueado") },
      setItem: () => { throw new Error("bloqueado") },
    })
    const a = getVoterToken()
    expect(a).toMatch(UUID)
    expect(getVoterToken()).toBe(a)
  })
})

describe("pollCandidates y defaultPick", () => {
  const club = (n: string, href = `/clubs/${n}`) => ({ kind: "club" as const, title: n, href })
  it("junta listas sin repetir por enlace y respeta el orden", () => {
    const out = pollCandidates([[club("a"), club("b")], [club("b"), club("c")]])
    expect(out.map((s) => s.title)).toEqual(["a", "b", "c"])
  })
  it("respeta el máximo y descarta los que no tienen nombre", () => {
    const many = Array.from({ length: 12 }, (_, i) => club(`c${i}`))
    expect(pollCandidates([many], 8)).toHaveLength(8)
    expect(pollCandidates([[{ kind: "club", title: "", href: "/x" }]])).toEqual([])
  })
  it("marca de entrada 3 sitios, o los que haya", () => {
    expect(defaultPick(7)).toEqual([0, 1, 2])
    expect(defaultPick(2)).toEqual([0, 1])
    expect(defaultPick(0)).toEqual([])
  })
})

describe("cleanShareStops", () => {
  it("solo enlaces internos y solo imágenes https; recorta textos", () => {
    const [a, b, c] = cleanShareStops([
      { kind: "club", title: "T".repeat(200), subtitle: "S".repeat(200), time: "00:30:00:00:00", image: "http://x/y.jpg", href: "/clubs/a" },
      { kind: "event", title: "E", image: "https://x/y.jpg", href: "https://malo.example" },
      { kind: "club", title: "F", href: "//malo.example" },
    ])
    expect(a.title).toHaveLength(80)
    expect(a.subtitle).toHaveLength(80)
    expect(a.time).toHaveLength(12)
    expect(a.image).toBeNull()
    expect(a.href).toBe("/clubs/a")
    expect(b.image).toBe("https://x/y.jpg")
    expect(b.href).toBe("")
    expect(c.href).toBe("")
  })
  it("máximo 8 paradas por defecto", () => {
    const s = Array.from({ length: 12 }, (_, i) => ({ kind: "club" as const, title: `c${i}`, href: `/c/${i}` }))
    expect(cleanShareStops(s)).toHaveLength(8)
    expect(cleanShareStops(s, 5)).toHaveLength(5)
  })
})

describe("madridToday", () => {
  it("usa la fecha de España, no la del servidor", () => {
    expect(madridToday(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01")
    expect(madridToday(new Date("2026-06-15T10:00:00Z"))).toBe("2026-06-15")
  })
})

describe("isPollClosed", () => {
  it("sigue abierta la noche del plan y hasta las 06:00 del día siguiente (hora de España)", () => {
    expect(isPollClosed("2026-11-14", new Date("2026-11-14T09:00:00Z"))).toBe(false) // sábado por la mañana
    expect(isPollClosed("2026-11-14", new Date("2026-11-15T03:00:00Z"))).toBe(false) // 04:00 del domingo
    expect(isPollClosed("2026-11-14", new Date("2026-11-15T04:59:00Z"))).toBe(false) // 05:59 del domingo
  })
  it("se da por terminada a partir de las 06:00 del día siguiente", () => {
    expect(isPollClosed("2026-11-14", new Date("2026-11-15T05:00:00Z"))).toBe(true) // 06:00 del domingo
    expect(isPollClosed("2026-11-14", new Date("2026-11-20T12:00:00Z"))).toBe(true)
  })
  it("usa la hora de España también en verano (UTC+2)", () => {
    expect(isPollClosed("2026-07-11", new Date("2026-07-12T03:59:00Z"))).toBe(false) // 05:59 en Madrid
    expect(isPollClosed("2026-07-11", new Date("2026-07-12T04:00:00Z"))).toBe(true) // 06:00 en Madrid
  })
  it("un plan de otro día o sin fecha válida no se cierra por error", () => {
    expect(isPollClosed("2026-12-24", new Date("2026-11-15T12:00:00Z"))).toBe(false)
    expect(isPollClosed(null)).toBe(false)
    expect(isPollClosed("")).toBe(false)
    expect(isPollClosed("mañana")).toBe(false)
  })
})
