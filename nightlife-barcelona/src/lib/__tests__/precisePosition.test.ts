import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getPrecisePosition, type PreciseGeo } from "../precisePosition"
import { circleCoords, distanceInMeters } from "../geo"

// Un «GPS» de pruebas: emite las lecturas que se le pidan, cuando se le pidan.
function fakeGeo() {
  let ok: ((p: { coords: { latitude: number; longitude: number; accuracy: number } }) => void) | null = null
  let err: ((e: { code: number }) => void) | null = null
  const cleared: number[] = []
  const opts: PositionOptions[] = []
  const geo: PreciseGeo = {
    watchPosition: (o, e, po) => {
      ok = o
      err = e as typeof err
      if (po) opts.push(po)
      return 7
    },
    clearWatch: (id) => cleared.push(id),
  }
  return {
    geo,
    cleared,
    opts,
    emit: (lat: number, lng: number, accuracy: number) => ok?.({ coords: { latitude: lat, longitude: lng, accuracy } }),
    fail: (code: number) => err?.({ code }),
  }
}

describe("getPrecisePosition", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("pide alta precisión y sin caché", () => {
    const f = fakeGeo()
    void getPrecisePosition({ geo: f.geo }).catch(() => {})
    expect(f.opts[0]).toMatchObject({ enableHighAccuracy: true, maximumAge: 0 })
  })

  it("termina enseguida si la lectura ya es buena", async () => {
    const f = fakeGeo()
    const p = getPrecisePosition({ geo: f.geo })
    f.emit(41.38, 2.17, 25)
    await expect(p).resolves.toEqual({ lat: 41.38, lng: 2.17, accuracy: 25 })
    expect(f.cleared).toEqual([7])
  })

  it("se queda con la lectura más precisa y avisa de cada mejora", async () => {
    const f = fakeGeo()
    const seen: number[] = []
    const p = getPrecisePosition({ geo: f.geo, onUpdate: (u) => seen.push(u.accuracy) })
    f.emit(41.3, 2.1, 900) // wifi/IP: muy burda
    f.emit(41.381, 2.171, 300)
    f.emit(41.39, 2.18, 500) // más nueva pero peor: se ignora
    f.emit(41.382, 2.172, 90) // aceptable: espera por si afina
    await vi.advanceTimersByTimeAsync(3600)
    await expect(p).resolves.toEqual({ lat: 41.382, lng: 2.172, accuracy: 90 })
    expect(seen).toEqual([900, 300, 90])
  })

  it("si una lectura aceptable afina durante la espera, devuelve la afinada", async () => {
    const f = fakeGeo()
    const p = getPrecisePosition({ geo: f.geo })
    f.emit(41.382, 2.172, 100)
    await vi.advanceTimersByTimeAsync(1000)
    f.emit(41.3821, 2.1721, 35)
    await expect(p).resolves.toMatchObject({ accuracy: 35 })
  })

  it("con solo lecturas malas, devuelve la mejor al agotar el tiempo", async () => {
    const f = fakeGeo()
    const p = getPrecisePosition({ geo: f.geo, maxWaitMs: 8000 })
    f.emit(41.3, 2.1, 1500)
    f.emit(41.31, 2.11, 800)
    await vi.advanceTimersByTimeAsync(8100)
    await expect(p).resolves.toMatchObject({ accuracy: 800 })
  })

  it("rechaza al momento si no hay permiso", async () => {
    const f = fakeGeo()
    const p = getPrecisePosition({ geo: f.geo })
    f.fail(1)
    await expect(p).rejects.toMatchObject({ code: 1 })
    expect(f.cleared).toEqual([7])
  })

  it("un fallo pasajero no corta la espera: si luego llega una lectura, la usa", async () => {
    const f = fakeGeo()
    const p = getPrecisePosition({ geo: f.geo })
    f.fail(2)
    f.emit(41.38, 2.17, 20)
    await expect(p).resolves.toMatchObject({ accuracy: 20 })
  })

  it("sin ninguna lectura rechaza con el último error, o con «tiempo» si no hubo ninguno", async () => {
    const f = fakeGeo()
    const p = getPrecisePosition({ geo: f.geo, maxWaitMs: 5000 })
    f.fail(2)
    const assertion = expect(p).rejects.toMatchObject({ code: 2 })
    await vi.advanceTimersByTimeAsync(5100)
    await assertion

    const g = fakeGeo()
    const q = getPrecisePosition({ geo: g.geo, maxWaitMs: 5000 })
    const assertion2 = expect(q).rejects.toMatchObject({ code: 3 })
    await vi.advanceTimersByTimeAsync(5100)
    await assertion2
  })

  it("sin soporte de geolocalización rechaza con code 0", async () => {
    vi.stubGlobal("navigator", {})
    await expect(getPrecisePosition()).rejects.toMatchObject({ code: 0 })
    vi.unstubAllGlobals()
  })
})

describe("circleCoords", () => {
  it("cierra el anillo y deja todos los puntos al radio pedido", () => {
    const pts = circleCoords(41.39, 2.17, 200)
    expect(pts[0]).toEqual(pts[pts.length - 1])
    for (const [lng, lat] of pts) expect(Math.abs(distanceInMeters(41.39, 2.17, lat, lng) - 200)).toBeLessThan(4)
  })
})
