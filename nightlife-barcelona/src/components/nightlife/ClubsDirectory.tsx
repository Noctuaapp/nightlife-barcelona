import { createSlug } from "../../lib/slug"
import type { DbRow } from "../../lib/clubQueries"
import ClubsDirectoryView, { type DirectoryGroup } from "./ClubsDirectoryView"

// Índice A–Z de todos los locales al final de /clubs (25/10/2026, indexación; rediseñado el
// 31/10/2026 para el móvil).
//
// El listado de /clubs solo pinta 9 fichas en el HTML; el resto aparece al pulsar "Mostrar más",
// que Google no pulsa. Así, cientos de fichas solo eran accesibles desde el sitemap, sin ningún
// enlace interno, y Google las considera poco importantes ("Descubierta: actualmente sin
// indexar"). Este índice deja un enlace normal a cada local desde la página principal de clubs.
// Se agrupa aquí, en el servidor, y la vista (selector de letras) se pinta con TODOS los enlaces en
// el HTML: las letras no elegidas van ocultas con CSS, pero siguen ahí para Google.
export default function ClubsDirectory({ clubs }: { clubs: DbRow[] }) {
  const sorted = clubs
    .filter((c) => typeof c.name === "string" && c.name.trim())
    .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }))
  if (sorted.length === 0) return null

  const groups = new Map<string, DirectoryGroup["items"]>()
  for (const c of sorted) {
    const first = c.name.trim().normalize("NFD").replace(/[̀-ͯ]/g, "").charAt(0).toUpperCase()
    const key = /[A-Z]/.test(first) ? first : "#"
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push({
      id: c.id,
      name: c.name.trim(),
      href: `/clubs/${c.slug || createSlug(c.name)}`,
      hood: c.neighborhood || null,
    })
  }
  // La "#" (nombres que empiezan por número o símbolo) va la última.
  const list: DirectoryGroup[] = Array.from(groups.entries())
    .map(([letter, items]) => ({ letter, items }))
    .sort((a, b) => (a.letter === "#" ? 1 : b.letter === "#" ? -1 : a.letter.localeCompare(b.letter)))

  return <ClubsDirectoryView groups={list} total={sorted.length} />
}
