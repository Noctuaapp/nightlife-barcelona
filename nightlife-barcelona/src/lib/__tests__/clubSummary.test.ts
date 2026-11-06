import { describe, it, expect } from "vitest"
import { clubMetaDescription, clubSummary, clubTitle, CLUB_TITLE_MAX } from "../clubSummary"

describe("clubTitle", () => {
  it("añade horario y cómo llegar cuando cabe", () => {
    expect(clubTitle({ name: "Capitolio", venue_type: "club", neighborhood: "Poble-sec" })).toBe(
      "Capitolio — Discoteca en Poble-sec: horario y cómo llegar | Noctua"
    )
  })

  it("usa el tipo real del local y Barcelona si no hay barrio", () => {
    expect(clubTitle({ name: "Almodobar", venue_type: "bar" })).toBe("Almodobar — Bar de copas en Barcelona: horario y cómo llegar | Noctua")
  })

  it("con un nombre muy largo se queda con el título de siempre", () => {
    const name = "Night & Day BCN Disco Bar Musical & Shisha Lounge Cocktails"
    const title = clubTitle({ name, neighborhood: "Eixample" })
    expect(title).toBe(`${name} — Discoteca en Eixample | Noctua`)
  })

  it("nunca pasa del máximo si se le añade la información", () => {
    for (const name of ["A", "Razzmatazz", "Sala Apolo / Nitsa", "Voyager Cocktail Bar | by COBA"]) {
      const t = clubTitle({ name, neighborhood: "Gràcia" })
      if (t.includes("horario")) expect(t.length).toBeLessThanOrEqual(CLUB_TITLE_MAX)
    }
  })
})

describe("clubMetaDescription", () => {
  it("respeta una descripción propia larga", () => {
    const own = "Clásico bar musical en el barrio de Gràcia con decoración retro, ideal para bailar y recordar grandes éxitos del pop-rock de los 80 y 90."
    expect(clubMetaDescription({ name: "Almodobar", description: own, hours: "23:00-03:00" })).toBe(own)
  })

  it("sin descripción propia empieza por lo práctico: horario, entrada y cómo volver", () => {
    const d = clubMetaDescription({
      name: "Sala X", venue_type: "club", neighborhood: "Raval", hours: "Vie-Sáb 23:30-06:00", price: "10 €", music: "Techno · House", address: "Carrer Gran, 1, 08001 Barcelona",
    })
    expect(d.startsWith("Sala X, discoteca en Raval (Barcelona).")).toBe(true)
    expect(d).toContain("Horario: Vie-Sáb 23:30-06:00. Entrada: 10 €.")
    expect(d).toContain("Música: Techno, House.")
    expect(d).not.toContain("Carrer Gran")
    expect(d.length).toBeLessThanOrEqual(158)
  })

  it("una descripción corta se completa con lo práctico", () => {
    const d = clubMetaDescription({ name: "Bar Y", description: "Un bar tranquilo", hours: "20:00-02:00" })
    expect(d.startsWith("Un bar tranquilo.")).toBe(true)
    expect(d).toContain("Horario: 20:00-02:00.")
    expect(d).toContain("Cómo llegar de noche")
  })

  it("sin horario ni entrada sigue diciendo cómo llegar y no deja huecos", () => {
    const d = clubMetaDescription({ name: "Bar Z", neighborhood: "Gràcia" })
    expect(d).toBe("Bar Z, discoteca en Gràcia (Barcelona). Cómo llegar de noche: metro, Nitbus o taxi.")
    expect(d).not.toMatch(/\s{2}|undefined|null/)
  })

  it("recorta en el límite de Google sin cortar una palabra", () => {
    const d = clubMetaDescription({ name: "Sala Larga", hours: "x ".repeat(60).trim(), price: "y ".repeat(40).trim() })
    expect(d.length).toBeLessThanOrEqual(158)
    expect(d.endsWith("…")).toBe(true)
  })
})

describe("clubSummary: vestimenta", () => {
  it("la toma de la columna real de clubs (dress_code)", () => {
    expect(clubSummary({ name: "Sutton", dress_code: "Elegant" })).toContain("Código de vestimenta: Elegant.")
  })

  it("sin dato, no la menciona", () => {
    expect(clubSummary({ name: "Sutton", dress_code: "" })).not.toContain("vestimenta")
  })
})
