// Typographie française: espace insécable avant « : ; ! ? » et à l'intérieur des guillemets « ... ». Les textes
// français (lib/intl/ui/fr.ts, lib/intl/fr/guides.ts) sont écrits avec des espaces normales et passent par ici
// pour qu'une ligne ne se coupe pas juste avant un deux-points. Ne touche pas aux adresses (https://...), car
// l'espace est obligatoire avant le signe.

export const frTypoText = (s: string): string => s.replace(/ ([:;!?»])/g, " $1").replace(/(«) /g, "$1 ")

/** Applique frTypoText à toutes les chaînes d'un objet, d'un tableau ou du résultat d'une fonction. */
export function frTypo<T>(value: T): T {
  if (typeof value === "string") return frTypoText(value) as unknown as T
  if (Array.isArray(value)) return value.map((v) => frTypo(v)) as unknown as T
  if (typeof value === "function") {
    const fn = value as unknown as (...args: unknown[]) => unknown
    return ((...args: unknown[]) => frTypo(fn(...args))) as unknown as T
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = frTypo(v)
    return out as T
  }
  return value
}
