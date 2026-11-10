import { describe, expect, it, vi } from "vitest"

// useTranslatedTexts.ts importa el cliente de Supabase, que pide estas variables al cargarse.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co"
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy"
})

import { textItems } from "../useTranslatedTexts"

describe("textItems", () => {
  it("solo pide traducir los campos con texto de verdad", () => {
    const row = { id: 7, description: "Sala de techno en el Raval", discount_info: "", free_entry_info: null, price: "15€" }
    const items = textItems("clubs", row, ["description", "discount_info", "free_entry_info", "price"])
    expect(items).toEqual([{ key: "description", ref: { table: "clubs", id: 7, field: "description" }, text: "Sala de techno en el Raval" }])
  })

  it("sin id numérico (un local de mentira) no pide nada", () => {
    expect(textItems("clubs", { id: "x", description: "Hola mundo" }, ["description"])).toEqual([])
    expect(textItems("clubs", null, ["description"])).toEqual([])
    expect(textItems("events", undefined, ["description"])).toEqual([])
  })

  it("un precio con palabras sí se pide", () => {
    expect(textItems("clubs", { id: 2, price: "Depende del DJ invitado" }, ["price"])).toHaveLength(1)
  })
})
