// Coordenadas que se escriben a mano en el admin (clubs, eventos, esenciales).

export type LatLng = { lat: number; lng: number }

function valid(lat: number, lng: number): LatLng | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat: round(lat), lng: round(lng) }
}

// 6 decimales ≈ 10 cm: más precisión no aporta nada y ensucia la base de datos.
function round(n: number): number {
  return Math.round(n * 1e6) / 1e6
}

function dms(deg: string, min: string, sec: string, hemi: string): number {
  const v = Number(deg) + Number(min) / 60 + Number(sec) / 3600
  return /[SWO]/i.test(hemi) ? -v : v
}

// Entiende lo que se suele copiar de Google Maps:
//   "41.3851, 2.1734"                                  (mantener pulsado / clic derecho)
//   "41°23'06.4\"N 2°10'24.2\"E"                       (ficha del sitio)
//   https://www.google.com/maps/place/…/@41.3851,2.1734,17z/…!3d41.3852!4d2.1735
//   https://maps.google.com/?q=41.3851,2.1734
// Los enlaces cortos (maps.app.goo.gl/…) no llevan coordenadas: devuelve null.
export function parseCoords(input: string): LatLng | null {
  const s = (input || "").trim()
  if (!s) return null

  // Pin exacto del sitio (más fiable que el centro de la vista "@…").
  let m = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  if (m) return valid(Number(m[1]), Number(m[2]))

  m = s.match(/[?&](?:q|query|ll|destination|center)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i)
  if (m) return valid(Number(m[1]), Number(m[2]))

  m = s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (m) return valid(Number(m[1]), Number(m[2]))

  m = s.match(/(\d+)°\s*(\d+)['′]\s*([\d.]+)["″]?\s*([NS])[\s,]+(\d+)°\s*(\d+)['′]\s*([\d.]+)["″]?\s*([EWO])/i)
  if (m) return valid(dms(m[1], m[2], m[3], m[4]), dms(m[5], m[6], m[7], m[8]))

  // Dos números decimales seguidos (separados por coma, punto y coma o espacio).
  m = s.match(/^\(?\s*(-?\d{1,2}\.\d+)\s*[,;\s]\s*(-?\d{1,3}\.\d+)\s*\)?$/)
  if (m) return valid(Number(m[1]), Number(m[2]))

  return null
}

// Un número suelto escrito en el campo de latitud o longitud ("41,3851" con coma también vale).
export function parseCoordNumber(value: string): number | null {
  const v = (value || "").trim().replace(",", ".")
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Zona en la que trabaja Noctua (Cataluña con margen). Fuera de aquí casi seguro es un error:
// latitud y longitud cambiadas de sitio, un signo menos, o un sitio con el mismo nombre en otra
// ciudad.
export function isInServiceArea({ lat, lng }: LatLng): boolean {
  return lat > 40.4 && lat < 42.95 && lng > 0.1 && lng < 3.4
}

export function googleMapsUrl({ lat, lng }: LatLng): string {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

// Para guardar: números o null (campo vacío o mal escrito → sin coordenadas).
export function coordsPayload(latitude: string, longitude: string): { latitude: number | null; longitude: number | null } {
  const lat = parseCoordNumber(latitude)
  const lng = parseCoordNumber(longitude)
  if (lat == null || lng == null) return { latitude: null, longitude: null }
  return { latitude: lat, longitude: lng }
}

// Para mostrar en el formulario un valor guardado sin ruido de decimales (41.382000000000005).
export function coordToInput(n: number | string | null | undefined): string {
  if (n == null || n === "") return ""
  const v = Number(n)
  return Number.isFinite(v) ? String(round(v)) : ""
}
