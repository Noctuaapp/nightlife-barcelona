import { describe, it, expect } from "vitest"
import { CONSENT_KEY, POLL_VOTES_KEY, parseConsent, readConsent, saveConsent, hasOptionalConsent, type KeyValueStore } from "../consent"
import { parseLocalVotes, readLocalVotes, recordLocalVote, votedOnDay } from "../partyPollLocal"

function fakeStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = String(v)
    },
    removeItem: (k: string) => {
      delete data[k]
    },
  }
}

describe("parseConsent", () => {
  it("lee una decisión válida", () => {
    expect(parseConsent('{"v":1,"optional":true,"at":"2026-10-30T10:00:00.000Z"}')).toEqual({ v: 1, optional: true, at: "2026-10-30T10:00:00.000Z" })
    expect(parseConsent('{"v":1,"optional":false}')).toEqual({ v: 1, optional: false, at: "" })
  })
  it("texto roto, vacío o de otra versión = sin decidir", () => {
    expect(parseConsent(null)).toBeNull()
    expect(parseConsent("")).toBeNull()
    expect(parseConsent("no es json")).toBeNull()
    expect(parseConsent('{"v":2,"optional":true}')).toBeNull()
    expect(parseConsent('{"v":1,"optional":"si"}')).toBeNull()
    expect(parseConsent("[]")).toBeNull()
  })
})

describe("saveConsent / readConsent", () => {
  it("sin nada guardado no hay decisión ni permiso", () => {
    const s = fakeStore()
    expect(readConsent(s)).toBeNull()
    expect(hasOptionalConsent(s)).toBe(false)
  })
  it("aceptar guarda el permiso", () => {
    const s = fakeStore()
    saveConsent(true, s, new Date("2026-10-30T10:00:00Z"))
    expect(hasOptionalConsent(s)).toBe(true)
    expect(readConsent(s)?.at).toBe("2026-10-30T10:00:00.000Z")
  })
  it("rechazar guarda la decisión pero no el permiso", () => {
    const s = fakeStore()
    saveConsent(false, s)
    expect(readConsent(s) === null).toBe(false)
    expect(hasOptionalConsent(s)).toBe(false)
  })
  it("rechazar borra lo opcional que hubiera guardado de antes", () => {
    const s = fakeStore({ [POLL_VOTES_KEY]: '{"cubata-golpe":20000}' })
    saveConsent(true, s)
    expect(s.data[POLL_VOTES_KEY] !== undefined).toBe(true)
    saveConsent(false, s)
    expect(s.data[POLL_VOTES_KEY] === undefined).toBe(true)
    expect(s.data[CONSENT_KEY] !== undefined).toBe(true) // la propia decisión sí se recuerda
  })
  it("aceptar después de rechazar vuelve a dar permiso", () => {
    const s = fakeStore()
    saveConsent(false, s)
    saveConsent(true, s)
    expect(hasOptionalConsent(s)).toBe(true)
  })
  it("un almacenamiento que falla no rompe nada", () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error("bloqueado")
      },
      setItem: () => {
        throw new Error("bloqueado")
      },
      removeItem: () => {
        throw new Error("bloqueado")
      },
    }
    expect(readConsent(broken)).toBeNull()
    expect(hasOptionalConsent(broken)).toBe(false)
    saveConsent(false, broken)
  })
})

describe("partyPollLocal", () => {
  it("parseLocalVotes ignora lo que no sea { id: día }", () => {
    expect(parseLocalVotes(null)).toEqual({})
    expect(parseLocalVotes("roto")).toEqual({})
    expect(parseLocalVotes("[1,2]")).toEqual({})
    expect(parseLocalVotes('{"a":20000,"b":"x","c":null,"":5}')).toEqual({ a: 20000 })
  })
  it("recordLocalVote guarda y acumula", () => {
    const s = fakeStore()
    recordLocalVote(s, "cubata-golpe", 20000)
    recordLocalVote(s, "zapatos", 20001)
    expect(readLocalVotes(s)).toEqual({ "cubata-golpe": 20000, zapatos: 20001 })
  })
  it("votar otra vez la misma pregunta no la duplica", () => {
    const s = fakeStore()
    recordLocalVote(s, "zapatos", 20000)
    recordLocalVote(s, "zapatos", 20005)
    expect(readLocalVotes(s)).toEqual({ zapatos: 20005 })
  })
  it("votedOnDay solo mira ese día", () => {
    const votes = { a: 20000, b: 19990 }
    expect(votedOnDay(votes, 20000)).toBe(true)
    expect(votedOnDay(votes, 20001)).toBe(false)
    expect(votedOnDay({}, 20000)).toBe(false)
  })
  it("no crece sin límite: se olvidan las más antiguas", () => {
    const s = fakeStore()
    for (let i = 0; i < 450; i++) recordLocalVote(s, `p${i}`, 20000 + i)
    const votes = readLocalVotes(s)
    expect(Object.keys(votes).length).toBeLessThanOrEqual(400)
    expect(votes["p449"]).toBe(20449) // la última sigue
    expect(votes["p0"] === undefined).toBe(true) // la primera se fue
  })
  it("sin almacenamiento no hace nada ni falla", () => {
    recordLocalVote(null, "zapatos", 20000)
    expect(readLocalVotes(null)).toEqual({})
  })
})
