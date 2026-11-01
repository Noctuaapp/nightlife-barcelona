import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

// La tabla `analytics` solo acepta los tipos de evento de la lista de la función analytics_guard()
// (Supabase). Un tipo que no esté en esa lista se descarta SIN dar error: durante semanas se
// perdieron los cambios de página, el embudo de registro y las estadísticas de esenciales porque se
// añadieron en el código y no en la lista. Este test compara las dos cosas para que no se repita.
//
// Si falla: añade el tipo a la lista en una migración nueva de supabase/ que vuelva a crear
// analytics_guard() (copia la última, ver 64_analitica_tipos_de_evento.sql) y ejecútala en Supabase.

const ROOT = process.cwd()

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name !== "__tests__" && name !== "node_modules") sourceFiles(full, out)
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full)
    }
  }
  return out
}

// Tipos permitidos por la última migración que define analytics_guard().
function guardEventTypes(): Set<string> {
  const dir = join(ROOT, "supabase")
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
  let list = ""
  for (const f of files) {
    const sql = readFileSync(join(dir, f), "utf8")
    const m = sql.match(/function public\.analytics_guard\(\)[\s\S]*?event_type not in \(([\s\S]*?)\)\s*then/i)
    if (m) list = m[1]
  }
  const types = new Set<string>()
  for (const m of list.replace(/--.*$/gm, "").matchAll(/'([a-z_]+)'/g)) types.add(m[1])
  return types
}

// Tipos que el código envía: track("x"), trackClick("x") y trackEssentialClick("x"), más los de
// los botones sociales (SocialLinks los pasa a trackClick como variable).
function emittedEventTypes(): Set<string> {
  const types = new Set<string>()
  for (const file of sourceFiles(join(ROOT, "src"))) {
    const text = readFileSync(file, "utf8")
    for (const m of text.matchAll(/\b(?:track|trackClick|trackEssentialClick)\(\s*"([a-z_]+)"/g)) types.add(m[1])
    if (file.endsWith("SocialLinks.tsx")) {
      const union = text.match(/onClick\?:\s*\(kind:\s*([^)]*)\)/)
      for (const m of (union?.[1] || "").matchAll(/"([a-z_]+)"/g)) types.add(m[1])
    }
  }
  return types
}

describe("tipos de evento de la analítica", () => {
  const allowed = guardEventTypes()
  const emitted = emittedEventTypes()

  it("lee la lista del servidor y los eventos del código", () => {
    expect(allowed.has("page_view")).toBe(true)
    expect(allowed.has("session_start")).toBe(true)
    expect(emitted.size).toBeGreaterThan(20)
  })

  it("el servidor acepta todos los eventos que envía la web", () => {
    const dropped = [...emitted].filter((t) => !allowed.has(t)).sort()
    expect(dropped).toEqual([])
  })
})
