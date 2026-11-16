import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { isCityScoped } from "../cities"

// Ningún botón debe cambiar de ciudad por descuido (16/11/2026). Un enlace a una página que existe por ciudad («/clubs», «/map»,
// «/plan», «/events», «/essentials…», «/metro…», «/»…) escrito con el <Link> de Next a secas lleva SIEMPRE a Barcelona, aunque se
// pulse en Madrid. Esas páginas deben usar CityLink (components/system/CityLink.tsx) o cityPath()/useCityPath(), que les ponen
// el prefijo de la ciudad en pantalla. Este test lo comprueba en todo el código público.

const SRC = path.resolve(__dirname, "../..")

// Fuera: el panel de admin y lo que es solo de Barcelona (otros idiomas, la página de Nochevieja), que no tiene versión de Madrid.
const SKIP = [/^app\/admin\//, /^components\/admin\//, /^components\/intl\//, /^app\/(en|de|fr|it)\//, /^app\/nochevieja-barcelona\//, /__tests__/]

function walk(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    if (fs.statSync(full).isDirectory()) walk(full, out)
    else if (/\.tsx?$/.test(name)) out.push(full)
  }
  return out
}

const FILES = walk(SRC)
  .map((full) => ({ full, rel: path.relative(SRC, full).split(path.sep).join("/") }))
  .filter(({ rel }) => !SKIP.some((re) => re.test(rel)))

// La parte de la dirección antes de ? o #.
const pathOnly = (href: string) => href.split(/[?#]/)[0]

describe("enlaces entre ciudades", () => {
  it("ningún <Link> de Next a secas apunta a una página que existe por ciudad", () => {
    // A propósito: la portada de Nitbus (/nitbus) es solo de Barcelona y su enlace a /essentials/nitbus también.
    const ALLOWED = new Set(["components/nitbus/NitbusIndexView.tsx"])
    const bad: string[] = []
    for (const { full, rel } of FILES) {
      if (ALLOWED.has(rel)) continue
      const text = fs.readFileSync(full, "utf8")
      if (!/from\s+["']next\/link["']/.test(text)) continue
      for (const m of text.matchAll(/href=\{?\s*["'`]([^"'`]*)["'`]/g)) {
        const href = m[1]
        if (href.startsWith("/") && !href.startsWith("//") && isCityScoped(pathOnly(href))) bad.push(`${rel}: href="${href}"`)
      }
    }
    expect(bad, `Usa CityLink en vez de next/link para estos enlaces:\n${bad.join("\n")}`).toEqual([])
  })

  it("ningún router.push/replace con una dirección de ciudad escrita a mano (salvo las que mandan a Barcelona a propósito)", () => {
    // A propósito: CityGate devuelve a la portada de Barcelona a quien no puede ver una ciudad en vista previa; /blocked saca a quien
    // tiene la cuenta bloqueada. En ninguna de las dos hay una ciudad que conservar.
    const ALLOWED = new Set(["components/system/CityGate.tsx", "app/blocked/page.tsx"])
    const bad: string[] = []
    for (const { full, rel } of FILES) {
      if (ALLOWED.has(rel)) continue
      const text = fs.readFileSync(full, "utf8")
      for (const m of text.matchAll(/router\.(?:push|replace)\(\s*["'`]([^"'`]*)["'`]/g)) {
        const href = m[1]
        if (href.startsWith("/") && isCityScoped(pathOnly(href))) bad.push(`${rel}: router.${m[0].includes("push") ? "push" : "replace"}("${href}")`)
      }
    }
    expect(bad, `Usa useCityPath()/cityPath() para estas navegaciones:\n${bad.join("\n")}`).toEqual([])
  })

  it("ningún window.location.href escrito a mano a una página de ciudad", () => {
    const bad: string[] = []
    for (const { full, rel } of FILES) {
      const text = fs.readFileSync(full, "utf8")
      for (const m of text.matchAll(/location\.href\s*=\s*["'`]([^"'`]*)["'`]/g)) {
        const href = m[1]
        if (href.startsWith("/") && !href.startsWith("//") && isCityScoped(pathOnly(href))) bad.push(`${rel}: location.href = "${href}"`)
      }
    }
    expect(bad, `Usa cityPath()/rememberedHome() para estas navegaciones:\n${bad.join("\n")}`).toEqual([])
  })
})
