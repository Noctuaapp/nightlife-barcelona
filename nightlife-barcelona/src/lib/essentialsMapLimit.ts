// Cuántos esenciales se dibujan a la vez en el mapa (06/11/2026).
//
// Antes, al abrir «Esenciales» en el mapa se dibujaba TODO de golpe (Nitbus 2.000+, Bicing 500+, aseos,
// parkings…): una nube de burbujas que tapaba el mapa, y miles de marcadores del navegador a la vez.
//   · Sin categoría elegida: solo los PER_CATEGORY más cercanos al centro del mapa de cada categoría
//     (una muestra repartida, no un muro).
//   · Con categoría elegida: esa categoría entera, hasta CATEGORY_CAP, también los más cercanos al centro.

export const PER_CATEGORY = 4
export const CATEGORY_CAP = 250

type Located = { category: string; latitude: number | null; longitude: number | null }

function dist2(lat: number, lng: number, refLat: number, refLng: number): number {
  const dLat = lat - refLat
  const dLng = (lng - refLng) * Math.cos((refLat * Math.PI) / 180)
  return dLat * dLat + dLng * dLng
}

export function limitEssentialsForMap<T extends Located>(
  items: T[],
  opts: { category: string; center: { lat: number; lng: number } },
): T[] {
  const { category, center } = opts
  const withDist = items
    .filter((i) => i.latitude != null && i.longitude != null && (!category || i.category === category))
    .map((i) => ({ i, d: dist2(Number(i.latitude), Number(i.longitude), center.lat, center.lng) }))
    .sort((a, b) => a.d - b.d)

  if (category) return withDist.slice(0, CATEGORY_CAP).map((x) => x.i)

  const taken = new Map<string, number>()
  const out: T[] = []
  for (const { i } of withDist) {
    const n = taken.get(i.category) || 0
    if (n >= PER_CATEGORY) continue
    taken.set(i.category, n + 1)
    out.push(i)
  }
  return out
}
