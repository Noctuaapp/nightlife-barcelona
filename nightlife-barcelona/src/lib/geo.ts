// Helpers de geolocalización compartidos. El cálculo de distancia (Haversine) ya vivía
// duplicado dentro de CheckInButton; aquí se centraliza para reutilizarlo en cualquier
// función que necesite "qué tengo cerca" (como la de locales cercanos si te dejan sin entrar).

export function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Formatea metros a algo legible: "180 m" por debajo de 1km, "1.2 km" a partir de ahí.
export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`
  return `${(meters / 1000).toFixed(1)} km`
}
