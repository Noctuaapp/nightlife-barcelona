import { beforeEach, describe, expect, it } from "vitest"
import {
  COOKIES_FIRST_MS,
  GAP_MS,
  cookiesShouldYield,
  emptyGate,
  evaluateSlot,
  readPopupGate,
  resetPopupGate,
  setPopupState,
} from "../popupGate"

const T0 = 1_000_000

beforeEach(() => resetPopupGate())

describe("cola de avisos: quién puede salir", () => {
  it("sin nada abierto, la encuesta y el registro pueden salir", () => {
    const g = emptyGate()
    expect(evaluateSlot(g, "poll", T0)).toEqual({ ok: true, retryAt: null })
    expect(evaluateSlot(g, "join", T0)).toEqual({ ok: true, retryAt: null })
  })

  it("nunca dos a la vez: con el registro abierto no sale la encuesta, y al revés", () => {
    const g = emptyGate()
    g.join = { open: true, pending: false, since: T0 }
    expect(evaluateSlot(g, "poll", T0).ok).toBe(false)
    const h = emptyGate()
    h.poll = { open: true, pending: false, since: T0 }
    expect(evaluateSlot(h, "join", T0).ok).toBe(false)
  })

  it("el registro espera a la encuesta si esta está a punto de salir; la encuesta no espera al registro pendiente", () => {
    const g = emptyGate()
    g.poll = { open: false, pending: true, since: 0 }
    expect(evaluateSlot(g, "join", T0).ok).toBe(false)
    const h = emptyGate()
    h.join = { open: false, pending: true, since: 0 }
    expect(evaluateSlot(h, "poll", T0).ok).toBe(true)
  })

  it("el banner de cookies manda durante sus primeros 20 s y luego cede", () => {
    const g = emptyGate()
    g.cookies = { open: true, pending: false, since: T0 }
    for (const id of ["poll", "join"] as const) {
      const early = evaluateSlot(g, id, T0 + 5_000)
      expect(early.ok).toBe(false)
      expect(early.retryAt).toBe(T0 + COOKIES_FIRST_MS)
      expect(evaluateSlot(g, id, T0 + COOKIES_FIRST_MS).ok).toBe(true)
    }
  })

  it("tras cerrarse un aviso hay una pausa antes del siguiente", () => {
    const g = emptyGate()
    g.lastClosedAt = T0
    const r = evaluateSlot(g, "join", T0 + 1_000)
    expect(r.ok).toBe(false)
    expect(r.retryAt).toBe(T0 + GAP_MS)
    expect(evaluateSlot(g, "join", T0 + GAP_MS).ok).toBe(true)
  })

  it("con cookies recién salidas y una pausa a la vez, espera a la más tardía", () => {
    const g = emptyGate()
    g.cookies = { open: true, pending: false, since: T0 }
    g.lastClosedAt = T0 + 18_000
    expect(evaluateSlot(g, "poll", T0 + 19_000).retryAt).toBe(T0 + 18_000 + GAP_MS)
  })

  it("el banner de cookies se esconde mientras haya encuesta o registro en pantalla", () => {
    const g = emptyGate()
    expect(cookiesShouldYield(g)).toBe(false)
    g.poll.open = true
    expect(cookiesShouldYield(g)).toBe(true)
    g.poll.open = false
    g.join.open = true
    expect(cookiesShouldYield(g)).toBe(true)
  })
})

describe("cola de avisos: registro de estados", () => {
  it("apunta cuándo se abre y cuándo se cierra cada aviso", () => {
    setPopupState("cookies", { open: true }, T0)
    expect(readPopupGate().cookies).toEqual({ open: true, pending: false, since: T0 })
    setPopupState("cookies", { open: false }, T0 + 3_000)
    expect(readPopupGate().cookies.open).toBe(false)
    expect(readPopupGate().lastClosedAt).toBe(T0 + 3_000)
  })

  it("repetir el mismo estado no cambia nada (ni la hora de apertura ni la de cierre)", () => {
    setPopupState("poll", { open: true }, T0)
    setPopupState("poll", { open: true }, T0 + 9_000)
    expect(readPopupGate().poll.since).toBe(T0)
    setPopupState("poll", { open: false }, T0 + 10_000)
    setPopupState("poll", { open: false }, T0 + 20_000)
    expect(readPopupGate().lastClosedAt).toBe(T0 + 10_000)
  })

  it("marcar «pendiente» no cuenta como cierre", () => {
    setPopupState("poll", { pending: true }, T0)
    setPopupState("poll", { pending: false }, T0 + 1_000)
    expect(readPopupGate().lastClosedAt).toBe(0)
  })

  it("recorrido completo de una primera visita: cookies, luego encuesta, luego registro", () => {
    // Llega: sale el banner de cookies; la encuesta está preparada y el registro armado.
    setPopupState("cookies", { open: true }, T0)
    setPopupState("poll", { pending: true }, T0)
    expect(evaluateSlot(readPopupGate(), "poll", T0 + 6_000).ok).toBe(false) // cookies mandan
    expect(evaluateSlot(readPopupGate(), "join", T0 + 12_000).ok).toBe(false) // y la encuesta va antes

    // Acepta las cookies a los 8 s: pausa de 6 s y sale la encuesta.
    setPopupState("cookies", { open: false }, T0 + 8_000)
    expect(evaluateSlot(readPopupGate(), "poll", T0 + 10_000).ok).toBe(false)
    expect(evaluateSlot(readPopupGate(), "poll", T0 + 14_000).ok).toBe(true)
    setPopupState("poll", { open: true, pending: false }, T0 + 14_000)
    expect(evaluateSlot(readPopupGate(), "join", T0 + 20_000).ok).toBe(false) // encuesta en pantalla

    // Vota y la cierra a los 25 s: pausa y sale el registro.
    setPopupState("poll", { open: false }, T0 + 25_000)
    expect(evaluateSlot(readPopupGate(), "join", T0 + 27_000).ok).toBe(false)
    expect(evaluateSlot(readPopupGate(), "join", T0 + 31_000).ok).toBe(true)
  })

  it("quien ignora el banner de cookies no se queda sin encuesta ni registro", () => {
    setPopupState("cookies", { open: true }, T0)
    setPopupState("poll", { pending: true }, T0)
    expect(evaluateSlot(readPopupGate(), "poll", T0 + 19_000).ok).toBe(false)
    expect(evaluateSlot(readPopupGate(), "poll", T0 + 21_000).ok).toBe(true)
    setPopupState("poll", { open: true, pending: false }, T0 + 21_000)
    expect(cookiesShouldYield(readPopupGate())).toBe(true) // el banner se aparta
    setPopupState("poll", { open: false }, T0 + 30_000)
    expect(cookiesShouldYield(readPopupGate())).toBe(false) // y vuelve, porque sigue sin decidir
    expect(readPopupGate().cookies.open).toBe(true)
  })
})
