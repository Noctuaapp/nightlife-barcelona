import { describe, it, expect, afterEach, vi } from "vitest"
import { parseOsmHours, isOpen24h, hasFullDay, opensPastOne, isNightEssentialHours, isOpenAt, toNoctuaHours } from "../osmHours"
import { getOpenStatus } from "../openStatus"

const night = (raw: string) => {
  const w = parseOsmHours(raw)
  return w ? isNightEssentialHours(w) : null
}

describe("parseOsmHours", () => {
  it("entiende 24/7 y lunes a domingo todo el día", () => {
    expect(isOpen24h(parseOsmHours("24/7")!)).toBe(true)
    expect(isOpen24h(parseOsmHours("Mo-Su 00:00-24:00")!)).toBe(true)
  })

  it("entiende rangos, listas de días y turnos partidos", () => {
    const w = parseOsmHours("Mo-Fr 09:00-14:00,17:00-21:00; Sa 09:00-14:00; Su off")!
    expect(w[0]).toEqual([[540, 840], [1020, 1260]])
    expect(w[5]).toEqual([[540, 840]])
    expect(w[6]).toEqual([])
    expect(parseOsmHours("Mo,We,Fr 10:00-12:00")![2]).toEqual([[600, 720]])
  })

  it("el cierre de madrugada pasa al día siguiente y Fr-Mo da la vuelta a la semana", () => {
    expect(parseOsmHours("Mo-Su 18:00-03:00")![0]).toEqual([[1080, 1620]])
    const w = parseOsmHours("Fr-Mo 10:00-12:00")!
    expect([4, 5, 6, 0].every((d) => w[d].length === 1)).toBe(true)
    expect(w[2]).toEqual([])
  })

  it("una regla posterior sustituye a la anterior en esos días, y «, Día» suma", () => {
    expect(parseOsmHours("Mo-Su 08:00-22:00; Sa 09:00-14:00")![5]).toEqual([[540, 840]])
    expect(parseOsmHours("Mo-Fr 08:00-12:00, Sa 09:00-14:00")![5]).toEqual([[540, 840]])
  })

  it("ignora los festivos", () => {
    const w = parseOsmHours("Mo-Su 09:00-23:00; PH off")!
    expect(w[3]).toEqual([[540, 1380]])
  })

  it("devuelve null con lo que no entiende, en vez de inventar", () => {
    for (const raw of ["", "sunrise-sunset", "Mo-Fr 08:00+", "Jan-Mar Mo-Fr 09:00-12:00", "Mo-Su open", "Mo-Fr", "Mo-Fr 08:00-18:00 \"con cita\"", "wk 1-10 Mo 09:00-10:00", "Mo-Fr 25:00-26:00", "Mo-Fr 10:00-10:00"]) {
      expect(parseOsmHours(raw), raw).toBeNull()
    }
  })
})

describe("criterio de noche (24 h o cierre pasada la 1:00)", () => {
  it("24 h entra, también si solo es algún día", () => {
    expect(night("24/7")).toBe(true)
    expect(night("Mo-Fr 08:00-22:00; Sa 00:00-24:00")).toBe(true)
  })

  it("cerrar a la 1:00 en punto NO es pasada la 1:00; a la 1:30 sí", () => {
    expect(night("Mo-Su 09:00-01:00")).toBe(false)
    expect(night("Mo-Su 09:00-01:30")).toBe(true)
    expect(night("Mo-Su 18:00-03:00")).toBe(true)
  })

  it("basta con que algún día cierre tarde", () => {
    expect(night("Mo-Th 09:00-23:00; Fr-Sa 09:00-03:00; Su 10:00-22:00")).toBe(true)
  })

  it("un horario normal de día no entra", () => {
    expect(night("Mo-Fr 09:00-14:00,17:00-21:00; Sa 09:00-14:00")).toBe(false)
    expect(night("Mo-Su 08:00-24:00")).toBe(false)
  })

  it("seguir abierto de madrugada cuenta; abrir de madrugada, no", () => {
    expect(opensPastOne(parseOsmHours("Mo-Su 00:00-06:00")!)).toBe(true)
    expect(opensPastOne(parseOsmHours("Mo-Su 01:00-05:00")!)).toBe(true)
    expect(hasFullDay(parseOsmHours("Mo-Su 06:00-14:00")!)).toBe(false)
  })

  it("una cafetería que abre a las 5:30 y cierra a las 21:30 no es de noche", () => {
    expect(night("Mo-Fr 05:30-21:30; Sa 06:00-21:30; Su 06:00-14:30")).toBe(false)
    expect(night("Mo-Su 04:00-12:00")).toBe(false)
  })

  it("los que cierran pasada la 1:00 solo algunos días sí entran", () => {
    expect(night("Mo-Fr 06:00-24:00; Sa-Su 07:00-01:30")).toBe(true)
    expect(night("Mo-Th 10:00-01:00; Fr-Sa 10:00-03:00; Su 10:00-24:00")).toBe(true)
    expect(night("Tu-Th 13:00-20:00; Th-Fr 22:30-02:30")).toBe(true)
  })
})

describe("toNoctuaHours", () => {
  it("24 h todos los días", () => {
    expect(toNoctuaHours(parseOsmHours("24/7")!)).toBe("Open 24 hours")
  })

  it("agrupa los días iguales en el formato que ya entiende la web", () => {
    expect(toNoctuaHours(parseOsmHours("Mo-Su 09:00-03:00")!)).toBe("Monday to Sunday 9:00 AM – 3:00 AM")
    expect(toNoctuaHours(parseOsmHours("Mo-Fr 08:00-22:00; Sa-Su 10:00-02:00")!)).toBe(
      "Monday to Friday 8:00 AM – 10:00 PM | Saturday to Sunday 10:00 AM – 2:00 AM",
    )
  })

  it("separa días no seguidos, turnos partidos y días de 24 h", () => {
    expect(toNoctuaHours(parseOsmHours("Mo,We 10:00-12:00")!)).toBe("Monday 10:00 AM – 12:00 PM | Wednesday 10:00 AM – 12:00 PM")
    expect(toNoctuaHours(parseOsmHours("Mo 09:00-14:00,17:00-21:00")!)).toBe("Monday 9:00 AM – 2:00 PM | Monday 5:00 PM – 9:00 PM")
    expect(toNoctuaHours(parseOsmHours("Mo-Th 09:00-23:00; Fr-Sa 00:00-24:00")!)).toBe("Monday to Thursday 9:00 AM – 11:00 PM | Friday to Saturday Open 24 hours")
  })

  it("el cierre a medianoche se escribe 12:00 AM", () => {
    expect(toNoctuaHours(parseOsmHours("Mo-Su 08:00-24:00")!)).toBe("Monday to Sunday 8:00 AM – 12:00 AM")
  })
})

// La prueba que importa: lo que se guarda en la base de datos, leído por getOpenStatus(), tiene que
// dar el mismo «abierto / cerrado» que el horario original de OpenStreetMap, en cualquier día y hora.
describe("el texto guardado se lee igual que el horario original", () => {
  afterEach(() => vi.useRealTimers())

  const SAMPLES = [
    "24/7",
    "Mo-Su 09:00-03:00",
    "Mo-Su 08:00-24:00",
    "Mo-Su 00:00-24:00",
    "Mo-Fr 08:00-22:00; Sa-Su 10:00-02:00",
    "Mo,We 10:00-12:00",
    "Mo-Fr 09:00-14:00,17:00-21:00; Sa 09:00-14:00",
    "Mo-Th 09:00-23:00; Fr-Sa 00:00-24:00",
    "Mo-Th 18:00-01:30; Fr-Sa 18:00-05:00; Su 18:00-00:00",
    "Fr-Mo 10:00-12:00",
  ]

  it.each(SAMPLES)("%s", (raw) => {
    const week = parseOsmHours(raw)!
    const stored = toNoctuaHours(week)
    // 2026-11-02 es lunes; cada 15 minutos de toda la semana, con hora de Madrid (UTC+1 en noviembre).
    vi.useFakeTimers()
    const mismatches: string[] = []
    let opens = 0
    let closeds = 0
    for (let day = 0; day < 7; day++) {
      for (let minutes = 0; minutes < 1440; minutes += 15) {
        const d = new Date(Date.UTC(2026, 10, 2 + day, 0, 0, 0) + (minutes - 60) * 60000)
        vi.setSystemTime(d)
        const st = getOpenStatus(stored).state
        const expected = isOpenAt(week, day, minutes)
        if (expected) opens++
        else closeds++
        // «unknown» solo vale cuando el sitio está cerrado ese día (el texto no lo menciona).
        const ok = expected ? st === "open" : st !== "open"
        if (!ok) mismatches.push(`${day} ${minutes} esperado=${expected} obtenido=${st} (${stored})`)
      }
    }
    expect(mismatches.slice(0, 5)).toEqual([])
    // Que la prueba no sea vacía: hay momentos abiertos y, salvo en los de 24 h, también cerrados.
    expect(opens).toBeGreaterThan(0)
    if (!isOpen24h(week) && !/^Mo-Su 00:00-24:00$/.test(raw)) expect(closeds).toBeGreaterThan(0)
  })
})
