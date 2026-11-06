"use client"

import { useEffect, useRef, useState } from "react"
import AdminShell from "../../../components/admin/AdminShell"
import { DataExport, SystemStatus } from "../../../components/admin/SystemStatus"
import { supabase } from "../../../lib/supabase"
import { ADMIN_EMAIL } from "../../../lib/admin"
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, Panel, SectionTitle } from "../../../components/admin/ui"
import { Bus, CalendarClock, CloudDownload, MapPin, Moon, PartyPopper, Power, RefreshCw, Search, ShieldAlert, ShoppingBasket, Wrench, type LucideIcon } from "lucide-react"
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
  osmEssentials?: boolean // zona + categoría + vista previa / importar de verdad
  googleEssentials?: boolean // igual, pero con Google Places (cuesta llamadas de pago)
  nitbus?: boolean // vista previa / importar de verdad, sin zona
}

const TOOL_ICONS: Record<string, LucideIcon> = {
  "refresh-clubs": RefreshCw,
  "refresh-events": RefreshCw,
  "refresh-essentials": RefreshCw,
  "advance-events": CalendarClock,
  "assign-place-ids": Search,
  geocode: MapPin,
  "fix-mismatched": ShieldAlert,
  "import-osm": CloudDownload,
  "import-osm-essentials": ShoppingBasket,
  "import-google-essentials": ShoppingBasket,
  "import-nitbus": Bus,
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
    key: "import-osm-essentials",
    path: "/api/admin/import-osm-essentials",
    title: "Importar esenciales desde OpenStreetMap",
    description: "Farmacias, cajeros, comida, supermercados, gasolineras y hospitales abiertos las 24 h o hasta la 1:00 o más tarde. Y, de una en una: paradas de taxi, veterinarios de urgencias, aseos, máquinas expendedoras, consignas, comisarías y estaciones de Bicing (sin bicis libres en directo). Todo entra oculto y «sin confirmar» para revisarlo en Esenciales antes de publicar. Necesita el SQL 82. En Barcelona elige una categoría cada vez. Sin marcar «Importar de verdad» solo es una vista previa.",
    osmEssentials: true,
  },
  {
    key: "import-google-essentials",
    path: "/api/admin/import-google-essentials",
    title: "Importar esenciales de noche desde Google",
    description: "Supermercados, comida, gasolineras y farmacias abiertos las 24 h o hasta la 1:00 o más tarde, con el horario que da Google (OpenStreetMap y Overture no lo traen). Todo entra oculto para revisarlo en Esenciales. OJO: gasta llamadas de pago de Google (unas 6–14 por municipio para súper + comida; 35 $ cada 1.000, con 1.000 gratis al mes) y respeta el tope diario GOOGLE_PLACES_DAILY_LIMIT, que está en 20: para usarla hay que subirlo en Vercel. La vista previa también gasta llamadas: si te fías, marca «Importar de verdad» directamente.",
    googleEssentials: true,
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
  const [essArea, setEssArea] = useState("badalona")
  const [essCat, setEssCat] = useState("all")
  const [essReal, setEssReal] = useState(false)
  const [allNewRunning, setAllNewRunning] = useState(false)
  const [allNewLog, setAllNewLog] = useState<string[]>([])
  const [gArea, setGArea] = useState("badalona")
  const [gCat, setGCat] = useState("supermarket,food")
  const [gReal, setGReal] = useState(false)
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
      : tool.osmEssentials
      ? `${tool.path}?area=${essArea}&cat=${essCat}${essReal ? "&dry=0" : ""}`
      : tool.googleEssentials
      ? `${tool.path}?area=${gArea}&cat=${gCat}${gReal ? "&dry=0" : ""}`
      : tool.nitbus
      ? `${tool.path}${nitbusReal ? "?dry=0" : ""}`
      : tool.path
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const json: ToolResult = await res.json().catch(() => ({ error: `Respuesta no válida (${res.status})` }))
    if (!res.ok) throw new Error(json?.error || `Error ${res.status}`)
    return json
  }

  // «Importar lo que falta» (06/11/2026): las categorías nuevas, una detrás de otra, en todas las áreas. Es lo mismo que
  // elegir cada área y categoría a mano e «Importar de verdad», pero sin tener que hacerlo 70 veces. Es seguro repetirlo:
  // el importador se salta lo que ya existe, y todo entra OCULTO para que lo revises y lo publiques.
  const NEW_ESS_CATS: [string, string][] = [
    ["taxi", "Paradas de taxi"],
    ["veterinary", "Veterinarios de urgencias"],
    ["toilets", "Aseos públicos"],
    ["vending", "Máquinas expendedoras"],
    ["luggage", "Consignas"],
    ["police", "Comisarías y policía"],
    ["bicing", "Estaciones de Bicing"],
  ]
  const ESS_AREAS: [string, string][] = [
    ["barcelona", "Barcelona"],
    ["hospitalet", "L'Hospitalet"],
    ["badalona", "Badalona"],
    ["elprat", "El Prat"],
    ["santacoloma", "Santa Coloma"],
    ["cornella", "Cornellà"],
    ["santadria", "Sant Adrià"],
    ["esplugues", "Esplugues"],
    ["santfeliu", "Sant Feliu"],
    ["santboi", "Sant Boi"],
  ]
  const runAllNewEssentials = async () => {
    if (!window.confirm("Se importarán las 7 categorías nuevas en las 10 áreas, una detrás de otra (unos minutos). Todo entra oculto. ¿Seguir?")) return
    stopRef.current["all-new-ess"] = false
    setAllNewRunning(true)
    setAllNewLog([])
    const log = (line: string) => setAllNewLog((l) => [...l, line])
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    try {
      for (const [cat, catName] of NEW_ESS_CATS) {
        for (const [area, areaName] of ESS_AREAS) {
          if (stopRef.current["all-new-ess"]) { log("Parado."); return }
          let done = false
          for (let attempt = 1; attempt <= 2 && !done; attempt++) {
            try {
              const { data } = await supabase.auth.getSession()
              const token = data.session?.access_token
              if (!token) throw new Error("Sesión caducada: vuelve a iniciar sesión.")
              const res = await fetch(`/api/admin/import-osm-essentials?area=${area}&cat=${cat}&dry=0`, { headers: { Authorization: `Bearer ${token}` } })
              const json = await res.json().catch(() => ({ error: `Respuesta no válida (${res.status})` }))
              if (!res.ok) throw new Error(json?.error || `Error ${res.status}`)
              log(`✓ ${catName} · ${areaName}: ${json.insertados ?? 0} nuevos`)
              done = true
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Error"
              if (attempt === 2 || /Sesión caducada/.test(msg)) { log(`✗ ${catName} · ${areaName}: ${msg}`); done = true }
              else await sleep(8000) // Overpass a veces responde «ocupado»: se reintenta una vez
            }
          }
          await sleep(1500) // sin ir a toda prisa contra Overpass
        }
      }
      log("Terminado. Revisa y publica en Admin › Esenciales.")
    } finally {
      setAllNewRunning(false)
    }
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

      <Panel accent="coral" className={`mb-6 ${maintenance ? "ring-1 ring-inset ring-red-500/50" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <SectionTitle icon={Power} accent={maintenance ? "pink" : "coral"}>Modo mantenimiento</SectionTitle>
            <p className="mt-3 text-sm text-zinc-400">
              {maintenance
                ? "Activo: la web está cerrada para todos menos para ti."
                : "Apagado: la web funciona con normalidad para todo el mundo."}
            </p>
          </div>
          <button
            onClick={toggleMaintenance}
            disabled={maintenance === null || savingMaintenance}
            className={`shrink-0 ${maintenance ? BTN_PRIMARY : BTN_DANGER}`}
          >
            {maintenance === null ? "Cargando…" : savingMaintenance ? "Guardando…" : maintenance ? "Desactivar" : "Activar mantenimiento"}
          </button>
        </div>
      </Panel>

      <Panel accent="violet" className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <SectionTitle icon={PartyPopper} accent="violet">Club Noctua</SectionTitle>
            <p className="mt-3 text-sm text-zinc-400">
              {noctuaEnabled
                ? "Activo: todo el mundo gana XP y ve misiones, insignias y niveles."
                : "En pausa: solo se gana XP invitando amigos. Nadie ve misiones, insignias ni niveles salvo tú."}
            </p>
          </div>
          <button
            onClick={toggleClubNoctua}
            disabled={noctuaEnabled === null || savingToggle}
            className={`shrink-0 ${noctuaEnabled ? BTN_GHOST : "rounded-ctl bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-strong disabled:opacity-50"}`}
          >
            {noctuaEnabled === null ? "Cargando…" : savingToggle ? "Guardando…" : noctuaEnabled ? "Pausar" : "Activar"}
          </button>
        </div>
      </Panel>

      <Panel accent="pink" className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <SectionTitle icon={Moon} accent="pink">Temporada de Noc</SectionTitle>
            <p className="mt-3 text-sm text-zinc-400">
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
            className="w-full max-w-full rounded-ctl border border-white/10 bg-night/70 px-4 py-2.5 text-sm font-semibold text-white outline-none transition focus:border-brand/60 disabled:opacity-50 sm:w-auto"
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
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {TOOLS.map((tool) => {
          const st = state[tool.key]
          const remaining = typeof st?.result?.remaining === "number" ? st.result.remaining : null
          return (
            <Panel key={tool.key} accent={tool.key.startsWith("import") ? "cyan" : "violet"} className="min-w-0" glow={false}>
              <SectionTitle icon={TOOL_ICONS[tool.key] ?? Wrench}>{tool.title}</SectionTitle>
              <p className="mt-3 text-sm text-zinc-400">{tool.description}</p>

              {tool.osm && (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <select
                    value={osmArea}
                    onChange={(e) => setOsmArea(e.target.value)}
                    className="max-w-full rounded-ctl border border-white/10 bg-night/70 px-3 py-2 text-white outline-none transition focus:border-brand/60"
                  >
                    <option value="barcelona">Barcelona</option>
                    <option value="hospitalet">L&apos;Hospitalet</option>
                    <option value="badalona">Badalona</option>
                    <option value="elprat">El Prat</option>
                    <option value="santacoloma">Santa Coloma de Gramenet</option>
                    <option value="cornella">Cornellà de Llobregat</option>
                    <option value="santadria">Sant Adrià de Besòs</option>
                    <option value="esplugues">Esplugues de Llobregat</option>
                    <option value="santfeliu">Sant Feliu de Llobregat</option>
                    <option value="santboi">Sant Boi de Llobregat</option>
                  </select>
                  <label className="flex items-center gap-2 text-zinc-300">
                    <input type="checkbox" checked={osmReal} onChange={(e) => setOsmReal(e.target.checked)} />
                    Importar de verdad
                  </label>
                </div>
              )}

              {tool.osmEssentials && (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <select
                    value={essArea}
                    onChange={(e) => setEssArea(e.target.value)}
                    className="max-w-full rounded-ctl border border-white/10 bg-night/70 px-3 py-2 text-white outline-none transition focus:border-brand/60"
                  >
                    <option value="barcelona">Barcelona</option>
                    <option value="hospitalet">L&apos;Hospitalet</option>
                    <option value="badalona">Badalona</option>
                    <option value="elprat">El Prat</option>
                    <option value="santacoloma">Santa Coloma de Gramenet</option>
                    <option value="cornella">Cornellà de Llobregat</option>
                    <option value="santadria">Sant Adrià de Besòs</option>
                    <option value="esplugues">Esplugues de Llobregat</option>
                    <option value="santfeliu">Sant Feliu de Llobregat</option>
                    <option value="santboi">Sant Boi de Llobregat</option>
                  </select>
                  <select
                    value={essCat}
                    onChange={(e) => setEssCat(e.target.value)}
                    className="max-w-full rounded-ctl border border-white/10 bg-night/70 px-3 py-2 text-white outline-none transition focus:border-brand/60"
                  >
                    <option value="all">Todas las categorías</option>
                    <option value="pharmacy">Farmacias</option>
                    <option value="atm">Cajeros</option>
                    <option value="food">Comida</option>
                    <option value="supermarket">Supermercados</option>
                    <option value="gas">Gasolineras</option>
                    <option value="hospital">Hospitales</option>
                    <option value="parking">Parkings gratuitos (aparte, no entra en «Todas»)</option>
                    <optgroup label="Nuevas (de una en una, no entran en «Todas»)">
                      <option value="taxi">Paradas de taxi</option>
                      <option value="veterinary">Veterinarios de urgencias</option>
                      <option value="toilets">Aseos públicos</option>
                      <option value="vending">Máquinas expendedoras</option>
                      <option value="luggage">Consignas</option>
                      <option value="police">Comisarías y policía</option>
                      <option value="bicing">Estaciones de Bicing</option>
                    </optgroup>
                  </select>
                  <label className="flex items-center gap-2 text-zinc-300">
                    <input type="checkbox" checked={essReal} onChange={(e) => setEssReal(e.target.checked)} />
                    Importar de verdad
                  </label>
                </div>
              )}

              {tool.osmEssentials && (
                <div className="mt-4 rounded-ctl border border-white/10 bg-night/60 p-4">
                  <p className="text-sm font-semibold text-white">Importar lo que falta</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                    Las 7 categorías nuevas (taxi, veterinarios, aseos, máquinas, consignas, policía y Bicing) en las 10 áreas, una detrás de
                    otra. Se salta lo que ya está importado y todo entra oculto.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={runAllNewEssentials}
                      disabled={allNewRunning}
                      className={BTN_PRIMARY}
                    >
                      {allNewRunning ? "Importando…" : "Importar lo que falta"}
                    </button>
                    {allNewRunning && (
                      <button
                        onClick={() => (stopRef.current["all-new-ess"] = true)}
                        className={BTN_GHOST}
                      >
                        Parar
                      </button>
                    )}
                  </div>
                  {allNewLog.length > 0 && (
                    <ul className="mt-3 max-h-56 overflow-auto rounded-ctl bg-black/50 p-3 text-xs leading-relaxed text-zinc-300">
                      {allNewLog.map((l, i) => (
                        <li key={i} className={l.startsWith("✗") ? "text-red-300" : ""}>{l}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {tool.googleEssentials && (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <select
                    value={gArea}
                    onChange={(e) => setGArea(e.target.value)}
                    className="max-w-full rounded-ctl border border-white/10 bg-night/70 px-3 py-2 text-white outline-none transition focus:border-brand/60"
                  >
                    <option value="hospitalet">L&apos;Hospitalet</option>
                    <option value="badalona">Badalona</option>
                    <option value="elprat">El Prat</option>
                    <option value="santacoloma">Santa Coloma de Gramenet</option>
                    <option value="cornella">Cornellà de Llobregat</option>
                    <option value="santadria">Sant Adrià de Besòs</option>
                    <option value="esplugues">Esplugues de Llobregat</option>
                    <option value="santfeliu">Sant Feliu de Llobregat</option>
                    <option value="santboi">Sant Boi de Llobregat</option>
                  </select>
                  <select
                    value={gCat}
                    onChange={(e) => setGCat(e.target.value)}
                    className="max-w-full rounded-ctl border border-white/10 bg-night/70 px-3 py-2 text-white outline-none transition focus:border-brand/60"
                  >
                    <option value="supermarket,food">Supermercados + comida</option>
                    <option value="supermarket">Solo supermercados</option>
                    <option value="food">Solo comida</option>
                    <option value="gas">Gasolineras</option>
                    <option value="pharmacy">Farmacias 24 h</option>
                    <option value="all">Todas</option>
                  </select>
                  <label className="flex items-center gap-2 text-zinc-300">
                    <input type="checkbox" checked={gReal} onChange={(e) => setGReal(e.target.checked)} />
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
                  className={BTN_PRIMARY}
                >
                  {st?.running ? "Ejecutando…" : "Ejecutar"}
                </button>
                {tool.batch && (
                  <button
                    onClick={() => run(tool, true)}
                    disabled={st?.running}
                    className={BTN_GHOST}
                  >
                    Repetir hasta terminar
                  </button>
                )}
                {st?.running && tool.batch && (
                  <button
                    onClick={() => (stopRef.current[tool.key] = true)}
                    className={BTN_DANGER}
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
                  <pre className="mt-2 max-h-64 overflow-auto rounded-ctl bg-black/50 p-3 text-xs leading-relaxed text-zinc-300">
                    {JSON.stringify(st.result, null, 2)}
                  </pre>
                </details>
              )}
            </Panel>
          )
        })}
      </div>

      <DataExport />
    </AdminShell>
  )
}
