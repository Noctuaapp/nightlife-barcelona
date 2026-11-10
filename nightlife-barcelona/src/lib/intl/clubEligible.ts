import { dressCodeOf } from "../dressCode"

// ¿Tiene este local datos suficientes para una página propia en inglés que merezca indexarse? (10/11/2026)
//
// Muchos locales importados de OpenStreetMap solo traen nombre y dirección. En español Google ya los rastrea
// sin indexarlos ("Rastreada: actualmente sin indexar") porque casi todas esas fichas son iguales. En inglés
// no se repite el problema: solo los locales con al menos 4 datos propios (horario, entrada, música,
// vestimenta, edad, valoración, foto) entran en el sitemap y en el par hreflang con la ficha española.
// Los demás siguen teniendo su página /en/clubs/... (se puede abrir), pero con noindex.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function englishClubEligible(c: Record<string, any>): boolean {
  const has = (v: unknown) => typeof v === "string" && v.trim().length > 0
  let n = 0
  if (has(c.hours)) n++
  if (has(c.price)) n++
  if (has(c.music)) n++
  if (dressCodeOf(c)) n++
  if (c.age_min || c.min_age) n++
  if (Number(c.google_rating || c.rating || 0) >= 1) n++
  if (has(c.image)) n++
  return n >= 4
}
