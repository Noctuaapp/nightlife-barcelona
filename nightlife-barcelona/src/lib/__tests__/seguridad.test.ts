import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Auditoría de seguridad 2/11/2026. Estos tests fijan las defensas que se añadieron, para que un
// cambio futuro no las quite sin que salte el aviso.

// ---- captcha (Turnstile) -------------------------------------------------------------------
import { captchaEnabled, captchaOptions } from "../captcha"

describe("captcha", () => {
  it("está apagado sin clave y encendido con clave", () => {
    expect(captchaEnabled("")).toBe(false)
    expect(captchaEnabled("   ")).toBe(false)
    expect(captchaEnabled("0x4AAAA-clave")).toBe(true)
  })

  it("solo añade captchaToken a Supabase cuando hay token", () => {
    expect(captchaOptions(null)).toEqual({})
    expect(captchaOptions(undefined)).toEqual({})
    expect(captchaOptions("")).toEqual({})
    expect(captchaOptions("abc")).toEqual({ captchaToken: "abc" })
  })
})

// ---- cabeceras de seguridad ----------------------------------------------------------------
import nextConfig from "../../../next.config"

describe("cabeceras de seguridad", () => {
  it("la política de contenido cierra plugins, <base> y formularios externos, y sigue sin permitir iframes ajenos", async () => {
    const rules = await nextConfig.headers!()
    const all = rules.find((r) => r.source === "/:path*")!
    const csp = all.headers.find((h) => h.key === "Content-Security-Policy")!.value
    expect(csp).toContain("frame-ancestors 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
    const keys = all.headers.map((h) => h.key)
    for (const k of ["X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "Strict-Transport-Security"]) {
      expect(keys).toContain(k)
    }
  })
})

// ---- /api/revalidate exige sesión -----------------------------------------------------------
const revalidatePath = vi.fn()
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }))
const getUser = vi.fn()
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { getUser } }) }))

describe("/api/revalidate", () => {
  beforeEach(() => {
    revalidatePath.mockReset()
    getUser.mockReset()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon"
  })

  const call = async (headers: Record<string, string>, body: unknown) => {
    const { POST } = await import("../../app/api/revalidate/route")
    const { NextRequest } = await import("next/server")
    return POST(
      new NextRequest("http://localhost/api/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      })
    )
  }

  it("rechaza sin cabecera Authorization y no refresca nada", async () => {
    const res = await call({}, { paths: ["/"] })
    expect(res.status).toBe(401)
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(getUser).not.toHaveBeenCalled()
  })

  it("rechaza un token que Supabase no reconoce", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: "invalid JWT" } })
    const res = await call({ Authorization: "Bearer falso" }, { paths: ["/"] })
    expect(res.status).toBe(401)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("sigue aceptando todas las rutas que manda el admin y «mi club» (touchCache)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null })
    const { clubPaths, eventPaths, clubEventPaths, essentialPaths } = await import("../touchCache")
    const paths = [...clubPaths("razzmatazz"), ...eventPaths("primavera"), ...clubEventPaths(12), ...essentialPaths()]
    const res = await call({ Authorization: "Bearer bueno" }, { paths })
    expect(res.status).toBe(200)
    const called = revalidatePath.mock.calls.map((c) => c[0] as string)
    for (const p of new Set(paths)) expect(called).toContain(p)
  })

  it("no deja refrescar rutas con «..» ni la raíz disfrazada de prefijo", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null })
    const res = await call({ Authorization: "Bearer bueno" }, { paths: ["/clubs/../admin", "/mapa-secreto", "/profile", "/"] })
    expect(res.status).toBe(200)
    expect(revalidatePath.mock.calls.map((c) => c[0])).toEqual(["/"])
  })

  it("con sesión válida refresca solo rutas permitidas y como mucho 20", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null })
    const paths = ["/admin", "/api/x", "/clubs/razzmatazz", ...Array.from({ length: 30 }, (_, i) => `/event/e-${i}`)]
    const res = await call({ Authorization: "Bearer bueno" }, { paths })
    expect(res.status).toBe(200)
    expect(revalidatePath).toHaveBeenCalledTimes(20)
    const called = revalidatePath.mock.calls.map((c) => c[0] as string)
    expect(called).not.toContain("/admin")
    expect(called).not.toContain("/api/x")
    expect(called[0]).toBe("/clubs/razzmatazz")
  })
})

// ---- touchCache manda el token de quien guarda -----------------------------------------------
const getSession = vi.fn()
vi.mock("../supabase", () => ({ supabase: { auth: { getSession: () => getSession() } } }))

describe("touchCache", () => {
  const realFetch = globalThis.fetch
  const fetchMock = vi.fn()
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(new Response("{}"))
    getSession.mockReset()
    globalThis.fetch = fetchMock as unknown as typeof fetch
  })
  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it("sin sesión no llama al servidor", async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    const { touchCache } = await import("../touchCache")
    await touchCache(["/"])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("con sesión envía Authorization: Bearer <token>", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "tok123" } } })
    const { touchCache } = await import("../touchCache")
    await touchCache(["/", "/clubs"])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/revalidate")
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok123")
    expect(JSON.parse(init.body as string)).toEqual({ paths: ["/", "/clubs"] })
  })

  it("si falla la red no lanza error (no bloquea el guardado)", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "t" } } })
    fetchMock.mockRejectedValue(new Error("offline"))
    const { touchCache } = await import("../touchCache")
    await expect(touchCache(["/"])).resolves.toBeUndefined()
  })
})
