"use client"

import { useEffect, useRef, useState } from "react"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"

// Herramientas de mantenimiento. Antes se lanzaban visitando una URL con la clave de admin
// pegada (?secret=...), que quedaba en el historial y en los registros. Ahora cada botón llama al
// endpoint con tu sesión de admin y el servidor comprueba que eres tú (ver src/lib/adminAuth.ts).

type Tool = {
  key: string
  path: string
  title: string
  description: string
  batch?: boolean // devuelve "remaining": se puede repetir hasta que llegue a 0
  osm?: boolean
}

const TOOLS: Tool[] = [
  {
    key: "refresh-clubs",
    path: "/api/cron/refresh-google-data",
    title: "Actualizar datos de Google (clubs)",
    description: "Fotos, valoración, reseñas y horario de los clubs. Se ejecuta solo cada noche a las 04:00.",
    batch: true,
  },
  {
    key: "refresh-events",
    path: "/api/cron/refresh-events-google-data",
    title: "Actualizar datos de Google (eventos)",
    description: "Lo mismo para festivales y fiestas de barrio. Automático a las 04:30.",
    batch: true,
  },
  {
    key: "refresh-essentials",
    path: "/api/cron/refresh-essentials-google-data",
    title: "Actualizar datos de Google (esenciales)",
    description: "Farmacias, cajeros, comida... Automático a las 06:00.",
    batch: true,
  },
  {
    key: "advance-events",
    path: "/api/cron/advance-past-events",
    title: "Pasar eventos anuales al año siguiente",
    description: "Mueve a la próxima edición los eventos recurrentes que ya han pasado. Automático a las 05:00.",
  },
  {
    key: "assign-place-ids",
    path: "/api/admin/assign-place-ids",
    title: "Asignar ficha de Google a clubs nuevos",
    description: "Busca en Google los clubs que aún no tienen google_place_id (15 por tanda).",
    batch: true,
  },
  {
    key: "geocode",
    path: "/api/admin/geocode-clubs",
    title: "Poner coordenadas a clubs sin ubicación",
    description: "Calcula latitud y longitud a partir de la dirección.",
    batch: true,
  },
  {
    key: "fix-mismatched",
    path: "/api/admin/fix-mismatched-clubs",
    title: "Revisar fichas de Google mal asignadas",
    description: "Detecta clubs enlazados a un sitio de Google equivocado.",
    batch: true,
  },
  {
    key: "import-osm",
    path: "/api/admin/import-osm-clubs",
    title: "Importar locales desde OpenStreetMap",
    description: "Todo entra oculto para revisarlo antes de publicar. Sin marcar «Importar de verdad» solo es una vista previa.",
    osm: true,
  },
]

const MAX_ROUNDS = 40

type ToolResult = { remaining?: number; error?: string; [key: string]: unknown }
type RunState = { running: boolean; rounds: number; result: ToolResult | null; error: string | null }

export default function AdminToolsPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [state, setState] = useState<Record<string, RunState>>({})
  const [osmArea, setOsmArea] = useState("barcelona")
  const [osmReal, setOsmReal] = useState(false)
  const stopRef = useRef<Record<string, boolean>>({})

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user.email !== "info@noctuaapp.com") {
        window.location.href = "/login"
        return
      }
      setCheckingAdmin(false)
    })
  }, [])

  const EMPTY: RunState = { running: false, rounds: 0, result: null, error: null }
  const update = (key: string, patch: Partial<RunState>) =>
    setState((s) => ({ ...s, [key]: { ...EMPTY, ...s[key], ...patch } }))

  const callOnce = async (tool: Tool): Promise<ToolResult> => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error("Sesión caducada: vuelve a iniciar sesión.")
    const url = tool.osm ? `${tool.path}?area=${osmArea}${osmReal ? "&dry=0" : ""}` : tool.path
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const json: ToolResult = await res.json().catch(() => ({ error: `Respuesta no válida (${res.status})` }))
    if (!res.ok) throw new Error(json?.error || `Error ${res.status}`)
    return json
  }

  const run = async (tool: Tool, repeat: boolean) => {
    stopRef.current[tool.key] = false
    update(tool.key, { running: true, rounds: 0, error: null, result: null })
    try {
      let rounds = 0
      let json: ToolResult | null = null
      do {
        json = await callOnce(tool)
        rounds++
        update(tool.key, { rounds, result: json })
      } while (
        repeat &&
        rounds < MAX_ROUNDS &&
        !stopRef.current[tool.key] &&
        typeof json?.remaining === "number" &&
        json.remaining > 0
      )
      update(tool.key, { running: false })
    } catch (e) {
      update(tool.key, { running: false, error: e instanceof Error ? e.message : "Error desconocido" })
    }
  }

  if (checkingAdmin) {
    return (
      <AdminShell title="Herramientas">
        <p className="text-sm text-zinc-500">Comprobando acceso…</p>
      </AdminShell>
    )
  }

  return (
    <AdminShell
      title="Herramientas"
      subtitle="Tareas de mantenimiento de datos. Las automáticas ya se ejecutan solas cada noche: aquí puedes lanzarlas a mano."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {TOOLS.map((tool) => {
          const st = state[tool.key]
          const remaining = typeof st?.result?.remaining === "number" ? st.result.remaining : null
          return (
            <div key={tool.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-base font-black">{tool.title}</h2>
              <p className="mt-1 text-sm text-zinc-400">{tool.description}</p>

              {tool.osm && (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <select
                    value={osmArea}
                    onChange={(e) => setOsmArea(e.target.value)}
                    className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
                  >
                    <option value="barcelona">Barcelona</option>
                    <option value="hospitalet">L&apos;Hospitalet</option>
                    <option value="badalona">Badalona</option>
                    <option value="elprat">El Prat</option>
                  </select>
                  <label className="flex items-center gap-2 text-zinc-300">
                    <input type="checkbox" checked={osmReal} onChange={(e) => setOsmReal(e.target.checked)} />
                    Importar de verdad
                  </label>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => run(tool, false)}
                  disabled={st?.running}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50"
                >
                  {st?.running ? "Ejecutando…" : "Ejecutar"}
                </button>
                {tool.batch && (
                  <button
                    onClick={() => run(tool, true)}
                    disabled={st?.running}
                    className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
                  >
                    Repetir hasta terminar
                  </button>
                )}
                {st?.running && tool.batch && (
                  <button
                    onClick={() => (stopRef.current[tool.key] = true)}
                    className="rounded-xl border border-red-400/30 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/10"
                  >
                    Parar
                  </button>
                )}
              </div>

              {(st?.rounds || 0) > 0 && (
                <p className="mt-3 text-xs text-zinc-400">
                  {st!.rounds} {st!.rounds === 1 ? "tanda" : "tandas"}
                  {remaining !== null ? ` · quedan ${remaining}` : ""}
                  {!st!.running && remaining === 0 ? " · terminado" : ""}
                </p>
              )}
              {st?.error && <p className="mt-3 text-sm text-red-400">{st.error}</p>}
              {st?.result && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-zinc-500">Ver respuesta</summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-black/50 p-3 text-[11px] leading-relaxed text-zinc-300">
                    {JSON.stringify(st.result, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )
        })}
      </div>
    </AdminShell>
  )
}
