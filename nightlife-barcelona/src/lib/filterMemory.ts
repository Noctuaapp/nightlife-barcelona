// Recordar los filtros al volver (01/11/2026). Quien filtra /clubs, abre una ficha y vuelve atrás
// encontraba el listado sin filtrar y tenía que empezar de nuevo. Los filtros se guardan en
// sessionStorage (solo esta pestaña, se borra al cerrarla) con la hora; si pasa demasiado tiempo se
// ignoran. Todo con try/catch: sin almacenamiento (modo privado, bloqueado) la web va igual, solo
// que sin memoria.

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">

export const FILTER_MEMORY_TTL_MS = 2 * 60 * 60 * 1000

type Envelope<T> = { savedAt: number; state: T }

export function saveFilterMemory<T>(storage: StorageLike | null | undefined, key: string, state: T, now: number = Date.now()): void {
  if (!storage) return
  try {
    const envelope: Envelope<T> = { savedAt: now, state }
    storage.setItem(key, JSON.stringify(envelope))
  } catch {
    /* lleno o bloqueado: se sigue sin memoria */
  }
}

export function loadFilterMemory<T>(
  storage: StorageLike | null | undefined,
  key: string,
  now: number = Date.now(),
  maxAgeMs: number = FILTER_MEMORY_TTL_MS
): T | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Envelope<T>> | null
    if (!parsed || typeof parsed !== "object" || typeof parsed.savedAt !== "number" || parsed.state == null) return null
    if (now - parsed.savedAt > maxAgeMs || now < parsed.savedAt) return null
    return parsed.state as T
  } catch {
    return null
  }
}

// De lo guardado, solo los valores que siguen existiendo: un filtro que se retiró de la web, o un
// barrio que ya no tiene locales, no debe volver como filtro fantasma.
export function onlyKnown(values: unknown, allowed: ReadonlySet<string> | readonly string[]): string[] {
  if (!Array.isArray(values)) return []
  const known = allowed instanceof Set ? allowed : new Set(allowed as readonly string[])
  return values.filter((v): v is string => typeof v === "string" && known.has(v))
}
