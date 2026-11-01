// Consulta a OpenStreetMap (Overpass) con varios servidores de respaldo, sin esperar a que uno
// falle del todo: se pregunta al primero y, si en `staggerMs` no ha contestado, se pregunta también
// al segundo (y así). Gana el primero que responda bien y el resto se cancelan. Un servidor colgado
// ya no se come el minuto entero que Vercel da a la función (antes salía un 504 sin más detalle).

// Servidores públicos de Overpass, de mayor a menor preferencia. Son gratuitos y a veces van
// saturados (502, 429 o sin respuesta), por eso hay varios.
export const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
]

// Consejo para las consultas: declarar [timeout] y [maxsize] ajustados (30 s y 128 MB, no los
// valores por defecto) hace que un servidor ocupado las acepte antes.

export type OverpassFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>

export function hedgedOverpass(opts: {
  mirrors: string[]
  query: string
  totalMs: number
  staggerMs: number
  errors: string[]
  fetchImpl?: OverpassFetch
}): Promise<any[] | null> {
  const { mirrors, query, totalMs, staggerMs, errors } = opts
  const fetchImpl = opts.fetchImpl ?? (fetch as unknown as OverpassFetch)

  return new Promise((resolve) => {
    const startedAt = Date.now()
    const ctrls: AbortController[] = []
    const timers: ReturnType<typeof setTimeout>[] = []
    let done = false
    let next = 0
    let failed = 0

    const host = (u: string) => {
      try { return new URL(u).host } catch { return u }
    }
    const finish = (value: any[] | null) => {
      if (done) return
      done = true
      timers.forEach(clearTimeout)
      ctrls.forEach((c) => c.abort())
      resolve(value)
    }

    const startNext = () => {
      if (done || next >= mirrors.length) return
      const url = mirrors[next++]
      const ctrl = new AbortController()
      ctrls.push(ctrl)
      // Cada intento muere cuando se acaba el tiempo total, empiece cuando empiece.
      timers.push(setTimeout(() => ctrl.abort(), Math.max(1, totalMs - (Date.now() - startedAt))))
      ;(async () => {
        try {
          const res = await fetchImpl(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "NoctuaApp/1.0 (info@noctuaapp.com)" },
            body: "data=" + encodeURIComponent(query),
            signal: ctrl.signal,
          })
          if (!res.ok) throw new Error(String(res.status))
          const json = await res.json()
          if (json.remark && /runtime error|timed out|out of memory/i.test(String(json.remark))) {
            throw new Error(String(json.remark).slice(0, 120))
          }
          finish(json.elements || [])
        } catch (e: any) {
          if (done) return
          errors.push(`${host(url)}: ${e?.name === "AbortError" ? "tiempo agotado" : e?.message || "error"}`)
          failed++
          if (failed >= mirrors.length) finish(null)
          else startNext() // si uno falla antes de tiempo, se pasa al siguiente sin esperar
        }
      })()
    }

    startNext()
    for (let i = 1; i < mirrors.length; i++) timers.push(setTimeout(startNext, staggerMs * i))
  })
}
