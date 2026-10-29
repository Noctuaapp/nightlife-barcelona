import { describe, it, expect } from "vitest"
import { ALCOHOL_POLL_IDS, PARTY_POLLS, isAlcoholPoll, pollOfTheDay, pollText } from "../partyPolls"

// Palabras que delatan una pregunta sobre alcohol. Si una pregunta nueva las lleva y su id no está en
// ALCOHOL_POLL_IDS, el test falla: así no se cuela a quien juega sin cuenta (que no ha confirmado la edad).
const ALCOHOL_WORDS_ES = /cubat|chupit|cerveza|vino\b|tinto|\bcava\b|champ[aá]n|\bgin\b|gin-?tonic|vermut|tequila|j[aä]ger|mojito|margarita|\bcopas?\b|barra libre|resaca|borrach|alcohol|\bron\b|sangr[ií]a|c[oó]ctel|garraf|botell[oó]n|\bronda|brind|whisk|vodka|litro|camarero/i
const ALCOHOL_WORDS_EN = /drink|beer|wine|\bshots?\b|cocktail|booze|hangover|\bgin\b|vodka|\brum\b|whisk|champagne|prosecco|\bcava\b|open bar|\bround\b|tipsy|drunk|sober|pre-drinks|\bpint|sangria|bartender|toast/i

function textOf(p: (typeof PARTY_POLLS)[number]): { es: string; en: string } {
  return { es: `${p.es.a} | ${p.es.b}`, en: `${p.en.a} | ${p.en.b}` }
}

describe("PARTY_POLLS · datos", () => {
  it("ids únicos, con formato válido y de 60 caracteres como mucho", () => {
    const ids = PARTY_POLLS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => /^[a-z0-9-]+$/.test(id) && id.length <= 60)).toBe(true)
  })
  it("todas tienen las dos opciones en es / ca / en, y distintas entre sí", () => {
    for (const p of PARTY_POLLS) {
      for (const l of [p.es, p.ca, p.en]) {
        expect(l.a.trim().length > 0 && l.b.trim().length > 0).toBe(true)
        expect(l.a === l.b).toBe(false)
      }
    }
  })
  it("hay de sobra para meses sin repetir", () => {
    expect(PARTY_POLLS.length >= 250).toBe(true)
  })
})

describe("alcohol", () => {
  it("todos los ids marcados existen de verdad", () => {
    const ids = new Set(PARTY_POLLS.map((p) => p.id))
    for (const id of ALCOHOL_POLL_IDS) expect(ids.has(id)).toBe(true)
  })
  it("ninguna pregunta que hable de bebida se queda sin marcar", () => {
    const sinMarcar = PARTY_POLLS.filter((p) => {
      const t = textOf(p)
      return (ALCOHOL_WORDS_ES.test(t.es) || ALCOHOL_WORDS_EN.test(t.en)) && !isAlcoholPoll(p)
    }).map((p) => p.id)
    expect(sinMarcar).toEqual([])
  })
  it("también quedan preguntas sin alcohol de sobra", () => {
    const abiertas = PARTY_POLLS.filter((p) => !isAlcoholPoll(p))
    expect(abiertas.length >= 200).toBe(true)
  })
})

describe("pollOfTheDay", () => {
  const DAY0 = 20_000

  it("sin cuenta (por defecto) no sale ninguna de alcohol en 700 días seguidos", () => {
    for (let d = DAY0; d < DAY0 + 700; d++) {
      const p = pollOfTheDay(new Set(), d)
      expect(p !== null && !isAlcoholPoll(p)).toBe(true)
    }
  })
  it("indicar allowAlcohol:false es lo mismo que no indicarlo", () => {
    for (let d = DAY0; d < DAY0 + 50; d++) {
      expect(pollOfTheDay(new Set(), d, { allowAlcohol: false })?.id).toBe(pollOfTheDay(new Set(), d)?.id)
    }
  })
  it("con cuenta sí salen las de alcohol", () => {
    let hay = false
    for (let d = DAY0; d < DAY0 + 700; d++) {
      const p = pollOfTheDay(new Set(), d, { allowAlcohol: true })
      if (p && isAlcoholPoll(p)) hay = true
    }
    expect(hay).toBe(true)
  })
  it("el mismo día sale la misma pregunta para todo el mundo", () => {
    expect(pollOfTheDay(new Set(), DAY0)?.id).toBe(pollOfTheDay(new Set(), DAY0)?.id)
    expect(pollOfTheDay(new Set(), DAY0, { allowAlcohol: true })?.id).toBe(pollOfTheDay(new Set(), DAY0, { allowAlcohol: true })?.id)
  })
  it("los días que no toca alcohol, con y sin cuenta ven la misma pregunta", () => {
    let iguales = 0
    for (let d = DAY0; d < DAY0 + 700; d++) {
      const conCuenta = pollOfTheDay(new Set(), d, { allowAlcohol: true })!
      const sinCuenta = pollOfTheDay(new Set(), d)!
      if (!isAlcoholPoll(conCuenta)) {
        expect(sinCuenta.id).toBe(conCuenta.id)
        iguales++
      }
    }
    expect(iguales > 400).toBe(true)
  })
  it("quien no tiene cuenta recibe la siguiente abierta cuando toca una de alcohol", () => {
    const d = Array.from({ length: 700 }, (_, k) => DAY0 + k).find((x) => isAlcoholPoll(pollOfTheDay(new Set(), x, { allowAlcohol: true })!))!
    const sinCuenta = pollOfTheDay(new Set(), d)!
    expect(isAlcoholPoll(sinCuenta)).toBe(false)
    const idx = PARTY_POLLS.findIndex((p) => p.id === sinCuenta.id)
    const idxCuenta = PARTY_POLLS.findIndex((p) => p.id === pollOfTheDay(new Set(), d, { allowAlcohol: true })!.id)
    // la que le toca está después de la de alcohol, sin saltarse ninguna abierta por el camino
    const n = PARTY_POLLS.length
    for (let k = idxCuenta; k % n !== idx; k++) expect(isAlcoholPoll(PARTY_POLLS[k % n]) || k % n === idx).toBe(true)
  })
  it("se salta las ya votadas", () => {
    const first = pollOfTheDay(new Set(), DAY0)
    expect(first === null).toBe(false)
    const next = pollOfTheDay(new Set([first!.id]), DAY0)
    expect(next === null || next.id === first!.id).toBe(false)
    expect(next !== null && !isAlcoholPoll(next)).toBe(true)
  })
  it("si ya votó todas las abiertas, sin cuenta no sale nada; con cuenta aún quedan las de alcohol", () => {
    const votedOpen = new Set(PARTY_POLLS.filter((p) => !isAlcoholPoll(p)).map((p) => p.id))
    expect(pollOfTheDay(votedOpen, DAY0)).toBeNull()
    const conCuenta = pollOfTheDay(votedOpen, DAY0, { allowAlcohol: true })
    expect(conCuenta !== null && isAlcoholPoll(conCuenta)).toBe(true)
  })
  it("si ya votó todas, no sale nada ni con cuenta", () => {
    const all = new Set(PARTY_POLLS.map((p) => p.id))
    expect(pollOfTheDay(all, DAY0, { allowAlcohol: true })).toBeNull()
  })
  it("un día negativo o raro tampoco rompe nada", () => {
    expect(pollOfTheDay(new Set(), -5) === null).toBe(false)
  })
})

describe("pollText", () => {
  it("idiomas sin traducción usan el inglés", () => {
    const p = PARTY_POLLS[0]
    expect(pollText(p, "es")).toEqual(p.es)
    expect(pollText(p, "ca")).toEqual(p.ca)
    expect(pollText(p, "fr")).toEqual(p.en)
  })
})
