import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { DEFAULT_TRANSLATE_DAILY_LIMIT, takeTranslateCall, translateDailyLimit } from "../translateBudget"

describe("translateDailyLimit", () => {
  it("usa 200 si la variable no está o no es un número válido", () => {
    expect(DEFAULT_TRANSLATE_DAILY_LIMIT).toBe(200)
    expect(translateDailyLimit(undefined)).toBe(200)
    expect(translateDailyLimit("")).toBe(200)
    expect(translateDailyLimit("   ")).toBe(200)
    expect(translateDailyLimit("mucho")).toBe(200)
    expect(translateDailyLimit("-5")).toBe(200)
  })

  it("respeta el valor de Vercel, también 0 (interruptor de emergencia)", () => {
    expect(translateDailyLimit("50")).toBe(50)
    expect(translateDailyLimit("0")).toBe(0)
    expect(translateDailyLimit("12.9")).toBe(12)
  })
})

describe("takeTranslateCall", () => {
  const fake = (result: { data: unknown; error: unknown } | "throw") => {
    const calls: { fn: string; args: Record<string, unknown> }[] = []
    return {
      calls,
      db: {
        rpc: async (fn: string, args: Record<string, unknown>) => {
          calls.push({ fn, args })
          if (result === "throw") throw new Error("red")
          return result
        },
      },
    }
  }

  it("deja pasar cuando la base de datos dice que hay cupo, y le manda el límite", async () => {
    const f = fake({ data: true, error: null })
    expect(await takeTranslateCall(f.db, 77)).toBe(true)
    expect(f.calls).toEqual([{ fn: "translate_take_call", args: { p_limit: 77 } }])
  })

  it("no deja pasar cuando el tope está alcanzado", async () => {
    expect(await takeTranslateCall(fake({ data: false, error: null }).db, 10)).toBe(false)
  })

  it("no deja pasar si el contador falla (tabla sin crear, error de red, respuesta rara)", async () => {
    expect(await takeTranslateCall(fake({ data: null, error: { message: "no existe" } }).db, 10)).toBe(false)
    expect(await takeTranslateCall(fake({ data: null, error: null }).db, 10)).toBe(false)
    expect(await takeTranslateCall(fake({ data: "true", error: null }).db, 10)).toBe(false)
    expect(await takeTranslateCall(fake("throw").db, 10)).toBe(false)
  })
})

describe("la ruta /api/translate", () => {
  it("pide cupo al contador ANTES de llamar al modelo de pago", () => {
    const src = readFileSync(join(__dirname, "../../app/api/translate/route.ts"), "utf8")
    const take = src.indexOf("takeTranslateCall(")
    const call = src.indexOf("https://api.anthropic.com")
    expect(take).toBeGreaterThan(-1)
    expect(call).toBeGreaterThan(-1)
    expect(take).toBeLessThan(call)
  })
})
