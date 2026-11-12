import { describe, it, expect } from "vitest"
import { compileRows, dayRuns, describeRows, emptyRows, groupRows, hasEarlyRows, rowsFromClub, startsAfterMidnight, type DayRow } from "../clubHoursEditor"
import { clubOpeningHoursSpec, clubOpensOn } from "../clubHours"

// Atajo: { 3: ["23:55", "06:00"] } = jueves de 23:55 a 06:00 (0 = lunes … 6 = domingo).
function rows(spec: Record<number, [string, string]>): DayRow[] {
  const r = emptyRows()
  for (const [i, [start, end]] of Object.entries(spec)) r[Number(i)] = { on: true, start, end }
  return r
}

describe("compileRows", () => {
  it("junta los días seguidos con las mismas horas", () => {
    const c = compileRows(rows({ 3: ["23:55", "06:00"], 4: ["23:55", "06:00"], 5: ["23:55", "06:00"] }))
    expect(c.hours).toBe("J-S 23:55-06:00")
    expect(c.openDays).toEqual(["Jue", "Vie", "Sáb"])
  })

  it("separa franjas distintas con | y las ordena por el primer día", () => {
    expect(compileRows(rows({ 0: ["16:00", "02:30"], 1: ["16:00", "02:30"], 2: ["16:00", "02:30"], 3: ["16:00", "02:30"], 4: ["16:00", "03:00"], 5: ["16:00", "03:00"] })).hours).toBe(
      "L-J 16:00-02:30 | V-S 16:00-03:00"
    )
    expect(compileRows(rows({ 3: ["20:30", "03:00"], 4: ["21:00", "06:00"], 5: ["21:00", "06:00"] })).hours).toBe("J 20:30-03:00 | V-S 21:00-06:00")
  })

  it("los días sueltos van con /, y los 7 días con L-D", () => {
    expect(compileRows(rows({ 0: ["19:00", "02:00"], 2: ["19:00", "02:00"], 4: ["19:00", "02:00"] })).hours).toBe("L/X/V 19:00-02:00")
    expect(compileRows(rows({ 0: ["18:00", "03:00"], 1: ["18:00", "03:00"], 2: ["18:00", "03:00"], 3: ["18:00", "03:00"], 4: ["18:00", "03:00"], 5: ["18:00", "03:00"], 6: ["18:00", "03:00"] })).hours).toBe(
      "L-D 18:00-03:00"
    )
  })

  it("un día marcado sin las dos horas cuenta como día de apertura pero no entra en el texto", () => {
    const r = rows({ 4: ["23:00", "06:00"] })
    r[5] = { on: true, start: "23:00", end: "" }
    const c = compileRows(r)
    expect(c.hours).toBe("V 23:00-06:00")
    expect(c.openDays).toEqual(["Vie", "Sáb"])
    expect(compileRows(emptyRows())).toEqual({ hours: "", openDays: [] })
  })

  it("si empieza pasada la medianoche el texto lleva el día siguiente y open_days la noche", () => {
    expect(startsAfterMidnight("00:00", "06:00")).toBe(true)
    expect(startsAfterMidnight("23:55", "06:00")).toBe(false)
    const c = compileRows(rows({ 4: ["00:00", "06:00"], 5: ["00:00", "06:00"] }))
    expect(c.hours).toBe("S-D 00:00-06:00")
    expect(c.openDays).toEqual(["Vie", "Sáb"])
    // La noche del domingo cae en lunes (vuelta de la semana).
    expect(compileRows(rows({ 6: ["00:30", "05:00"] })).hours).toBe("L 00:30-05:00")
  })
})

describe("rowsFromClub", () => {
  it("lee los horarios por días que ya hay en la base de datos", () => {
    const { rows: r, legacy } = rowsFromClub("L-J 16:00-02:30 | V-S 16:00-03:00", ["Lun", "Mar"])
    expect(legacy).toBe("")
    expect(r.map((x) => x.on)).toEqual([true, true, true, true, true, true, false])
    expect(r[0]).toEqual({ on: true, start: "16:00", end: "02:30" })
    expect(r[5]).toEqual({ on: true, start: "16:00", end: "03:00" })
  })

  it("un horario sin días vale para los días de apertura, o para todos si no hay", () => {
    const a = rowsFromClub("23:55-06:00", ["Vie", "Sáb"])
    expect(a.rows.map((x) => x.on)).toEqual([false, false, false, false, true, true, false])
    expect(a.rows[4].start).toBe("23:55")
    const b = rowsFromClub("23:55-06:00", null)
    expect(b.rows.every((x) => x.on && x.start === "23:55" && x.end === "06:00")).toBe(true)
  })

  it("sin horario deja marcados los días de apertura, sin horas", () => {
    const { rows: r, legacy } = rowsFromClub("", ["Jue", "Dom"])
    expect(legacy).toBe("")
    expect(r.map((x) => x.on)).toEqual([false, false, false, true, false, false, true])
    expect(r[3].start).toBe("")
  })

  it("lo que no se puede repartir por días se devuelve como texto y no se pierde", () => {
    for (const text of ["Viernes-sábado hasta las 3:00", "Horario no especificado, consultar", "V/S/D: 23:30-06:00h.", "J 20:00-02:00 | J-S 21:00-03:00", "L-D 23:55-06:00 | V-S 23:55-06:30", "V 24:00-06:00", "V 10:00-10:00"]) {
      const out = rowsFromClub(text, ["Vie"])
      expect(out.legacy).toBe(text)
      expect(out.rows.map((x) => x.on)).toEqual([false, false, false, false, true, false, false])
      expect(out.rows[4].start).toBe("")
    }
  })

  it("un horario de madrugada con días de calendario vuelve a la noche anterior", () => {
    const { rows: r } = rowsFromClub("S-D 00:00-06:00", ["Vie", "Sáb"])
    expect(r.map((x) => x.on)).toEqual([false, false, false, false, true, true, false])
    expect(r[4]).toEqual({ on: true, start: "00:00", end: "06:00" })
  })
})

describe("ida y vuelta", () => {
  const formats = [
    "L-D 18:00-03:00",
    "J-S 23:55-06:00",
    "V-S 23:55-06:00",
    "L-J 16:00-02:30 | V-S 16:00-03:00",
    "J 20:30-03:00 | V-S 21:00-06:00",
    "X-J 19:00-02:30 | V-S 19:00-03:00",
    "L-J 23:55-06:00 | V-S 23:55-06:30",
    "S-D 00:00-06:00",
  ]
  for (const f of formats) {
    it(`"${f}" se lee y se vuelve a componer igual`, () => {
      const parsed = rowsFromClub(f, null)
      expect(parsed.legacy).toBe("")
      expect(compileRows(parsed.rows).hours).toBe(f)
    })
  }

  it("lo que compone el editor lo entienden los datos estructurados y el filtro de días de la web", () => {
    const c = compileRows(rows({ 3: ["21:00", "03:00"], 4: ["23:55", "06:00"], 5: ["23:55", "06:00"] }))
    const spec = clubOpeningHoursSpec(c.hours, c.openDays)
    expect(spec).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Thursday"], opens: "21:00", closes: "03:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Friday", "Saturday"], opens: "23:55", closes: "06:00" },
    ])
    expect(clubOpensOn(c.hours, c.openDays, 5)).toBe(true) // viernes
    expect(clubOpensOn(c.hours, c.openDays, 1)).toBe(false) // lunes

    // Abrir a las 00:00 el viernes por la noche es el sábado de calendario para Google.
    const early = compileRows(rows({ 4: ["00:00", "06:00"] }))
    expect(clubOpeningHoursSpec(early.hours, early.openDays)[0].dayOfWeek).toEqual(["Saturday"])
    expect(clubOpensOn(early.hours, early.openDays, 5)).toBe(true) // sigue contando como noche del viernes
  })
})

describe("horario de madrugada (caso Wolf, 12/11/2026)", () => {
  // Jueves 00:30-05:00 y viernes y sábado 00:30-06:00, marcados como noches.
  const wolf = rows({ 3: ["00:30", "05:00"], 4: ["00:30", "06:00"], 5: ["00:30", "06:00"] })

  it("guarda las letras con el día de calendario y vuelve a abrir con las mismas noches", () => {
    const c = compileRows(wolf)
    expect(c.hours).toBe("V 00:30-05:00 | S-D 00:30-06:00")
    expect(c.openDays).toEqual(["Jue", "Vie", "Sáb"])
    const back = rowsFromClub(c.hours, c.openDays)
    expect(back.legacy).toBe("")
    expect(back.rows).toEqual(wolf)
  })

  it("enseña las noches tal como se marcaron", () => {
    expect(describeRows(wolf)).toBe("Jue 00:30–05:00 · Vie-Sáb 00:30–06:00")
    expect(hasEarlyRows(wolf)).toBe(true)
    expect(hasEarlyRows(rows({ 3: ["23:55", "06:00"] }))).toBe(false)
  })

  it("agrupa las noches por horario para la ficha pública (bolitas de días + horas)", () => {
    const { rows } = rowsFromClub("V 00:30-05:00 | S-D 00:30-06:00", ["Jue", "Vie", "Sáb"])
    expect(groupRows(rows)).toEqual([
      { time: "00:30–05:00", days: [3] },
      { time: "00:30–06:00", days: [4, 5] },
    ])
    expect(dayRuns([4, 5])).toBe("Vie-Sáb")
    expect(dayRuns([3, 5])).toBe("Jue/Sáb")
    expect(dayRuns([3], ["L", "M", "X", "J", "V", "S", "D"])).toBe("J")
  })
})
