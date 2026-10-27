// Service worker mínimo de Noctua (27/10/2026). No guarda nada en caché ni cambia cómo carga la web:
// solo existe porque Chrome (Android) exige tener uno con un manejador "fetch" para ofrecer
// «Instalar app»; sin él, el botón de instalar de Noctua nunca llegaba a aparecer en Android.
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))
// Sin respondWith: cada petición sigue su camino normal por la red, como si no hubiera service worker.
self.addEventListener("fetch", () => {})
