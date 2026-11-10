import { describe, expect, it } from "vitest"
import { clubSummaryEn, dressEn, hoursEn, musicEn, priceEn, venueKindEn } from "../intl/en/clubText"
import { englishClubEligible } from "../intl/clubEligible"
import { busRouteEn, METRO_HOURS, SOURCES, TAXI_2026 } from "../intl/en/transit"
import { GUIDES, buildGuide, guideMeta, type Block, type Guide, type GuideCtx } from "../intl/en/guides"
import { englishAlternates, spanishAlternates, enUrl, esUrl, langUrl } from "../intl/site"
import { buildEnglishSitemap, withSpanishAlternates } from "../intl/sitemap"
import { ESSENTIALS_EN, essentialEn } from "../intl/en/essentialsText"
import { metroStationName, operatorOf, sectionName } from "../intl/en/metroText"
import { NIGHT_BUS_LINES } from "../nightBuses"

describe("hoursEn", () => {
  it("pasa el horario a inglés con los días", () => {
    expect(hoursEn("V/S 23:00-06:00")).toEqual(["Fri, Sat 23:00–06:00"])
    expect(hoursEn("L-J 22:00-03:00, V/S 23:00-06:00")).toEqual(["Mon–Thu 22:00–03:00", "Fri, Sat 23:00–06:00"])
  })
  it("sin días en el texto usa los días de apertura del local, o todas las noches", () => {
    expect(hoursEn("23:00-05:00", ["viernes", "sábado"])).toEqual(["Fri, Sat 23:00–05:00"])
    expect(hoursEn("23:00-05:00")).toEqual(["Every night 23:00–05:00"])
  })
  it("un horario que no se entiende no sale", () => {
    expect(hoursEn("consultar")).toEqual([])
    expect(hoursEn("")).toEqual([])
    expect(hoursEn(null)).toEqual([])
  })
})

describe("priceEn", () => {
  it("traduce precios con frases conocidas", () => {
    expect(priceEn("15€ con copa")).toEqual({ text: "15€ with a drink", translated: true })
    expect(priceEn("Gratis")).toEqual({ text: "Free", translated: true })
  })
  it("si hay una palabra que no se reconoce deja el texto tal cual y lo marca", () => {
    const p = priceEn("Entrada 12€ y pulsera fluorescente")
    expect(p).toEqual({ text: "Entrada 12€ y pulsera fluorescente", translated: false })
  })
  it("vacío = sin precio", () => {
    expect(priceEn("")).toBeNull()
    expect(priceEn(undefined)).toBeNull()
  })
})

describe("musicEn y tipo de local", () => {
  it("traduce los estilos conocidos y deja el resto como está", () => {
    expect(musicEn("Comercial, Latina")).toEqual(["commercial", "Latin"])
    expect(musicEn("Electrónica / Techno")).toEqual(["electronic", "techno"])
    expect(musicEn("Cumbia villera")).toEqual(["Cumbia villera"])
  })
  it("el tipo de local da el nombre en inglés", () => {
    expect(venueKindEn("Bar de copas").noun).toBe("bar")
    expect(venueKindEn("Pub").noun).toBe("pub")
    expect(venueKindEn("Discoteca").noun).toBe("nightclub")
    expect(venueKindEn(null).plural).toBe("nightclubs")
  })
  it("'Elegante' pasa a Elegant", () => {
    expect(dressEn({ dress_code: "Elegante" })).toBe("Elegant")
    expect(dressEn({ dress_code: "Smart casual" })).toBe("Smart casual")
    expect(dressEn({})).toBe("")
  })
})

describe("clubSummaryEn", () => {
  const club = {
    name: "Sala Test",
    venue_type: "Discoteca",
    neighborhood: "El Raval",
    address: "Carrer Ample 1, 08002 Barcelona",
    music: "Techno",
    hours: "V/S 23:55-06:00",
    price: "15€ con copa",
    age_min: 18,
    dress_code: "Casual",
    google_rating: 4.4,
    google_review_count: 120,
    terrace: true,
  }
  it("monta el párrafo solo con datos reales del local", () => {
    const text = clubSummaryEn(club)
    expect(text).toContain("Sala Test is a nightclub")
    expect(text).toContain("Music: techno.")
    expect(text).toContain("Opening hours: Fri, Sat 23:55–06:00.")
    expect(text).toContain("Entry: 15€ with a drink.")
    expect(text).toContain("Minimum age: 18+.")
    expect(text).toContain("Dress code: Casual.")
    expect(text).toContain("4.4 out of 5 from 120 reviews")
    expect(text).toContain("a terrace")
  })
  it("no inventa lo que falta", () => {
    const text = clubSummaryEn({ name: "Solo Nombre", address: "Calle 1" })
    expect(text).not.toMatch(/Opening hours|Entry:|Minimum age|Dress code|Google rating|Music:/)
  })
})

describe("englishClubEligible", () => {
  it("pide al menos 4 datos propios", () => {
    expect(englishClubEligible({ name: "x" })).toBe(false)
    expect(englishClubEligible({ hours: "23:00-05:00", price: "10€", music: "House" })).toBe(false)
    expect(englishClubEligible({ hours: "23:00-05:00", price: "10€", music: "House", dress_code: "Casual" })).toBe(true)
    expect(englishClubEligible({ hours: "23:00-05:00", image: "https://x/y.jpg", google_rating: 4.2, age_min: 18 })).toBe(true)
  })
})

describe("busRouteEn", () => {
  it("traduce las palabras del recorrido y deja los nombres de lugar", () => {
    expect(busRouteEn("Barceloneta ↔ Roquetes (vía Gràcia y Canyelles)")).toBe("Barceloneta ↔ Roquetes (via Gràcia and Canyelles)")
    expect(busRouteEn("Pl. Catalunya ↔ Aeroport T1")).toBe("Pl. Catalunya ↔ Airport T1")
    expect(busRouteEn("Circular por el centro (Pl. Portal de la Pau)")).toBe("Circular route through the centre (Pl. Portal de la Pau)")
  })
  it("ninguna línea de Nitbus queda con palabras en español sueltas", () => {
    for (const l of Object.values(NIGHT_BUS_LINES)) expect(busRouteEn(l.route)).not.toMatch(/\bvía\b|\bAeroport\b| y /)
  })
})

describe("horario del metro y tarifas", () => {
  it("el horario del metro coincide con lo verificado en TMB", () => {
    expect(METRO_HOURS.map((r) => r.hours)).toEqual(["05:00 – 00:00", "05:00 – 02:00", "From 05:00, then non-stop all night", "Non-stop from Saturday night until 00:00"])
  })
  it("las fuentes tienen dirección https", () => {
    for (const s of Object.values(SOURCES)) expect(s.url).toMatch(/^https:\/\//)
  })
  it("las tarifas del taxi llevan euros", () => {
    for (const v of Object.values(TAXI_2026)) expect(v).toMatch(/^€\d/)
  })
})

describe("hreflang", () => {
  it("la página inglesa con gemela se declara a sí misma, a las demás versiones, a la española y x-default español", () => {
    const a = englishAlternates("/clubs/x", "/clubs/x")
    expect(a).toEqual({
      canonical: enUrl("/clubs/x"),
      languages: {
        en: enUrl("/clubs/x"),
        de: langUrl("de", "/clubs/x"),
        fr: langUrl("fr", "/clubs/x"),
        it: langUrl("it", "/clubs/x"),
        es: esUrl("/clubs/x"),
        "x-default": esUrl("/clubs/x"),
      },
    })
  })
  it("una guía sin gemela es su propio x-default (inglés) y lista los cuatro idiomas", () => {
    expect(englishAlternates("/guides/g", null)).toEqual({
      canonical: enUrl("/guides/g"),
      languages: {
        en: enUrl("/guides/g"),
        de: langUrl("de", "/guides/g"),
        fr: langUrl("fr", "/guides/g"),
        it: langUrl("it", "/guides/g"),
        "x-default": enUrl("/guides/g"),
      },
    })
  })
  it("la española devuelve el enlace de vuelta a los cuatro idiomas", () => {
    const a = spanishAlternates("/nitbus/N7", "/night-bus/N7")
    expect(a).toEqual({
      canonical: esUrl("/nitbus/N7"),
      languages: {
        es: esUrl("/nitbus/N7"),
        en: enUrl("/night-bus/N7"),
        de: langUrl("de", "/night-bus/N7"),
        fr: langUrl("fr", "/night-bus/N7"),
        it: langUrl("it", "/night-bus/N7"),
        "x-default": esUrl("/nitbus/N7"),
      },
    })
  })
})

describe("sitemap en inglés", () => {
  const good = { name: "Buena", slug: "buena", neighborhood: "El Born", hours: "23:00-05:00", price: "10€", music: "House", dress_code: "Casual", image: "https://x/y.jpg" }
  const thin = { name: "Pelada", slug: "pelada", neighborhood: "El Born" }
  const clubs = [good, { ...good, name: "B2", slug: "b2" }, { ...good, name: "B3", slug: "b3" }, thin]
  const { entries, twins } = buildEnglishSitemap({ clubs, busCodes: ["N7"], metroCodes: ["L1"] })
  const urls = entries.map((e) => e.url)

  it("solo entran los locales con datos suficientes, en los cuatro idiomas", () => {
    for (const l of ["en", "de", "fr", "it"] as const) {
      expect(urls).toContain(langUrl(l, "/clubs/buena"))
      expect(urls).not.toContain(langUrl(l, "/clubs/pelada"))
    }
  })
  it("incluye portada, listas, barrios, líneas, esenciales y guías", () => {
    for (const u of [enUrl(""), enUrl("/clubs"), enUrl("/neighbourhoods/el-born"), enUrl("/night-bus"), enUrl("/night-bus/N7"), enUrl("/metro"), enUrl("/metro/L1"), enUrl("/essentials"), enUrl("/guides")])
      expect(urls).toContain(u)
    for (const e of ESSENTIALS_EN) expect(urls).toContain(enUrl(`/essentials/${e.slug}`))
    for (const g of GUIDES) expect(urls).toContain(enUrl(`/guides/${g.slug}`))
  })
  it("no repite direcciones", () => {
    expect(new Set(urls).size).toBe(urls.length)
  })
  it("toda página con gemela lleva las seis direcciones, y la española las mismas (ida y vuelta)", () => {
    const spanish = withSpanishAlternates(
      [{ url: esUrl("/clubs/buena") }, { url: esUrl("/nitbus/N7") }, { url: esUrl("/faq") }],
      twins
    )
    const all = (sub: string, es: string) => ({
      es: esUrl(es),
      en: langUrl("en", sub),
      de: langUrl("de", sub),
      fr: langUrl("fr", sub),
      it: langUrl("it", sub),
      "x-default": esUrl(es),
    })
    const club = spanish.find((e) => e.url === esUrl("/clubs/buena"))
    expect(club?.alternates?.languages).toEqual(all("/clubs/buena", "/clubs/buena"))
    expect(spanish.find((e) => e.url === esUrl("/nitbus/N7"))?.alternates?.languages).toEqual(all("/night-bus/N7", "/nitbus/N7"))
    expect(spanish.find((e) => e.url === esUrl("/faq"))?.alternates).toBeUndefined()
    // Ida y vuelta: cada versión internacional dice lo mismo que la española.
    for (const l of ["en", "de", "fr", "it"] as const) {
      const e = entries.find((x) => x.url === langUrl(l, "/clubs/buena"))!
      expect(e.alternates?.languages).toEqual(all("/clubs/buena", "/clubs/buena"))
    }
  })
  it("las guías no tienen gemela española: x-default = inglés y cuatro idiomas", () => {
    const g = entries.find((x) => x.url === langUrl("de", `/guides/${GUIDES[0].slug}`))!
    expect(g.alternates?.languages?.["x-default"]).toBe(enUrl(`/guides/${GUIDES[0].slug}`))
    expect(Object.keys(g.alternates!.languages!).sort()).toEqual(["de", "en", "fr", "it", "x-default"])
  })
})

describe("categorías de esenciales en inglés", () => {
  it("existen las siete y cada una tiene título, h1, descripción y su categoría de base de datos", () => {
    expect(ESSENTIALS_EN.map((e) => e.slug)).toEqual(["pharmacy", "hospital", "taxi", "food", "supermarket", "atm", "gas-station"])
    for (const e of ESSENTIALS_EN) {
      expect(e.title.endsWith("| Noctua")).toBe(true)
      expect(e.description.length).toBeGreaterThan(40)
      expect(e.key.length).toBeGreaterThan(0)
    }
    expect(essentialEn("nope")).toBeUndefined()
  })
})

describe("textos del metro", () => {
  it("limpia los nombres con dos nombres y traduce Nord/Sud", () => {
    expect(metroStationName("Europa | Fira")).toBe("Europa / Fira")
    expect(sectionName("Nord")).toBe("North")
    expect(sectionName("Sud")).toBe("South")
    expect(operatorOf("L6")).toBe("FGC")
    expect(operatorOf("L3")).toBe("TMB")
  })
})

// --- Guías -------------------------------------------------------------------------------------------------------

const ph = (n: string) => ({ name: n, where: `Carrer ${n} 1, El Raval`, phone: "933 000 000" })
const ctx: GuideCtx = {
  total: 250,
  facts: {
    total: 250,
    price: { min: 0, max: 30 },
    hours: { open: "23:55", close: "06:00" },
    late: { n: 80, of: 120 },
    styles: [],
    metro: [],
    nitbus: [],
    top: [],
  },
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
  nightsOpen: [
    { day: "Monday", n: 20 },
    { day: "Tuesday", n: 22 },
    { day: "Wednesday", n: 30 },
    { day: "Thursday", n: 90 },
    { day: "Friday", n: 200 },
    { day: "Saturday", n: 210 },
    { day: "Sunday", n: 40 },
  ],
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

function internalLinks(g: Guide): string[] {
  const out = [g.cta.href]
  for (const s of g.sections) for (const b of s.blocks) if (b.t === "links") out.push(...b.items.map((i) => i.href))
  return out
}

describe("guías para turistas", () => {
  it("hay siete, con dirección y título propios y sin repetir", () => {
    expect(GUIDES).toHaveLength(7)
    expect(new Set(GUIDES.map((g) => g.slug)).size).toBe(7)
    expect(new Set(GUIDES.map((g) => g.title)).size).toBe(7)
    for (const g of GUIDES) {
      expect(g.title.endsWith("| Noctua")).toBe(true)
      expect(g.title.length).toBeLessThanOrEqual(75)
      expect(g.description.length).toBeGreaterThan(80)
      expect(g.description.length).toBeLessThanOrEqual(175)
      expect(guideMeta(g.slug)).toBe(g)
    }
    expect(buildGuide("nope", ctx)).toBeNull()
  })

  it.each(GUIDES.map((g) => g.slug))("%s se monta con datos y sin datos", (slug) => {
    for (const c of [ctx, emptyCtx]) {
      const g = buildGuide(slug, c)!
      expect(g).not.toBeNull()
      expect(g.sections.length).toBeGreaterThanOrEqual(2)
      expect(g.faq.length).toBeGreaterThanOrEqual(2)
      const text = allText(g)
      // Nada de "undefined", "NaN" ni plantillas sin rellenar.
      expect(text).not.toMatch(/undefined|NaN|\[object|\$\{|\bnull\b/)
      // Los enlaces internos van a páginas que existen.
      for (const href of internalLinks(g)) {
        expect(href).toMatch(/^\/(en|clubs|essentials|nitbus|metro|map|plan)?/)
        if (href.startsWith("/en/guides/")) expect(guideMeta(href.replace("/en/guides/", ""))).toBeDefined()
        if (href.startsWith("/en/essentials/")) expect(essentialEn(href.replace("/en/essentials/", ""))).toBeDefined()
      }
      // Las guías relacionadas existen.
      for (const r of g.related) expect(guideMeta(r)).toBeDefined()
    }
  })

  it("las respuestas de las preguntas frecuentes cuadran con los datos", () => {
    const home = buildGuide(GUIDES[0].slug, ctx)!
    const count = ctx.busLines.length
    const viaCat = ctx.busLines.filter((l) => l.catalunya).length
    expect(home.faq.find((f) => /night bus/i.test(f.q))!.a).toContain(`${count} N-lines`)
    expect(home.faq.find((f) => /night bus/i.test(f.q))!.a).toContain(`${viaCat} of them stop at Plaça Catalunya`)
    expect(allText(home)).toContain(TAXI_2026.minFare)
    const pharmacy = buildGuide(GUIDES[3].slug, ctx)!
    expect(pharmacy.faq[0].a).toContain("9 pharmacies that open 24 hours")
    expect(allText(pharmacy)).toContain("120 pharmacies")
    const entry = buildGuide(GUIDES[1].slug, ctx)!
    expect(allText(entry)).toContain("Among the 60 venues that state a dress code")
    expect(allText(entry)).toContain("free entry up to €30")
    const time = buildGuide(GUIDES[2].slug, ctx)!
    expect(allText(time)).toContain("most common opening time is 23:55")
    expect(allText(time)).toContain("80 of the 120 venues")
    expect(allText(time)).toContain("the most venues are open on Saturday and Friday nights")
    const areas = buildGuide(GUIDES[6].slug, ctx)!
    expect(allText(areas)).toContain("Liceu")
    expect(allText(areas)).toContain("N9")
  })

  it("sin datos, las cifras de Noctua desaparecen en vez de inventarse", () => {
    const entry = allText(buildGuide(GUIDES[1].slug, emptyCtx)!)
    expect(entry).not.toMatch(/On Noctua, venues that list an entry price|venues that state a dress code/)
    const time = allText(buildGuide(GUIDES[2].slug, emptyCtx)!)
    expect(time).not.toMatch(/most common opening time|of the .* venues with opening hours|Which nights are venues open/)
    const food = allText(buildGuide(GUIDES[4].slug, emptyCtx)!)
    expect(food).not.toMatch(/Noctua marks/)
  })

  it("las multas de la ordenanza son las de la fuente", () => {
    const rules = allText(buildGuide(GUIDES[5].slug, ctx)!)
    for (const s of ["15 February 2026", "€100 to €600", "€750 to €1,500", "Up to €300", "Up to €750", "€1,500 to €3,000", "50%"]) expect(rules).toContain(s)
    expect(buildGuide(GUIDES[5].slug, ctx)!.sources).toContainEqual(SOURCES.ordinance)
  })

  it("lo que se afirma del metro coincide con el horario oficial", () => {
    const home = allText(buildGuide(GUIDES[0].slug, ctx)!)
    for (const r of METRO_HOURS) expect(home).toContain(r.hours)
    expect(home).toContain("02:00")
  })
})
