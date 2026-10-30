"use client"

import { useEffect, useRef, useState } from "react"
import AdminShell from "../../../components/admin/AdminShell"
import { DataExport, SystemStatus } from "../../../components/admin/SystemStatus"
import { supabase } from "../../../lib/supabase"
import { ADMIN_EMAIL } from "../../../lib/admin"
import { SEASONAL_THEMES, type SeasonalOverride } from "../../../lib/nocSeasonal"

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
  nitbus?: boolean // vista previa / importar de verdad, sin zona
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
  {
    key: "import-nitbus",
    path: "/api/admin/import-nitbus-stops",
    title: "Cargar paradas de Nitbus (OpenStreetMap)",
    description: "Todas las paradas de las líneas N con sus líneas, para el mapa de Nitbus y las fichas de club. Reemplaza las que se cargaron antes desde aquí (las tuyas a mano no se tocan). Sin marcar «Importar de verdad» solo es una vista previa.",
    nitbus: true,
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
  const [nitbusReal, setNitbusReal] = useState(false)
  const stopRef = useRef<Record<string, boolean>>({})

  // Interruptor de Club Noctua (pedido el 23/10/2026): mientras está en false, nadie gana XP por
  // check-in/racha/login/misiones (solo invitar amigos sigue dando algo) y nadie salvo tú ve
  // misiones, insignias ni la lista de niveles en /club-noctua. Ver supabase/18_pausar_club_noctua.sql.
  const [noctuaEnabled, setNoctuaEnabled] = useState<boolean | null>(null)
  const [savingToggle, setSavingToggle] = useState(false)

  // Temporada de Noc (pedido el 23/10/2026): "auto" es el valor normal, de verdad — Noc decide
  // por la fecha sin que haga falta tocar nada aquí. Esto es solo para forzar una temporada antes
  // de que llegue (probarla) o apagarlas todas, sin esperar al calendario. Ver
  // supabase/20_noc_estacional.sql y src/lib/nocSeasonal.ts.
  const [nocMode, setNocMode] = useState<SeasonalOverride | null>(null)
  const [savingNocMode, setSavingNocMode] = useState(false)

  // Modo mantenimiento: antes era lo primero del Resumen (el botón más peligroso del admin en el
  // sitio más visible). Ahora vive aquí, con los otros interruptores de la web.
  const [maintenance, setMaintenance] = useState<boolean | null>(null)
  const [savingMaintenance, setSavingMaintenance] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user.email !== ADMIN_EMAIL) {
        window.location.href = "/login"
        return
      }
      setCheckingAdmin(false)
    })
  }, [])

  useEffect(() => {
    if (checkingAdmin) return
    supabase
      .from("club_noctua_settings")
      .select("enabled")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => setNoctuaEnabled(data?.enabled === true))
    supabase
      .from("noc_seasonal_settings")
      .select("mode")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => setNocMode(((data?.mode as SeasonalOverride) || "auto")))
    supabase
      .from("app_settings")
      .select("maintenance_mode")
      .eq("id", true)
      .maybeSingle()
      .then(({ data }) => setMaintenance(!!data?.maintenance_mode))
  }, [checkingAdmin])

  const toggleMaintenance = async () => {
    if (maintenance === null) return
    const next = !maintenance
    if (next && !window.confirm("¿Activar el modo mantenimiento? Nadie excepto tú podrá usar la web hasta que lo desactives.")) return
    setSavingMaintenance(true)
    const { error } = await supabase.from("app_settings").update({ maintenance_mode: next }).eq("id", true)
    setSavingMaintenance(false)
    if (error) {
      window.alert("No se pudo cambiar el modo mantenimiento: " + error.message)
      return
    }
    setMaintenance(next)
  }

  const toggleClubNoctua = async () => {
    if (noctuaEnabled === null) return
    setSavingToggle(true)
    const next = !noctuaEnabled
    const { error } = await supabase
      .from("club_noctua_settings")
      .update({ enabled: next, updated_at: new Date().toISOString() })
      .eq("id", 1)
    setSavingToggle(false)
    if (error) {
      window.alert("No se pudo cambiar: " + error.message)
      return
    }
    setNoctuaEnabled(next)
  }

  const changeNocMode = async (next: SeasonalOverride) => {
    setSavingNocMode(true)
    const { error } = await supabase
      .from("noc_seasonal_settings")
      .update({ mode: next, updated_at: new Date().toISOString() })
      .eq("id", 1)
    setSavingNocMode(false)
    if (error) {
      window.alert("No se pudo cambiar: " + error.message)
      return
    }
    setNocMode(next)
  }

  const EMPTY: RunState = { running: false, rounds: 0, result: null, error: null }
  const update = (key: string, patch: Partial<RunState>) =>
    setState((s) => ({ ...s, [key]: { ...EMPTY, ...s[key], ...patch } }))

  const callOnce = async (tool: Tool): Promise<ToolResult> => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error("Sesión caducada: vuelve a iniciar sesión.")
    const url = tool.osm
      ? `${tool.path}?area=${osmArea}${osmReal ? "&dry=0" : ""}`
      : tool.nitbus
      ? `${tool.path}${nitbusReal ? "?dry=0" : ""}`
      : tool.path
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
      <AdminShell title="Ajustes y herramientas">
        <p className="text-sm text-zinc-400">Comprobando acceso…</p>
      </AdminShell>
    )
  }

  return (
    <AdminShell
      title="Ajustes y herramientas"
      subtitle="Los interruptores de la web y las tareas de mantenimiento de datos (las automáticas ya se ejecutan solas cada noche; aquí puedes lanzarlas a mano)."
    >
      <SystemStatus />

      <div className={`mb-6 rounded-2xl border p-5 ${maintenance ? "border-red-500/40 bg-red-500/[0.07]" : "border-white/10 bg-white/[0.03]"}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black">Modo mantenimiento</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {maintenance
                ? "Activo: la web está cerrada para todos menos para ti."
                : "Apagado: la web funciona con normalidad para todo el mundo."}
            </p>
          </div>
          <button
            onClick={toggleMaintenance}
            disabled={maintenance === null || savingMaintenance}
            className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
              maintenance ? "bg-white text-black hover:bg-zinc-200" : "border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
            }`}
          >
            {maintenance === null ? "Cargando…" : savingMaintenance ? "Guardando…" : maintenance ? "Desactivar" : "Activar mantenimiento"}
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-purple-500/30 bg-purple-500/[0.06] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black">Club Noctua</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {noctuaEnabled
                ? "Activo: todo el mundo gana XP y ve misiones, insignias y niveles."
                : "En pausa: solo se gana XP invitando amigos. Nadie ve misiones, insignias ni niveles salvo tú."}
            </p>
          </div>
          <button
            onClick={toggleClubNoctua}
            disabled={noctuaEnabled === null || savingToggle}
            className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
              noctuaEnabled ? "bg-white text-black hover:bg-zinc-200" : "bg-purple-500 text-white hover:bg-purple-400"
            }`}
          >
            {noctuaEnabled === null ? "Cargando…" : savingToggle ? "Guardando…" : noctuaEnabled ? "Pausar" : "Activar"}
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-purple-500/30 bg-purple-500/[0.06] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black">Temporada de Noc</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {nocMode === "auto" || nocMode === null
                ? "Automático: Noc se pone el accesorio que toque según la fecha, sin tocar nada."
                : nocMode === "none"
                ? "Apagado: Noc se ve siempre normal, sin accesorios de temporada."
                : `Forzado a mano: ${SEASONAL_THEMES.find((s) => s.key === nocMode)?.label || nocMode}, aunque no sea la fecha.`}
            </p>
          </div>
          <select
            value={nocMode ?? "auto"}
            disabled={nocMode === null || savingNocMode}
            onChange={(e) => changeNocMode(e.target.value as SeasonalOverride)}
            className="shrink-0 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm font-semibold text-white outline-none disabled:opacity-50"
            style={{ colorScheme: "dark" }}
          >
            <option value="auto">🗓️ Automático (según la fecha)</option>
            <option value="none">🙈 Ninguno (Noc normal)</option>
            {SEASONAL_THEMES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label} — {s.dateHint}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

              {tool.nitbus && (
                <label className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
                  <input type="checkbox" checked={nitbusReal} onChange={(e) => setNitbusReal(e.target.checked)} />
                  Importar de verdad
                </label>
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
                  <summary className="cursor-pointer text-xs font-semibold text-zinc-400">Ver respuesta</summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-black/50 p-3 text-xs leading-relaxed text-zinc-300">
                    {JSON.stringify(st.result, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )
        })}
      </div>

      <DataExport />
    </AdminShell>
  )
}
