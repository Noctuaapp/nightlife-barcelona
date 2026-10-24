import Link from "next/link"
import { createSlug } from "../../lib/slug"
import type { DbRow } from "../../lib/clubQueries"

// Índice A–Z de todos los locales al final de /clubs (25/10/2026, indexación).
//
// El listado de /clubs solo pinta 9 fichas en el HTML; el resto aparece al pulsar "Mostrar más",
// que Google no pulsa. Así, cientos de fichas solo eran accesibles desde el sitemap, sin ningún
// enlace interno, y Google las considera poco importantes ("Descubierta: actualmente sin
// indexar"). Este índice deja un enlace normal a cada local desde la página principal de clubs.
// Es un componente de servidor: va en el HTML tal cual, sin JavaScript.
export default function ClubsDirectory({ clubs }: { clubs: DbRow[] }) {
  const sorted = clubs
    .filter((c) => typeof c.name === "string" && c.name.trim())
    .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }))
  if (sorted.length === 0) return null

  const groups = new Map<string, DbRow[]>()
  for (const c of sorted) {
    const first = c.name.trim().normalize("NFD").replace(/[̀-ͯ]/g, "").charAt(0).toUpperCase()
    const key = /[A-Z]/.test(first) ? first : "#"
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(c)
  }

  return (
    <section aria-labelledby="clubs-az" className="mx-auto max-w-7xl border-t border-white/10 bg-night px-4 pt-10">
      <h2 id="clubs-az" className="text-xl font-semibold text-ink">
        Todos los locales de Barcelona, de la A a la Z
      </h2>
      <p className="mt-2 text-sm text-zinc-400">{sorted.length} discotecas, pubs, bares de copas y karaokes.</p>
      <div className="mt-6 columns-2 gap-6 sm:columns-3 lg:columns-4">
        {Array.from(groups.entries()).map(([letter, list]) => (
          <div key={letter} className="mb-5 break-inside-avoid">
            <h3 className="mb-1.5 text-sm font-bold text-brand-soft">{letter}</h3>
            <ul className="space-y-1">
              {list.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/clubs/${c.slug || createSlug(c.name)}`}
                    className="text-sm text-zinc-300 transition hover:text-ink hover:underline"
                  >
                    {c.name}
                    {c.neighborhood ? <span className="text-zinc-500"> · {c.neighborhood}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
