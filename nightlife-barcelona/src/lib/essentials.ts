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
