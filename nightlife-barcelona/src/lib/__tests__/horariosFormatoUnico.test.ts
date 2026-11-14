import { afterEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { clubOpenNow } from "../clubHours"

// supabase/102_horarios_a_formato_unico.sql reescribe 74 formas de escribir el horario. Aquí se comprueba que lo que
// deja escrito lo lee la web (si no, el cambio no serviría de nada) y que algunos casos significan lo mismo que el texto
// original. Los pares «antes → después» se leen del propio SQL, así que no se pueden desincronizar.

const sql = readFileSync("supabase/102_horarios_a_formato_unico.sql", "utf8")
const pairs = [...sql.matchAll(/^\s+\('((?:[^']|'')*)', '((?:[^']|'')*)'\),?$/gm)].map((m) => [m[1].replace(/''/g, "'"), m[2].replace(/''/g, "'")] as const)

const at = (isoLocal: string) => vi.setSystemTime(new Date(`${isoLocal}+01:00`))
afterEach(() => vi.useRealTimers())

describe("102_horarios_a_formato_unico.sql", () => {
  it("lee los 74 pares", () => {
    expect(pairs).toHaveLength(74)
    expect(new Set(pairs.map(([viejo]) => viejo)).size).toBe(74)
  })

  it("todo lo que escribe la web lo sabe leer (a cualquier hora devuelve sí o no, nunca «no sé»)", () => {
    vi.useFakeTimers()
    for (const when of ["2025-11-08T12:00:00", "2025-11-08T01:30:00", "2025-11-08T23:30:00", "2025-11-10T03:00:00"]) {
      at(when)
      for (const [, nuevo] of pairs) expect(clubOpenNow(nuevo, null), `${nuevo} @ ${when}`).not.toBeNull()
    }
  })

  it("cada tramo de lo nuevo cumple el formato de la web y el original tenía al menos uno que no", () => {
    // Misma regla que la consulta de diagnóstico y que lib/clubHours: tramos separados por coma, «|» o «;».
    const tramo = /^([LMXJVSD/-]+\s+)?\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}$/
    const ilegible = (h: string) => h.split(/[,|;]/).some((t) => !tramo.test(t.trim()))
    for (const [viejo, nuevo] of pairs) {
      expect(ilegible(viejo), viejo).toBe(true)
      expect(ilegible(nuevo), nuevo).toBe(false)
    }
  })

  it("«Jue-Sa 23:55-06:00» → «J-S 23:55-06:00»: jueves a sábado por la noche, con la madrugada del día siguiente", () => {
    vi.useFakeTimers()
    const nuevo = pairs.find(([v]) => v === "Jue-Sa 23:55-06:00")![1]
    expect(nuevo).toBe("J-S 23:55-06:00")
    at("2025-11-06T23:30:00"); expect(clubOpenNow(nuevo, null)).toBe(false) // jueves antes de abrir
    at("2025-11-06T23:56:00"); expect(clubOpenNow(nuevo, null)).toBe(true) // jueves, ya abierto
    at("2025-11-08T02:00:00"); expect(clubOpenNow(nuevo, null)).toBe(true) // madrugada del sábado (noche del viernes)
    at("2025-11-09T02:00:00"); expect(clubOpenNow(nuevo, null)).toBe(true) // madrugada del domingo (noche del sábado)
    at("2025-11-10T02:00:00"); expect(clubOpenNow(nuevo, null)).toBe(false) // madrugada del lunes: el domingo no abre
  })

  it("«Lun/mié/jue/dom 21:00–2:30, vie-sáb 21:00–3:00, martes cerrado»", () => {
    vi.useFakeTimers()
    const nuevo = pairs.find(([v]) => v.startsWith("Lun/mié/jue/dom"))![1]
    expect(nuevo).toBe("L/X/J/D 21:00-02:30, V/S 21:00-03:00")
    at("2025-11-04T22:00:00"); expect(clubOpenNow(nuevo, null)).toBe(false) // martes: cerrado
    at("2025-11-07T02:45:00"); expect(clubOpenNow(nuevo, null)).toBe(false) // viernes 02:45: el turno del jueves acabó a las 02:30
    at("2025-11-08T02:45:00"); expect(clubOpenNow(nuevo, null)).toBe(true) // sábado 02:45: el turno del viernes llega a las 03:00
  })

  it("«Todos los días 18:00–2:00, viernes-sábado hasta 3:00»: el «hasta» usa la apertura del mismo texto", () => {
    vi.useFakeTimers()
    const nuevo = pairs.find(([v]) => v === "Todos los días 18:00–2:00, viernes-sábado hasta 3:00")![1]
    expect(nuevo).toBe("L/M/X/J/D 18:00-02:00, V/S 18:00-03:00")
    at("2025-11-05T02:30:00"); expect(clubOpenNow(nuevo, null)).toBe(false) // miércoles 02:30
    at("2025-11-08T02:30:00"); expect(clubOpenNow(nuevo, null)).toBe(true) // sábado 02:30
  })

  it("si el texto da dos horas de cierre, se usa la más temprana; si da dos de apertura, la más tardía", () => {
    expect(pairs.find(([v]) => v === "Jueves-sábado 23:00–2:30/3:00")![1]).toBe("J-S 23:00-02:30")
    expect(pairs.find(([v]) => v === "Jueves-sábado 20:00/21:00–3:00/3:30")![1]).toBe("J-S 21:00-03:00")
  })

  it("no se toca lo que solo dice cuándo cierra ni lo que no da horario", () => {
    for (const v of ["Viernes-sábado hasta las 3:00", "Todos los días hasta las 3:00", "Horario no especificado, consultar", "Según programación", "L-J 19:00-02:00. V-S"]) {
      expect(pairs.some(([viejo]) => viejo === v), v).toBe(false)
    }
  })
})
