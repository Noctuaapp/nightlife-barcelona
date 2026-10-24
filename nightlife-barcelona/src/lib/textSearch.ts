// Búsqueda de texto tolerante: sin distinguir mayúsculas ni acentos ("gracia" encuentra
// "Gràcia", "razz" encuentra "Razzmatazz"). Antes cada buscador comparaba con toLowerCase() a
// secas, así que bastaba un acento para no encontrar nada.
export function normalizeText(text: string | null | undefined): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

// Todas las palabras de la búsqueda tienen que aparecer en alguno de los campos
// ("techno gracia" encuentra un club de techno en Gràcia).
export function matchesQuery(query: string, fields: (string | null | undefined)[]): boolean {
  const q = normalizeText(query)
  if (!q) return true
  const haystack = normalizeText(fields.filter(Boolean).join(" "))
  return q.split(" ").every((word) => haystack.includes(word))
}

// Puntuación para ordenar sugerencias: primero los que EMPIEZAN por lo escrito en el nombre,
// luego los que lo contienen en el nombre, luego el resto (barrio, música...).
export function matchScore(query: string, name: string | null | undefined): number {
  const q = normalizeText(query)
  const n = normalizeText(name)
  if (!q) return 0
  if (n.startsWith(q)) return 3
  if (n.split(" ").some((w) => w.startsWith(q))) return 2
  if (n.includes(q)) return 1
  return 0
}
