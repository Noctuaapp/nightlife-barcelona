// Utilidad de distancia compartida — Haversine. "distanceInMeters" y "formatDistance" (en
// metros) ya existían y los usa NearbyVenuesSheet.tsx; se mantienen con la misma firma para no
// romper nada que ya dependa de ellas. Lo único añadido aquí es reutilizar esta misma función en
// vez de que cada sitio (ClubsExplorer, EventsExplorer, /essentials, metro/taxi en ClubPageContent)
// tenga su propia copia pegada del cálculo.
export function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

// Minutos andando estimados a ritmo normal (~80 m/min, 4.8 km/h). Se usa en metro/bus
// nocturno/taxi para dar una idea real de "cuánto tardo" y no solo la distancia en metros, que
// a las 4 de la mañana y con ganas de irse a casa es lo que de verdad importa.
export function walkingMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / 80))
}

// Enlace de Google Maps con ruta a pie ya calculada entre dos puntos (no solo un marcador), para
// poder pulsar "cómo llegar andando" a la estación/parada/taxi más cercano sin tener que buscarlo
// a mano.
export function walkingDirectionsUrl(fromLat: number, fromLon: number, toLat: number, toLon: number): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLon}&destination=${toLat},${toLon}&travelmode=walking`
}
