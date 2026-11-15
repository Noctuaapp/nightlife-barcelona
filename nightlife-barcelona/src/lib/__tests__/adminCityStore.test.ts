import { beforeEach, describe, expect, it, vi } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

// Un navegador de mentira con lo justo: almacenamiento y eventos.
const store = vi.hoisted(() => ({ data: new Map<string, string>(), listeners: new Map<string, ((e: unknown) => void)[]>(), failWrites: false }))
vi.hoisted(() => {
  const w = {
    localStorage: {
      getItem: (k: string) => (store.data.has(k) ? (store.data.get(k) as string) : null),
      setItem: (k: string, v: string) => {
        if (store.failWrites) throw new Error("sin almacenamiento")
        store.data.set(k, v)
      },
    },
    addEventListener: (name: string, fn: (e: unknown) => void) => store.listeners.set(name, [...(store.listeners.get(name) || []), fn]),
    removeEventListener: (name: string, fn: (e: unknown) => void) => store.listeners.set(name, (store.listeners.get(name) || []).filter((f) => f !== fn)),
  }
  ;(globalThis as unknown as { window: unknown }).window = w
})

import { AdminCityBadge, AdminCitySwitch, setAdminCity } from "../../components/admin/AdminCity"
import { ADMIN_CITY_STORAGE_KEY } from "../adminCity"

beforeEach(() => {
  store.data.clear()
  store.failWrites = false
})

describe("selector de ciudad del admin", () => {
  it("se pinta con las dos ciudades y Barcelona marcada al principio", () => {
    const html = renderToStaticMarkup(createElement(AdminCitySwitch))
    expect(html).toContain("Barcelona")
    expect(html).toContain("Madrid")
    expect(html).toMatch(/aria-pressed="true"[^>]*>Barcelona/)
    expect(html).toMatch(/aria-pressed="false"[^>]*>Madrid/)
    expect(html).toContain("Los apartados con")
  })

  it("la versión compacta no lleva la explicación", () => {
    expect(renderToStaticMarkup(createElement(AdminCitySwitch, { compact: true }))).not.toContain("Los apartados con")
  })

  it("al elegir una ciudad se guarda con la clave de siempre", () => {
    setAdminCity("madrid")
    expect(store.data.get(ADMIN_CITY_STORAGE_KEY)).toBe("madrid")
    setAdminCity("barcelona")
    expect(store.data.get(ADMIN_CITY_STORAGE_KEY)).toBe("barcelona")
  })

  it("si el almacenamiento falla no rompe nada", () => {
    store.failWrites = true
    expect(() => setAdminCity("madrid")).not.toThrow()
  })

  it("la etiqueta de la cabecera dice la ciudad (en el servidor, Barcelona)", () => {
    const html = renderToStaticMarkup(createElement(AdminCityBadge))
    expect(html).toContain("Barcelona")
    expect(html).not.toContain("sin abrir")
  })
})
