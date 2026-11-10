// Pedir un taxi desde la pantalla Taxi de Esenciales (11/11/2026): las apps y los teléfonos de radio taxi.
// Antes eran botones pegados en una misma fila; ahora son dos listas separadas (components/essentials/TaxiPanel.tsx).

export type TaxiApp = { id: "uber" | "cabify" | "freenow"; name: string; logo: string }

/** Apps desde las que se pide un coche. Los logos están en public/brands/. */
export const TAXI_APPS: readonly TaxiApp[] = [
  { id: "freenow", name: "FREE NOW", logo: "/brands/freenow.png" },
  { id: "cabify", name: "Cabify", logo: "/brands/cabify.png" },
  { id: "uber", name: "Uber", logo: "/brands/uber.png" },
]

export type TaxiPhone = { name: string; phone: string }

/** Radio taxis de Barcelona (teléfonos sin espacios). Para añadir otro, basta con una línea más aquí. */
export const TAXI_PHONES: readonly TaxiPhone[] = [
  { name: "Radio Taxi 033", phone: "933033033" },
  { name: "Fonotaxi", phone: "933001100" },
]

/** «933033033» → «933 033 033» (nueve cifras, de tres en tres). Cualquier otro formato se deja como está. */
export function formatPhoneEs(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  return digits.length === 9 ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}` : phone
}

/** Enlace para llamar: solo cifras y el «+» inicial. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`
}

/** Uber: su enlace universal abre la app (con tu ubicación como recogida) y, si no está instalada, su web. */
export const UBER_PICKUP_LINK = "https://m.uber.com/ul/?action=setPickup&pickup=my_location"
