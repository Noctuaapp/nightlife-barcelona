import { afterEach, describe, expect, it, vi } from "vitest"
import { CITY_MEMORY_TTL_MS, cityForPath, parseCity, parseStoredCity, readRememberedCity, rememberCity, rememberedHome } from "../cityMemory"
import { safeNextPath } from "../nextPath"

// Ciudad recordada (16/11/2026): quien entra por Madrid no debe acabar en Barcelona por pasar por una página común
// (perfil, favoritos, acceso…), ni al revés. Ver lib/cityMemory.ts.

// `stored` = sessionStorage (esta pestaña); `local` = localStorage (este navegador). Devuelve los dos para mirar qué se guardó.
function fakeWindow(search = "", stored: Record<string, string> = {}, local: Record<string, string> = {}) {
  const session = { ...stored }
  const long = { ...local }
  const store = (data: Record<string, string>) => ({
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v
    },
  })
  vi.stubGlobal("window", { location: { search }, sessionStorage: store(session), localStorage: store(long) })
  return { session, long }
}

const savedAt = (city: string, at: number) => JSON.stringify({ city, at })

afterEach(() => vi.unstubAllGlobals())

describe("cityForPath: de qué ciudad es cada dirección", () => {
  it("lo que cuelga de /madrid es Madrid y manda, se recuerde lo que se recuerde", () => {
    for (const p of ["/madrid", "/madrid/clubs", "/madrid/map", "/madrid/essentials/pharmacy", "/madrid/events"]) {
      expect(cityForPath(p, null)).toEqual({ city: "madrid", explicit: true })
      expect(cityForPath(p, "barcelona")).toEqual({ city: "madrid", explicit: true })
    }
  })

  it("las páginas de Barcelona (raíz) mandan aunque se recordara Madrid: es la forma de volver con el selector", () => {
    for (const p of ["/", "/clubs", "/map", "/plan", "/events", "/essentials", "/essentials/pharmacy", "/metro", "/barrio/gracia"]) {
      expect(cityForPath(p, "madrid")).toEqual({ city: "barcelona", explicit: true })
    }
  })

  it("las páginas comunes heredan la ciudad recordada y no la cambian", () => {
    for (const p of ["/profile", "/favorites", "/login", "/signup", "/contact", "/faq", "/privacy", "/terms", "/mi-mes", "/event/x", "/club-event/3", "/essentials/sugerir", "/plan/ABC123"]) {
      expect(cityForPath(p, "madrid")).toEqual({ city: "madrid", explicit: false })
      expect(cityForPath(p, "barcelona")).toEqual({ city: "barcelona", explicit: false })
    }
  })

  it("sin nada recordado, una página común es de Barcelona, como siempre", () => {
    expect(cityForPath("/profile", null)).toEqual({ city: "barcelona", explicit: false })
    expect(cityForPath(null, null)).toEqual({ city: "barcelona", explicit: true }) // sin dirección = la portada
    expect(cityForPath(undefined, "madrid")).toEqual({ city: "barcelona", explicit: true })
  })

  it("los idiomas de fuera y las páginas solo de Barcelona no heredan Madrid", () => {
    for (const p of ["/en", "/en/clubs", "/de/guides/x", "/fr/metro", "/it/essentials", "/zona/badalona", "/nitbus", "/nitbus/N1", "/nochevieja-barcelona"]) {
      expect(cityForPath(p, "madrid").city).toBe("barcelona")
    }
  })

  it("una ruta que solo empieza como /madrid (/madridista) no es de Madrid", () => {
    expect(cityForPath("/madridista", null).city).toBe("barcelona")
  })
})

describe("la ciudad recordada se guarda en la pestaña", () => {
  it("parseCity solo acepta las ciudades que existen", () => {
    expect(parseCity("madrid")).toBe("madrid")
    expect(parseCity("barcelona")).toBe("barcelona")
    for (const v of ["valencia", "", null, undefined, 3, "toString", "__proto__"]) expect(parseCity(v)).toBeNull()
  })

  it("rememberCity guarda y readRememberedCity lee", () => {
    fakeWindow()
    expect(readRememberedCity()).toBeNull()
    rememberCity("madrid")
    expect(readRememberedCity()).toBe("madrid")
    rememberCity("barcelona")
    expect(readRememberedCity()).toBe("barcelona")
  })

  it("un valor raro guardado se ignora", () => {
    fakeWindow("", { noctua_city: "atlantis" })
    expect(readRememberedCity()).toBeNull()
  })

  it("sin sessionStorage no rompe nada", () => {
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: () => {
          throw new Error("bloqueado")
        },
        setItem: () => {
          throw new Error("bloqueado")
        },
      },
    })
    expect(readRememberedCity()).toBeNull()
    expect(() => rememberCity("madrid")).not.toThrow()
    expect(rememberedHome()).toBe("/")
  })
})

describe("pestaña nueva: la última ciudad de este navegador", () => {
  it("rememberCity guarda también la copia con la hora en localStorage", () => {
    const { session, long } = fakeWindow()
    rememberCity("madrid")
    expect(session.noctua_city).toBe("madrid")
    expect(JSON.parse(long.noctua_city)).toMatchObject({ city: "madrid" })
    expect(typeof JSON.parse(long.noctua_city).at).toBe("number")
  })

  it("en una pestaña nueva (sessionStorage vacío) se usa la copia: el enlace del correo o un marcador no pierden la ciudad", () => {
    fakeWindow("", {}, { noctua_city: savedAt("madrid", Date.now() - 60_000) })
    expect(readRememberedCity()).toBe("madrid")
    expect(rememberedHome()).toBe("/madrid")
    expect(safeNextPath()).toBe("/madrid")
  })

  it("la ciudad de la pestaña manda sobre la copia del navegador (dos pestañas, dos ciudades)", () => {
    fakeWindow("", { noctua_city: "barcelona" }, { noctua_city: savedAt("madrid", Date.now()) })
    expect(readRememberedCity()).toBe("barcelona")
  })

  it("la copia caduca a los 7 días y entonces vuelve Barcelona", () => {
    const now = 1_800_000_000_000
    expect(parseStoredCity(savedAt("madrid", now - CITY_MEMORY_TTL_MS + 1000), now)).toBe("madrid")
    expect(parseStoredCity(savedAt("madrid", now - CITY_MEMORY_TTL_MS - 1000), now)).toBeNull()
    expect(CITY_MEMORY_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it("una copia rota, de otra ciudad, con hora del futuro o sin hora se ignora", () => {
    const now = 1_800_000_000_000
    for (const raw of [null, undefined, "", "madrid", "{", "null", savedAt("valencia", now), savedAt("madrid", now + 99_999), JSON.stringify({ city: "madrid" }), JSON.stringify({ city: "madrid", at: "ayer" })]) {
      expect(parseStoredCity(raw as string | null | undefined, now)).toBeNull()
    }
  })

  it("con localStorage bloqueado, sigue valiendo la pestaña", () => {
    vi.stubGlobal("window", {
      location: { search: "" },
      sessionStorage: { getItem: () => "madrid", setItem: () => {} },
      localStorage: {
        getItem: () => {
          throw new Error("bloqueado")
        },
        setItem: () => {
          throw new Error("bloqueado")
        },
      },
    })
    expect(readRememberedCity()).toBe("madrid")
    expect(() => rememberCity("barcelona")).not.toThrow()
  })

  it("al entrar por una página de Barcelona se pisa la copia: no se arrastra Madrid", () => {
    const { session, long } = fakeWindow("", {}, { noctua_city: savedAt("madrid", Date.now()) })
    rememberCity("barcelona") // lo que hace el CityScope de «/», «/clubs»…
    expect(session.noctua_city).toBe("barcelona")
    expect(JSON.parse(long.noctua_city).city).toBe("barcelona")
    expect(readRememberedCity()).toBe("barcelona")
  })
})

describe("volver «a casa» desde una página común", () => {
  it("rememberedHome lleva a la portada de la ciudad recordada", () => {
    fakeWindow()
    expect(rememberedHome()).toBe("/")
    rememberCity("madrid")
    expect(rememberedHome()).toBe("/madrid")
    rememberCity("barcelona")
    expect(rememberedHome()).toBe("/")
  })

  it("tras iniciar sesión sin ?next=, quien venía de Madrid vuelve a Madrid", () => {
    fakeWindow("", { noctua_city: "madrid" })
    expect(safeNextPath()).toBe("/madrid")
  })

  it("con ?next= se respeta (el acceso desde una ficha o un plan vuelve donde estaba)", () => {
    fakeWindow("?next=/madrid/plan", { noctua_city: "madrid" })
    expect(safeNextPath()).toBe("/madrid/plan")
    fakeWindow("?next=/clubs/abc", { noctua_city: "madrid" })
    expect(safeNextPath()).toBe("/clubs/abc")
  })

  it("un ?next= externo se descarta y se vuelve a la portada de la ciudad", () => {
    fakeWindow("?next=//evil.example", { noctua_city: "madrid" })
    expect(safeNextPath()).toBe("/madrid")
    fakeWindow("?next=https://evil.example", { noctua_city: "madrid" })
    expect(safeNextPath()).toBe("/madrid")
  })

  it("con un fallback explícito se usa ese, no la ciudad recordada", () => {
    fakeWindow("", { noctua_city: "madrid" })
    expect(safeNextPath("/profile")).toBe("/profile")
  })

  it("sin ciudad recordada, Barcelona (como siempre)", () => {
    fakeWindow("")
    expect(safeNextPath()).toBe("/")
  })
})
