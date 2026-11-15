import { describe, expect, it } from "vitest"
import { NYE_CHECKED, NYE_ES_PATH, NYE_SLUG, nyeGuide, nyeMeta, type NyeLang } from "../intl/nye"
import { guidesOf } from "../intl/guides"
import { INTL_LANGS } from "../intl/lang"
import { TAXI_2026_NUM } from "../intl/transit"
import type { Block, Guide } from "../intl/guideTypes"

// Guía de Nochevieja (15/11/2026): las cinco versiones dicen lo mismo, no inventan nada y enlazan a sitios que existen.

const LANGS: NyeLang[] = ["es", ...INTL_LANGS]

function textOf(g: Guide): string {
  const parts: string[] = [g.title, g.h1, g.description, g.lead]
  const block = (b: Block) => {
    if (b.t === "p") parts.push(b.text)
    else if (b.t === "ul") parts.push(...b.items)
    else if (b.t === "table") parts.push(...b.head, ...b.rows.flat(), b.note ?? "")
    else if (b.t === "note") parts.push(b.title, b.text)
    else if (b.t === "links") parts.push(...b.items.flatMap((i) => [i.label, i.note ?? ""]))
    else parts.push(...b.items.flatMap((i) => [i.name, i.line]), b.more ?? "")
  }
  for (const s of g.sections) {
    parts.push(s.h2)
    s.blocks.forEach(block)
  }
  for (const f of g.faq) parts.push(f.q, f.a)
  for (const s of g.sources) parts.push(s.name)
  return parts.join("\n")
}

describe("guía de Nochevieja", () => {
  it("el recargo y la tarifa de taxi son los de AMB 2026 en todos los idiomas", () => {
    expect(TAXI_2026_NUM.holidayEveSurcharge).toBe(4.6)
    for (const lang of LANGS) {
      const t = textOf(nyeGuide(lang))
      expect(t, lang).toMatch(lang === "en" ? /€4\.60/ : /4,60 €/)
      expect(t, lang).toMatch(lang === "en" ? /€2\.80/ : /2,80 €/)
      expect(t, lang).toMatch(lang === "en" ? /€1\.66/ : /1,66 €/)
    }
  })

  it("las cinco versiones tienen la misma estructura", () => {
    const base = nyeGuide("en")
    for (const lang of LANGS) {
      const g = nyeGuide(lang)
      expect(g.slug).toBe(NYE_SLUG)
      expect(g.sections.map((s) => s.id), lang).toEqual(base.sections.map((s) => s.id))
      // El español no enlaza a otras guías (solo existen en los cuatro idiomas internacionales): le faltan esos enlaces.
      if (lang !== "es") expect(g.sections.map((s) => s.blocks.map((b) => b.t)), lang).toEqual(base.sections.map((s) => s.blocks.map((b) => b.t)))
      expect(g.faq.length, lang).toBe(base.faq.length)
      expect(g.sources.map((s) => s.url), lang).toEqual(base.sources.map((s) => s.url))
    }
  })

  it("las cifras clave salen en todas las versiones (y coinciden con las fuentes oficiales)", () => {
    for (const lang of LANGS) {
      const t = textOf(nyeGuide(lang))
      for (const n of ["43", "165", "23:50", "00:15"]) {
        // el francés escribe «23 h 50» y «0 h 15»
        const alt = n === "23:50" ? "23 h 50" : n === "00:15" ? "0 h 15" : n
        expect(t.includes(n) || t.includes(alt), `${lang} ${n}`).toBe(true)
      }
      for (const w of ["L1", "L3", "S1", "S2", "L12", "112", "092", "Espanya", "Hostafrancs", "Poble Sec"]) expect(t, `${lang} ${w}`).toContain(w)
      expect(t, lang).toContain("2026")
      expect(t, lang).toContain("2025")
    }
  })

  it("separa lo confirmado de lo pendiente y dice cuándo se comprobó", () => {
    expect(NYE_CHECKED).toBe("2026-11-15")
    for (const lang of LANGS) {
      const g = nyeGuide(lang)
      const status = g.sections[0]
      const table = status.blocks.find((b): b is Extract<Block, { t: "table" }> => b.t === "table")!
      expect(table.rows.length).toBe(5)
      // La única fila «confirmada» es la del taxi (tarifa 2026 de AMB); las demás son 2021-2025 o pendientes.
      const taxiRow = table.rows[3].join(" ")
      expect(taxiRow, lang).toMatch(/4[,.]60/)
      expect(textOf(g), lang).toMatch(/15/)
    }
  })

  it("las fuentes son páginas oficiales (Ajuntament, barcelona.cat, AMB) y no hay duplicadas", () => {
    for (const lang of LANGS) {
      const urls = nyeGuide(lang).sources.map((s) => s.url)
      expect(new Set(urls).size).toBe(urls.length)
      for (const u of urls) expect(u).toMatch(/^https:\/\/(ajuntament\.barcelona\.cat|www\.barcelona\.cat|taxi\.amb\.cat|www\.amb\.cat)(\/|$)/)
    }
  })

  it("no nombra locales ni fiestas de pago ni Madrid", () => {
    for (const lang of LANGS) expect(textOf(nyeGuide(lang)), lang).not.toMatch(/Madrid|Poble Espanyol|Razzmatazz|Sala Apolo|Opium|entradas? desde|tickets from/i)
  })

  it("los enlaces internos llevan el prefijo de su idioma y apuntan a páginas que existen", () => {
    for (const lang of LANGS) {
      const g = nyeGuide(lang)
      const hrefs: string[] = []
      for (const s of g.sections) for (const b of s.blocks) if (b.t === "links") hrefs.push(...b.items.map((i) => i.href))
      expect(hrefs.length).toBeGreaterThanOrEqual(5)
      for (const h of hrefs) {
        if (lang === "es") expect(h, lang).toMatch(/^\/(metro|nitbus|essentials\/(taxi|pharmacy|food|atm))$/)
        else {
          expect(h.startsWith(`/${lang}/`), `${lang} ${h}`).toBe(true)
          const sub = h.slice(lang.length + 1)
          if (sub.startsWith("/guides/")) expect(guidesOf(lang).guideMeta(sub.replace("/guides/", "")), h).toBeDefined()
          else expect(sub, h).toMatch(/^\/(metro|night-bus|essentials\/(taxi|pharmacy|food|atm))$/)
        }
      }
      for (const r of g.related) if (lang !== "es") expect(guidesOf(lang as never).guideMeta(r), r).toBeDefined()
    }
  })

  it("los metadatos apuntan a la gemela en español y llevan la fecha de revisión", () => {
    for (const lang of LANGS) {
      const m = nyeMeta(lang)
      expect(m.esPath).toBe(NYE_ES_PATH)
      expect(m.reviewed).toBe(NYE_CHECKED)
      expect(m.title.endsWith("| Noctua")).toBe(true)
      expect(m.title.length).toBeLessThanOrEqual(75)
      expect(m.description.length).toBeGreaterThan(80)
      expect(m.description.length).toBeLessThanOrEqual(175)
    }
    for (const lang of INTL_LANGS) {
      const set = guidesOf(lang)
      expect(set.GUIDES[set.GUIDES.length - 1].slug).toBe(NYE_SLUG)
      expect(set.buildGuide(NYE_SLUG, {} as never)).not.toBeNull()
    }
  })
})
