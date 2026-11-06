import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { availabilityOf, availabilityClass, isVerificationCurrent, verificationAgeDays } from "../availability"
import { ESSENTIAL_CATEGORIES, categoryInfo, isKnownCategory, usesOwnPhoto } from "../essentialCategories"

// Viernes 6/11/2026 a las 03:00 en Madrid (CET = UTC+1 → 02:00 UTC).
const NOW = new Date("2026-11-06T02:00:00Z")
const OPEN_NIGHT = "Monday to Sunday 9:00 AM – 5:00 AM"
const CLOSED_NOW = "Monday to Sunday 9:00 AM – 11:00 PM"
const DAYS_AGO = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => vi.useRealTimers())

describe("availabilityOf · categorías de siempre (directory)", () => {
  it("abierto según el horario del directorio: se ve como hasta ahora y cuenta como disponible", () => {
    const a = availabilityOf({ category: "Pharmacy", open_hours: OPEN_NIGHT })
    expect(a.state).toBe("open_listed")
    expect(a.counts).toBe(true)
    expect(a.tone).toBe("open")
    expect(a.label).toMatch(/Abierto/)
  })

  it("abierto y verificado: open_verified", () => {
    const a = availabilityOf({ category: "Pharmacy", open_hours: OPEN_NIGHT, verification_status: "verified", last_verified_at: DAYS_AGO(10) })
    expect(a.state).toBe("open_verified")
    expect(a.verified).toBe(true)
    expect(a.counts).toBe(true)
  })

  it("cerrado: no cuenta", () => {
    const a = availabilityOf({ category: "Pharmacy", open_hours: CLOSED_NOW })
    expect(a.state).toBe("closed")
    expect(a.counts).toBe(false)
    expect(availabilityClass(a)).toBe("text-zinc-400")
  })

  it("sin horario: no se dice nada (como antes) y no cuenta", () => {
    const a = availabilityOf({ category: "ATM", open_hours: null })
    expect(a.state).toBe("unverified")
    expect(a.label).toBe("")
    expect(a.counts).toBe(false)
  })
})

describe("availabilityOf · categorías estrictas", () => {
  it("Hospital abierto en el directorio pero sin verificar: NO se enseña como abierto", () => {
    const a = availabilityOf({ category: "Hospital", open_hours: "Open 24 hours", phone: "+34 932 00 00 00" })
    expect(a.state).toBe("unverified")
    expect(a.counts).toBe(false)
    expect(a.label).toBe("Horario sin confirmar · llama antes de ir")
    expect(a.tone).toBe("warn")
  })

  it("Hospital verificado hace poco: abierto confirmado", () => {
    const a = availabilityOf({ category: "Hospital", open_hours: "Open 24 hours", verification_status: "verified", last_verified_at: DAYS_AGO(30) })
    expect(a.state).toBe("open_verified")
    expect(a.counts).toBe(true)
  })

  it("verificación caducada (más de 90 días en Hospital): vuelve a sin confirmar", () => {
    const a = availabilityOf({ category: "Hospital", open_hours: "Open 24 hours", verification_status: "verified", last_verified_at: DAYS_AGO(91) })
    expect(a.state).toBe("unverified")
    expect(a.verified).toBe(false)
    expect(a.counts).toBe(false)
  })

  it("estado 'verified' sin fecha no vale", () => {
    expect(isVerificationCurrent({ category: "Hospital", verification_status: "verified", last_verified_at: null })).toBe(false)
  })

  it("sin teléfono no dice «llama»: un aseo o una máquina no tienen a quién llamar", () => {
    const a = availabilityOf({ category: "Toilets", open_hours: null })
    expect(a.state).toBe("unverified")
    expect(a.label).toBe("Horario sin confirmar")
    expect(availabilityOf({ category: "Vending", open_hours: "Open 24 hours" }).label).toBe("Horario sin confirmar")
    expect(availabilityOf({ category: "Toilets", open_hours: null, phone: "   " }).label).toBe("Horario sin confirmar")
  })

  it("Veterinario sin horario y con teléfono: dice que hay que llamar", () => {
    const a = availabilityOf({ category: "Veterinary", open_hours: null, phone: "933000000" })
    expect(a.state).toBe("unverified")
    expect(a.label).toMatch(/llama antes de ir/)
  })

  it("is_24h verificado cuenta como abierto 24 h aunque no haya texto de horario", () => {
    const a = availabilityOf({ category: "Veterinary", open_hours: null, is_24h: true, verification_status: "verified", last_verified_at: DAYS_AGO(5) })
    expect(a.state).toBe("open_verified")
    expect(a.label).toMatch(/24/)
  })

  it("servicio por llamada: no cuenta como presencial", () => {
    const a = availabilityOf({ category: "Veterinary", open_hours: OPEN_NIGHT, attrs: { service: "on_call" }, verification_status: "verified", last_verified_at: DAYS_AGO(1) })
    expect(a.state).toBe("on_call")
    expect(a.counts).toBe(false)
    expect(a.label).toBe("Urgencias por llamada")
  })

  it("usa los textos del idioma cuando se pasa t()", () => {
    const t = (k: string) => (k === "availability.unverified" ? "Unconfirmed hours · call first" : k)
    expect(availabilityOf({ category: "Hospital", open_hours: null, phone: "933000000" }, t).label).toBe("Unconfirmed hours · call first")
  })
})

describe("availabilityOf · siempre accesibles", () => {
  it("parada de taxi: always, cuenta, sin etiqueta", () => {
    const a = availabilityOf({ category: "Taxi" })
    expect(a.state).toBe("always")
    expect(a.counts).toBe(true)
    expect(a.label).toBe("")
  })
})

describe("verificationAgeDays", () => {
  it("cuenta días y devuelve null sin fecha", () => {
    expect(verificationAgeDays(DAYS_AGO(12), NOW)).toBe(12)
    expect(verificationAgeDays(null)).toBeNull()
    expect(verificationAgeDays("no es una fecha")).toBeNull()
  })
})

describe("catálogo de categorías", () => {
  it("no hay claves ni slugs repetidos", () => {
    const keys = ESSENTIAL_CATEGORIES.map((c) => c.key)
    const slugs = ESSENTIAL_CATEGORIES.map((c) => c.slug)
    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it("Bicing, consignas, comisarías y objetos perdidos están en el catálogo; recarga eléctrica y agua no", () => {
    for (const k of ["Bicing", "Luggage", "Police", "LostFound", "Taxi", "Veterinary", "Toilets", "Vending"]) expect(isKnownCategory(k)).toBe(true)
    for (const k of ["EVCharging", "Water", "Hotel"]) expect(isKnownCategory(k)).toBe(false)
  })

  it("Bicing se considera siempre accesible", () => {
    expect(availabilityOf({ category: "Bicing" }).state).toBe("always")
  })

  it("Hotel ya no existe y Casino se queda", () => {
    expect(isKnownCategory("Hotel")).toBe(false)
    expect(isKnownCategory("Casino")).toBe(true)
  })

  it("las categorías críticas son estrictas", () => {
    expect(categoryInfo("Hospital").trust).toBe("strict")
    expect(categoryInfo("Veterinary").trust).toBe("strict")
  })

  it("una categoría desconocida no rompe nada", () => {
    expect(categoryInfo("Inventada").slug).toBe("inventada")
  })
})

describe("imagen de los esenciales", () => {
  it("consignas, casinos, comida, supermercados y gasolineras enseñan su propia foto; el resto, la imagen predeterminada", () => {
    expect(usesOwnPhoto("Luggage")).toBe(true)
    expect(usesOwnPhoto("luggage")).toBe(true)
    expect(usesOwnPhoto("Casino")).toBe(true)
    for (const c of ["Food", "food", "Supermarket", "Gas Station", "gas-station"]) expect(usesOwnPhoto(c), c).toBe(true)
    for (const c of ["Pharmacy", "Hospital", "Veterinary", "Police", "Taxi", "Metro", "Nitbus", "Parking", "Bicing", "Vending", "ATM", "Toilets", "LostFound"]) {
      expect(usesOwnPhoto(c), c).toBe(false)
    }
    expect(usesOwnPhoto(null)).toBe(false)
  })
})
