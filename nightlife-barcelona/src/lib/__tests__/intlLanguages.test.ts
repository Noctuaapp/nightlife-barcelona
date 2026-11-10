import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"

// Las páginas llaman a la base de datos al importarse; aquí solo se leen sus metadatos, así que basta con unas
// variables de entorno falsas (se ponen antes de que se importe nada).
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co"
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-key"
})

import { CITY_NAME, INTL_LANGS, LANG_LABEL, NUM_LOCALE, OG_LOCALE, isIntlLang, type IntlLang } from "../intl/lang"
import { UI, uiOf } from "../intl/ui"
import { guidesOf } from "../intl/guides"
import type { Block, Guide, GuideCtx } from "../intl/guideTypes"
import { essentialIn, essentialsOf } from "../intl/essentialsText"
import { TAXI_2026_NUM, busRouteOf, eurOf, metroHoursOf, metroNoteOf, sourcesOf, taxiFaresOf } from "../intl/transit"
import { CLUB_LEX, MUSIC_KEYS, type KindKey } from "../intl/clubLex"
import { EXTRA_FEATURES } from "../extraFeatures"
import { clubMetaDescription, clubSummary, clubTagline, clubTitle, dressOf, hoursOf, listOf, placeOf, priceOf, venueKindOf } from "../intl/clubText"
import { NIGHT_BUS_LINES } from "../nightBuses"
import { buildIntlSitemap } from "../intl/sitemap"
import { esUrl, langUrl, languagesOf } from "../intl/site"
import { frTypo, frTypoText } from "../intl/frTypo"
import { homeMetadata } from "../../components/intl/pages/Home"
import { clubsMetadata } from "../../components/intl/pages/ClubsList"
import { nightBusMetadata } from "../../components/intl/pages/NightBus"
import { metroMetadata } from "../../components/intl/pages/Metro"
import { essentialsMetadata } from "../../components/intl/pages/Essentials"
import { essentialCategoryMetadata } from "../../components/intl/pages/EssentialCategory"
import { guidesIndexMetadata } from "../../components/intl/pages/GuidesIndex"
import { guideMetadata } from "../../components/intl/pages/GuidePage"

// Pruebas de los cuatro idiomas internacionales a la vez (inglés, alemán, francés, italiano): que ninguno se
// quede a medias, que digan lo mismo con las mismas cifras y que las etiquetas hreflang se correspondan.
// Las pruebas específicas del inglés están en intlEnglish.test.ts.

const OTHERS: IntlLang[] = ["de", "fr", "it"]
const ENGLISH_WORDS = /\b(the|and|with|your|you|from|which|where|when)\b/
const SPANISH_ROUTE = /\bvía\b|Circular por|\sy\s/

describe("idiomas", () => {
  it("son cuatro, con nombre, locale y formato de números propios", () => {
    expect([...INTL_LANGS]).toEqual(["en", "de", "fr", "it"])
    for (const l of INTL_LANGS) {
      expect(isIntlLang(l)).toBe(true)
      expect(LANG_LABEL[l].length).toBeGreaterThan(2)
      expect(OG_LOCALE[l]).toMatch(/^[a-z]{2}_[A-Z]{2}$/)
      expect(NUM_LOCALE[l]).toMatch(/^[a-z]{2}-[A-Z]{2}$/)
      expect(CITY_NAME[l].length).toBeGreaterThan(5)
    }
    expect(isIntlLang("es")).toBe(false)
    expect(isIntlLang("xx")).toBe(false)
    expect(CITY_NAME.fr).toBe("Barcelone")
    expect(CITY_NAME.it).toBe("Barcellona")
  })
})

// --- Diccionarios de la interfaz -----------------------------------------------------------------------------

function shape(v: unknown, path = "", out: string[] = []): string[] {
  if (typeof v === "function") out.push(`${path}:fn`)
  else if (typeof v === "string") out.push(`${path}:str`)
  else if (typeof v === "number") out.push(`${path}:num`)
  else if (Array.isArray(v)) {
    out.push(`${path}:arr${v.length}`)
    v.forEach((x, i) => shape(x, `${path}[${i}]`, out))
  } else if (v && typeof v === "object") {
    for (const k of Object.keys(v).sort()) shape((v as Record<string, unknown>)[k], path ? `${path}.${k}` : k, out)
  }
  return out
}

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v)
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out))
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out))
  return out
}

describe("diccionarios de la interfaz", () => {
  it.each(OTHERS)("%s tiene exactamente las mismas claves que el inglés", (lang) => {
    expect(shape(UI[lang])).toEqual(shape(UI.en))
  })

  it.each(INTL_LANGS as IntlLang[])("%s: ningún texto vacío ni con restos de plantilla", (lang) => {
    for (const s of strings(UI[lang])) {
      expect(s.trim().length).toBeGreaterThan(0)
      expect(s).not.toMatch(/undefined|\[object|\$\{|\bNaN\b/)
    }
  })

  it.each(OTHERS)("%s: sin frases en inglés sin traducir", (lang) => {
    const bad = strings(UI[lang]).filter((s) => !/https?:/.test(s) && ENGLISH_WORDS.test(s))
    expect(bad).toEqual([])
  })

  it("uiOf devuelve el diccionario de cada idioma", () => {
    for (const l of INTL_LANGS) expect(uiOf(l)).toBe(UI[l])
  })

  it("el selector de idioma y el menú están traducidos", () => {
    const nav = new Set(INTL_LANGS.map((l) => uiOf(l).shell.navClubs))
    expect(nav.size).toBe(4)
  })
})

describe("tipografía francesa", () => {
  it("pone espacio fino sin corte antes de : ; ! ? y dentro de « »", () => {
    expect(frTypoText("Horaires : tous les soirs")).toBe("Horaires\u00a0: tous les soirs")
    expect(frTypoText("Quoi ? Vraiment !")).toBe("Quoi\u00a0? Vraiment\u00a0!")
    expect(frTypoText("dit « bonjour »")).toBe("dit «\u00a0bonjour\u00a0»")
  })
  it("no toca las direcciones web", () => {
    expect(frTypoText("https://www.tmb.cat/fr")).toBe("https://www.tmb.cat/fr")
  })
  it("recorre objetos, listas y funciones", () => {
    const x = frTypo({ a: "un : deux", b: ["trois ?"], c: (n: number) => `n ${n} !` })
    expect(x.a).toBe("un\u00a0: deux")
    expect(x.b[0]).toBe("trois\u00a0?")
    expect(x.c(2)).toBe("n 2\u00a0!")
  })
  it("el diccionario francés no deja espacios normales antes de la puntuación doble", () => {
    for (const s of strings(UI.fr)) expect(s).not.toMatch(/\S [:;!?»]/)
  })
})

// --- Guías -------------------------------------------------------------------------------------------------

const ph = (n: string) => ({ name: n, where: `Carrer ${n} 1, El Raval`, phone: "933 000 000" })
const ctx: GuideCtx = {
  total: 250,
  facts: { total: 250, price: { min: 0, max: 30 }, hours: { open: "23:55", close: "06:00" }, late: { n: 80, of: 120 }, styles: [], metro: [], nitbus: [], top: [] },
  dress: [
    { label: "Casual", n: 40 },
    { label: "Smart casual", n: 20 },
  ],
  withDress: 60,
  ages: [
    { age: 18, n: 30 },
    { age: 21, n: 5 },
  ],
  withAge: 35,
  nightsOpen: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, i) => ({ day, n: [20, 22, 30, 90, 200, 210, 40][i] })),
  pharmacies24: [ph("Aaa"), ph("Bbb")],
  pharmacies24Total: 9,
  pharmaciesTotal: 120,
  hospitals: [ph("Hospital Clínic")],
  hospitalsTotal: 3,
  food24: [ph("Kebab 1")],
  food24Total: 7,
  supermarkets24: [ph("Super 1")],
  supermarkets24Total: 4,
  highFeeAtms: 12,
  atmsTotal: 80,
  busLines: Object.values(NIGHT_BUS_LINES).map((l) => ({ code: l.code, route: l.route, catalunya: l.catalunya })),
  areas: [
    { slug: "el-raval", name: "El Raval", count: 40, facts: { total: 40, price: { min: 5, max: 20 }, hours: { open: "00:00", close: "05:00" }, late: null, styles: [], metro: ["Liceu"], nitbus: ["N9"], top: [] } },
    { slug: "poblenou", name: "Poblenou", count: 20, facts: null },
  ],
}
const emptyCtx: GuideCtx = {
  total: 0,
  facts: null,
  dress: [],
  withDress: 0,
  ages: [],
  withAge: 0,
  nightsOpen: [],
  pharmacies24: [],
  pharmacies24Total: 0,
  pharmaciesTotal: 0,
  hospitals: [],
  hospitalsTotal: 0,
  food24: [],
  food24Total: 0,
  supermarkets24: [],
  supermarkets24Total: 0,
  highFeeAtms: 0,
  atmsTotal: 0,
  busLines: [],
  areas: [],
}

function allText(g: Guide): string {
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
  return parts.join("\n")
}

function hrefsOf(g: Guide): string[] {
  const out = [g.cta.href]
  for (const s of g.sections) for (const b of s.blocks) if (b.t === "links") out.push(...b.items.map((i) => i.href))
  return out
}

/** Todos los números de un texto, sin separadores de miles: «1.500», «1,500» y «1 500» → 1500. */
function numbersIn(text: string): Set<number> {
  const flat = text.replace(/(\d)[.,\u00a0\u202f ](?=\d{3}(?!\d))/g, "$1")
  return new Set((flat.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => Number(n.replace(",", "."))))
}

const EN_SLUGS = guidesOf("en").GUIDES.map((g) => g.slug)

describe("guías en los cuatro idiomas", () => {
  it.each(INTL_LANGS as IntlLang[])("%s: siete guías con las mismas direcciones y el mismo orden que el inglés", (lang) => {
    const set = guidesOf(lang)
    expect(set.GUIDES.map((g) => g.slug)).toEqual(EN_SLUGS)
    expect(set.GUIDES).toHaveLength(7)
    expect(set.GUIDES_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(set.buildGuide("nope", ctx)).toBeNull()
    expect(set.guideMeta("nope")).toBeUndefined()
  })

  it.each(INTL_LANGS as IntlLang[])("%s: títulos y descripciones con longitud útil para Google y sin repetirse", (lang) => {
    const set = guidesOf(lang)
    expect(new Set(set.GUIDES.map((g) => g.title)).size).toBe(7)
    expect(new Set(set.GUIDES.map((g) => g.description)).size).toBe(7)
    for (const g of set.GUIDES) {
      expect(g.title.endsWith("| Noctua")).toBe(true)
      expect(g.title.length).toBeLessThanOrEqual(75)
      expect(g.description.length).toBeGreaterThan(80)
      expect(g.description.length).toBeLessThanOrEqual(175)
      expect(g.h1.length).toBeGreaterThan(10)
      expect(g.blurb.length).toBeGreaterThan(30)
      expect(set.guideMeta(g.slug)).toBe(g)
    }
  })

  describe.each(INTL_LANGS as IntlLang[])("%s", (lang) => {
    const set = guidesOf(lang)
    it.each(EN_SLUGS)("%s se monta con datos y sin datos", (slug) => {
      for (const c of [ctx, emptyCtx]) {
        const g = set.buildGuide(slug, c)!
        expect(g).not.toBeNull()
        expect(g.slug).toBe(slug)
        expect(g.sections.length).toBeGreaterThanOrEqual(2)
        expect(g.faq.length).toBeGreaterThanOrEqual(2)
        const text = allText(g)
        expect(text).not.toMatch(/undefined|NaN|\[object|\$\{|\bnull\b/)
        if (lang !== "en") expect(text.replace(/https?:\S+/g, "")).not.toMatch(ENGLISH_WORDS)
        if (lang === "fr") expect(text).not.toMatch(/\S [:;!?»]/)
        for (const r of g.related) expect(set.guideMeta(r)).toBeDefined()
        for (const href of hrefsOf(g)) {
          if (/^https?:\/\//.test(href)) continue
          // Los enlaces a páginas internacionales son del mismo idioma y apuntan a algo que existe.
          const m = href.match(/^\/(en|de|fr|it)(\/.*)?$/)
          if (m) {
            expect(m[1]).toBe(lang)
            const sub = m[2] ?? ""
            if (sub.startsWith("/guides/")) expect(set.guideMeta(sub.replace("/guides/", ""))).toBeDefined()
            if (sub.startsWith("/essentials/")) expect(essentialIn(lang, sub.replace("/essentials/", ""))).toBeDefined()
          } else {
            expect(href).toMatch(/^\/(clubs|essentials|nitbus|metro|map|plan)?(\/|$|#|\?)/)
          }
        }
      }
    })

    it("las cifras de las guías coinciden con los datos y las fuentes", () => {
      const rules = set.buildGuide(EN_SLUGS[5], ctx)!
      const nums = numbersIn(allText(rules))
      // Ordenanza de febrero de 2026: importes de las multas y descuento por pronto pago.
      for (const n of [2026, 100, 600, 750, 1500, 3000, 300, 50, 112]) expect(nums.has(n)).toBe(true)
      expect(rules.sources).toContainEqual(sourcesOf(lang).ordinance)

      const home = set.buildGuide(EN_SLUGS[0], ctx)!
      const homeText = allText(home)
      for (const r of metroHoursOf(lang)) expect(homeText).toContain(r.hours)
      expect(numbersIn(homeText).has(Object.keys(NIGHT_BUS_LINES).length)).toBe(true)

      const pharmacy = allText(set.buildGuide(EN_SLUGS[3], ctx)!)
      for (const n of [112, 61, 92]) expect(numbersIn(pharmacy.replace(/\b061\b/g, "61").replace(/\b092\b/g, "92")).has(n)).toBe(true)
      expect(pharmacy).toContain("Aaa")
      expect(pharmacy).toContain("933 000 000")
    })

    it("sin datos no se inventa ninguna cifra de Noctua", () => {
      const withData = allText(set.buildGuide(EN_SLUGS[1], ctx)!)
      const without = allText(set.buildGuide(EN_SLUGS[1], emptyCtx)!)
      expect(without.length).toBeLessThan(withData.length)
      expect(numbersIn(without).has(250)).toBe(false)
    })
  })
})

// --- Transporte y esenciales ------------------------------------------------------------------------------------

describe("transporte", () => {
  it.each(OTHERS)("%s: los recorridos del Nitbus no llevan palabras en español", (lang) => {
    for (const l of Object.values(NIGHT_BUS_LINES)) {
      const route = busRouteOf(lang, l.route)
      expect(route).not.toMatch(SPANISH_ROUTE)
      expect(route.length).toBeGreaterThan(5)
    }
    expect(busRouteOf(lang, "Circular por el centro (Pl. Portal de la Pau)")).not.toContain("Circular por")
    expect(busRouteOf("de", "Barceloneta ↔ Roquetes (vía Gràcia y Canyelles)")).toBe("Barceloneta ↔ Roquetes (über Gràcia und Canyelles)")
    expect(busRouteOf("fr", "Barceloneta ↔ Roquetes (vía Gràcia y Canyelles)")).toBe("Barceloneta ↔ Roquetes (via Gràcia et Canyelles)")
    expect(busRouteOf("it", "Barceloneta ↔ Roquetes (vía Gràcia y Canyelles)")).toBe("Barceloneta ↔ Roquetes (via Gràcia e Canyelles)")
  })

  it("el horario del metro tiene las mismas horas en todos los idiomas", () => {
    const times = (l: IntlLang) => metroHoursOf(l).map((r) => r.hours.match(/\d\d:\d\d/g) ?? [])
    for (const l of OTHERS) {
      expect(metroHoursOf(l)).toHaveLength(4)
      expect(times(l)).toEqual(times("en"))
      expect(metroNoteOf(l)).toMatch(/Sant Joan/)
    }
  })

  it("las tarifas del taxi son las mismas cifras en todos los idiomas, con el euro como se escribe en cada uno", () => {
    for (const l of INTL_LANGS) {
      const fares = taxiFaresOf(l)
      for (const k of Object.keys(TAXI_2026_NUM) as (keyof typeof TAXI_2026_NUM)[]) {
        expect(Number(fares[k].replace(/[^\d,.]/g, "").replace(",", "."))).toBe(TAXI_2026_NUM[k])
      }
    }
    expect(eurOf("en", 2.8)).toBe("€2.80")
    expect(eurOf("en", 21)).toBe("€21")
    for (const l of OTHERS) {
      expect(eurOf(l, 2.8)).toMatch(/^2,80\s€$/)
      expect(eurOf(l, 21)).toMatch(/^21\s€$/)
    }
  })

  it("las fuentes que se citan son las mismas direcciones en todos los idiomas", () => {
    for (const l of OTHERS) {
      const s = sourcesOf(l)
      const en = sourcesOf("en")
      for (const k of Object.keys(en) as (keyof typeof en)[]) {
        expect(s[k].url).toBe(en[k].url)
        expect(s[k].name.length).toBeGreaterThan(5)
      }
    }
  })
})

describe("categorías de esenciales en los cuatro idiomas", () => {
  it.each(INTL_LANGS as IntlLang[])("%s: las siete, con las mismas direcciones y categorías de base de datos", (lang) => {
    const list = essentialsOf(lang)
    expect(list.map((e) => e.slug)).toEqual(["pharmacy", "hospital", "taxi", "food", "supermarket", "atm", "gas-station"])
    expect(list.map((e) => e.key)).toEqual(essentialsOf("en").map((e) => e.key))
    for (const e of list) {
      expect(e.title.endsWith("| Noctua")).toBe(true)
      expect(e.title.length).toBeLessThanOrEqual(75)
      expect(e.h1.length).toBeGreaterThan(10)
      expect(e.description.length).toBeGreaterThan(40)
      expect(e.description.length).toBeLessThanOrEqual(175)
      if (e.guide) expect(guidesOf(lang).guideMeta(e.guide)).toBeDefined()
      if (e.guide) expect(e.guideLabel?.length).toBeGreaterThan(5)
    }
    expect(essentialIn(lang, "nope")).toBeUndefined()
    expect(essentialIn(lang, "taxi")?.slug).toBe("taxi")
  })
})

// --- Textos de las fichas ---------------------------------------------------------------------------------------

describe("léxico de locales", () => {
  const KINDS: KindKey[] = ["karaoke", "pool", "cocktail", "pub", "bar", "live", "club"]
  it.each(INTL_LANGS as IntlLang[])("%s: tipos de local, días, estilos y servicios completos", (lang) => {
    const lex = CLUB_LEX[lang]
    for (const k of KINDS) {
      expect(lex.kinds[k].noun.length).toBeGreaterThan(1)
      expect(lex.kinds[k].plural.length).toBeGreaterThan(1)
      expect(lex.kinds[k].indef.length).toBeGreaterThan(2)
    }
    expect(new Set(lex.days).size).toBe(7)
    for (const key of new Set(Object.values(MUSIC_KEYS))) expect(lex.musicLabel[key], `${lang}: falta el estilo ${key}`).toBeTruthy()
    expect(Object.keys(lex.features).sort()).toEqual(Object.keys(CLUB_LEX.en.features).sort())
    for (const f of EXTRA_FEATURES) expect(lex.features[f.field], `${lang}: falta el servicio ${f.field}`).toBeTruthy()
  })
})

describe("textos de un local en los cuatro idiomas", () => {
  const club = {
    name: "Sala Apolo",
    slug: "sala-apolo",
    neighborhood: "El Raval",
    venue_type: "Discoteca",
    hours: "23:55-06:00",
    price: "10€ con copa",
    music: "Techno, House",
    dress_code: "Elegante",
    address: "Carrer Nou de la Rambla 113, 08001 Barcelona",
    google_rating: 4.5,
    google_review_count: 1200,
    terrace: true,
  }
  const bare = { name: "Bar Pelado" }

  it.each(INTL_LANGS as IntlLang[])("%s: título, descripción, tarjeta y párrafo", (lang) => {
    const title = clubTitle(lang, club)
    expect(title).toContain("Sala Apolo")
    expect(title.endsWith("| Noctua")).toBe(true)
    expect(title.length).toBeLessThanOrEqual(75)

    const meta = clubMetaDescription(lang, club)
    expect(meta).toContain("Sala Apolo")
    expect(meta.length).toBeLessThanOrEqual(160)
    expect(meta.endsWith("…")).toBe(false)

    const summary = clubSummary(lang, club)
    expect(summary).toContain("Sala Apolo")
    expect(summary).toContain("Carrer Nou de la Rambla 113")
    expect(summary).toContain(CITY_NAME[lang])
    expect(summary).not.toMatch(/undefined|NaN|\[object|\)\s*\(/)
    expect(summary).not.toContain("08001")
    expect(clubTagline(lang, club)).toContain("El Raval")
    if (lang !== "en") expect(summary).not.toMatch(ENGLISH_WORDS)
  })

  it.each(OTHERS)("%s: la valoración lleva coma decimal", (lang) => {
    const summary = clubSummary(lang, club)
    expect(summary).toContain("4,5")
    expect(summary).not.toContain("4.5")
  })
  it("en inglés la valoración lleva punto", () => {
    expect(clubSummary("en", club)).toContain("4.5")
  })

  it("la ciudad sale en el idioma de la página", () => {
    expect(placeOf("en", club)).toBe("El Raval (Barcelona)")
    expect(placeOf("de", club)).toBe("El Raval (Barcelona)")
    expect(placeOf("fr", club)).toBe("El Raval (Barcelone)")
    expect(placeOf("it", club)).toBe("El Raval (Barcellona)")
    expect(placeOf("fr", { neighborhood: "Barcelona" })).toBe("Barcelone")
    expect(placeOf("it", {})).toBe("Barcellona")
    expect(placeOf("fr", { neighborhood: "Sitges", city: "Sitges" })).toBe("Sitges")
  })

  it.each(INTL_LANGS as IntlLang[])("%s: un local casi sin datos no inventa nada", (lang) => {
    const summary = clubSummary(lang, bare)
    expect(summary).toContain("Bar Pelado")
    expect(summary).not.toMatch(/undefined|NaN|null|\d{2}:\d{2}|€/)
    expect(clubTitle(lang, bare)).toContain(CITY_NAME[lang])
    expect(clubMetaDescription(lang, bare).length).toBeLessThanOrEqual(160)
  })

  it.each(INTL_LANGS as IntlLang[])("%s: horario, precio, tipo y vestimenta", (lang) => {
    expect(hoursOf(lang, "23:55-06:00", null)[0]).toMatch(/23:55[–-]06:00/)
    expect(hoursOf(lang, "esto no es un horario", null)).toEqual([])
    expect(priceOf(lang, "")).toBeNull()
    expect(priceOf(lang, "Gratis")?.translated).toBe(true)
    expect(priceOf(lang, "Gratis")?.text.length).toBeGreaterThan(2)
    expect(priceOf(lang, "10€ con copa")?.text).toContain("10€")
    expect(venueKindOf(lang, "Discoteca").noun).toBe(CLUB_LEX[lang].kinds.club.noun)
    expect(venueKindOf(lang, "Bar de copas").indef.length).toBeGreaterThan(2)
    expect(dressOf(lang, club)).toBe(CLUB_LEX[lang].elegant)
    expect(listOf(lang, ["a", "b", "c"])).toBe(`a, b ${CLUB_LEX[lang].and} c`)
    expect(listOf(lang, ["a", "b"])).toBe(`a ${CLUB_LEX[lang].and} b`)
  })
})

// --- Mapa del sitio y hreflang ----------------------------------------------------------------------------------

describe("mapa del sitio en los cuatro idiomas", () => {
  const good = { name: "Buena", slug: "buena", neighborhood: "El Born", hours: "23:00-05:00", price: "10€", music: "House", dress_code: "Casual", image: "https://x/y.jpg" }
  const thin = { name: "Pelada", slug: "pelada", neighborhood: "El Born" }
  const clubs = [good, { ...good, name: "B2", slug: "b2" }, { ...good, name: "B3", slug: "b3" }, thin]
  const { entries, twins } = buildIntlSitemap({ clubs, busCodes: ["N7", "N12"], metroCodes: ["L1", "L3"] })
  const byUrl = new Map(entries.map((e) => [e.url, e]))
  const subOf = (url: string, lang: IntlLang) => url.slice(langUrl(lang).length)

  it("no repite direcciones y cada idioma tiene las mismas páginas", () => {
    expect(byUrl.size).toBe(entries.length)
    const subs = (l: IntlLang) => entries.filter((e) => e.url.startsWith(langUrl(l) + "/") || e.url === langUrl(l)).map((e) => subOf(e.url, l))
    for (const l of OTHERS) expect(subs(l)).toEqual(subs("en"))
    expect(subs("en").length * 4).toBe(entries.length)
  })

  it("los locales con pocos datos no entran en ningún idioma", () => {
    for (const l of INTL_LANGS) {
      expect(byUrl.has(langUrl(l, "/clubs/buena"))).toBe(true)
      expect(byUrl.has(langUrl(l, "/clubs/pelada"))).toBe(false)
    }
  })

  it("trae portada, listas, barrios, líneas, esenciales y guías en cada idioma", () => {
    for (const l of INTL_LANGS) {
      for (const sub of ["", "/clubs", "/neighbourhoods/el-born", "/night-bus", "/night-bus/N7", "/night-bus/N12", "/metro", "/metro/L1", "/metro/L3", "/essentials", "/guides"])
        expect(byUrl.has(langUrl(l, sub)), `${l}${sub}`).toBe(true)
      for (const e of essentialsOf(l)) expect(byUrl.has(langUrl(l, `/essentials/${e.slug}`))).toBe(true)
      for (const g of guidesOf(l).GUIDES) expect(byUrl.has(langUrl(l, `/guides/${g.slug}`))).toBe(true)
    }
  })

  it("hreflang de ida y vuelta: cada versión lista las demás y todas llevan el mismo conjunto", () => {
    for (const e of entries) {
      const languages = e.alternates?.languages as Record<string, string>
      expect(languages, e.url).toBeTruthy()
      const own = INTL_LANGS.find((l) => e.url === langUrl(l) || e.url.startsWith(langUrl(l) + "/"))!
      expect(languages[own]).toBe(e.url)
      for (const l of INTL_LANGS) {
        const other = byUrl.get(languages[l])
        expect(other, `${e.url} → ${l}`).toBeDefined()
        expect(other!.alternates?.languages).toEqual(languages)
      }
      expect(languages["x-default"]).toBeTruthy()
    }
  })

  it("las páginas con gemela española la declaran y la española vuelve a ellas", () => {
    expect(twins.get(esUrl("/clubs/buena"))).toBe("/clubs/buena")
    expect(twins.get(esUrl("/nitbus/N7"))).toBe("/night-bus/N7")
    expect(twins.get(esUrl("/barrio/el-born"))).toBe("/neighbourhoods/el-born")
    expect(twins.get(esUrl("/metro/L1"))).toBe("/metro/L1")
    expect(twins.get(esUrl("/essentials/taxi"))).toBe("/essentials/taxi")
    expect(twins.has(esUrl("/clubs/pelada"))).toBe(false)
    for (const [es, sub] of twins) {
      for (const l of INTL_LANGS) {
        const languages = byUrl.get(langUrl(l, sub))?.alternates?.languages as Record<string, string>
        expect(languages.es).toBe(es)
        expect(languages["x-default"]).toBe(es)
      }
    }
  })

  it("las guías no tienen gemela española y su x-default es el inglés", () => {
    for (const slug of EN_SLUGS) {
      for (const l of INTL_LANGS) {
        const languages = byUrl.get(langUrl(l, `/guides/${slug}`))?.alternates?.languages as Record<string, string>
        expect(languages.es).toBeUndefined()
        expect(languages["x-default"]).toBe(langUrl("en", `/guides/${slug}`))
      }
    }
  })
})

describe("metadatos de las páginas", () => {
  type Alt = { canonical?: string; languages?: Record<string, string> }
  const pages = (lang: IntlLang) => {
    const list: { name: string; sub: string; es: string | null; meta: ReturnType<typeof homeMetadata> }[] = [
      { name: "home", sub: "", es: "", meta: homeMetadata(lang) },
      { name: "clubs", sub: "/clubs", es: "/clubs", meta: clubsMetadata(lang) },
      { name: "night-bus", sub: "/night-bus", es: "/nitbus", meta: nightBusMetadata(lang) },
      { name: "metro", sub: "/metro", es: "/metro", meta: metroMetadata(lang) },
      { name: "essentials", sub: "/essentials", es: "/essentials", meta: essentialsMetadata(lang) },
      { name: "guides", sub: "/guides", es: null, meta: guidesIndexMetadata(lang) },
    ]
    for (const e of essentialsOf(lang)) list.push({ name: `essentials/${e.slug}`, sub: `/essentials/${e.slug}`, es: `/essentials/${e.slug}`, meta: essentialCategoryMetadata(lang, e.slug) })
    for (const g of guidesOf(lang).GUIDES) list.push({ name: `guides/${g.slug}`, sub: `/guides/${g.slug}`, es: null, meta: guideMetadata(lang, g.slug) })
    return list
  }

  it.each(INTL_LANGS as IntlLang[])("%s: título, descripción, canonical, hreflang y Open Graph", (lang) => {
    for (const p of pages(lang)) {
      const m = p.meta
      const alt = m.alternates as Alt
      const where = `${lang} ${p.name}`
      expect(String(m.title), where).toMatch(/\| Noctua$/)
      expect(String(m.title).length, where).toBeLessThanOrEqual(75)
      expect(String(m.description).length, where).toBeGreaterThan(60)
      expect(String(m.description).length, where).toBeLessThanOrEqual(180)
      expect(alt.canonical, where).toBe(langUrl(lang, p.sub))
      expect(alt.languages, where).toEqual(languagesOf(p.sub, p.es))
      for (const l of INTL_LANGS) expect(alt.languages![l], where).toBe(langUrl(l, p.sub))
      expect(alt.languages!["x-default"], where).toBe(p.es === null ? langUrl("en", p.sub) : esUrl(p.es))
      expect(m.openGraph?.url, where).toBe(langUrl(lang, p.sub))
      expect((m.openGraph as { locale?: string }).locale, where).toBe(OG_LOCALE[lang])
      expect(m.robots, where).toBeUndefined()
    }
  })

  it("los títulos de una misma página son distintos en cada idioma", () => {
    const titles = INTL_LANGS.map((l) => String(homeMetadata(l).title))
    expect(new Set(titles).size).toBe(4)
  })
})

// --- Carpetas de páginas ---------------------------------------------------------------------------------------

describe("páginas generadas por idioma", () => {
  const FILES = [
    "page.tsx",
    "clubs/page.tsx",
    "clubs/[slug]/page.tsx",
    "neighbourhoods/[slug]/page.tsx",
    "night-bus/page.tsx",
    "night-bus/[line]/page.tsx",
    "metro/page.tsx",
    "metro/[line]/page.tsx",
    "essentials/page.tsx",
    "essentials/[category]/page.tsx",
    "guides/page.tsx",
    "guides/[slug]/page.tsx",
  ]
  const root = process.cwd()
  const STATIC_PAGES = ["metro/page.tsx", "metro/[line]/page.tsx", "essentials/page.tsx", "guides/page.tsx"]

  it.each(INTL_LANGS as IntlLang[])("%s: tiene las doce páginas, cada una con su propio idioma", (lang) => {
    for (const f of FILES) {
      const path = join(root, "src", "app", lang, f)
      expect(existsSync(path), path).toBe(true)
      const src = readFileSync(path, "utf8")
      // Ningún archivo menciona el idioma de otra carpeta: así se detecta un copiar y pegar equivocado.
      const langs = new Set([...src.matchAll(/["'`](en|de|fr|it)["'`]/g)].map((m) => m[1]))
      expect([...langs], path).toEqual([lang])
      // Las únicas páginas sin datos de la base (se generan una vez) son el metro (índice y líneas), el índice de esenciales y el de guías.
      if (!STATIC_PAGES.includes(f)) expect(src, path).toMatch(/export const revalidate = \d+/)
      if (f.includes("[")) expect(src, path).toContain("generateStaticParams")
    }
  })

  it("no hay una carpeta de idioma sin registrar", () => {
    for (const l of INTL_LANGS) expect(existsSync(join(root, "src", "app", l))).toBe(true)
  })
})
