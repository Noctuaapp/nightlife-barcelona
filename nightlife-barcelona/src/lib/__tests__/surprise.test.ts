import { afterEach, describe, expect, it, vi } from "vitest"
import { clubHoursStatus } from "../clubHours"
import { effectiveHoursStatus } from "../scheduleNotices"
import { anyExtras, matchesExtras, moodScore, NO_EXTRAS, pickSurprise, pickWeighted } from "../surprise"

// Madrid = UTC+1 en noviembre. Viernes 7 nov 2025.
const at = (isoLocal: string) => vi.setSystemTime(new Date(`${isoLocal}+01:00`))
afterEach(() => vi.useRealTimers())

describe("clubHoursStatus", () => {
  it("abierto: da la hora de cierre", () => {
    vi.useFakeTimers()
    at("2025-11-07T23:30:00")
    expect(clubHoursStatus("23:00-06:00", null)).toEqual({ open: true, at: "06:00" })
    at("2025-11-08T02:00:00")
    expect(clubHoursStatus("23:00-06:00", null)).toEqual({ open: true, at: "06:00" })
  })
  it("todavía no ha abierto: da la hora de apertura de esta noche", () => {
    vi.useFakeTimers()
    at("2025-11-07T20:00:00")
    expect(clubHoursStatus("23:55-06:00", null)).toEqual({ open: false, at: "23:55" })
  })
  it("de día, abre por la noche: da la hora de apertura", () => {
    vi.useFakeTimers()
    at("2025-11-07T08:00:00")
    expect(clubHoursStatus("23:00-06:00", null)).toEqual({ open: false, at: "23:00" })
  })
  it("ya cerró y no vuelve a abrir hoy: null", () => {
    vi.useFakeTimers()
    at("2025-11-07T23:30:00")
    expect(clubHoursStatus("20:00-23:00", null)).toBeNull()
  })
  it("respeta los días del horario", () => {
    vi.useFakeTimers()
    at("2025-11-07T22:00:00") // viernes
    expect(clubHoursStatus("J-S 23:00-06:00, D 19:00-01:00", null)).toEqual({ open: false, at: "23:00" })
    at("2025-11-05T22:00:00") // miércoles: ninguna franja
    expect(clubHoursStatus("J-S 23:00-06:00, D 19:00-01:00", null)).toBeNull()
  })
  it("respeta los días de apertura del admin (open_days)", () => {
    vi.useFakeTimers()
    at("2025-11-07T20:00:00") // viernes
    expect(clubHoursStatus("23:00-06:00", ["Vie", "Sáb"])).toEqual({ open: false, at: "23:00" })
    expect(clubHoursStatus("23:00-06:00", ["Lun"])).toBeNull()
    at("2025-11-08T01:00:00") // madrugada del sábado = noche del viernes
    expect(clubHoursStatus("23:00-06:00", ["Vie"])).toEqual({ open: true, at: "06:00" })
    // Con solo «Sáb», a esa hora aún no ha abierto: abre esta misma tarde-noche.
    expect(clubHoursStatus("23:00-06:00", ["Sáb"])).toEqual({ open: false, at: "23:00" })
    expect(clubHoursStatus("23:00-06:00", ["Lun"])).toBeNull()
  })
  it("sin horario o ilegible: null", () => {
    expect(clubHoursStatus(null, null)).toBeNull()
    expect(clubHoursStatus("", null)).toBeNull()
    expect(clubHoursStatus("consultar", null)).toBeNull()
  })
})

describe("effectiveHoursStatus", () => {
  it("cierre temporal o de esta noche: null", () => {
    vi.useFakeTimers()
    at("2025-11-07T23:30:00")
    expect(effectiveHoursStatus({ hours: "23:00-06:00", temporarily_closed: true })).toBeNull()
    expect(
      effectiveHoursStatus({ hours: "23:00-06:00", schedule_notices: [{ id: "a", kind: "closed", from: "2025-11-07", to: "2025-11-07" }] })
    ).toBeNull()
  })
  it("horario especial de esta noche manda", () => {
    vi.useFakeTimers()
    at("2025-11-07T23:30:00")
    expect(
      effectiveHoursStatus({
        hours: "23:00-06:00",
        schedule_notices: [{ id: "a", kind: "hours", from: "2025-11-07", to: "2025-11-07", open: "20:00", close: "02:00" }],
      })
    ).toEqual({ open: true, at: "02:00" })
  })
})

describe("moodScore y extras", () => {
  it("«lo que sea» siempre encaja", () => {
    expect(moodScore({}, "any")).toBe(1)
  })
  it("cuenta palabras y características", () => {
    expect(moodScore({ music: "Techno, House" }, "dance")).toBe(2)
    expect(moodScore({ music: "Techno", dance_floor: true }, "dance")).toBe(2)
    expect(moodScore({ music: "Jazz", live_music: true }, "live")).toBeGreaterThanOrEqual(2)
    expect(moodScore({ music: "Techno" }, "chill")).toBe(0)
  })
  it("extras", () => {
    expect(anyExtras(NO_EXTRAS)).toBe(false)
    expect(anyExtras({ ...NO_EXTRAS, terrace: true })).toBe(true)
    expect(matchesExtras({ free_entry_info: "  " }, { ...NO_EXTRAS, free: true })).toBe(false)
    expect(matchesExtras({ free_entry_info: "Gratis antes de 1h" }, { ...NO_EXTRAS, free: true })).toBe(true)
    expect(matchesExtras({ terrace: false }, { ...NO_EXTRAS, terrace: true })).toBe(false)
    expect(matchesExtras({ lgtbi_friendly: true }, { ...NO_EXTRAS, lgtbi: true })).toBe(true)
  })
})

describe("pickWeighted", () => {
  it("respeta los pesos y siempre devuelve algo", () => {
    expect(pickWeighted(["a", "b"], () => 1, () => 0)).toBe("a")
    expect(pickWeighted(["a", "b"], (x) => (x === "a" ? 1 : 100), () => 0.99)).toBe("b")
    expect(pickWeighted(["a"], () => 0, () => 0.5)).toBe("a")
  })
})

const club = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  name: `Club ${id}`,
  city: "Barcelona",
  neighborhood: "Eixample",
  hours: "23:00-06:00",
  music: "Techno",
  latitude: 41.39,
  longitude: 2.16,
  ...extra,
})

const base = {
  mood: "any" as const,
  extras: NO_EXTRAS,
  zone: "",
  near: false,
  pos: null,
  denied: new Set<number>(),
  seen: [] as number[],
}

describe("pickSurprise", () => {
  it("sin locales: null", () => {
    expect(pickSurprise({ ...base, clubs: [] })).toBeNull()
  })

  it("nunca elige cerrados, cerrados esta noche ni los vetados", () => {
    vi.useFakeTimers()
    at("2025-11-07T23:30:00")
    const clubs = [
      club(1, { temporarily_closed: true }),
      club(2, { schedule_notices: [{ id: "a", kind: "closed", from: "2025-11-07", to: "2025-11-07" }] }),
      club(3),
      club(4),
    ]
    for (let i = 0; i < 40; i++) {
      const r = pickSurprise({ ...base, clubs, denied: new Set([4]), rand: Math.random })
      expect(r?.club.id).toBe(3)
    }
  })

  it("prefiere lo abierto ahora y no pone nota", () => {
    vi.useFakeTimers()
    at("2025-11-07T23:30:00")
    const clubs = [club(1, { hours: "10:00-12:00" }), club(2)]
    const r = pickSurprise({ ...base, clubs })
    expect(r?.club.id).toBe(2)
    expect(r?.note).toBe("")
  })

  it("si nada encaja con el rollo, propone otro abierto y avisa", () => {
    vi.useFakeTimers()
    at("2025-11-07T23:30:00")
    const clubs = [club(1, { music: "Techno" }), club(2, { hours: "10:00-12:00", music: "Jazz" })]
    const r = pickSurprise({ ...base, clubs, mood: "chill" })
    expect(r?.club.id).toBe(1)
    expect(r?.note).toBe("otherOpen")
  })

  it("si nada tiene los extras, avisa con «extras»", () => {
    vi.useFakeTimers()
    at("2025-11-07T23:30:00")
    const clubs = [club(1), club(2, { terrace: true, hours: "10:00-12:00" })]
    const r = pickSurprise({ ...base, clubs, extras: { ...NO_EXTRAS, terrace: true } })
    expect(r?.club.id).toBe(1)
    expect(r?.note).toBe("extras")
  })

  it("con extras que sí se cumplen, elige solo esos", () => {
    vi.useFakeTimers()
    at("2025-11-07T23:30:00")
    const clubs = [club(1), club(2, { lgtbi_friendly: true }), club(3, { lgtbi_friendly: true })]
    for (let i = 0; i < 30; i++) {
      const r = pickSurprise({ ...base, clubs, extras: { ...NO_EXTRAS, lgtbi: true } })
      expect([2, 3]).toContain(r?.club.id)
      expect(r?.note).toBe("")
    }
  })

  it("si no hay nada abierto, deja un plan para más tarde", () => {
    vi.useFakeTimers()
    at("2025-11-07T12:00:00")
    const r = pickSurprise({ ...base, clubs: [club(1), club(2)] })
    expect(r?.note).toBe("later")
  })

  it("no repite hasta que se acaban y luego solo evita el último", () => {
    vi.useFakeTimers()
    at("2025-11-07T23:30:00")
    const clubs = [club(1), club(2), club(3)]
    expect(pickSurprise({ ...base, clubs, seen: [1, 2] })?.club.id).toBe(3)
    for (let i = 0; i < 30; i++) {
      expect(pickSurprise({ ...base, clubs, seen: [1, 2, 3] })?.club.id).not.toBe(3)
    }
    // Un solo local: puede repetir.
    expect(pickSurprise({ ...base, clubs: [club(1)], seen: [1] })?.club.id).toBe(1)
  })

  it("cuando se acaban los que encajan del todo, pasa a los siguientes (con aviso) en vez de repetir", () => {
    vi.useFakeTimers()
    at("2025-11-07T23:30:00")
    const clubs = [club(1, { music: "Techno" }), club(2, { music: "Jazz" })]
    const first = pickSurprise({ ...base, clubs, mood: "dance" })
    expect(first?.club.id).toBe(1)
    expect(first?.note).toBe("")
    const second = pickSurprise({ ...base, clubs, mood: "dance", seen: [1] })
    expect(second?.club.id).toBe(2)
    expect(second?.note).toBe("otherOpen")
  })

  it("«cerca de mí» descarta lo lejano si hay algo cerca", () => {
    vi.useFakeTimers()
    at("2025-11-07T23:30:00")
    const pos = { lat: 41.39, lon: 2.16 }
    const clubs = [club(1, { latitude: 41.395, longitude: 2.165 }), club(2, { latitude: 41.6, longitude: 2.5 })]
    for (let i = 0; i < 30; i++) {
      expect(pickSurprise({ ...base, clubs, near: true, pos })?.club.id).toBe(1)
    }
  })

  it("zona sin locales: cae a todos", () => {
    vi.useFakeTimers()
    at("2025-11-07T23:30:00")
    const r = pickSurprise({ ...base, clubs: [club(1)], zone: "Una zona que no existe" })
    expect(r?.club.id).toBe(1)
  })
})
