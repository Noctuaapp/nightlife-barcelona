// Genera las rutas finas de cada idioma internacional (src/app/{en,de,fr,it}/...). Todas son iguales salvo el idioma y la
// profundidad de los imports: la página de verdad está en src/components/intl/pages/*. Cada archivo tiene que declarar
// `revalidate`, `dynamicParams` y `generateStaticParams` como literales (Next.js no los lee de un import).
//
// Uso: node scripts/make-intl-pages.mjs   (vuelve a escribir las 12 rutas de los 4 idiomas)

import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "app")
const LANGS = ["en", "de", "fr", "it"]

const STATIC_PARAMS = `export async function generateStaticParams() {
  return []
}
`

// Cada ruta: carpeta bajo /{idioma}, componente, función de metadatos y cómo se renueva.
const ROUTES = [
  { dir: "", comp: "Home", meta: { kind: "static", fn: "homeMetadata" }, revalidate: 86400, props: [] },
  { dir: "clubs", comp: "ClubsList", meta: { kind: "static", fn: "clubsMetadata" }, revalidate: 43200, props: [] },
  { dir: "clubs/[slug]", comp: "ClubDetail", meta: { kind: "param", fn: "clubMetadata", param: "slug" }, revalidate: 259200, staticParams: true, props: ["slug"] },
  { dir: "neighbourhoods/[slug]", comp: "Neighbourhood", meta: { kind: "param", fn: "neighbourhoodMetadata", param: "slug" }, revalidate: 86400, staticParams: true, props: ["slug"] },
  { dir: "night-bus", comp: "NightBus", meta: { kind: "static", fn: "nightBusMetadata" }, revalidate: 43200, props: [] },
  { dir: "night-bus/[line]", comp: "NightBusLine", meta: { kind: "param", fn: "nightBusLineMetadata", param: "line" }, revalidate: 43200, staticParams: true, props: ["line"] },
  { dir: "metro", comp: "Metro", meta: { kind: "static", fn: "metroMetadata" }, props: [], syncPage: true },
  { dir: "metro/[line]", comp: "MetroLine", meta: { kind: "param", fn: "metroLineMetadata", param: "line" }, metroLines: true, props: ["line"] },
  { dir: "essentials", comp: "Essentials", meta: { kind: "static", fn: "essentialsMetadata" }, props: [], syncPage: true },
  { dir: "essentials/[category]", comp: "EssentialCategory", meta: { kind: "param", fn: "essentialCategoryMetadata", param: "category", sync: true }, revalidate: 43200, staticParams: true, props: ["category"] },
  { dir: "guides", comp: "GuidesIndex", meta: { kind: "static", fn: "guidesIndexMetadata" }, props: [], syncPage: true },
  { dir: "guides/[slug]", comp: "GuidePage", meta: { kind: "param", fn: "guideMetadata", param: "slug", sync: true }, revalidate: 86400, staticParams: true, props: ["slug"] },
]

// Los componentes que no son async (Metro, Essentials, GuidesIndex, MetroLine) se devuelven sin await.
const SYNC_COMPONENTS = new Set(["Metro", "MetroLine", "Essentials", "GuidesIndex"])

function fileFor(lang, r) {
  const depth = r.dir === "" ? 2 : 2 + r.dir.split("/").length
  const rel = "../".repeat(depth) + "components/intl/pages/" + r.comp
  const lines = []
  lines.push(`import type { Metadata } from "next"`)
  lines.push(`import ${r.comp}, { ${r.meta.fn} } from "${rel}"`)
  if (r.metroLines) lines.push(`import { METRO_LINE_CODES } from "${"../".repeat(depth)}lib/metroLines"`)
  lines.push("")
  lines.push(`// /${lang}${r.dir ? "/" + r.dir : ""}: ruta fina; la página y sus textos están en components/intl/pages/${r.comp}.tsx`)
  lines.push(`// (archivo generado por scripts/make-intl-pages.mjs: no se edita a mano).`)
  if (r.revalidate) lines.push(`export const revalidate = ${r.revalidate}`)
  if (r.metroLines) {
    lines.push("export const dynamicParams = false")
    lines.push("export function generateStaticParams() {")
    lines.push("  return METRO_LINE_CODES.map((line) => ({ line }))")
    lines.push("}")
  }
  if (r.staticParams) lines.push(STATIC_PARAMS.trimEnd())
  lines.push("")
  const asyncComp = !SYNC_COMPONENTS.has(r.comp)
  if (r.props.length === 0) {
    lines.push(`export const metadata: Metadata = ${r.meta.fn}("${lang}")`)
    lines.push("")
    lines.push(`export default ${asyncComp ? "async " : ""}function Page() {`)
    lines.push(`  return <${r.comp} lang="${lang}" />`)
    lines.push("}")
  } else {
    const p = r.props[0]
    lines.push(`type Props = { params: Promise<{ ${p}: string }> }`)
    lines.push("")
    const awaitMeta = r.meta.sync ? "" : "await "
    lines.push(`export async function generateMetadata({ params }: Props): Promise<Metadata> {`)
    lines.push(`  const { ${p} } = await params`)
    lines.push(`  return ${awaitMeta}${r.meta.fn}("${lang}", ${p})`)
    lines.push("}")
    lines.push("")
    lines.push(`export default async function Page({ params }: Props) {`)
    lines.push(`  const { ${p} } = await params`)
    const propName = p === "line" ? "line" : p
    lines.push(`  return <${r.comp} lang="${lang}" ${propName}={${p}} />`)
    lines.push("}")
  }
  lines.push("")
  return lines.join("\n")
}

let n = 0
for (const lang of LANGS) {
  for (const r of ROUTES) {
    const dir = join(root, lang, r.dir)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, "page.tsx"), fileFor(lang, r))
    n++
  }
}
console.log(`Escritas ${n} rutas en ${LANGS.join(", ")}`)
