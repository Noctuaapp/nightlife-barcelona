// Rotación de la portada (30/10/2026). «Abierto ahora» enseñaba casi siempre los mismos locales:
// la mezcla de antes solo barajaba los 24 mejor puntuados, así que de noche (cuando abren los
// mejores) salían siempre ellos. Ahora cada local tiene un «número de la suerte» propio y los
// mejor puntuados tienen más probabilidad, no la exclusiva: salen primero con más frecuencia,
// pero cualquier local abierto puede entrar en las 10 primeras posiciones.
//
// Estable durante la visita: la semilla se guarda en la pestaña (sessionStorage) 30 minutos, así
// que al volver atrás o recargar la portada no se reordena todo; en una visita nueva, sí.
// El número de cada local depende solo de la semilla y de su id (no de qué otros locales están
// abiertos), así que cuando uno abre o cierra a mitad de la noche el resto no se mezcla.

const SEED_KEY = "noctua_home_seed"
const SEED_TTL_MS = 30 * 60 * 1000

// Semilla de esta visita. Sin sessionStorage (navegación privada, bloqueado) vale una nueva cada vez.
export function homeSeed(now: number = Date.now()): number {
  try {
    const raw = sessionStorage.getItem(SEED_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as { seed?: number; at?: number }
      if (typeof saved.seed === "number" && typeof saved.at === "number" && now - saved.at < SEED_TTL_MS) return saved.seed
    }
    const seed = Math.floor(Math.random() * 2 ** 31) + 1
    sessionStorage.setItem(SEED_KEY, JSON.stringify({ seed, at: now }))
    return seed
  } catch {
    return Math.floor(Math.random() * 2 ** 31) + 1
  }
}

// Número entre 0 y 1 que depende solo de (semilla, id): mismo par, mismo número.
export function unitFor(seed: number, id: string | number): number {
  let h = seed >>> 0
  const s = String(id)
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 2654435761) >>> 0
  // mulberry32
  h = (h + 0x6d2b79f5) >>> 0
  let t = h
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const u = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return Math.min(Math.max(u, 1e-9), 1 - 1e-9)
}

// Orden al azar con pesos (Efraimidis–Spirakis): a mayor peso, más probable ir delante.
// seed = 0 → sin mezcla (orden de entrada), que es lo que se usa antes de montar la página.
export function weightedOrder<T>(items: T[], opts: { seed: number; id: (item: T) => string | number; weight: (item: T) => number }): T[] {
  if (!opts.seed) return [...items]
  return items
    .map((item) => ({ item, key: Math.pow(unitFor(opts.seed, opts.id(item)), 1 / Math.max(0.0001, opts.weight(item))) }))
    .sort((a, b) => b.key - a.key)
    .map((x) => x.item)
}
