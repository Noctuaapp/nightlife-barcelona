import { describe, expect, it } from "vitest"
import { frameAt, norm, planSpin, pocketCenter, PITCH, POCKETS, R_POCKET, R_TRACK } from "../roulette"

// Números fijos para que la prueba no dependa del azar.
const seeded = (seed: number) => {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

describe("ruleta del Sorpréndeme", () => {
  it("el plan siempre sale con valores razonables", () => {
    const rand = seeded(7)
    for (let i = 0; i < 300; i++) {
      const p = planSpin(rand)
      expect(p.pocket).toBeGreaterThanOrEqual(0)
      expect(p.pocket).toBeLessThan(POCKETS)
      expect(Number.isInteger(p.pocket)).toBe(true)
      expect(p.ballLaps).toBeGreaterThanOrEqual(3)
      expect(p.wheelTravel).toBeGreaterThanOrEqual(540)
      expect(p.wheelTravel).toBeLessThanOrEqual(720)
      // La bola da más vueltas que la rueda, así que acaba yendo al revés que ella.
      expect(p.ballLaps * 360).toBeGreaterThan(p.wheelTravel)
    }
  })

  it("también con el azar en sus extremos", () => {
    expect(planSpin(() => 0).pocket).toBe(0)
    expect(planSpin(() => 0.999999).pocket).toBe(POCKETS - 1)
  })

  it("al empezar la bola va por la pista y al acabar está quieta en el centro de su casilla", () => {
    const rand = seeded(11)
    for (let i = 0; i < 300; i++) {
      const plan = planSpin(rand)
      const a = frameAt(0, plan)
      expect(a.radius).toBeCloseTo(R_TRACK, 5)
      const z = frameAt(1, plan)
      expect(z.radius).toBeCloseTo(R_POCKET, 5)
      // Respecto a la rueda, la bola queda justo en el centro de la casilla elegida.
      const rel = norm(z.ball - z.wheel)
      expect(Math.abs(rel - pocketCenter(plan.pocket))).toBeLessThan(1e-6)
      expect(Math.floor(rel / PITCH)).toBe(plan.pocket)
    }
  })

  it("después de acabar nada se mueve aunque el tiempo siga corriendo", () => {
    const plan = planSpin(seeded(3))
    const a = frameAt(1, plan)
    const b = frameAt(1.7, plan)
    expect(b).toEqual(a)
    expect(frameAt(-1, plan)).toEqual(frameAt(0, plan))
  })

  it("la rueda solo avanza y frena, y la bola nunca sale de la pista ni se hunde en el centro", () => {
    const plan = planSpin(seeded(5))
    let prevWheel = -Infinity
    let prevSpeed = Infinity
    for (let i = 0; i <= 200; i++) {
      const u = i / 200
      const fr = frameAt(u, plan)
      expect(fr.wheel).toBeGreaterThanOrEqual(prevWheel)
      expect(fr.radius).toBeLessThanOrEqual(R_TRACK + 1e-9)
      expect(fr.radius).toBeGreaterThanOrEqual(R_POCKET - 2 - 1e-9)
      if (i > 0) {
        const speed = fr.wheel - prevWheel
        expect(speed).toBeLessThanOrEqual(prevSpeed + 1e-9)
        prevSpeed = speed
      }
      prevWheel = fr.wheel
    }
  })

  it("la bola va por la pista hasta más de la mitad de la tirada y solo entonces baja", () => {
    const plan = planSpin(seeded(9))
    expect(frameAt(0.5, plan).radius).toBeCloseTo(R_TRACK, 5)
    expect(frameAt(0.58, plan).radius).toBeCloseTo(R_TRACK, 5)
    expect(frameAt(0.8, plan).radius).toBeLessThan(R_TRACK)
  })

  it("va hacia el lado contrario que la rueda", () => {
    const plan = planSpin(seeded(13))
    const a = frameAt(0.1, plan)
    const b = frameAt(0.2, plan)
    expect(b.wheel - a.wheel).toBeGreaterThan(0)
    expect(b.ball - a.ball).toBeLessThan(0)
  })
})
