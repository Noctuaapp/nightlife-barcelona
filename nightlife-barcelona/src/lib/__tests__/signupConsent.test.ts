import { describe, it, expect } from "vitest"
import {
  consentComplete,
  consentMetadata,
  confirmAgeUrl,
  isConsentExempt,
  readSignupConsent,
} from "../signupConsent"

const NOW = new Date("2026-11-06T12:00:00Z")

describe("consentMetadata + readSignupConsent", () => {
  it("lo que deja el registro se lee de vuelta", () => {
    const meta = consentMetadata(1998, NOW)
    expect(meta).toEqual({ terms_accepted_at: "2026-11-06T12:00:00.000Z", birth_year: 1998 })
    expect(readSignupConsent({ username: "x", ...meta }, NOW)).toEqual({
      termsAcceptedAt: "2026-11-06T12:00:00.000Z",
      birthYear: 1998,
    })
  })
  it("sin metadatos (Google, cuentas antiguas) no hay consentimiento", () => {
    expect(readSignupConsent(null, NOW)).toBeNull()
    expect(readSignupConsent(undefined, NOW)).toBeNull()
    expect(readSignupConsent({ full_name: "Ana" }, NOW)).toBeNull()
    expect(readSignupConsent("hola", NOW)).toBeNull()
  })
  it("rechaza fechas raras y menores de 18", () => {
    expect(readSignupConsent({ terms_accepted_at: "ayer", birth_year: 1990 }, NOW)).toBeNull()
    expect(readSignupConsent({ terms_accepted_at: "2027-01-01T00:00:00Z", birth_year: 1990 }, NOW)).toBeNull()
    expect(readSignupConsent({ terms_accepted_at: "2026-11-05T00:00:00Z", birth_year: 2009 }, NOW)).toBeNull()
    expect(readSignupConsent({ terms_accepted_at: "2026-11-05T00:00:00Z", birth_year: 2008 }, NOW)).not.toBeNull()
    expect(readSignupConsent({ terms_accepted_at: "2026-11-05T00:00:00Z", birth_year: 1800 }, NOW)).toBeNull()
    expect(readSignupConsent({ terms_accepted_at: "2026-11-05T00:00:00Z", birth_year: "abc" }, NOW)).toBeNull()
    expect(readSignupConsent({ terms_accepted_at: "2026-11-05T00:00:00Z" }, NOW)).toBeNull()
  })
})

describe("consentComplete", () => {
  it("pide términos y año de nacimiento", () => {
    expect(consentComplete({ terms_accepted_at: "2026-11-06T10:00:00Z", birth_year: 1995 })).toBe(true)
    expect(consentComplete({ terms_accepted_at: "2026-11-06T10:00:00Z", birth_year: null })).toBe(false)
    expect(consentComplete({ terms_accepted_at: null, birth_year: 1995 })).toBe(false)
    expect(consentComplete(null)).toBe(false)
    expect(consentComplete(undefined)).toBe(false)
  })
})

describe("isConsentExempt", () => {
  it("deja leer los textos legales y la propia confirmación", () => {
    for (const p of ["/confirm-age", "/blocked", "/terms", "/privacy", "/terms/"]) expect(isConsentExempt(p)).toBe(true)
  })
  it("el resto de páginas no", () => {
    for (const p of ["/", "/map", "/clubs/razzmatazz", "/login", "/termsx", "/admin"]) expect(isConsentExempt(p)).toBe(false)
  })
})

describe("confirmAgeUrl", () => {
  it("vuelve a la misma página, con su búsqueda", () => {
    expect(confirmAgeUrl("/clubs/x", "?a=1", "/")).toBe("/confirm-age?next=%2Fclubs%2Fx%3Fa%3D1")
  })
  it("desde /login y /signup usa el destino indicado", () => {
    expect(confirmAgeUrl("/login", "?next=/plan", "/plan")).toBe("/confirm-age?next=%2Fplan")
    expect(confirmAgeUrl("/signup", "", "/")).toBe("/confirm-age")
  })
  it("desde la portada no añade next", () => {
    expect(confirmAgeUrl("/", "", "/")).toBe("/confirm-age")
  })
})
