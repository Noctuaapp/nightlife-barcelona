// Ubicación del usuario con más precisión (31/10/2026).
//
// getCurrentPosition devuelve la PRIMERA lectura que tiene el navegador, que muchas veces es la
// más burda (por wifi o por IP: cientos de metros, a veces kilómetros) o una guardada hasta un
// minuto antes (maximumAge). Así el metro «más cercano» salía en el sitio equivocado aunque el
// usuario tuviera la ubicación activada.
//
// Aquí se escucha el GPS unos segundos (watchPosition, sin caché) y se queda la lectura con menor
// margen de error. Termina antes si ya es buena (≤ goodEnoughM), o si lleva settleMs con una
// lectura aceptable (≤ okEnoughM) sin mejorar, o a los maxWaitMs con lo mejor que haya.
// onUpdate avisa de cada mejora, para enseñar algo enseguida y afinar después.

export type PrecisePos = { lat: number; lng: number; accuracy: number }

export type PreciseError = { code: number; message: string } // code como GeolocationPositionError: 1 permiso, 2 sin señal, 3 tiempo; 0 sin soporte

type RawPosition = { coords: { latitude: number; longitude: number; accuracy: number } }
export type PreciseGeo = {
  watchPosition: (ok: (p: RawPosition) => void, err: (e: { code: number; message?: string }) => void, o?: PositionOptions) => number
  clearWatch: (id: number) => void
}

export type PreciseOptions = {
  geo?: PreciseGeo
  goodEnoughM?: number
  okEnoughM?: number
  settleMs?: number
  maxWaitMs?: number
  onUpdate?: (p: PrecisePos) => void
}

export function getPrecisePosition(opts: PreciseOptions = {}): Promise<PrecisePos> {
  const goodEnoughM = opts.goodEnoughM ?? 40
  const okEnoughM = opts.okEnoughM ?? 120
  const settleMs = opts.settleMs ?? 3500
  const maxWaitMs = opts.maxWaitMs ?? 12000
  const geo: PreciseGeo | undefined =
    opts.geo ?? (typeof navigator !== "undefined" ? (navigator.geolocation as unknown as PreciseGeo | undefined) : undefined)

  return new Promise<PrecisePos>((resolve, reject) => {
    if (!geo) {
      reject({ code: 0, message: "unsupported" } satisfies PreciseError)
      return
    }
    let best: PrecisePos | null = null
    let lastError: PreciseError | null = null
    let done = false
    let watchId: number | null = null
    let settleTimer: ReturnType<typeof setTimeout> | null = null
    let maxTimer: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      done = true
      if (watchId !== null) geo.clearWatch(watchId)
      if (settleTimer) clearTimeout(settleTimer)
      if (maxTimer) clearTimeout(maxTimer)
    }
    const finish = () => {
      if (done) return
      cleanup()
      if (best) resolve(best)
      else reject(lastError ?? ({ code: 3, message: "timeout" } satisfies PreciseError))
    }

    maxTimer = setTimeout(finish, maxWaitMs)

    watchId = geo.watchPosition(
      (p) => {
        if (done) return
        const accuracy = Number.isFinite(p.coords.accuracy) ? p.coords.accuracy : 99999
        // Una lectura más imprecisa que la que ya hay no sustituye a la buena, aunque sea más nueva.
        if (best && accuracy >= best.accuracy) return
        best = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy }
        opts.onUpdate?.(best)
        if (best.accuracy <= goodEnoughM) finish()
        else if (best.accuracy <= okEnoughM && !settleTimer) settleTimer = setTimeout(finish, settleMs)
      },
      (e) => {
        if (done) return
        lastError = { code: e.code, message: e.message || "" }
        // Sin permiso no hay nada que esperar; el resto de fallos pueden arreglarse con la siguiente lectura.
        if (e.code === 1) {
          cleanup()
          reject(lastError)
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: maxWaitMs }
    )
    // Si el navegador contestó de forma síncrona (o en pruebas) y ya terminó, se suelta la escucha.
    if (done && watchId !== null) geo.clearWatch(watchId)
  })
}
