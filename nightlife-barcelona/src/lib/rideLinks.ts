// Abrir las apps de transporte (Uber, Cabify, FREE NOW) desde la web, en vez de mandar a su página.
//
// - Uber: su enlace universal (m.uber.com/ul) abre la app si está instalada, con el destino ya
//   puesto; si no, la web de Uber.
// - Cabify y FREE NOW no tienen un enlace público fiable con destino. En el móvil se abre su app
//   (Android: "intent" con el paquete; iPhone: su esquema propio) y, si no está instalada, la
//   tienda para descargarla. En el ordenador, su web.

export type RideApp = "uber" | "cabify" | "freenow"
export type Platform = "android" | "ios" | "desktop"

type AppInfo = { scheme: string; host: string; androidPackage: string; iosStore: string; web: string }

const APPS: Record<"cabify" | "freenow", AppInfo> = {
  cabify: {
    scheme: "cabify",
    host: "cabify",
    androidPackage: "com.cabify.rider",
    iosStore: "https://apps.apple.com/es/app/cabify/id476087442",
    web: "https://cabify.com/es",
  },
  freenow: {
    scheme: "freenow",
    host: "",
    androidPackage: "taxi.android.client",
    iosStore: "https://apps.apple.com/es/app/id357852748",
    web: "https://www.free-now.com/es/",
  },
}

export function detectPlatform(userAgent: string, maxTouchPoints = 0): Platform {
  if (/Android/i.test(userAgent)) return "android"
  // iPadOS se presenta como Mac: se distingue por la pantalla táctil.
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)) return "ios"
  return "desktop"
}

export function uberLink(name: string, address?: string | null, lat?: number | null, lng?: number | null): string {
  return lat && lng
    ? `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=${encodeURIComponent(name)}`
    : `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(address || name)}`
}

// Enlace "intent" de Android: abre la app si está instalada; si no, Chrome va a la tienda.
export function androidIntent(app: "cabify" | "freenow"): string {
  const a = APPS[app]
  const store = `https://play.google.com/store/apps/details?id=${a.androidPackage}`
  return `intent://${a.host}#Intent;scheme=${a.scheme};package=${a.androidPackage};S.browser_fallback_url=${encodeURIComponent(store)};end`
}

export function iosScheme(app: "cabify" | "freenow"): string {
  const a = APPS[app]
  return `${a.scheme}://${a.host}`
}

export function webLink(app: "cabify" | "freenow"): string {
  return APPS[app].web
}

// Abre la app en el móvil. En iPhone, si la app no está instalada, Safari no navega: a los
// ~1,5 s se manda a la App Store (si la app se abrió, la página ya está en segundo plano y no
// se hace nada).
export function openRideApp(app: "cabify" | "freenow"): void {
  const platform = detectPlatform(navigator.userAgent, navigator.maxTouchPoints || 0)
  if (platform === "android") {
    window.location.href = androidIntent(app)
    return
  }
  if (platform === "ios") {
    const timer = window.setTimeout(() => {
      if (document.visibilityState === "visible") window.location.href = APPS[app].iosStore
    }, 1500)
    const onHide = () => {
      if (document.visibilityState === "hidden") window.clearTimeout(timer)
    }
    document.addEventListener("visibilitychange", onHide, { once: true })
    window.location.href = iosScheme(app)
    return
  }
  window.open(webLink(app), "_blank", "noopener,noreferrer")
}
