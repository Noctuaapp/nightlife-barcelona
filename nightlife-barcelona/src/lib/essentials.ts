import { isKnownCategory } from "./essentialCategories"

// En la tabla de esenciales hay nombres con avisos metidos dentro ("Cajeros Euronet EVITAR").
// Se separan: el nombre se muestra limpio y el aviso como etiqueta propia ("Comisión alta").
// Los cajeros de Euronet cobran comisiones muy altas a tarjetas extranjeras; se marcan siempre.
const WARNING_IN_NAME = /\s*[-–(]*\s*\b(evitar|avoid)\b\s*[)]*\s*/gi
const HIGH_FEE_ATM = /euronet/i

export type EssentialFlags = { name: string; highFee: boolean }

export function cleanEssential<T extends { name?: string | null; category?: string | null }>(row: T): T & { highFee: boolean } {
  const raw = String(row.name || "")
  const flagged = WARNING_IN_NAME.test(raw)
  WARNING_IN_NAME.lastIndex = 0
  const name = raw.replace(WARNING_IN_NAME, " ").replace(/\s{2,}/g, " ").trim() || raw
  const isAtm = /atm|cajero/i.test(String(row.category || ""))
  return { ...row, name, highFee: flagged || (isAtm && HIGH_FEE_ATM.test(raw)) }
}

// ¿Se enseña esta fila en las listas de Esenciales? (05/11/2026)
//   · La categoría tiene que existir en el catálogo: Hotel (retirado) y Transport ya no salen aunque
//     queden filas en la base.
//   · En Taxi se descartan las oficinas y apps (Uber, Cabify, FREE NOW…) que había de antes: no son un
//     sitio al que ir a buscar un coche. Las paradas y servicios reales sí.
const NOT_A_RANK = /cabify|uber|bolt|free\s?now|oficina|office|headquarter/i
export function isShownEssential(row: { name?: string | null; category?: string | null }): boolean {
  if (!isKnownCategory(row.category)) return false
  if (row.category === "Taxi" && NOT_A_RANK.test(String(row.name || ""))) return false
  return true
}
