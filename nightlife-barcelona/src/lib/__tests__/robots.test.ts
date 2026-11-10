import { describe, expect, it } from "vitest"
import robots, { STATE_PARAMS } from "../../app/robots"

// Reglas de robots.txt con la semántica de Google: «*» = cualquier cosa, «$» = final, gana la regla más larga.
function rule(pattern: string): RegExp {
  const body = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*").replace(/\*/g, ".*")
  return new RegExp("^" + body)
}
function blocked(path: string): boolean {
  const r = robots()
  const rules = Array.isArray(r.rules) ? r.rules[0] : r.rules
  const allow = ([] as string[]).concat(rules.allow ?? [])
  const disallow = ([] as string[]).concat(rules.disallow ?? [])
  const longest = (list: string[]) => list.filter((p) => rule(p.replace(/\?/g, "?")).test(path)).reduce((m, p) => Math.max(m, p.length), -1)
  return longest(disallow) > longest(allow)
}

describe("robots.txt", () => {
  it("las páginas que importan siguen abiertas", () => {
    for (const p of [
      "/", "/clubs", "/clubs/razzmatazz", "/essentials", "/essentials/taxi", "/essentials/pharmacy", "/map", "/plan",
      "/nitbus", "/nitbus/N7", "/metro", "/metro/L3", "/barrio/gracia", "/zona/badalona", "/musica/techno",
      "/en/clubs", "/de/clubs/razzmatazz", "/fr/night-bus/N7", "/it/guides", "/sitemap.xml", "/club-event/12", "/event/algo",
    ]) expect(blocked(p), p).toBe(false)
  })

  it("las URLs de estado (misma página con algo marcado) no se rastrean", () => {
    for (const p of [
      "/clubs?open=1",
      "/clubs?search=apolo",
      "/essentials/pharmacy?id=123",
      "/essentials/nitbus?line=N7",
      "/nitbus/N7?stop=Pla%C3%A7a%20Catalunya",
      "/nitbus/N7?lat=41.38000&lon=2.17000",
      "/metro/L3?stop=Catalunya",
      "/map?type=clubs&id=5",
      "/map?foo=1&id=5",
      "/?ref=ABC123",
      "/clubs/razzmatazz?tab=opiniones",
    ]) expect(blocked(p), p).toBe(true)
  })

  it("lo que ya estaba bloqueado sigue bloqueado", () => {
    for (const p of ["/admin", "/admin/users", "/api/revalidate", "/profile", "/mi-club", "/contact?type=report_issue", "/recuperar"]) expect(blocked(p), p).toBe(true)
  })

  it("un parámetro cualquiera que no es de estado no bloquea la página", () => {
    expect(blocked("/clubs?utm_source=instagram")).toBe(false)
    expect(blocked("/essentials/taxi?utm_medium=x")).toBe(false)
  })

  it("los nombres de parámetro no se pisan con otros más largos", () => {
    // «id» no debe bloquear «idioma» ni «video»
    expect(blocked("/clubs?idioma=es")).toBe(false)
    expect(blocked("/clubs?video=1")).toBe(false)
    expect(STATE_PARAMS).toContain("id")
  })

  it("el sitemap sigue declarado", () => {
    expect(robots().sitemap).toBe("https://www.noctuaapp.com/sitemap.xml")
  })
})
